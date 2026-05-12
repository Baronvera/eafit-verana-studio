import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { McpConnectionService, McpToolDef } from './mcp-connection.service';
import { AuthManagerService } from '../auth/auth-manager.service';
import { v4 as uuidv4 } from 'uuid';

export interface RegisterMcpDto {
  agentId: string;
  name: string;
  type: 'sse' | 'stdio';
  url: string;
  authType: 'none' | 'api_key' | 'bearer' | 'oauth2';
  credentials?: Record<string, string>;
}

@Injectable()
export class McpRegistryService implements OnModuleInit {
  private readonly logger = new Logger(McpRegistryService.name);

  constructor(
    private prisma: PrismaService,
    private connections: McpConnectionService,
    private authManager: AuthManagerService,
  ) {}

  // Reconectar todos los servidores activos al arrancar
  async onModuleInit() {
    const servers = await this.prisma.mcpServer.findMany({
      where: { status: { in: ['CONNECTED', 'CONNECTING'] } },
    });

    this.logger.log(`Restoring ${servers.length} MCP connections...`);
    for (const server of servers) {
      this.connectServer(server).catch((err) => {
        this.logger.warn(`Failed to restore ${server.id}: ${err.message}`);
      });
    }
  }

  // ── Registrar nuevo MCP server ────────────────────────────────────────

  async register(dto: RegisterMcpDto) {
    const id = uuidv4();
    let encryptedCreds: string | undefined;

    if (dto.credentials && Object.keys(dto.credentials).length > 0) {
      encryptedCreds = this.authManager.encrypt(JSON.stringify(dto.credentials));
    }

    const server = await this.prisma.mcpServer.create({
      data: {
        id,
        agentId: dto.agentId,
        name: dto.name,
        type: dto.type.toUpperCase() as any,
        url: dto.url,
        authType: dto.authType.toUpperCase() as any,
        encryptedCreds,
        status: 'CONNECTING',
      },
    });

    await this.connectServer(server);
    return server;
  }

  // ── Desconectar y eliminar ────────────────────────────────────────────

  async unregister(serverId: string) {
    await this.connections.disconnect(serverId);
    await this.prisma.mcpTool.deleteMany({ where: { mcpServerId: serverId } });
    await this.prisma.mcpServer.delete({ where: { id: serverId } });
    this.logger.log(`MCP server unregistered: ${serverId}`);
  }

  // ── Listar MCPs de un agente ──────────────────────────────────────────

  async listByAgent(agentId: string) {
    return this.prisma.mcpServer.findMany({
      where: { agentId },
      include: { tools: { where: { enabled: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── Generar LLM_TOOLS_CONFIG para el agente ───────────────────────────

  async buildToolsConfig(agentId: string): Promise<string> {
    const servers = await this.prisma.mcpServer.findMany({
      where: { agentId, status: 'CONNECTED' },
      include: { tools: { where: { enabled: true } } },
    });

    const tools = servers.flatMap((s) =>
      s.tools.map((t) => ({
        name: `${s.name}__${t.name}`,
        description: `[${s.name}] ${t.description}`,
        input_schema: t.inputSchema,
        bridge_url: `${process.env.MCP_BRIDGE_URL || 'http://localhost:3002'}/bridge/${agentId}/${s.name}__${t.name}`,
      })),
    );

    return JSON.stringify(tools);
  }

  // ── Conectar internamente (con auth) ──────────────────────────────────

  async connectServer(server: { id: string; type: string; url: string; authType: string; encryptedCreds: string | null }) {
    const authHeaders = this.authManager.buildAuthHeaders(
      server.authType,
      server.encryptedCreds,
    );

    try {
      await this.connections.connect(
        server.id,
        server.type.toLowerCase() as 'sse' | 'stdio',
        server.url,
        authHeaders,
      );

      // Sincronizar tools disponibles
      const tools = await this.connections.listTools(server.id);
      await this.syncTools(server.id, tools);

      await this.prisma.mcpServer.update({
        where: { id: server.id },
        data: { status: 'CONNECTED', updatedAt: new Date() },
      });

      this.logger.log(`MCP server connected: ${server.id} (${tools.length} tools)`);
    } catch (err: any) {
      await this.prisma.mcpServer.update({
        where: { id: server.id },
        data: { status: 'ERROR' },
      });
      throw err;
    }
  }

  private async syncTools(serverId: string, tools: McpToolDef[]) {
    await this.prisma.mcpTool.deleteMany({ where: { mcpServerId: serverId } });
    if (tools.length === 0) return;

    await this.prisma.mcpTool.createMany({
      data: tools.map((t) => ({
        id: uuidv4(),
        mcpServerId: serverId,
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema as any,
        enabled: true,
      })),
    });
  }
}
