import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { McpConnectionService } from '../mcp/mcp-connection.service';
import { v4 as uuidv4 } from 'uuid';

interface CacheEntry {
  result: unknown;
  expiresAt: number;
}

@Injectable()
export class BridgeService {
  private readonly logger = new Logger(BridgeService.name);
  private cache = new Map<string, CacheEntry>();
  private readonly DEFAULT_TTL_MS = 60_000; // 1 minuto por defecto

  constructor(
    private prisma: PrismaService,
    private connections: McpConnectionService,
  ) {}

  // ── Invocar tool via REST ─────────────────────────────────────────────

  async invokeTool(
    agentId: string,
    toolKey: string, // formato: serverName__toolName
    input: Record<string, unknown>,
    cacheTtlMs?: number,
  ): Promise<unknown> {
    const cacheKey = `${agentId}:${toolKey}:${JSON.stringify(input)}`;
    const ttl = cacheTtlMs ?? this.DEFAULT_TTL_MS;

    // Revisar caché
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      this.logger.debug(`Cache hit: ${cacheKey}`);
      return cached.result;
    }

    // Resolver server y tool
    const [serverName, ...toolNameParts] = toolKey.split('__');
    const toolName = toolNameParts.join('__');

    const server = await this.prisma.mcpServer.findFirst({
      where: { agentId, name: serverName },
    });

    if (!server) throw new NotFoundException(`MCP server "${serverName}" no encontrado para el agente`);

    const tool = await this.prisma.mcpTool.findFirst({
      where: { mcpServerId: server.id, name: toolName, enabled: true },
    });

    if (!tool) throw new NotFoundException(`Tool "${toolName}" no encontrada o deshabilitada`);

    const startTime = Date.now();
    let output: unknown;
    let error: string | undefined;

    try {
      output = await this.connections.callTool(server.id, toolName, input);
    } catch (err: any) {
      error = err.message;
      throw err;
    } finally {
      const durationMs = Date.now() - startTime;
      // Log asíncrono — no bloquea la respuesta
      this.logInvocation(agentId, server.id, toolName, input, output, durationMs, error).catch(() => {});
    }

    // Guardar en caché
    if (ttl > 0) {
      this.cache.set(cacheKey, { result: output, expiresAt: Date.now() + ttl });
    }

    return output;
  }

  // ── Logs de invocaciones ──────────────────────────────────────────────

  async getInvocationLogs(agentId: string, limit = 50) {
    const servers = await this.prisma.mcpServer.findMany({
      where: { agentId },
      select: { id: true },
    });

    const serverIds = servers.map((s) => s.id);
    if (serverIds.length === 0) return [];

    return this.prisma.mcpInvocationLog.findMany({
      where: { serverId: { in: serverIds } },
      include: { server: { select: { name: true } } } as any,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  private async logInvocation(
    agentId: string,
    serverId: string,
    toolName: string,
    input: unknown,
    output: unknown,
    durationMs: number,
    error?: string,
  ) {
    await this.prisma.mcpInvocationLog.create({
      data: {
        id: uuidv4(),
        serverId,
        agentId, // Need to pass agentId as well since it's required in schema
        toolName,
        input: input as any,
        output: output as any,
        durationMs,
        error,
      },
    });
  }
}
