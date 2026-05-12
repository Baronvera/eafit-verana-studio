import {
  Controller, Get, Post, Body, Param, Query,
  UseGuards, Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsNumber } from 'class-validator';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AnalyticsService } from './analytics.service';

class LogTurnDto {
  @IsString() connectionId: string;
  @IsEnum(['user', 'agent']) role: 'user' | 'agent';
  @IsString() content: string;
  @IsNumber() @IsOptional() tokensUsed?: number;
  @IsString({ each: true }) @IsOptional() citedDocIds?: string[];
}

class SatisfactionDto {
  @IsString() connectionId: string;
  @IsEnum([1, -1]) score: 1 | -1;
}

@ApiTags('analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('agents/:agentId/analytics')
export class AnalyticsController {
  constructor(private analytics: AnalyticsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Dashboard de analytics del agente' })
  getDashboard(
    @Param('agentId') agentId: string,
    @Query('days') days: number = 30,
  ) {
    return this.analytics.getDashboard(agentId, days);
  }

  @Get('intents')
  @ApiOperation({ summary: 'Top keywords / intents de usuarios' })
  getIntents(
    @Param('agentId') agentId: string,
    @Query('days') days: number = 30,
    @Query('limit') limit: number = 20,
  ) {
    return this.analytics.getTopIntents(agentId, days, limit);
  }

  @Get('export')
  @ApiOperation({ summary: 'Exportar logs a CSV' })
  async exportCsv(
    @Param('agentId') agentId: string,
    @Query('days') days: number = 30,
    @Res() res: Response,
  ) {
    const csv = await this.analytics.exportCsv(agentId, days);
    res.set('Content-Type', 'text/csv');
    res.set('Content-Disposition', `attachment; filename="analytics-${agentId}-${days}d.csv"`);
    res.end(csv);
  }

  // ── Webhook endpoints (called by vs-agent / Hologram) ─────────────────────

  @Post('log')
  @ApiOperation({ summary: 'Registrar turno de conversación (webhook de vs-agent)' })
  logTurn(@Param('agentId') agentId: string, @Body() dto: LogTurnDto) {
    return this.analytics.logTurn(
      agentId,
      dto.connectionId,
      dto.role,
      dto.content,
      dto.tokensUsed,
      dto.citedDocIds,
    );
  }

  @Post('satisfaction')
  @ApiOperation({ summary: 'Registrar satisfacción (thumbs up/down de Hologram)' })
  recordSatisfaction(@Param('agentId') agentId: string, @Body() dto: SatisfactionDto) {
    return this.analytics.recordSatisfaction(agentId, dto.connectionId, dto.score);
  }
}
