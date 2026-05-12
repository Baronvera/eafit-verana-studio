import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

export interface AttributeDef {
  name: string;
  type: 'text' | 'date' | 'number' | 'image';
}

export interface CreateCredTypeDto {
  name: string;
  version?: string;
  attributes: AttributeDef[];
}

@Injectable()
export class CredentialsService {
  private readonly logger = new Logger(CredentialsService.name);

  constructor(private prisma: PrismaService) {}

  // ── Credential Type Designer ───────────────────────────────────────────

  async createCredentialType(userId: string, agentId: string, dto: CreateCredTypeDto) {
    const agent = await this.assertAgentOwner(userId, agentId);
    const adminPort = agent.stack?.adminPort;

    if (!adminPort) throw new NotFoundException('El agente no tiene stack activo');

    // Registrar el tipo de credencial en el vs-agent
    let credDefId: string | undefined;
    let vtjscId: string | undefined;

    try {
      const { data } = await axios.post(
        `http://localhost:${adminPort}/v1/credential-types`,
        {
          name: dto.name,
          version: dto.version || '1.0',
          attributes: dto.attributes.map((a) => a.name),
        },
        { timeout: 30_000 },
      );
      credDefId = data.credDefId;
      vtjscId = data.vtjscId;
      this.logger.log(`Credential type registered on-chain: ${credDefId}`);
    } catch (err: any) {
      this.logger.warn(`vs-agent credential-types call failed: ${err.message} — storing without credDefId`);
    }

    return this.prisma.credentialType.create({
      data: {
        id: uuidv4(),
        agentId,
        name: dto.name,
        version: dto.version || '1.0',
        attributes: dto.attributes as any,
        credDefId,
        vtjscId,
      },
    });
  }

  async listCredentialTypes(userId: string, agentId: string) {
    await this.assertAgentOwner(userId, agentId);
    return this.prisma.credentialType.findMany({
      where: { agentId },
      include: { _count: { select: { issuanceFlows: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteCredentialType(userId: string, agentId: string, typeId: string) {
    await this.assertAgentOwner(userId, agentId);
    await this.prisma.credentialType.delete({ where: { id: typeId } });
    return { deleted: true };
  }

  // ── Credenciales emitidas (registro) ──────────────────────────────────

  async listIssuedCredentials(userId: string, agentId: string) {
    await this.assertAgentOwner(userId, agentId);
    return this.prisma.agentCredential.findMany({
      where: { agentId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revokeCredential(userId: string, agentId: string, credId: string) {
    await this.assertAgentOwner(userId, agentId);

    const cred = await this.prisma.agentCredential.findFirst({
      where: { id: credId, agentId },
    });
    if (!cred) throw new NotFoundException('Credencial no encontrada');

    const agent = await this.prisma.agent.findUnique({
      where: { id: agentId },
      include: { stack: true },
    });

    // Intentar revocar en vs-agent
    if (agent?.stack?.adminPort && cred.raw) {
      try {
        const raw = cred.raw as Record<string, unknown>;
        await axios.post(
          `http://localhost:${agent.stack.adminPort}/v1/vt/revoke-credential`,
          { credentialId: raw.credentialId || credId },
        );
      } catch (err: any) {
        this.logger.warn(`Revocation call failed: ${err.message}`);
      }
    }

    return this.prisma.agentCredential.update({
      where: { id: credId },
      data: { status: 'REVOKED' },
    });
  }

  async revokeByType(userId: string, agentId: string, credDefId: string) {
    await this.assertAgentOwner(userId, agentId);

    const creds = await this.prisma.agentCredential.findMany({
      where: { agentId, status: 'ACTIVE' },
    });

    // Revocar todas las que coincidan con el credDefId en el raw JSON
    const toRevoke = creds.filter((c) => {
      const raw = c.raw as Record<string, unknown> | null;
      return raw?.credDefId === credDefId;
    });

    await this.prisma.agentCredential.updateMany({
      where: { id: { in: toRevoke.map((c) => c.id) } },
      data: { status: 'REVOKED' },
    });

    return { revoked: toRevoke.length };
  }

  // ── Stats ─────────────────────────────────────────────────────────────

  async getStats(userId: string, agentId: string) {
    await this.assertAgentOwner(userId, agentId);

    const [totalIssued, active, revoked, types] = await Promise.all([
      this.prisma.agentCredential.count({ where: { agentId } }),
      this.prisma.agentCredential.count({ where: { agentId, status: 'ACTIVE' } }),
      this.prisma.agentCredential.count({ where: { agentId, status: 'REVOKED' } }),
      this.prisma.credentialType.count({ where: { agentId } }),
    ]);

    return { totalIssued, active, revoked, types };
  }

  // ── Helper ─────────────────────────────────────────────────────────────

  async assertAgentOwner(userId: string, agentId: string) {
    const agent = await this.prisma.agent.findUnique({
      where: { id: agentId },
      include: {
        org: { select: { userId: true } },
        stack: { select: { adminPort: true } },
      },
    });
    if (!agent) throw new NotFoundException('Agente no encontrado');
    if (agent.org.userId !== userId) throw new ForbiddenException();
    return agent;
  }
}
