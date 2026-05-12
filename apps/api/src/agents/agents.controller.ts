import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Res,
  Sse,
  MessageEvent,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { Observable } from 'rxjs';
import { EventEmitter } from 'events';
import { IsString } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, JwtUser } from '../auth/current-user.decorator';
import { AgentsService } from './agents.service';
import { DomainService } from './domain.service';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';

class SetDomainDto {
  @IsString() domain: string;
}

@ApiTags('agents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('agents')
export class AgentsController {
  constructor(
    private readonly agentsService: AgentsService,
    private readonly domainService: DomainService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Crear agente + deploy automático' })
  create(@CurrentUser() user: JwtUser, @Body() dto: CreateAgentDto) {
    return this.agentsService.create(user.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar agentes del usuario' })
  findAll(@CurrentUser() user: JwtUser) {
    return this.agentsService.findAll(user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle del agente con DID, credenciales y QR' })
  findOne(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.agentsService.findOne(user.userId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar config del agente (prompt, modelo, etc.)' })
  update(@CurrentUser() user: JwtUser, @Param('id') id: string, @Body() dto: UpdateAgentDto) {
    return this.agentsService.update(user.userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Destruir stack Docker y eliminar agente' })
  remove(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.agentsService.remove(user.userId, id);
  }

  @Post(':id/restart')
  @ApiOperation({ summary: 'Reiniciar solo el ai-agent-vs' })
  restart(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.agentsService.restart(user.userId, id);
  }

  // ── Domain management ─────────────────────────────────────────────────────

  @Get(':id/domain')
  @ApiOperation({ summary: 'Estado del dominio personalizado' })
  getDomain(@Param('id') id: string) {
    return this.domainService.getDomainStatus(id);
  }

  @Post(':id/domain')
  @ApiOperation({ summary: 'Configurar dominio personalizado' })
  setDomain(@CurrentUser() user: JwtUser, @Param('id') id: string, @Body() dto: SetDomainDto) {
    return this.domainService.setDomain(user.userId, id, dto.domain);
  }

  @Delete(':id/domain')
  @ApiOperation({ summary: 'Eliminar dominio personalizado' })
  removeDomain(@Param('id') id: string) {
    return this.domainService.removeDomain(id);
  }

  @Get(':id/provisioning-steps')
  @ApiOperation({ summary: 'Obtener pasos de provisioning actuales' })
  getProvisioningSteps(@Param('id') id: string) {
    return this.agentsService.getProvisioningSteps(id);
  }

  @Sse(':id/logs')
  @ApiOperation({ summary: 'Stream de logs vía SSE' })
  async logs(@Param('id') id: string, @Res() res: Response): Promise<Observable<MessageEvent>> {
    const stream = await this.agentsService.getLogs(id);
    const emitter = new EventEmitter();

    stream.on('data', (chunk: Buffer) => {
      emitter.emit('log', chunk.toString());
    });

    stream.on('end', () => emitter.emit('end'));

    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Accel-Buffering', 'no');

    return new Observable<MessageEvent>((subscriber) => {
      const logHandler = (data: string) => subscriber.next({ data } as MessageEvent);
      const endHandler = () => subscriber.complete();

      emitter.on('log', logHandler);
      emitter.on('end', endHandler);

      return () => {
        emitter.off('log', logHandler);
        emitter.off('end', endHandler);
        (stream as any).destroy?.();
      };
    });
  }
}
