import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MetricsService } from '../observability/metrics.service';
import { BillingService } from '../billing/billing.service';
import { createHash } from 'crypto';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    private prisma: PrismaService,
    private metrics: MetricsService,
    private billing: BillingService,
  ) {}

  // ── Log conversation turn (called by agent webhook) ──────────────────────

  async logTurn(
    agentId: string,
    connectionId: string,
    role: 'user' | 'agent',
    content: string,
    tokensUsed: number = 0,
    citedDocIds?: string[],
  ) {
    const connectionHash = createHash('sha256').update(connectionId).digest('hex').slice(0, 16);

    await this.prisma.conversationLog.create({
      data: {
        agentId,
        connectionHash,
        role,
        content,
        tokensUsed,
        citedDocIds: citedDocIds ?? [],
      },
    });

    if (role === 'agent') {
      await this.billing.recordConversation(agentId, tokensUsed);
    }
  }

  // ── Record satisfaction score (thumbs up/down from Hologram) ─────────────

  async recordSatisfaction(agentId: string, connectionId: string, score: 1 | -1) {
    const connectionHash = createHash('sha256').update(connectionId).digest('hex').slice(0, 16);

    // Find most recent agent turn for this connection
    const log = await this.prisma.conversationLog.findFirst({
      where: { agentId, connectionHash, role: 'agent' },
      orderBy: { createdAt: 'desc' },
    });

    if (log) {
      await this.prisma.conversationLog.update({
        where: { id: log.id },
        data: { satisfactionScore: score },
      });
    }

    return { recorded: true };
  }

  // ── Dashboard data ────────────────────────────────────────────────────────

  async getDashboard(agentId: string, days: number = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [
      dailyMessages,
      totalMessages,
      satisfactionCounts,
      topDocs,
      hourlyDistribution,
      sessionDuration,
    ] = await Promise.all([
      this.getDailyMessageCounts(agentId, since),
      this.prisma.conversationLog.count({ where: { agentId, createdAt: { gte: since } } }),
      this.getSatisfactionStats(agentId, since),
      this.getTopCitedDocs(agentId, since),
      this.getHourlyDistribution(agentId, since),
      this.getAvgSessionDuration(agentId, since),
    ]);

    const month = new Date().toISOString().slice(0, 7);
    const usage = await this.prisma.usageRecord.findUnique({
      where: { agentId_month: { agentId, month } },
    });

    return {
      period: { days, since },
      totals: {
        messages: totalMessages,
        conversations: usage?.conversations ?? 0,
        tokensUsed: usage?.tokensUsed ?? 0,
      },
      dailyMessages,
      hourlyDistribution,
      avgSessionDurationMs: sessionDuration,
      satisfaction: satisfactionCounts,
      topCitedDocs: topDocs,
    };
  }

  private async getDailyMessageCounts(agentId: string, since: Date) {
    const logs = await this.prisma.conversationLog.findMany({
      where: { agentId, createdAt: { gte: since } },
      select: { createdAt: true, role: true },
      orderBy: { createdAt: 'asc' },
    });

    const dailyMap: Record<string, { user: number; agent: number }> = {};
    for (const log of logs) {
      const day = log.createdAt.toISOString().slice(0, 10);
      if (!dailyMap[day]) dailyMap[day] = { user: 0, agent: 0 };
      dailyMap[day][log.role as 'user' | 'agent']++;
    }

    return Object.entries(dailyMap).map(([date, counts]) => ({ date, ...counts }));
  }

  private async getSatisfactionStats(agentId: string, since: Date) {
    const [thumbsUp, thumbsDown, total] = await Promise.all([
      this.prisma.conversationLog.count({ where: { agentId, createdAt: { gte: since }, satisfactionScore: 1 } }),
      this.prisma.conversationLog.count({ where: { agentId, createdAt: { gte: since }, satisfactionScore: -1 } }),
      this.prisma.conversationLog.count({ where: { agentId, createdAt: { gte: since }, role: 'agent' } }),
    ]);

    const rated = thumbsUp + thumbsDown;
    return {
      thumbsUp,
      thumbsDown,
      total,
      rated,
      scorePercent: rated > 0 ? Math.round((thumbsUp / rated) * 100) : null,
    };
  }

  private async getTopCitedDocs(agentId: string, since: Date) {
    const logs = await this.prisma.conversationLog.findMany({
      where: { agentId, createdAt: { gte: since }, role: 'agent', citedDocIds: { not: [] } },
      select: { citedDocIds: true },
    });

    const countMap: Record<string, number> = {};
    for (const log of logs) {
      const docIds = log.citedDocIds as string[] | null ?? [];
      for (const docId of docIds) {
        countMap[docId] = (countMap[docId] ?? 0) + 1;
      }
    }

    const top = Object.entries(countMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);

    // Resolve document names
    const docIds = top.map(([id]) => id);
    const docs = await this.prisma.document.findMany({
      where: { id: { in: docIds } },
      select: { id: true, name: true },
    });

    return top.map(([docId, citations]) => ({
      docId,
      name: docs.find((d) => d.id === docId)?.name ?? 'Unknown',
      citations,
    }));
  }

  private async getHourlyDistribution(agentId: string, since: Date) {
    const logs = await this.prisma.conversationLog.findMany({
      where: { agentId, createdAt: { gte: since }, role: 'user' },
      select: { createdAt: true },
    });

    const hourMap: number[] = Array(24).fill(0);
    for (const log of logs) {
      hourMap[log.createdAt.getHours()]++;
    }

    return hourMap.map((count, hour) => ({ hour, count }));
  }

  private async getAvgSessionDuration(agentId: string, since: Date): Promise<number | null> {
    const logs = await this.prisma.conversationLog.findMany({
      where: { agentId, createdAt: { gte: since } },
      select: { connectionHash: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const sessions: Record<string, { first: Date; last: Date }> = {};
    for (const log of logs) {
      if (!sessions[log.connectionHash]) {
        sessions[log.connectionHash] = { first: log.createdAt, last: log.createdAt };
      } else {
        sessions[log.connectionHash].last = log.createdAt;
      }
    }

    const durations = Object.values(sessions)
      .map((s) => s.last.getTime() - s.first.getTime())
      .filter((d) => d > 0);

    if (durations.length === 0) return null;
    return Math.round(durations.reduce((s, d) => s + d, 0) / durations.length);
  }

  // ── CSV Export ────────────────────────────────────────────────────────────

  async exportCsv(agentId: string, days: number = 30): Promise<string> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const logs = await this.prisma.conversationLog.findMany({
      where: { agentId, createdAt: { gte: since } },
      orderBy: { createdAt: 'asc' },
      select: {
        connectionHash: true,
        role: true,
        createdAt: true,
        tokensUsed: true,
        satisfactionScore: true,
      },
    });

    const header = 'connectionHash,role,timestamp,tokensUsed,satisfactionScore\n';
    const rows = logs.map((l) =>
      `${l.connectionHash},${l.role},${l.createdAt.toISOString()},${l.tokensUsed},${l.satisfactionScore ?? ''}`
    ).join('\n');

    return header + rows;
  }

  // ── Intent clustering (basic keyword grouping) ─────────────────────────────

  async getTopIntents(agentId: string, days: number = 30, limit: number = 20) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const userMessages = await this.prisma.conversationLog.findMany({
      where: { agentId, createdAt: { gte: since }, role: 'user' },
      select: { content: true },
    });

    // Simple n-gram frequency clustering (no external embeddings required)
    const wordMap: Record<string, number> = {};
    const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'i', 'you', 'me', 'my', 'can', 'how', 'what', 'when', 'where', 'do', 'does', 'it', 'this', 'that', 'and', 'or', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'an', 'be', 'has', 'had', 'not', 'but', 'if', 'el', 'la', 'los', 'las', 'un', 'una', 'es', 'en', 'de', 'que', 'se', 'no', 'mi', 'si', 'su', 'por']);

    for (const msg of userMessages) {
      const words = msg.content
        .toLowerCase()
        .replace(/[^a-záéíóúüñ\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 3 && !stopWords.has(w));

      for (const word of words) {
        wordMap[word] = (wordMap[word] ?? 0) + 1;
      }
    }

    return Object.entries(wordMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([keyword, count]) => ({ keyword, count }));
  }
}
