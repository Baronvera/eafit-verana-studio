import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrchestratorService } from '../orchestrator/orchestrator.service';
import axios from 'axios';

const BRIDGE_URL = process.env.MCP_BRIDGE_URL || 'http://localhost:3002';

export interface RegisterMcpDto {
  name: string;
  type: 'sse' | 'stdio';
  url: string;
  authType: 'none' | 'api_key' | 'bearer' | 'oauth2';
  credentials?: Record<string, string>;
}

@Injectable()
export class McpService {
  private readonly logger = new Logger(McpService.name);

  constructor(
    private prisma: PrismaService,
    private orchestrator: OrchestratorService,
  ) {}

  // ── Registrar nuevo MCP server ────────────────────────────────────────

  async register(userId: string, agentId: string, dto: RegisterMcpDto) {
    await this.assertAgentOwner(userId, agentId);

    // Delegar al MCP Bridge
    const { data: server } = await axios.post(`${BRIDGE_URL}/mcp/register`, {
      agentId,
      ...dto,
    });

    // Actualizar LLM_TOOLS_CONFIG del agente → hot-reload
    await this.syncToolsConfig(agentId);

    return server;
  }

  // ── Listar MCPs del agente ────────────────────────────────────────────

  async list(userId: string, agentId: string) {
    await this.assertAgentOwner(userId, agentId);
    const { data } = await axios.get(`${BRIDGE_URL}/mcp/${agentId}`);
    return data;
  }

  // ── Eliminar MCP server ───────────────────────────────────────────────

  async remove(userId: string, agentId: string, serverId: string) {
    await this.assertAgentOwner(userId, agentId);
    await axios.delete(`${BRIDGE_URL}/mcp/${serverId}`);

    // Actualizar tools config → hot-reload
    await this.syncToolsConfig(agentId);

    return { deleted: true };
  }

  // ── Toggle tool individual ────────────────────────────────────────────

  async toggleTool(userId: string, agentId: string, toolId: string, enabled: boolean) {
    await this.assertAgentOwner(userId, agentId);

    await this.prisma.mcpTool.update({
      where: { id: toolId },
      data: { enabled },
    });

    await this.syncToolsConfig(agentId);
    return { toolId, enabled };
  }

  // ── Invocar tool para test inline ────────────────────────────────────

  async testTool(userId: string, agentId: string, toolKey: string, input: Record<string, unknown>) {
    await this.assertAgentOwner(userId, agentId);

    const bridgeKey = process.env.BRIDGE_INTERNAL_KEY || 'dev-bridge-key';
    const { data } = await axios.post(
      `${BRIDGE_URL}/bridge/${agentId}/${toolKey}`,
      input,
      { headers: { 'x-bridge-key': bridgeKey } },
    );
    return data;
  }

  // ── Logs de invocaciones ──────────────────────────────────────────────

  async getLogs(userId: string, agentId: string, limit = 50) {
    await this.assertAgentOwner(userId, agentId);
    const { data } = await axios.get(`${BRIDGE_URL}/bridge/${agentId}/logs?limit=${limit}`);
    return data;
  }

  // ── Sync interno ──────────────────────────────────────────────────────

  private async syncToolsConfig(agentId: string) {
    try {
      const { data: toolsConfig } = await axios.get(`${BRIDGE_URL}/mcp/${agentId}/tools-config`);
      // Reiniciar ai-agent-vs para que cargue el nuevo LLM_TOOLS_CONFIG
      await this.orchestrator.restartAiAgent(agentId);
      this.logger.log(`Tools config synced for agent ${agentId}: ${toolsConfig}`);
    } catch (err: any) {
      this.logger.warn(`Could not sync tools config: ${err.message}`);
    }
  }

  private async assertAgentOwner(userId: string, agentId: string) {
    const agent = await this.prisma.agent.findUnique({
      where: { id: agentId },
      include: { org: { select: { userId: true } } },
    });
    if (!agent) throw new NotFoundException('Agente no encontrado');
    if (agent.org.userId !== userId) throw new ForbiddenException();
  }
}
