import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

export interface ClaimMapping {
  attributeName: string;
  source: 'fixed' | 'session' | 'mcp_tool';
  value?: string;          // para source=fixed
  sessionKey?: string;     // para source=session
  toolKey?: string;        // para source=mcp_tool
}

export interface CreateIssuanceFlowDto {
  credTypeId: string;
  triggerType: 'ON_CONNECT' | 'ON_AUTH' | 'ON_COMMAND';
  triggerCommand?: string; // solo para ON_COMMAND
  claimsMappings: ClaimMapping[];
  active?: boolean;
}

@Injectable()
export class IssuanceService {
  private readonly logger = new Logger(IssuanceService.name);

  constructor(private prisma: PrismaService) {}

  // ── Crear flujo de emisión ─────────────────────────────────────────────

  async createFlow(agentId: string, dto: CreateIssuanceFlowDto) {
    const credType = await this.prisma.credentialType.findFirst({
      where: { id: dto.credTypeId, agentId },
    });
    if (!credType) throw new NotFoundException('Tipo de credencial no encontrado');

    return this.prisma.issuanceFlow.create({
      data: {
        id: uuidv4(),
        agentId,
        credTypeId: dto.credTypeId,
        triggerType: dto.triggerType as any,
        claimsConfig: {
          mappings: dto.claimsMappings,
          triggerCommand: dto.triggerCommand,
        } as any,
        active: dto.active ?? false,
      },
      include: { credType: true },
    });
  }

  async listFlows(agentId: string) {
    return this.prisma.issuanceFlow.findMany({
      where: { agentId },
      include: { credType: { select: { name: true, version: true, credDefId: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async toggleFlow(agentId: string, flowId: string, active: boolean) {
    return this.prisma.issuanceFlow.update({
      where: { id: flowId },
      data: { active },
    });
  }

  async deleteFlow(agentId: string, flowId: string) {
    await this.prisma.issuanceFlow.delete({ where: { id: flowId } });
    return { deleted: true };
  }

  // ── Generar oferta de credencial ──────────────────────────────────────

  async generateCredentialOffer(
    agentId: string,
    flowId: string,
    connectionId: string,
    sessionContext?: Record<string, string>,
  ) {
    const flow = await this.prisma.issuanceFlow.findFirst({
      where: { id: flowId, agentId, active: true },
      include: { credType: true },
    });
    if (!flow) throw new NotFoundException('Flujo de emisión no encontrado o inactivo');

    const agent = await this.prisma.agent.findUnique({
      where: { id: agentId },
      include: { stack: true },
    });
    if (!agent?.stack?.adminPort) throw new NotFoundException('Stack del agente no disponible');

    // Resolver claims según el config
    const config = flow.claimsConfig as any as { mappings: ClaimMapping[] };
    const claims: Record<string, string> = {};

    for (const mapping of config.mappings || []) {
      switch (mapping.source) {
        case 'fixed':
          claims[mapping.attributeName] = mapping.value || '';
          break;
        case 'session':
          claims[mapping.attributeName] = sessionContext?.[mapping.sessionKey || ''] || '';
          break;
        case 'mcp_tool':
          // En producción llamaría al MCP Bridge — por ahora placeholder
          claims[mapping.attributeName] = `[mcp:${mapping.toolKey}]`;
          break;
      }
    }

    // Llamar al vs-agent para emitir la oferta
    const { data } = await axios.post(
      `http://localhost:${agent.stack.adminPort}/v1/invitation/credential-offer`,
      {
        connectionId,
        credDefId: flow.credType.credDefId,
        claims,
      },
    );

    const offerId = data.offerId || uuidv4();

    // Registrar en DB como credencial emitida (pendiente de aceptación)
    await this.prisma.agentCredential.create({
      data: {
        id: uuidv4(),
        agentId,
        type: 'ORGANIZATION', // placeholder — en producción sería tipo dinámico
        status: 'PENDING',
        raw: { offerId, connectionId, credDefId: flow.credType.credDefId, claims } as any,
      },
    });

    this.logger.log(`Credential offer generated: ${offerId} for connection ${connectionId}`);
    return { offerId, status: 'pending' };
  }

  async getOfferStatus(agentId: string, offerId: string) {
    const agent = await this.prisma.agent.findUnique({
      where: { id: agentId },
      include: { stack: true },
    });
    if (!agent?.stack?.adminPort) throw new NotFoundException('Stack no disponible');

    const { data } = await axios.get(
      `http://localhost:${agent.stack.adminPort}/v1/invitation/credential-offer/${offerId}`,
    );

    // Actualizar estado en DB si fue aceptado
    if (data.status === 'accepted') {
      const cred = await this.prisma.agentCredential.findFirst({
        where: { raw: { path: ['offerId'], equals: offerId } },
      });
      if (cred) {
        await this.prisma.agentCredential.update({
          where: { id: cred.id },
          data: { status: 'ACTIVE', issuedAt: new Date() },
        });
      }
    }

    return data;
  }
}
