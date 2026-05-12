import { Injectable, Logger, BadRequestException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import Stripe from 'stripe';

export const PLANS = {
  free: {
    name: 'Free',
    maxAgents: 1,
    maxConversations: 100,
    maxStorageMb: 100,
    mcpEnabled: false,
    stripePriceId: null,
  },
  pro: {
    name: 'Pro',
    maxAgents: 5,
    maxConversations: 1000,
    maxStorageMb: 500,
    mcpEnabled: true,
    stripePriceId: process.env.STRIPE_PRICE_PRO || '',
  },
  enterprise: {
    name: 'Enterprise',
    maxAgents: -1,        // unlimited
    maxConversations: -1,
    maxStorageMb: -1,
    mcpEnabled: true,
    stripePriceId: process.env.STRIPE_PRICE_ENTERPRISE || '',
  },
} as const;

export type PlanName = keyof typeof PLANS;

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private stripe: Stripe;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {
    this.stripe = new Stripe(this.config.get('STRIPE_SECRET_KEY') || 'sk_test_placeholder', {
      apiVersion: '2024-04-10',
    });
  }

  // ── Plans ─────────────────────────────────────────────────────────────────

  getPlans() {
    return Object.entries(PLANS).map(([id, plan]) => ({ id, ...plan }));
  }

  async getUserPlan(userId: string): Promise<PlanName> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const status = user.subscriptionStatus as PlanName;
    return Object.keys(PLANS).includes(status) ? status : 'free';
  }

  getPlanConfig(plan: PlanName) {
    return PLANS[plan] ?? PLANS.free;
  }

  // ── Enforcement ───────────────────────────────────────────────────────────

  async assertCanCreateAgent(userId: string) {
    const plan = await this.getUserPlan(userId);
    const cfg = this.getPlanConfig(plan);
    if (cfg.maxAgents === -1) return; // unlimited

    // Count orgs where user is owner, then count agents
    const orgs = await this.prisma.orgMember.findMany({
      where: { userId, role: 'OWNER' },
      select: { orgId: true },
    });
    const orgIds = orgs.map((o) => o.orgId);
    const agentCount = await this.prisma.agent.count({ where: { orgId: { in: orgIds } } });

    if (agentCount >= cfg.maxAgents) {
      throw new ForbiddenException(
        `Tu plan ${plan} permite máximo ${cfg.maxAgents} agente(s). Actualiza tu suscripción.`,
      );
    }
  }

  async assertCanUseMcp(userId: string) {
    const plan = await this.getUserPlan(userId);
    if (!this.getPlanConfig(plan).mcpEnabled) {
      throw new ForbiddenException('Las integraciones MCP requieren plan Pro o Enterprise.');
    }
  }

  async checkConversationLimit(userId: string, agentId: string): Promise<boolean> {
    const plan = await this.getUserPlan(userId);
    const cfg = this.getPlanConfig(plan);
    if (cfg.maxConversations === -1) return true;

    const month = new Date().toISOString().slice(0, 7); // "2026-04"
    const usage = await this.prisma.usageRecord.findUnique({
      where: { agentId_month: { agentId, month } },
    });

    if ((usage?.conversations ?? 0) >= cfg.maxConversations) {
      return false;
    }
    return true;
  }

  async recordConversation(agentId: string, tokensUsed: number = 0) {
    const month = new Date().toISOString().slice(0, 7);
    await this.prisma.usageRecord.upsert({
      where: { agentId_month: { agentId, month } },
      create: { agentId, month, conversations: 1, tokensUsed },
      update: { conversations: { increment: 1 }, tokensUsed: { increment: tokensUsed } },
    });
  }

  async getUsage(userId: string) {
    const orgs = await this.prisma.orgMember.findMany({
      where: { userId },
      select: { orgId: true },
    });
    const orgIds = orgs.map((o) => o.orgId);
    const agents = await this.prisma.agent.findMany({
      where: { orgId: { in: orgIds } },
      select: { id: true, name: true },
    });

    const month = new Date().toISOString().slice(0, 7);
    const usage = await this.prisma.usageRecord.findMany({
      where: { agentId: { in: agents.map((a) => a.id) }, month },
    });

    const plan = await this.getUserPlan(userId);
    const cfg = this.getPlanConfig(plan);

    return {
      plan,
      limits: cfg,
      agents: agents.map((agent) => {
        const record = usage.find((u) => u.agentId === agent.id);
        return {
          agentId: agent.id,
          name: agent.name,
          conversations: record?.conversations ?? 0,
          tokensUsed: record?.tokensUsed ?? 0,
        };
      }),
      totals: {
        conversations: usage.reduce((s, u) => s + u.conversations, 0),
        tokensUsed: usage.reduce((s, u) => s + u.tokensUsed, 0),
        agentCount: agents.length,
      },
    };
  }

  // ── Stripe Checkout ───────────────────────────────────────────────────────

  async createCheckoutSession(userId: string, planName: PlanName, successUrl: string, cancelUrl: string) {
    if (planName === 'free') throw new BadRequestException('El plan Free no requiere pago');

    const plan = PLANS[planName];
    if (!plan.stripePriceId) throw new BadRequestException('Plan no disponible');

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

    // Ensure Stripe customer
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await this.stripe.customers.create({
        email: user.email,
        name: user.name ?? undefined,
        metadata: { userId },
      });
      customerId = customer.id;
      await this.prisma.user.update({
        where: { id: userId },
        data: { stripeCustomerId: customerId },
      });
    }

    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: plan.stripePriceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { userId, plan: planName },
    });

    return { url: session.url };
  }

  async createBillingPortalSession(userId: string, returnUrl: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.stripeCustomerId) throw new BadRequestException('No tienes suscripción activa');

    const session = await this.stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: returnUrl,
    });

    return { url: session.url };
  }

  // ── Stripe Webhooks ───────────────────────────────────────────────────────

  async handleWebhook(rawBody: Buffer, signature: string) {
    const webhookSecret = this.config.get('STRIPE_WEBHOOK_SECRET');
    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret!);
    } catch (err) {
      throw new BadRequestException(`Webhook inválido: ${(err as any).message}`);
    }

    this.logger.log(`Stripe webhook: ${event.type}`);

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        await this.handleSubscriptionChange(sub);
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        await this.handleSubscriptionCanceled(sub);
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await this.handlePaymentFailed(invoice);
        break;
      }
    }

    return { received: true };
  }

  private async handleSubscriptionChange(sub: Stripe.Subscription) {
    const customer = await this.stripe.customers.retrieve(sub.customer as string);
    if (customer.deleted) return;

    const userId = (customer as Stripe.Customer).metadata?.userId;
    if (!userId) return;

    const priceId = sub.items.data[0]?.price?.id;
    const plan = this.resolvePlanByPriceId(priceId);

    await this.prisma.user.update({
      where: { id: userId },
      data: { subscriptionStatus: plan, subscriptionId: sub.id },
    });
    this.logger.log(`User ${userId} subscription updated to ${plan}`);
  }

  private async handleSubscriptionCanceled(sub: Stripe.Subscription) {
    const customer = await this.stripe.customers.retrieve(sub.customer as string);
    if (customer.deleted) return;

    const userId = (customer as Stripe.Customer).metadata?.userId;
    if (!userId) return;

    await this.prisma.user.update({
      where: { id: userId },
      data: { subscriptionStatus: 'free', subscriptionId: null },
    });
    this.logger.log(`User ${userId} downgraded to free`);
  }

  private async handlePaymentFailed(invoice: Stripe.Invoice) {
    const customerId = invoice.customer as string;
    const customer = await this.stripe.customers.retrieve(customerId);
    if (customer.deleted) return;

    const userId = (customer as Stripe.Customer).metadata?.userId;
    this.logger.warn(`Payment failed for user ${userId}`);
    // Email notification handled by MailService via event
  }

  private resolvePlanByPriceId(priceId?: string): PlanName {
    if (!priceId) return 'free';
    if (priceId === PLANS.pro.stripePriceId) return 'pro';
    if (priceId === PLANS.enterprise.stripePriceId) return 'enterprise';
    return 'free';
  }
}
