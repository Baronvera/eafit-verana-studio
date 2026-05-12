import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrchestratorService } from '../orchestrator/orchestrator.service';
import { HelmOrchestratorService } from '../orchestrator/helm-orchestrator.service';
import { ProvisioningService } from '../provisioning/provisioning.service';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';
import { v4 as uuidv4 } from 'uuid';
import * as QRCode from 'qrcode';
import { ProvisioningStep } from '@vas/shared';

const BASE_PORT = parseInt(process.env.AGENT_BASE_PORT || '4000');
const AGENT_BASE_DOMAIN = process.env.AGENT_BASE_DOMAIN || 'team-b.teams.eafit.testnet.verana.network';

@Injectable()
export class AgentsService implements OnModuleInit {
  private readonly logger = new Logger(AgentsService.name);
  private provisioningSteps = new Map<string, ProvisioningStep[]>();
  private readonly useK8s = process.env.USE_KUBERNETES === 'true';

  constructor(
    private prisma: PrismaService,
    private orchestrator: OrchestratorService,
    private helm: HelmOrchestratorService,
    private provisioning: ProvisioningService,
  ) {}

  async onModuleInit() {
    // Recover agents stuck in PROVISIONING from a previous API crash
    const stuck = await this.prisma.agent.findMany({
      where: { status: 'PROVISIONING' },
      select: { id: true },
    });
    if (stuck.length > 0) {
      this.logger.warn(`Found ${stuck.length} agents stuck in PROVISIONING — marking as ERROR`);
      await this.prisma.agent.updateMany({
        where: { id: { in: stuck.map((a) => a.id) } },
        data: { status: 'ERROR' },
      });
    }
  }

  async create(userId: string, dto: CreateAgentDto) {
    let org = await this.prisma.organization.findFirst({
      where: { userId, name: dto.organization.name },
    });

    if (!org) {
      org = await this.prisma.organization.create({
        data: {
          name: dto.organization.name,
          country: dto.organization.country,
          registryId: dto.organization.registryId,
          userId,
        },
      });
    }

    const agentCount = await this.prisma.agent.count();
    const portOffset = agentCount * 10;
    const ports = await this.orchestrator.allocatePorts(BASE_PORT + portOffset);

    const agent = await this.prisma.agent.create({
      data: {
        name: dto.name,
        type: dto.type || 'general',
        description: dto.description,
        status: 'PENDING',
        network: (dto.network?.toUpperCase() || 'TESTNET') as any,
        llmProvider: (dto.llmProvider?.toUpperCase() || 'ANTHROPIC') as any,
        model: dto.model,
        prompt: dto.prompt,
        temperature: dto.temperature ?? 0.7,
        orgId: org.id,
        stack: {
          create: {
            adminPort: ports.adminPort,
            publicPort: ports.publicPort,
          },
        },
      },
      include: { stack: true, org: true },
    });

    this.deployAgent(agent.id, dto, ports).catch((err) => {
      this.logger.error(`Deploy failed for agent ${agent.id}: ${err.stack}`, err.body || err);
      this.prisma.agent.update({
        where: { id: agent.id },
        data: { status: 'ERROR' },
      });
    });

    return { agentId: agent.id, status: 'provisioning', orchestration: this.useK8s ? 'kubernetes' : 'docker' };
  }

  private async deployAgent(
    agentId: string,
    dto: CreateAgentDto,
    ports: { adminPort: number; publicPort: number; postgresPort: number; redisPort: number },
  ) {
    await this.prisma.agent.update({ where: { id: agentId }, data: { status: 'PROVISIONING' } });

    const postgresPassword = uuidv4().replace(/-/g, '');
    const mcpServers: any = {};
    
    // Configuración de MCPs...
    if (dto.selectedMcps?.includes('weather')) {
      mcpServers['weather'] = {
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-weather']
      };
    }
    
    if (dto.selectedMcps?.includes('google-maps')) {
      mcpServers['google-maps'] = {
        command: 'npx',
        args: ['-y', 'google-maps-mcp-server'],
        env: { GOOGLE_MAPS_API_KEY: dto.googleMapsApiKey || '' }
      };
    }

    if (dto.selectedMcps?.includes('tavily')) {
      mcpServers['tavily'] = {
        command: 'npx',
        args: ['-y', '@tavily/mcp'],
        env: { TAVILY_API_KEY: dto.tavilyApiKey || '' }
      };
    }

    if (dto.selectedMcps?.includes('wikipedia')) {
      mcpServers['wikipedia'] = {
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-wikipedia']
      };
    }

    if (dto.selectedMcps?.includes('twitter')) {
      mcpServers['twitter'] = {
        command: 'npx',
        args: ['-y', 'mcp-server-twitter'],
        env: { TWITTER_API_KEY: dto.twitterApiKey || '' }
      };
    }

    const hasGoogleServices = dto.selectedMcps?.some(m => ['google-calendar', 'gmail', 'google-sheets'].includes(m));
    if (hasGoogleServices) {
      mcpServers['google'] = {
        command: 'npx',
        args: ['-y', 'mcp-server-google'],
        env: {
          GOOGLE_CLIENT_ID: dto.googleClientId || '',
          GOOGLE_CLIENT_SECRET: dto.googleClientSecret || ''
        }
      };
    }

    // LLM_TOOLS_CONFIG must be a JSON array; mcpServers are passed separately
    const llmToolsConfig = '[]';
    const agentDomain = `agent-${agentId.substring(0, 8)}.${AGENT_BASE_DOMAIN}`;
    const config = {
      agentId,
      agentDomain,
      llmProvider: dto.llmProvider,
      llmApiKey: dto.llmApiKey || '',
      model: dto.model,
      prompt: dto.prompt,
      temperature: dto.temperature ?? 0.7,
      llmToolsConfig,
      adminPort: ports.adminPort,
      publicPort: ports.publicPort,
      postgresPort: ports.postgresPort,
      redisPort: ports.redisPort,
      postgresPassword,
    };

    let vsAgentId = 'k8s';
    let aiAgentId = 'k8s';
    let postgresId = 'k8s';
    let redisId = 'k8s';
    let networkId = 'k8s';

    if (this.useK8s) {
      await this.helm.deployAgentStack(config);
      await this.helm.waitUntilInitialized(agentId, ports.adminPort);
    } else {
      networkId = await this.orchestrator.createAgentNetwork(agentId);
      [postgresId, redisId] = await Promise.all([
        this.orchestrator.startPostgres(config),
        this.orchestrator.startRedis(config),
      ]);
      await new Promise((r) => setTimeout(r, 3000));
      vsAgentId = await this.orchestrator.startVsAgent(config);
      await this.orchestrator.waitUntilInitialized(ports.adminPort);
    }

    const steps: ProvisioningStep[] = [];
    this.provisioningSteps.set(agentId, steps);

    const result = await this.provisioning.provision({
      agentId,
      adminPort: ports.adminPort,
      orgName: dto.organization.name,
      orgCountry: dto.organization.country,
      orgRegistryId: dto.organization.registryId,
      agentName: dto.name,
      agentType: dto.type || 'general',
      termsUrl: dto.service.termsUrl,
      privacyUrl: dto.service.privacyUrl,
      onStep: (step) => steps.push(step),
    });

    if (this.useK8s) {
      await this.helm.deployAiAgent(agentId, { ...config, did: result.did });
    } else {
      aiAgentId = await this.orchestrator.startAiAgent({ ...config, did: result.did });
    }

    await this.prisma.$transaction([
      this.prisma.agent.update({
        where: { id: agentId },
        data: { did: result.did, status: 'RUNNING' },
      }),
      this.prisma.agentStack.update({
        where: { agentId },
        data: {
          vsAgentContainerId: vsAgentId,
          aiAgentContainerId: aiAgentId,
          postgresContainerId: postgresId,
          redisContainerId: redisId,
          networkId,
        },
      }),
      this.prisma.agentCredential.createMany({
        data: [
          { agentId, type: 'ORGANIZATION', status: 'ACTIVE', issuedAt: new Date() },
          { agentId, type: 'SERVICE', status: 'ACTIVE', issuedAt: new Date() },
        ],
      }),
    ]);

    this.logger.log(`Agent ${agentId} deployed successfully on ${this.useK8s ? 'K8s' : 'Docker'}`);
  }

  async findAll(userId: string) {
    const orgs = await this.prisma.organization.findMany({ where: { userId }, select: { id: true } });
    const orgIds = orgs.map((o) => o.id);

    return this.prisma.agent.findMany({
      where: { orgId: { in: orgIds } },
      include: {
        org: true,
        stack: true,
        credentials: true,
        _count: { select: { documents: true, mcpServers: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(userId: string, agentId: string) {
    const agent = await this.prisma.agent.findUnique({
      where: { id: agentId },
      include: {
        org: true,
        stack: true,
        credentials: true,
        documents: { where: { status: 'READY' } },
        mcpServers: { include: { tools: true } },
      },
    });

    if (!agent) throw new NotFoundException('Agente no encontrado');
    if (agent.org.userId !== userId) throw new ForbiddenException();

    const useK8s = process.env.USE_KUBERNETES === 'true';
    const baseUrl = useK8s
      ? `wss://agent-${agent.id.substring(0, 8)}.${AGENT_BASE_DOMAIN}`
      : `wss://localhost:${agent.stack?.publicPort || 3001}`;

    const qrInvitation = agent.stack?.publicPort
      ? await QRCode.toDataURL(`https://hologram.app/connect?endpoint=${baseUrl}`)
      : null;

    return { ...agent, qrInvitation };
  }

  async update(userId: string, agentId: string, dto: UpdateAgentDto) {
    await this.assertOwner(userId, agentId);

    const agent = await this.prisma.agent.update({
      where: { id: agentId },
      data: {
        ...(dto.prompt && { prompt: dto.prompt }),
        ...(dto.model && { model: dto.model }),
        ...(dto.llmProvider && { llmProvider: dto.llmProvider as any }),
        ...(dto.temperature !== undefined && { temperature: dto.temperature }),
        ...(dto.description && { description: dto.description }),
      },
    });

    if (dto.prompt || dto.model || dto.llmProvider || dto.temperature) {
      if (this.useK8s) {
        await this.helm.restartAiAgent(agentId).catch(() => {});
      } else {
        await this.orchestrator.restartAiAgent(agentId).catch(() => {});
      }
    }

    return agent;
  }

  async remove(userId: string, agentId: string) {
    await this.assertOwner(userId, agentId);
    if (this.useK8s) {
      await this.helm.destroyAgentStack(agentId).catch(() => {});
    } else {
      // En Docker solo detenemos para el MVP
      await this.orchestrator.stopAgent(agentId).catch(() => {});
    }
    await this.prisma.agent.update({ where: { id: agentId }, data: { status: 'STOPPED' } });
    return { stopped: true };
  }

  async restart(userId: string, agentId: string) {
    await this.assertOwner(userId, agentId);
    if (this.useK8s) {
      await this.helm.restartAiAgent(agentId);
    } else {
      await this.orchestrator.restartAiAgent(agentId);
    }
    await this.prisma.agent.update({ where: { id: agentId }, data: { status: 'RUNNING' } });
    return { restarted: true };
  }

  getProvisioningSteps(agentId: string): ProvisioningStep[] {
    return this.provisioningSteps.get(agentId) || [];
  }

  async getLogs(agentId: string): Promise<NodeJS.ReadableStream> {
    if (this.useK8s) {
      // Log streaming for K8s is more complex, placeholder for MVP
      throw new Error('K8s log streaming not implemented in this version');
    }
    return this.orchestrator.getContainerLogs(agentId, 'aiagent');
  }

  private async assertOwner(userId: string, agentId: string) {
    const agent = await this.prisma.agent.findUnique({
      where: { id: agentId },
      include: { org: { select: { userId: true } } },
    });
    if (!agent) throw new NotFoundException('Agente no encontrado');
    if (agent.org.userId !== userId) throw new ForbiddenException();
  }
}
