import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

export interface McpToolDef {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

interface ActiveSession {
  client: Client;
  serverId: string;
  reconnectTimer?: ReturnType<typeof setTimeout>;
}

@Injectable()
export class McpConnectionService implements OnModuleDestroy {
  private readonly logger = new Logger(McpConnectionService.name);
  private sessions = new Map<string, ActiveSession>();

  // ── Conectar a un MCP server ──────────────────────────────────────────

  async connect(
    serverId: string,
    type: 'sse' | 'stdio',
    url: string,
    authHeaders?: Record<string, string>,
  ): Promise<void> {
    // Desconectar si ya había sesión activa
    await this.disconnect(serverId);

    const client = new Client(
      { name: 'vas-mcp-bridge', version: '1.0.0' },
      { capabilities: { tools: {} } } as any,
    );

    let transport;
    if (type === 'sse') {
      transport = new SSEClientTransport(new URL(url), {
        requestInit: { headers: authHeaders },
      });
    } else {
      // stdio: url contiene el comando a ejecutar
      const [command, ...args] = url.split(' ');
      transport = new StdioClientTransport({ command, args });
    }

    await client.connect(transport);
    this.sessions.set(serverId, { client, serverId });
    this.logger.log(`Connected to MCP server: ${serverId} (${type})`);

    // Reconexión automática en caso de desconexión
    transport.onclose = () => {
      this.logger.warn(`MCP server disconnected: ${serverId} — reconnecting in 5s`);
      this.scheduleReconnect(serverId, type, url, authHeaders);
    };
  }

  // ── Listar tools disponibles ──────────────────────────────────────────

  async listTools(serverId: string): Promise<McpToolDef[]> {
    const session = this.getSession(serverId);
    const result = await session.client.listTools();
    return result.tools.map((t) => ({
      name: t.name,
      description: t.description || '',
      inputSchema: t.inputSchema as Record<string, unknown>,
    }));
  }

  // ── Invocar una tool ─────────────────────────────────────────────────

  async callTool(
    serverId: string,
    toolName: string,
    input: Record<string, unknown>,
  ): Promise<unknown> {
    const session = this.getSession(serverId);
    const result = await session.client.callTool({ name: toolName, arguments: input });

    if (result.isError) {
      throw new Error(`MCP tool error: ${JSON.stringify(result.content)}`);
    }

    // Extraer contenido texto si es un array de bloques
    if (Array.isArray(result.content)) {
      const textBlocks = result.content.filter((c: any) => c.type === 'text');
      if (textBlocks.length > 0) {
        return textBlocks.map((b: any) => b.text).join('\n');
      }
    }

    return result.content;
  }

  // ── Estado de la sesión ───────────────────────────────────────────────

  isConnected(serverId: string): boolean {
    return this.sessions.has(serverId);
  }

  async disconnect(serverId: string): Promise<void> {
    const session = this.sessions.get(serverId);
    if (!session) return;

    if (session.reconnectTimer) clearTimeout(session.reconnectTimer);

    try {
      await session.client.close();
    } catch {
      // ignore
    }

    this.sessions.delete(serverId);
    this.logger.log(`Disconnected MCP server: ${serverId}`);
  }

  async onModuleDestroy() {
    for (const serverId of this.sessions.keys()) {
      await this.disconnect(serverId);
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────

  private getSession(serverId: string): ActiveSession {
    const session = this.sessions.get(serverId);
    if (!session) throw new Error(`No active session for MCP server: ${serverId}`);
    return session;
  }

  private scheduleReconnect(
    serverId: string,
    type: 'sse' | 'stdio',
    url: string,
    authHeaders?: Record<string, string>,
    attempt = 1,
  ) {
    const delay = Math.min(5000 * attempt, 60_000); // max 60s backoff
    const timer = setTimeout(async () => {
      this.logger.log(`Reconnecting MCP server ${serverId} (attempt ${attempt})...`);
      try {
        await this.connect(serverId, type, url, authHeaders);
      } catch {
        this.scheduleReconnect(serverId, type, url, authHeaders, attempt + 1);
      }
    }, delay);

    const session = this.sessions.get(serverId);
    if (session) session.reconnectTimer = timer;
  }
}
