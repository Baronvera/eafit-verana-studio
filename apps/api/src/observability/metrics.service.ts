import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  Registry,
  collectDefaultMetrics,
  Counter,
  Histogram,
  Gauge,
} from 'prom-client';

@Injectable()
export class MetricsService implements OnModuleInit {
  readonly registry = new Registry();

  // ── Per-agent counters ────────────────────────────────────────────────────

  readonly conversationTotal = new Counter({
    name: 'vas_conversations_total',
    help: 'Total number of conversations per agent',
    labelNames: ['agentId', 'agentName'],
    registers: [this.registry],
  });

  readonly tokensUsedTotal = new Counter({
    name: 'vas_tokens_used_total',
    help: 'Total LLM tokens consumed per agent',
    labelNames: ['agentId', 'agentName', 'provider'],
    registers: [this.registry],
  });

  readonly errorTotal = new Counter({
    name: 'vas_errors_total',
    help: 'Total errors per agent and type',
    labelNames: ['agentId', 'type'],
    registers: [this.registry],
  });

  readonly credentialsIssuedTotal = new Counter({
    name: 'vas_credentials_issued_total',
    help: 'Total AnonCreds credentials issued per agent',
    labelNames: ['agentId'],
    registers: [this.registry],
  });

  readonly verificationsTotal = new Counter({
    name: 'vas_verifications_total',
    help: 'Total credential verifications per agent',
    labelNames: ['agentId', 'result'],
    registers: [this.registry],
  });

  readonly mcpToolCallsTotal = new Counter({
    name: 'vas_mcp_tool_calls_total',
    help: 'Total MCP tool invocations per agent and tool',
    labelNames: ['agentId', 'toolName', 'status'],
    registers: [this.registry],
  });

  // ── Response latency ──────────────────────────────────────────────────────

  readonly responseLatency = new Histogram({
    name: 'vas_response_latency_seconds',
    help: 'LLM response latency per agent',
    labelNames: ['agentId'],
    buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
    registers: [this.registry],
  });

  readonly httpLatency = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request duration',
    labelNames: ['method', 'route', 'status'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 5],
    registers: [this.registry],
  });

  // ── Gauges ────────────────────────────────────────────────────────────────

  readonly agentsRunning = new Gauge({
    name: 'vas_agents_running',
    help: 'Number of agents currently in RUNNING status',
    registers: [this.registry],
  });

  readonly agentsStopped = new Gauge({
    name: 'vas_agents_stopped',
    help: 'Number of agents currently in STOPPED or ERROR status',
    registers: [this.registry],
  });

  onModuleInit() {
    collectDefaultMetrics({ register: this.registry });
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  getContentType(): string {
    return this.registry.contentType;
  }

  // ── Convenience helpers ───────────────────────────────────────────────────

  recordConversation(agentId: string, agentName: string, tokensUsed: number, provider: string, latencySeconds: number) {
    this.conversationTotal.inc({ agentId, agentName });
    this.tokensUsedTotal.inc({ agentId, agentName, provider }, tokensUsed);
    this.responseLatency.observe({ agentId }, latencySeconds);
  }

  recordError(agentId: string, type: string) {
    this.errorTotal.inc({ agentId, type });
  }

  recordMcpCall(agentId: string, toolName: string, success: boolean) {
    this.mcpToolCallsTotal.inc({ agentId, toolName, status: success ? 'success' : 'error' });
  }

  recordVerification(agentId: string, verified: boolean) {
    this.verificationsTotal.inc({ agentId, result: verified ? 'success' : 'failure' });
  }

  recordCredentialIssued(agentId: string) {
    this.credentialsIssuedTotal.inc({ agentId });
  }

  updateAgentGauges(running: number, stopped: number) {
    this.agentsRunning.set(running);
    this.agentsStopped.set(stopped);
  }
}
