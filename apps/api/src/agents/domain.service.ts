import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HelmOrchestratorService } from '../orchestrator/helm-orchestrator.service';
import { SchedulerRegistry } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import * as dns from 'dns/promises';

@Injectable()
export class DomainService {
  private readonly logger = new Logger(DomainService.name);

  constructor(
    private prisma: PrismaService,
    private helm: HelmOrchestratorService,
    private config: ConfigService,
    private schedulerRegistry: SchedulerRegistry,
  ) {}

  /**
   * Returns the CNAME target the user should point their domain at.
   * e.g. agents.verana.io  (the Ingress load balancer DNS)
   */
  get cnameTarget(): string {
    return this.config.get('INGRESS_CNAME_TARGET') || 'agents.verana.io';
  }

  // ── Set custom domain ─────────────────────────────────────────────────────

  async setDomain(userId: string, agentId: string, domain: string) {
    const agent = await this.prisma.agent.findFirst({
      where: { id: agentId, org: { userId } },
      include: { stack: true },
    });
    if (!agent) throw new NotFoundException('Agente no encontrado');

    // Check domain not already used by another agent
    const conflict = await this.prisma.agentStack.findFirst({
      where: { domain, agentId: { not: agentId } },
    });
    if (conflict) throw new ConflictException('Dominio ya en uso por otro agente');

    // Validate domain format
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain)) {
      throw new BadRequestException('Dominio inválido');
    }

    // Save domain in stack
    await this.prisma.agentStack.update({
      where: { agentId },
      data: { domain },
    });

    // Start DNS polling
    this.startDnsPolling(agentId, domain, agent.stack?.adminPort ?? 0, agent.stack?.publicPort ?? 0);

    return {
      domain,
      cnameTarget: this.cnameTarget,
      instructions: `Crea un registro CNAME: ${domain} → ${this.cnameTarget}`,
      status: 'verifying',
    };
  }

  async getDomainStatus(agentId: string) {
    const stack = await this.prisma.agentStack.findUnique({ where: { agentId } });
    if (!stack?.domain) return { domain: null, status: 'not_configured' };

    const verified = await this.checkDnsPropagated(stack.domain);
    return {
      domain: stack.domain,
      cnameTarget: this.cnameTarget,
      status: verified ? 'active' : 'verifying',
      instructions: `Crea un registro CNAME: ${stack.domain} → ${this.cnameTarget}`,
    };
  }

  async removeDomain(agentId: string) {
    const stack = await this.prisma.agentStack.findUnique({ where: { agentId } });
    if (!stack?.domain) return { removed: false };

    this.stopDnsPolling(agentId);

    if (process.env.USE_KUBERNETES === 'true') {
      await this.helm.deleteIngress(agentId);
    }

    await this.prisma.agentStack.update({
      where: { agentId },
      data: { domain: null },
    });

    return { removed: true };
  }

  // ── DNS polling ───────────────────────────────────────────────────────────

  private startDnsPolling(agentId: string, domain: string, adminPort: number, publicPort: number) {
    this.stopDnsPolling(agentId); // clear any existing interval

    const intervalName = `dns-${agentId}`;
    const interval = setInterval(async () => {
      const propagated = await this.checkDnsPropagated(domain);
      if (propagated) {
        this.logger.log(`DNS propagated for ${domain}, configuring Ingress`);
        this.stopDnsPolling(agentId);

        if (process.env.USE_KUBERNETES === 'true') {
          try {
            await this.helm.upsertIngress(agentId, domain, publicPort);
          } catch (err) {
            this.logger.error(`Failed to create Ingress for ${domain}: ${(err as any).message}`);
          }
        }
      }
    }, 5 * 60 * 1000); // every 5 minutes

    try {
      this.schedulerRegistry.addInterval(intervalName, interval);
    } catch {
      // interval already exists — replace
      this.schedulerRegistry.deleteInterval(intervalName);
      this.schedulerRegistry.addInterval(intervalName, interval);
    }
  }

  private stopDnsPolling(agentId: string) {
    const intervalName = `dns-${agentId}`;
    try {
      clearInterval(this.schedulerRegistry.getInterval(intervalName));
      this.schedulerRegistry.deleteInterval(intervalName);
    } catch { /* not polling */ }
  }

  private async checkDnsPropagated(domain: string): Promise<boolean> {
    try {
      const records = await dns.resolveCname(domain);
      return records.some((r) => r.includes(this.cnameTarget.split('.')[0]));
    } catch {
      return false;
    }
  }
}
