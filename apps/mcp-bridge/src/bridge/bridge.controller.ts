import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { BridgeService } from './bridge.service';
import { McpRegistryService } from '../mcp/mcp-registry.service';
import { AuthManagerService } from '../auth/auth-manager.service';
import { IsString, IsIn, IsOptional, IsObject } from 'class-validator';

class RegisterMcpDto {
  @IsString() agentId: string;
  @IsString() name: string;
  @IsIn(['sse', 'stdio']) type: 'sse' | 'stdio';
  @IsString() url: string;
  @IsIn(['none', 'api_key', 'bearer', 'oauth2']) authType: 'none' | 'api_key' | 'bearer' | 'oauth2';
  @IsObject() @IsOptional() credentials?: Record<string, string>;
}

class SaveAuthDto {
  @IsIn(['api_key', 'bearer', 'oauth2']) authType: string;
  @IsObject() credentials: Record<string, string>;
}

@ApiTags('bridge')
@Controller()
export class BridgeController {
  constructor(
    private bridge: BridgeService,
    private registry: McpRegistryService,
    private authManager: AuthManagerService,
  ) {}

  // ── Endpoint REST para el ai-agent-vs ─────────────────────────────────
  // GET /bridge/:agentId/:toolKey?query=...&param2=...
  // POST /bridge/:agentId/:toolKey  { "param": "value" }

  @Get('bridge/:agentId/:toolKey')
  @ApiOperation({ summary: 'Invocar tool MCP via GET (usado por el LLM)' })
  async invokeGet(
    @Param('agentId') agentId: string,
    @Param('toolKey') toolKey: string,
    @Query() query: Record<string, string>,
    @Headers('x-bridge-key') bridgeKey: string,
  ) {
    this.validateBridgeKey(bridgeKey);
    return this.bridge.invokeTool(agentId, toolKey, query);
  }

  @Post('bridge/:agentId/:toolKey')
  @ApiOperation({ summary: 'Invocar tool MCP via POST con body JSON' })
  async invokePost(
    @Param('agentId') agentId: string,
    @Param('toolKey') toolKey: string,
    @Body() body: Record<string, unknown>,
    @Headers('x-bridge-key') bridgeKey: string,
  ) {
    this.validateBridgeKey(bridgeKey);
    return this.bridge.invokeTool(agentId, toolKey, body);
  }

  // ── Gestión de MCP servers (llamado desde el API principal) ───────────

  @Post('mcp/register')
  @ApiOperation({ summary: 'Registrar nuevo MCP server' })
  register(@Body() dto: RegisterMcpDto) {
    return this.registry.register(dto);
  }

  @Get('mcp/:agentId')
  @ApiOperation({ summary: 'Listar MCPs del agente con tools' })
  list(@Param('agentId') agentId: string) {
    return this.registry.listByAgent(agentId);
  }

  @Delete('mcp/:serverId')
  @ApiOperation({ summary: 'Desconectar y eliminar MCP server' })
  async remove(@Param('serverId') serverId: string) {
    await this.registry.unregister(serverId);
    return { deleted: true };
  }

  @Get('mcp/:agentId/tools-config')
  @ApiOperation({ summary: 'Obtener LLM_TOOLS_CONFIG JSON del agente' })
  toolsConfig(@Param('agentId') agentId: string) {
    return this.registry.buildToolsConfig(agentId);
  }

  // ── Auth credentials ──────────────────────────────────────────────────

  @Post('mcp-config/:serverId/auth')
  @ApiOperation({ summary: 'Guardar credenciales OAuth/APIKey para un MCP server' })
  async saveAuth(@Param('serverId') serverId: string, @Body() dto: SaveAuthDto) {
    const encrypted = this.authManager.encrypt(JSON.stringify(dto.credentials));
    return { encrypted: true, preview: encrypted.slice(0, 20) + '...' };
  }

  // ── Logs ──────────────────────────────────────────────────────────────

  @Get('bridge/:agentId/logs')
  @ApiOperation({ summary: 'Últimas invocaciones de tools del agente' })
  logs(@Param('agentId') agentId: string, @Query('limit') limit?: string) {
    return this.bridge.getInvocationLogs(agentId, limit ? parseInt(limit) : 50);
  }

  // ── Helpers ───────────────────────────────────────────────────────────

  private validateBridgeKey(key: string) {
    const expected = process.env.BRIDGE_INTERNAL_KEY || 'dev-bridge-key';
    if (key !== expected) throw new UnauthorizedException('Invalid bridge key');
  }
}
