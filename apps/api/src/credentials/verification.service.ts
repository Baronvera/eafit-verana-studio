import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

export interface RequestedAttribute {
  name: string;
  credDefId: string;
  restrictions?: Record<string, string>[];
}

export interface CreateVerificationFlowDto {
  credDefId: string;
  requestedAttributes: RequestedAttribute[];
  callbackUrl?: string;
  postAction: 'continue' | 'block' | 'custom_response';
  customResponse?: string;
  active?: boolean;
}

export interface VerificationCallbackPayload {
  connectionId: string;
  verified: boolean;
  attributes?: Record<string, string>;
  error?: string;
}

@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);

  constructor(private prisma: PrismaService) {}

  // ── Crear flujo de verificación ────────────────────────────────────────

  async createFlow(agentId: string, dto: CreateVerificationFlowDto) {
    return this.prisma.verificationFlow.create({
      data: {
        id: uuidv4(),
        agentId,
        credDefId: dto.credDefId,
        requestedAttributes: dto.requestedAttributes as any,
        callbackUrl: dto.callbackUrl,
        postAction: dto.postAction,
        active: dto.active ?? false,
      },
    });
  }

  async listFlows(agentId: string) {
    return this.prisma.verificationFlow.findMany({
      where: { agentId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async toggleFlow(agentId: string, flowId: string, active: boolean) {
    return this.prisma.verificationFlow.update({
      where: { id: flowId },
      data: { active },
    });
  }

  async deleteFlow(agentId: string, flowId: string) {
    await this.prisma.verificationFlow.delete({ where: { id: flowId } });
    return { deleted: true };
  }

  // ── Generar solicitud de presentación ─────────────────────────────────

  async generatePresentationRequest(
    agentId: string,
    flowId: string,
    connectionId: string,
  ) {
    const flow = await this.prisma.verificationFlow.findFirst({
      where: { id: flowId, agentId, active: true },
    });
    if (!flow) throw new NotFoundException('Flujo de verificación no encontrado o inactivo');

    const agent = await this.prisma.agent.findUnique({
      where: { id: agentId },
      include: { stack: true },
    });
    if (!agent?.stack?.adminPort) throw new NotFoundException('Stack no disponible');

    const attrs = flow.requestedAttributes as any as RequestedAttribute[];

    const { data } = await axios.post(
      `http://localhost:${agent.stack.adminPort}/v1/invitation/presentation-request`,
      {
        connectionId,
        requestedAttributes: attrs.map((a) => ({
          name: a.name,
          restrictions: a.restrictions || [{ cred_def_id: flow.credDefId }],
        })),
      },
    );

    this.logger.log(`Presentation request sent to connection ${connectionId}`);
    return { requestId: data.requestId || uuidv4(), status: 'pending' };
  }

  // ── Webhook callback del vs-agent ─────────────────────────────────────
  // Recibe el resultado cuando Hologram presenta la credencial

  async handleVerificationCallback(
    agentId: string,
    payload: VerificationCallbackPayload,
  ) {
    this.logger.log(
      `Verification callback for agent ${agentId}: verified=${payload.verified} connection=${payload.connectionId}`,
    );

    // Buscar el flujo activo para este agente
    const flow = await this.prisma.verificationFlow.findFirst({
      where: { agentId, active: true },
    });

    if (!flow) {
      this.logger.warn(`No active verification flow for agent ${agentId}`);
      return { action: 'continue' };
    }

    if (!payload.verified) {
      this.logger.warn(`Verification failed for connection ${payload.connectionId}`);
      return {
        action: flow.postAction,
        message: flow.postAction === 'custom_response'
          ? (flow as any).customResponse || 'No se pudo verificar tu identidad.'
          : 'Verificación fallida.',
      };
    }

    // Verificación exitosa — registrar en DB
    await this.prisma.agentCredential.create({
      data: {
        id: uuidv4(),
        agentId,
        type: 'ORGANIZATION',
        status: 'ACTIVE',
        issuedAt: new Date(),
        raw: {
          type: 'verification',
          connectionId: payload.connectionId,
          credDefId: flow.credDefId,
          attributes: payload.attributes,
          verified: true,
        } as any,
      },
    });

    // Notificar al callback externo si está configurado
    if (flow.callbackUrl) {
      axios.post(flow.callbackUrl, payload).catch((err) => {
        this.logger.warn(`Callback notification failed: ${err.message}`);
      });
    }

    return { action: flow.postAction, attributes: payload.attributes };
  }
}
