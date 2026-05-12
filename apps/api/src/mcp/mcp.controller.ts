import {
  Controller, Get, Post, Delete, Patch,
  Param, Body, Query, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsString, IsIn, IsOptional, IsObject, IsBoolean } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, JwtUser } from '../auth/current-user.decorator';
import { McpService } from './mcp.service';

class RegisterMcpDto {
  @IsString() name: string;
  @IsIn(['sse', 'stdio']) type: 'sse' | 'stdio';
  @IsString() url: string;
  @IsIn(['none', 'api_key', 'bearer', 'oauth2']) authType: 'none' | 'api_key' | 'bearer' | 'oauth2';
  @IsObject() @IsOptional() credentials?: Record<string, string>;
}

class ToggleToolDto {
  @IsBoolean() enabled: boolean;
}

class TestToolDto {
  @IsString() toolKey: string;
  @IsObject() @IsOptional() input?: Record<string, unknown>;
}

@ApiTags('mcp')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('agents/:agentId/mcp')
export class McpController {
  constructor(private mcp: McpService) {}

  @Post()
  @ApiOperation({ summary: 'Registrar nuevo MCP server al agente' })
  register(
    @CurrentUser() user: JwtUser,
    @Param('agentId') agentId: string,
    @Body() dto: RegisterMcpDto,
  ) {
    return this.mcp.register(user.userId, agentId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar MCPs activos con tools disponibles' })
  list(@CurrentUser() user: JwtUser, @Param('agentId') agentId: string) {
    return this.mcp.list(user.userId, agentId);
  }

  @Delete(':serverId')
  @ApiOperation({ summary: 'Desconectar MCP y actualizar tools config' })
  remove(
    @CurrentUser() user: JwtUser,
    @Param('agentId') agentId: string,
    @Param('serverId') serverId: string,
  ) {
    return this.mcp.remove(user.userId, agentId, serverId);
  }

  @Patch('tools/:toolId')
  @ApiOperation({ summary: 'Habilitar / deshabilitar tool individual' })
  toggleTool(
    @CurrentUser() user: JwtUser,
    @Param('agentId') agentId: string,
    @Param('toolId') toolId: string,
    @Body() dto: ToggleToolDto,
  ) {
    return this.mcp.toggleTool(user.userId, agentId, toolId, dto.enabled);
  }

  @Post('test')
  @ApiOperation({ summary: 'Invocar tool para test inline desde la UI' })
  testTool(
    @CurrentUser() user: JwtUser,
    @Param('agentId') agentId: string,
    @Body() dto: TestToolDto,
  ) {
    return this.mcp.testTool(user.userId, agentId, dto.toolKey, dto.input || {});
  }

  @Get('logs')
  @ApiOperation({ summary: 'Log de invocaciones recientes' })
  logs(
    @CurrentUser() user: JwtUser,
    @Param('agentId') agentId: string,
    @Query('limit') limit?: string,
  ) {
    return this.mcp.getLogs(user.userId, agentId, limit ? parseInt(limit) : 50);
  }
}
