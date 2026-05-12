import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { MetricsService } from './metrics.service';
import { MailService } from '../auth/mail.service';
import { BillingService } from '../billing/billing.service';

@Injectable()
export class AlertService {
  private readonly logger = new Logger(AlertService.name);

  // Track which agents we've already alerted for (reset each cron cycle)
  private readonly alertedAgents = new Set<string>();
  private readonly usageWarned = new Set<string>();

  constructor(
    private prisma: PrismaService,
    private metrics: MetricsService,
    private mail: MailService,
    private billing: BillingService,
  ) {}

  // ── Agent down alert (every 2 minutes) ────────────────────────────────────

  @Cron('*/2 * * * *')
  async checkAgentHealth() {
    const agents = await this.prisma.agent.findMany({
      where: { status: 'RUNNING' },
      include: { org: { include: { owner: true } } },
    });

    // Update gauge
    const runningCount = await this.prisma.agent.count({ where: { status: 'RUNNING' } });
    const stoppedCount = await this.prisma.agent.count({ where: { status: { in: ['STOPPED', 'ERROR'] } } });
    this.metrics.updateAgentGauges(runningCount, stoppedCount);

    for (const agent of agents) {
      const key = agent.id;

      // A real implementation would poll /health from vs-agent and ai-agent.
      // Here we track status changes via DB.
      if (agent.status !== 'RUNNING' && !this.alertedAgents.has(key)) {
        this.alertedAgents.add(key);
        this.logger.warn(`Agent ${agent.name} is down, alerting owner`);
        await this.mail.sendAgentDownAlert(
          agent.org.owner.email,
          agent.name,
          agent.id,
        );
        this.metrics.recordError(agent.id, 'agent_down');
      } else if (agent.status === 'RUNNING') {
        this.alertedAgents.delete(key);
      }
    }
  }

  // ── Usage warning at 80% (daily at 08:00) ─────────────────────────────────

  @Cron('0 8 * * *')
  async checkUsageWarnings() {
    const users = await this.prisma.user.findMany({
      where: { subscriptionStatus: { not: null } },
      include: {
        organizations: { include: { org: { include: { agents: { select: { id: true, name: true } } } } } },
      },
    });

    const month = new Date().toISOString().slice(0, 7);

    for (const user of users) {
      const plan = await this.billing.getUserPlan(user.id);
      const cfg = this.billing.getPlanConfig(plan);
      if (cfg.maxConversations === -1) continue; // unlimited

      const agentIds = user.organizations.flatMap((m) => m.org.agents.map((a) => a.id));
      if (agentIds.length === 0) continue;

      const usage = await this.prisma.usageRecord.findMany({
        where: { agentId: { in: agentIds }, month },
      });

      const totalConversations = usage.reduce((s, u) => s + u.conversations, 0);
      const pct = Math.round((totalConversations / cfg.maxConversations) * 100);

      if (pct >= 80 && !this.usageWarned.has(user.id)) {
        this.usageWarned.add(user.id);
        this.logger.warn(`User ${user.email} at ${pct}% usage`);
        await this.mail.sendUsageWarning(user.email, `${agentIds.length} agente(s)`, pct);
      }
    }
  }
}
