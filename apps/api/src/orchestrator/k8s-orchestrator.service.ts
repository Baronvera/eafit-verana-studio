import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { AgentStackConfig } from './orchestrator.service';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Readable } from 'stream';

const execAsync = promisify(exec);

@Injectable()
export class K8sOrchestratorService implements OnModuleInit {
  private readonly logger = new Logger(K8sOrchestratorService.name);
  private readonly namespace = process.env.K8S_NAMESPACE || 'team-b';
  private readonly kubeconfigPath = process.env.KUBECONFIG || path.resolve(process.cwd(), '../../team_b_kubeconfig.yaml');

  onModuleInit() {
    this.logger.log(`K8s Orchestrator initialized using namespace: ${this.namespace}`);
  }

  // En K8s todos los agentes usan los puertos estándar internamente.
  // Pero devolvemos los mismos para no romper la firma.
  async allocatePorts(basePort: number) {
    return {
      // In K8s mode, vs-agent always listens on fixed ports 3000 (admin) and 3001 (public).
      // Dynamic ports are not supported inside containers — the image has hardcoded ports.
      adminPort: 3000,
      publicPort: 3001,
      postgresPort: 5432,
      redisPort: 6379,
    };
  }

  async createAgentNetwork(agentId: string): Promise<string> {
    // En K8s la red es implícita (namespace/DNS). No hacemos nada aquí.
    return `k8s-network-${agentId}`;
  }

  // ── Fase 1 de Despliegue: Infraestructura (VS Agent, Postgres, Redis) ──
  
  async startPostgres(config: AgentStackConfig): Promise<string> {
    return `k8s-postgres-${config.agentId}`;
  }

  async startRedis(config: AgentStackConfig): Promise<string> {
    return `k8s-redis-${config.agentId}`;
  }

  async startVsAgent(config: AgentStackConfig): Promise<string> {
    // Aquí ejecutamos Helm install pero con el chatbot apagado (replicas=0),
    // porque aún no tenemos el DID (depende del provisioning).
    
    await this.runHelmUpgrade(config, 0);
    this.logger.log(`Helm chart deployed (Phase 1) for agent ${config.agentId}`);
    
    // IMPORTANTE: Si la API corre localmente, para que funcione el provisioning
    // que viene después, necesitaríamos hacer kubectl port-forward.
    // Si la API corre en el clúster, puede usar el DNS interno.
    // Asumimos que haremos port-forward temporal o la API correrá en el clúster.
    return `k8s-vsagent-${config.agentId}`;
  }

  async waitUntilInitialized(_adminPort: number, _timeoutMs = 120_000): Promise<void> {
    // Aquí idealmente esperaríamos a que los Pods estén Ready en K8s.
    // Por simplicidad en esta versión, hacemos un sleep.
    this.logger.log(`Waiting for K8s pods to be ready...`);
    await new Promise((r) => setTimeout(r, 15000));
  }

  // ── Fase 2 de Despliegue: AI Agent (con el DID inyectado) ──

  async startAiAgent(config: AgentStackConfig): Promise<string> {
    // Ejecutamos Helm de nuevo, esta vez encendiendo el chatbot (replicas=1)
    // y pasando el DID que ya fue generado por el Provisioning.
    await this.runHelmUpgrade(config, 1);
    this.logger.log(`Helm chart deployed (Phase 2 - AI Agent) for agent ${config.agentId}`);
    return `k8s-aiagent-${config.agentId}`;
  }

  async restartAiAgent(agentId: string): Promise<void> {
    // En Kubernetes, para reiniciar un deployment usamos rollout restart
    const cmd = `kubectl --kubeconfig ${this.kubeconfigPath} -n ${this.namespace} rollout restart deployment example-agent-chart-chatbot`;
    try {
      await execAsync(cmd);
      this.logger.log(`AI agent restarted in K8s: ${agentId}`);
    } catch (e: any) {
      this.logger.error(`Error restarting AI agent: ${e.message}`);
    }
  }

  async updateAiAgentEnv(agentId: string, _envVars: Record<string, string>): Promise<void> {
    // Requiere actualizar el helm chart o deployment. 
    await this.restartAiAgent(agentId);
  }

  async stopAgent(agentId: string): Promise<void> {
    // Podríamos escalar a 0
    const cmd = `kubectl --kubeconfig ${this.kubeconfigPath} -n ${this.namespace} scale deployment --all --replicas=0 -l vas.agentId=${agentId}`;
    try {
      await execAsync(cmd);
    } catch (e: any) {
      this.logger.warn(`Failed to stop agent ${agentId} in K8s: ${e.message}`);
    }
  }

  async destroyAgent(agentId: string): Promise<void> {
    const releaseName = `vas-${agentId}`;
    const cmd = `helm uninstall ${releaseName} -n ${this.namespace} --kubeconfig ${this.kubeconfigPath}`;
    try {
      await execAsync(cmd);
      this.logger.log(`Helm release destroyed: ${releaseName}`);
    } catch (e: any) {
      this.logger.warn(`Error destroying helm release: ${e.message}`);
    }
  }

  async getContainerLogs(_agentId: string, _role: 'vsagent' | 'aiagent' = 'aiagent'): Promise<NodeJS.ReadableStream> {
    // Retornamos un dummy stream por ahora, requeriría @kubernetes/client-node logs API
    const stream = new Readable({ read() {} });
    stream.push('K8s logs stream not fully implemented yet.\n');
    return stream as any;
  }

  // ── Helper para ejecutar Helm ──

  private async runHelmUpgrade(config: AgentStackConfig, chatbotReplicas: number) {
    const releaseName = `vas-${config.agentId}`;
    
    // Usamos el helm chart genérico
    const chartRef = 'oci://registry-1.docker.io/io2060/hologram-generic-ai-agent-chart';
    const chartVersion = 'v1.11.2';
    
    // Archivo de values dinámico
    const values = `
global:
  domain: eafit.testnet.verana.network
nameOverride: 'vas-${config.agentId}'

postgres:
  secret:
    POSTGRES_PASSWORD: '${config.postgresPassword}'
    POSTGRES_USER: 'agent'
    POSTGRES_DB: 'agent'

chatbot:
  replicas: ${chatbotReplicas}
  env:
    - name: LLM_PROVIDER
      value: '${config.llmProvider}'
    - name: OPENAI_API_KEY
      value: '${config.llmProvider === 'openai' ? config.llmApiKey : ''}'
    - name: ANTHROPIC_API_KEY
      value: '${config.llmProvider === 'anthropic' ? config.llmApiKey : ''}'
    - name: OPENAI_MODEL
      value: '${config.model}'
    - name: ANTHROPIC_MODEL
      value: '${config.model}'
    - name: AGENT_PROMPT
      value: '${config.prompt.replace(/\n/g, ' ')}'
    - name: LLM_TOOLS_CONFIG
      value: '${config.llmToolsConfig?.replace(/'/g, "''") || '[]'}'
    - name: AGENT_PUBLIC_DID
      value: '${config.did || ''}'
    - name: REDIS_URL
      value: 'redis://vas-${config.agentId}-redis.${this.namespace}:6379'
    - name: VS_AGENT_ADMIN_URL
      value: 'http://vas-${config.agentId}-vs-agent.${this.namespace}:3000'
    - name: POSTGRES_HOST
      value: 'vas-${config.agentId}-postgres.${this.namespace}'
    - name: POSTGRES_USER
      value: 'agent'
    - name: POSTGRES_PASSWORD
      value: '${config.postgresPassword}'
    - name: POSTGRES_DB
      value: 'agent'
  agentPack:
    enabled: false

vs-agent-chart:
  enabled: true
  name: vas-${config.agentId}
  eventsBaseUrl: http://vas-${config.agentId}-chatbot:3003
  ingress:
    host: "agent-${config.agentId}.eafit.testnet.verana.network"
`;

    const valuesFile = path.resolve(process.cwd(), `helm-values-${config.agentId}.yaml`);
    await fs.writeFile(valuesFile, values);

    const cmd = `helm upgrade --install ${releaseName} ${chartRef} --version ${chartVersion} -f ${valuesFile} -n ${this.namespace} --kubeconfig ${this.kubeconfigPath}`;
    
    try {
      const { stdout, stderr } = await execAsync(cmd);
      this.logger.debug(stdout);
      if (stderr) this.logger.warn(stderr);
    } catch (error) {
      this.logger.error('Helm command failed: ' + String(error));
      throw error;
    } finally {
      // Limpiar archivo temporal
      await fs.unlink(valuesFile).catch(() => {});
    }
  }
}
