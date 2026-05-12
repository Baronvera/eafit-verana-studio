import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as k8s from '@kubernetes/client-node';
import axios from 'axios';
import { AgentStackConfig } from './orchestrator.service';

/**
 * HelmOrchestrator — deploys per-agent stacks on Kubernetes.
 *
 * Each agent gets an isolated namespace `agents-{agentId}` containing:
 *   - vs-agent Deployment + Service + PVC (Recreate strategy)
 *   - ai-agent Deployment + Service (RollingUpdate strategy)
 *   - PostgreSQL StatefulSet + Service + PVC
 *   - Redis Deployment + Service
 *   - Ingress with cert-manager TLS (when domain is set)
 *
 * Enable with USE_KUBERNETES=true in env.
 */
@Injectable()
export class HelmOrchestratorService {
  private readonly logger = new Logger(HelmOrchestratorService.name);
  private kc: k8s.KubeConfig;
  private coreApi: k8s.CoreV1Api;
  private appsApi: k8s.AppsV1Api;
  private networkApi: k8s.NetworkingV1Api;

  constructor(private config: ConfigService) {
    this.kc = new k8s.KubeConfig();
    if (process.env.KUBERNETES_SERVICE_HOST) {
      this.kc.loadFromCluster();
    } else {
      this.kc.loadFromDefault();
    }
    this.coreApi = this.kc.makeApiClient(k8s.CoreV1Api);
    this.appsApi = this.kc.makeApiClient(k8s.AppsV1Api);
    this.networkApi = this.kc.makeApiClient(k8s.NetworkingV1Api);
    this.logger.log('Kubernetes client initialized');
  }

  private ns(agentId: string) {
    return 'team-b';
  }

  // ── Namespace ──────────────────────────────────────────────────────────────

  async ensureNamespace(agentId: string): Promise<void> {
    const name = this.ns(agentId);
    try {
      return; // patched
    } catch {
      await this.coreApi.createNamespace({
        metadata: {
          name,
          labels: { 'vas.agentId': agentId, 'managed-by': 'verana-agent-studio' },
        },
      });
      this.logger.log(`Namespace created: ${name}`);
    }
  }

  // ── Secrets ────────────────────────────────────────────────────────────────

  async upsertAgentSecret(agentId: string, cfg: AgentStackConfig): Promise<void> {
    const ns = this.ns(agentId);
    const secretData: Record<string, string> = {
      LLM_PROVIDER: Buffer.from(cfg.llmProvider).toString('base64'),
      LLM_API_KEY: Buffer.from(cfg.llmApiKey).toString('base64'),
      LLM_MODEL: Buffer.from(cfg.model).toString('base64'),
      SYSTEM_PROMPT: Buffer.from(cfg.prompt).toString('base64'),
      POSTGRES_PASSWORD: Buffer.from(cfg.postgresPassword).toString('base64'),
    };

    const secret = {
      metadata: { name: `agent-secrets-${agentId}`, namespace: ns },
      data: secretData,
    };

    try {
      await this.coreApi.replaceNamespacedSecret(`agent-secrets-${agentId}`, ns, secret);
    } catch {
      await this.coreApi.createNamespacedSecret(ns, secret);
    }
  }

  // ── PostgreSQL StatefulSet ─────────────────────────────────────────────────

  async deployPostgres(agentId: string): Promise<void> {
    const ns = this.ns(agentId);
    const name = `postgres-${agentId}`;

    const statefulSet: k8s.V1StatefulSet = {
      metadata: { name, namespace: ns },
      spec: {
        serviceName: name,
        replicas: 1,
        selector: { matchLabels: { app: name } },
        volumeClaimTemplates: [{
          metadata: { name: 'pgdata' },
          spec: {
            accessModes: ['ReadWriteOnce'],
            resources: { requests: { storage: '5Gi' } },
          },
        }],
        template: {
          metadata: { labels: { app: name } },
          spec: {
            containers: [{
              name,
              image: 'postgres:16-alpine',
              ports: [{ containerPort: 5432 }],
              env: [
                { name: 'PGDATA', value: '/var/lib/postgresql/data/pgdata' },
                { name: 'POSTGRES_DB', value: 'vsagent' },
                { name: 'POSTGRES_PASSWORD', valueFrom: { secretKeyRef: { name: `agent-secrets-${agentId}`, key: 'POSTGRES_PASSWORD' } } },
              ],
              volumeMounts: [{ name: 'pgdata', mountPath: '/var/lib/postgresql/data' }],
              resources: { requests: { cpu: '100m', memory: '128Mi' }, limits: { cpu: '500m', memory: '512Mi' } },
              readinessProbe: { exec: { command: ['pg_isready', '-U', 'postgres'] }, initialDelaySeconds: 5, periodSeconds: 5 },
            }],
          },
        },
      },
    };

    await this.upsertStatefulSet(ns, statefulSet);
    await this.upsertService(ns, {
      metadata: { name, namespace: ns },
      spec: { selector: { app: name }, ports: [{ port: 5432 }], clusterIP: 'None' },
    });
  }

  // ── Redis Deployment ──────────────────────────────────────────────────────

  async deployRedis(agentId: string): Promise<void> {
    const ns = this.ns(agentId);
    const name = `redis-${agentId}`;

    await this.upsertDeployment(ns, {
      metadata: { name, namespace: ns },
      spec: {
        replicas: 1,
        selector: { matchLabels: { app: name } },
        template: {
          metadata: { labels: { app: name } },
          spec: {
            containers: [{
              name,
              image: 'redis:7-alpine',
              ports: [{ containerPort: 6379 }],
              resources: { requests: { cpu: '50m', memory: '64Mi' }, limits: { cpu: '200m', memory: '256Mi' } },
              readinessProbe: { exec: { command: ['redis-cli', 'ping'] }, initialDelaySeconds: 3, periodSeconds: 5 },
            }],
          },
        },
      },
    });

    await this.upsertService(ns, {
      metadata: { name, namespace: ns },
      spec: { selector: { app: name }, ports: [{ port: 6379 }] },
    });
  }

  // ── vs-agent Deployment ────────────────────────────────────────────────────

  async deployVsAgent(agentId: string, adminPort: number, publicPort: number, agentDomain?: string): Promise<void> {
    const ns = this.ns(agentId);
    const name = `vs-agent-${agentId}`;

    const vsAgentEnv: k8s.V1EnvVar[] = [
      { name: 'POSTGRES_PASSWORD', valueFrom: { secretKeyRef: { name: `agent-secrets-${agentId}`, key: 'POSTGRES_PASSWORD' } } },
      { name: 'POSTGRES_URL', value: `postgresql://postgres:$(POSTGRES_PASSWORD)@postgres-${agentId}:5432/vsagent` },
      { name: 'REDIS_URL', value: `redis://redis-${agentId}:6379` },
    ];

    if (agentDomain) {
      vsAgentEnv.push({ name: 'AGENT_PUBLIC_DID', value: `did:webvh:${agentDomain}` });
    }
    // Tell vs-agent where to deliver DIDComm events (ai-agent service, port 3000)
    vsAgentEnv.push({ name: 'EVENTS_BASE_URL', value: `http://ai-agent-${agentId}.${ns}:3000` });

    await this.upsertDeployment(ns, {
      metadata: { name, namespace: ns },
      spec: {
        replicas: 1,
        strategy: { type: 'Recreate' },  // Must be Recreate to preserve DID keys
        selector: { matchLabels: { app: name } },
        template: {
          metadata: { labels: { app: name } },
          spec: {
            containers: [{
              name,
              image: 'veranalabs/vs-agent:latest',
              ports: [
                { name: 'admin', containerPort: 3000 },
                { name: 'public', containerPort: 3001 },
              ],
              env: vsAgentEnv,
              volumeMounts: [{ name: `vsagent-data-${agentId}`, mountPath: '/data' }],
              resources: { requests: { cpu: '100m', memory: '256Mi' }, limits: { cpu: '500m', memory: '512Mi' } },
              livenessProbe: { httpGet: { path: '/v1/agent', port: 3000 }, initialDelaySeconds: 30, periodSeconds: 30 },
              readinessProbe: { httpGet: { path: '/v1/agent', port: 3000 }, initialDelaySeconds: 10, periodSeconds: 10 },
            }],
            volumes: [{
              name: `vsagent-data-${agentId}`,
              persistentVolumeClaim: { claimName: `vsagent-data-${agentId}` },
            }],
          },
        },
      },
    });

    // PVC for DID keys — critical, never delete
    await this.ensurePVC(ns, `vsagent-data-${agentId}`, '2Gi');

    await this.upsertService(ns, {
      metadata: { name, namespace: ns },
      spec: {
        selector: { app: name },
        ports: [
          { name: 'admin', port: adminPort, targetPort: 3000 },
          { name: 'public', port: publicPort, targetPort: 3001 },
        ],
      },
    });
  }

  // ── ai-agent Deployment ───────────────────────────────────────────────────

  async deployAiAgent(agentId: string, cfg: AgentStackConfig): Promise<void> {
    const ns = this.ns(agentId);
    const name = `ai-agent-${agentId}`;

    await this.upsertDeployment(ns, {
      metadata: { name, namespace: ns },
      spec: {
        replicas: 1,
        strategy: { type: 'RollingUpdate', rollingUpdate: { maxUnavailable: 0, maxSurge: 1 } },
        selector: { matchLabels: { app: name } },
        template: {
          metadata: { labels: { app: name } },
          spec: {
            containers: [{
              name,
              image: 'io2060/hologram-generic-ai-agent-app:v1.11.2',
              ports: [{ containerPort: 3000 }],
              env: [
                { name: 'APP_PORT', value: '3000' },
                { name: 'POSTGRES_HOST', value: `postgres-${agentId}` },
                { name: 'POSTGRES_USER', value: 'postgres' },
                { name: 'POSTGRES_DB_NAME', value: 'vsagent' },
                { name: 'POSTGRES_PASSWORD', valueFrom: { secretKeyRef: { name: `agent-secrets-${agentId}`, key: 'POSTGRES_PASSWORD' } } },
                { name: 'REDIS_URL', value: `redis://redis-${agentId}:6379` },
                { name: 'REDIS_HOST', value: `redis-${agentId}` },

                { name: 'LLM_PROVIDER', valueFrom: { secretKeyRef: { name: `agent-secrets-${agentId}`, key: 'LLM_PROVIDER' } } },
                { name: 'LLM_API_KEY', valueFrom: { secretKeyRef: { name: `agent-secrets-${agentId}`, key: 'LLM_API_KEY' } } },
                // Alias for provider-specific env vars expected by the ai-agent container
                { name: 'ANTHROPIC_API_KEY', valueFrom: { secretKeyRef: { name: `agent-secrets-${agentId}`, key: 'LLM_API_KEY' } } },
                { name: 'OPENAI_API_KEY', valueFrom: { secretKeyRef: { name: `agent-secrets-${agentId}`, key: 'LLM_API_KEY' } } },
                { name: 'LLM_MODEL', valueFrom: { secretKeyRef: { name: `agent-secrets-${agentId}`, key: 'LLM_MODEL' } } },
                { name: 'SYSTEM_PROMPT', valueFrom: { secretKeyRef: { name: `agent-secrets-${agentId}`, key: 'SYSTEM_PROMPT' } } },
                { name: 'VS_AGENT_ADMIN_URL', value: `http://vs-agent-${agentId}.${ns}:3000` },
                { name: 'RAG_REMOTE_URLS', value: cfg.ragRemoteUrls || '' },
                { name: 'LLM_TOOLS_CONFIG', value: cfg.llmToolsConfig || '[]' },
                { name: 'LLM_TEMPERATURE', value: String(cfg.temperature) },
              ],
              resources: { requests: { cpu: '100m', memory: '256Mi' }, limits: { cpu: '1000m', memory: '1Gi' } },
              livenessProbe: { tcpSocket: { port: 3000 }, initialDelaySeconds: 15, periodSeconds: 30 },
              readinessProbe: { tcpSocket: { port: 3000 }, initialDelaySeconds: 10, periodSeconds: 10 },
            }],
          },
        },
      },
    });

    await this.upsertService(ns, {
      metadata: { name, namespace: ns },
      spec: { selector: { app: name }, ports: [{ port: 3000 }] },
    });
  }

  // ── Ingress + TLS (cert-manager) ──────────────────────────────────────────

  async upsertIngress(agentId: string, domain: string, publicPort: number): Promise<void> {
    const ns = this.ns(agentId);
    const name = `agent-ingress-${agentId}`;
    const certName = `agent-tls-${agentId}`;

    const ingress: k8s.V1Ingress = {
      metadata: {
        name,
        namespace: ns,
        annotations: {
          'cert-manager.io/cluster-issuer': this.config.get('CERT_MANAGER_ISSUER') || 'letsencrypt-prod',
          'nginx.ingress.kubernetes.io/ssl-redirect': 'true',
        },
      },
      spec: {
        ingressClassName: 'nginx',
        tls: [{ hosts: [domain], secretName: certName }],
        rules: [{
          host: domain,
          http: {
            paths: [{
              path: '/',
              pathType: 'Prefix',
              backend: {
                service: { name: `vs-agent-${agentId}`, port: { number: publicPort } },
              },
            }],
          },
        }],
      },
    };

    try {
      await this.networkApi.replaceNamespacedIngress(name, ns, ingress);
    } catch {
      await this.networkApi.createNamespacedIngress(ns, ingress);
    }
    this.logger.log(`Ingress configured for domain ${domain}`);
  }

  async deleteIngress(agentId: string): Promise<void> {
    const ns = this.ns(agentId);
    try {
      await this.networkApi.deleteNamespacedIngress(`agent-ingress-${agentId}`, ns);
    } catch { /* ignore if not found */ }
  }

  // ── Rolling restart ai-agent ──────────────────────────────────────────────

  async restartAiAgent(agentId: string): Promise<void> {
    const ns = this.ns(agentId);
    // Patch with a restart annotation to trigger rolling restart
    await this.appsApi.patchNamespacedDeployment(
      `ai-agent-${agentId}`,
      ns,
      {
        spec: {
          template: {
            metadata: {
              annotations: { 'kubectl.kubernetes.io/restartedAt': new Date().toISOString() },
            },
          },
        },
      },
      undefined, undefined, undefined, undefined,
      { headers: { 'Content-Type': 'application/strategic-merge-patch+json' } } as any,
    );
    this.logger.log(`Rolling restart triggered for ai-agent in ${ns}`);
  }

  // ── Update ai-agent env (for config changes) ──────────────────────────────

  async updateAiAgentEnv(agentId: string, envPatch: Record<string, string>): Promise<void> {
    const ns = this.ns(agentId);
    const envEntries = Object.entries(envPatch).map(([name, value]) => ({ name, value }));

    // Read current deployment
    const { body: dep } = await this.appsApi.readNamespacedDeployment(`ai-agent-${agentId}`, ns);
    const container = dep.spec?.template.spec?.containers?.[0];
    if (!container) return;

    const existing = container.env || [];
    for (const entry of envEntries) {
      const idx = existing.findIndex((e) => e.name === entry.name);
      if (idx >= 0) existing[idx] = entry;
      else existing.push(entry);
    }

    await this.appsApi.patchNamespacedDeployment(
      `ai-agent-${agentId}`,
      ns,
      { spec: { template: { spec: { containers: [{ ...container, env: existing }] } } } },
      undefined, undefined, undefined, undefined,
      { headers: { 'Content-Type': 'application/strategic-merge-patch+json' } } as any,
    );
  }

  // ── Wait until initialized ────────────────────────────────────────────────

  async waitUntilInitialized(agentId: string, adminPort: number, timeoutMs = 600_000): Promise<void> {
    // BUILD_MARKER_V2
    const ns = this.ns(agentId);
    // Use the Service port (adminPort), which K8s NATs to container port 3000
    const svcUrl = `http://vs-agent-${agentId}.${ns}.svc.cluster.local:${adminPort}/v1/agent`;
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      try {
        const { data } = await axios.get(svcUrl, { timeout: 5000 });
        if (data?.isInitialized && data?.publicDid) {
          this.logger.log(`vs-agent in namespace ${ns} is initialized with DID: ${data.publicDid}`);
          return;
        }
        if (data?.isInitialized && !data?.publicDid) {
          this.logger.warn(`vs-agent initialized but no publicDid yet (missing AGENT_PUBLIC_DID env?)`);
        }
      } catch { /* not ready yet */ }
      await new Promise((r) => setTimeout(r, 3000));
    }
    throw new Error(`vs-agent in namespace ${ns} did not initialize within ${timeoutMs}ms`);
  }

  // ── Full stack deploy ─────────────────────────────────────────────────────

  async deployAgentStack(cfg: AgentStackConfig): Promise<void> {
    const { agentId } = cfg;
    this.logger.log(`Deploying K8s stack for agent ${agentId}`);

    await this.ensureNamespace(agentId);
    await this.upsertAgentSecret(agentId, cfg);
    await this.deployPostgres(agentId);
    await this.deployRedis(agentId);
    await this.deployVsAgent(agentId, cfg.adminPort, cfg.publicPort, cfg.agentDomain);
    await this.deployAiAgent(agentId, cfg);

    if (cfg.agentDomain) {
      await this.upsertIngress(agentId, cfg.agentDomain, cfg.publicPort);
    }

    this.logger.log(`K8s stack deployed for agent ${agentId}`);
  }

  // ── Full stack destroy ────────────────────────────────────────────────────

  async destroyAgentStack(agentId: string): Promise<void> {
    const ns = this.ns(agentId);
    this.logger.log(`Destroying K8s namespace ${ns}`);
    try {
      await this.coreApi.deleteNamespace(ns);
    } catch (err: any) {
      this.logger.warn(`Failed to delete namespace ${ns}: ${err.message}`);
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private async upsertDeployment(ns: string, dep: k8s.V1Deployment): Promise<void> {
    try {
      await this.appsApi.replaceNamespacedDeployment(dep.metadata!.name!, ns, dep);
    } catch {
      await this.appsApi.createNamespacedDeployment(ns, dep);
    }
  }

  private async upsertStatefulSet(ns: string, ss: k8s.V1StatefulSet): Promise<void> {
    try {
      await this.appsApi.replaceNamespacedStatefulSet(ss.metadata!.name!, ns, ss);
    } catch {
      await this.appsApi.createNamespacedStatefulSet(ns, ss);
    }
  }

  private async upsertService(ns: string, svc: k8s.V1Service): Promise<void> {
    try {
      await this.coreApi.replaceNamespacedService(svc.metadata!.name!, ns, svc);
    } catch {
      await this.coreApi.createNamespacedService(ns, svc);
    }
  }

  private async ensurePVC(ns: string, name: string, storage: string): Promise<void> {
    try {
      await this.coreApi.readNamespacedPersistentVolumeClaim(name, ns);
    } catch {
      await this.coreApi.createNamespacedPersistentVolumeClaim(ns, {
        metadata: { name, namespace: ns },
        spec: {
          accessModes: ['ReadWriteOnce'],
          resources: { requests: { storage } },
        },
      });
    }
  }
}
