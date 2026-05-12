import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import Dockerode from 'dockerode';
import axios from 'axios';

export interface AgentStackConfig {
  agentId: string;
  agentDomain?: string;
  did?: string;
  llmProvider: string;
  llmApiKey: string;
  model: string;
  prompt: string;
  temperature: number;
  ragRemoteUrls?: string;
  llmToolsConfig?: string;
  adminPort: number;
  publicPort: number;
  postgresPort: number;
  redisPort: number;
  postgresPassword: string;
}

const VS_AGENT_IMAGE = 'veranalabs/vs-agent:latest';
const AI_AGENT_IMAGE = 'io2060/hologram-generic-ai-agent-app:v1.11.2';
const POSTGRES_IMAGE = 'postgres:16-alpine';
const REDIS_IMAGE = 'redis:7-alpine';

@Injectable()
export class OrchestratorService implements OnModuleInit {
  private readonly logger = new Logger(OrchestratorService.name);
  private docker: Dockerode;

  onModuleInit() {
    const isWin = process.platform === 'win32';
    const defaultSocket = isWin ? '//./pipe/docker_engine' : '/var/run/docker.sock';
    
    this.docker = new Dockerode({
      socketPath: process.env.DOCKER_SOCKET || defaultSocket,
    });
    this.logger.log(`Docker connected (${isWin ? 'Windows Pipe' : 'Unix Socket'})`);
  }

  async pullImage(image: string): Promise<void> {
    this.logger.log(`Pulling image: ${image}`);
    await new Promise<void>((resolve, reject) => {
      this.docker.pull(image, (err: Error, stream: NodeJS.ReadableStream) => {
        if (err) return reject(err);
        this.docker.modem.followProgress(stream, (err: Error | null, _result: any[]) => {
          if (err) return reject(err);
          resolve();
        });
      });
    });
  }

  async createAgentNetwork(agentId: string): Promise<string> {
    const name = `vas_agent_${agentId}`;
    const network = await this.docker.createNetwork({
      Name: name,
      Driver: 'bridge',
      Labels: { 'vas.agentId': agentId },
    });
    this.logger.log(`Network created: ${name}`);
    return network.id;
  }

  async startVsAgent(config: AgentStackConfig): Promise<string> {
    const name = `vas_vsagent_${config.agentId}`;
    const container = await this.docker.createContainer({
      name,
      Image: VS_AGENT_IMAGE,
      Env: [
        `AGENT_PUBLIC_DID=${config.did || ''}`,
      ],
      ExposedPorts: {
        '3000/tcp': {},
        '3001/tcp': {},
      },
      HostConfig: {
        PortBindings: {
          '3000/tcp': [{ HostPort: String(config.adminPort) }],
          '3001/tcp': [{ HostPort: String(config.publicPort) }],
        },
        Binds: [`vas_vsagent_data_${config.agentId}:/data`],
        NetworkMode: `vas_agent_${config.agentId}`,
      },
      Labels: { 'vas.agentId': config.agentId, 'vas.role': 'vsagent' },
    });
    await container.start();
    this.logger.log(`vs-agent started: ${name}`);
    return container.id;
  }

  async startPostgres(config: AgentStackConfig): Promise<string> {
    const name = `vas_postgres_${config.agentId}`;
    const container = await this.docker.createContainer({
      name,
      Image: POSTGRES_IMAGE,
      Env: [
        'POSTGRES_USER=agent',
        `POSTGRES_PASSWORD=${config.postgresPassword}`,
        'POSTGRES_DB=agent',
      ],
      HostConfig: {
        PortBindings: {
          '5432/tcp': [{ HostPort: String(config.postgresPort) }],
        },
        Binds: [`vas_postgres_data_${config.agentId}:/var/lib/postgresql/data`],
        NetworkMode: `vas_agent_${config.agentId}`,
      },
      Labels: { 'vas.agentId': config.agentId, 'vas.role': 'postgres' },
    });
    await container.start();
    this.logger.log(`PostgreSQL started: ${name}`);
    return container.id;
  }

  async startRedis(config: AgentStackConfig): Promise<string> {
    const name = `vas_redis_${config.agentId}`;
    const container = await this.docker.createContainer({
      name,
      Image: REDIS_IMAGE,
      HostConfig: {
        PortBindings: {
          '6379/tcp': [{ HostPort: String(config.redisPort) }],
        },
        NetworkMode: `vas_agent_${config.agentId}`,
      },
      Labels: { 'vas.agentId': config.agentId, 'vas.role': 'redis' },
    });
    await container.start();
    this.logger.log(`Redis started: ${name}`);
    return container.id;
  }

  async startAiAgent(config: AgentStackConfig): Promise<string> {
    const name = `vas_aiagent_${config.agentId}`;
    const container = await this.docker.createContainer({
      name,
      Image: AI_AGENT_IMAGE,
      Env: [
        `AGENT_PUBLIC_DID=${config.did || ''}`,
        `VS_AGENT_ADMIN_URL=http://vas_vsagent_${config.agentId}:3000`,
        `LLM_PROVIDER=${config.llmProvider}`,
        `ANTHROPIC_API_KEY=${config.llmProvider === 'anthropic' ? config.llmApiKey : ''}`,
        `OPENAI_API_KEY=${config.llmProvider === 'openai' ? config.llmApiKey : ''}`,
        `OPENAI_MODEL=${config.llmProvider === 'openai' ? config.model : ''}`,
        `ANTHROPIC_MODEL=${config.llmProvider === 'anthropic' ? config.model : ''}`,
        `AGENT_PROMPT=${config.prompt}`,
        `RAG_REMOTE_URLS=${config.ragRemoteUrls || ''}`,
        `RAG_CHUNK_SIZE=1000`,
        `RAG_CHUNK_OVERLAP=200`,
        `LLM_TOOLS_CONFIG=${config.llmToolsConfig || '[]'}`,
        `REDIS_URL=redis://vas_redis_${config.agentId}:6379`,
        `POSTGRES_HOST=vas_postgres_${config.agentId}`,
        `POSTGRES_PORT=5432`,
        `POSTGRES_USER=agent`,
        `POSTGRES_PASSWORD=${config.postgresPassword}`,
        `POSTGRES_DB=agent`,
      ],
      HostConfig: {
        NetworkMode: `vas_agent_${config.agentId}`,
      },
      Labels: { 'vas.agentId': config.agentId, 'vas.role': 'aiagent' },
    });
    await container.start();
    this.logger.log(`AI agent started: ${name}`);
    return container.id;
  }

  async waitUntilInitialized(adminPort: number, timeoutMs = 120_000): Promise<void> {
    const url = `http://localhost:${adminPort}/v1/agent`;
    const start = Date.now();
    this.logger.log(`Waiting for vs-agent to initialize at ${url}`);

    while (Date.now() - start < timeoutMs) {
      try {
        const res = await axios.get(url, { timeout: 3000 });
        if (res.data?.isInitialized === true) {
          this.logger.log('vs-agent initialized');
          return;
        }
      } catch {
        // still starting
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
    throw new Error(`vs-agent did not initialize within ${timeoutMs}ms`);
  }

  async restartAiAgent(agentId: string): Promise<void> {
    const name = `vas_aiagent_${agentId}`;
    const container = this.docker.getContainer(name);
    await container.restart({ t: 10 });
    this.logger.log(`AI agent restarted: ${name}`);
  }

  async updateAiAgentEnv(agentId: string, _envVars: Record<string, string>): Promise<void> {
    await this.restartAiAgent(agentId);
  }

  async stopAgent(agentId: string): Promise<void> {
    const roles = ['vsagent', 'aiagent', 'postgres', 'redis'];
    for (const role of roles) {
      try {
        const container = this.docker.getContainer(`vas_${role}_${agentId}`);
        await container.stop({ t: 10 });
        this.logger.log(`Stopped: vas_${role}_${agentId}`);
      } catch {
        // ignore if not running
      }
    }
  }

  async destroyAgent(agentId: string): Promise<void> {
    await this.stopAgent(agentId);

    const roles = ['vsagent', 'aiagent', 'postgres', 'redis'];
    for (const role of roles) {
      try {
        const container = this.docker.getContainer(`vas_${role}_${agentId}`);
        await container.remove({ force: true, v: true });
        this.logger.log(`Removed: vas_${role}_${agentId}`);
      } catch {
        // ignore if not found
      }
    }

    try {
      const network = this.docker.getNetwork(`vas_agent_${agentId}`);
      await network.remove();
      this.logger.log(`Network removed: vas_agent_${agentId}`);
    } catch {
      // ignore
    }
  }

  async getContainerLogs(agentId: string, role: 'vsagent' | 'aiagent' = 'aiagent'): Promise<NodeJS.ReadableStream> {
    const container = this.docker.getContainer(`vas_${role}_${agentId}`);
    return container.logs({
      follow: true,
      stdout: true,
      stderr: true,
      tail: 100,
    }) as unknown as NodeJS.ReadableStream;
  }

  async allocatePorts(basePort: number): Promise<{
    adminPort: number;
    publicPort: number;
    postgresPort: number;
    redisPort: number;
  }> {
    return {
      adminPort: basePort,
      publicPort: basePort + 1,
      postgresPort: basePort + 2,
      redisPort: basePort + 3,
    };
  }
}
