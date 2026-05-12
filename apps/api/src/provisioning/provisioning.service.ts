import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { execSync } from 'child_process';
import { EcsMockService } from './ecs-mock.service';
import { ProvisioningStep } from '@vas/shared';

export interface ProvisioningConfig {
  agentId: string;
  adminPort: number;
  namespace?: string;  // K8s namespace for internal DNS resolution
  orgName: string;
  orgCountry: string;
  orgRegistryId?: string;
  agentName: string;
  agentType: string;
  termsUrl?: string;
  privacyUrl?: string;
  onStep?: (step: ProvisioningStep) => void;
}

export interface ProvisioningResult {
  did: string;
  orgCredentialId: string;
  serviceCredentialId: string;
}

@Injectable()
export class ProvisioningService {
  private readonly logger = new Logger(ProvisioningService.name);
  private readonly ecsUrl = process.env.ECS_TRUST_REGISTRY_URL || '';
  private readonly trustResolverUrl = process.env.TRUST_RESOLVER_URL || '';

  constructor(private ecsMock: EcsMockService) {}

  async provision(config: ProvisioningConfig): Promise<ProvisioningResult> {
    const emit = (step: number, name: string, status: ProvisioningStep['status'], message?: string) => {
      const s: ProvisioningStep = { step, name, status, message };
      this.logger.log(`[Step ${step}] ${name}: ${status} ${message || ''}`);
      config.onStep?.(s);
    };

    try {
      // ── Paso 1: Obtener DID del vs-agent ───────────────────────────────────
      emit(1, 'Obtener DID del vs-agent', 'running');
      const agentInfo = await this.getVsAgentInfo(config);
      const did = agentInfo.did;
      emit(1, 'Obtener DID del vs-agent', 'done', did);

      // ── Paso 2: Obtener DID Document del ECS ──────────────────────────────
      emit(2, 'Obtener DID Document del ECS Trust Registry', 'running');
      const ecsDidDoc = await this.fetchEcsDIDDocument();
      const orgVtjscUrl = this.extractServiceUrl(ecsDidDoc, 'org');
      emit(2, 'Obtener DID Document del ECS Trust Registry', 'done');

      // ── Paso 3: Solicitar credencial de Organización ───────────────────────
      emit(3, 'Solicitar credencial de Organización', 'running');
      const orgCredentialId = await this.requestOrgCredential(orgVtjscUrl, {
        name: config.orgName,
        country: config.orgCountry,
        registryId: config.orgRegistryId,
      });
      emit(3, 'Solicitar credencial de Organización', 'done', orgCredentialId);

      // ── Paso 4: Vincular credencial Org al DID Document ───────────────────
      emit(4, 'Vincular credencial al DID Document', 'running');
      await this.linkCredential(config, orgCredentialId);
      emit(4, 'Vincular credencial al DID Document', 'done');

      // ── Paso 5: Obtener URL schema Service ────────────────────────────────
      emit(5, 'Obtener schema Service del ECS', 'running');
      const serviceVtjscUrl = this.extractServiceUrl(ecsDidDoc, 'service');
      emit(5, 'Obtener schema Service del ECS', 'done');

      // ── Paso 6: Crear permiso ISSUER en blockchain ────────────────────────
      emit(6, 'Crear permiso ISSUER en blockchain Verana', 'running');
      await this.createIssuerPermission(did);
      emit(6, 'Crear permiso ISSUER en blockchain Verana', 'done');

      // ── Paso 7: Esperar que el permiso sea efectivo (15-21s) ──────────────
      emit(7, 'Esperando efectividad del permiso (15-21s)', 'running');
      await this.waitPermissionEffective();
      emit(7, 'Esperando efectividad del permiso (15-21s)', 'done');

      // ── Paso 8: Auto-emitir credencial de Servicio ────────────────────────
      emit(8, 'Emitir credencial de Servicio', 'running');
      const serviceCredentialId = await this.selfIssueServiceCredential(config, {
        name: config.agentName,
        type: config.agentType,
        termsUrl: config.termsUrl,
        privacyUrl: config.privacyUrl,
        vtjscUrl: serviceVtjscUrl,
      });
      emit(8, 'Emitir credencial de Servicio', 'done', serviceCredentialId);

      // ── Paso 9: Verificar Trust Resolver ──────────────────────────────────
      emit(9, 'Verificar Trust Resolver', 'running');
      const trusted = await this.verifyTrustResolver(did);
      if (!trusted) throw new Error('El agente no aparece como trusted en el resolver');
      emit(9, 'Verificar Trust Resolver', 'done', 'Agente verificable en Hologram');

      return { did, orgCredentialId, serviceCredentialId };
    } catch (err: any) {
      this.logger.error(`Provisioning failed: ${err.message}`, err.stack);
      throw err;
    }
  }

  /**
   * Build the vs-agent base URL.
   * In K8s mode: use internal cluster DNS so the API pod can reach the vs-agent pod.
   * In local Docker mode: fall back to localhost:adminPort.
   */
  private vsAgentBaseUrl(config: ProvisioningConfig): string {
    const useK8s = process.env.USE_KUBERNETES === 'true';
    if (useK8s) {
      const ns = config.namespace || process.env.K8S_NAMESPACE || 'team-b';
      // Use the Service port (adminPort), which K8s NATs to container port 3000
      return `http://vs-agent-${config.agentId}.${ns}.svc.cluster.local:${config.adminPort}`;
    }
    return `http://localhost:${config.adminPort}`;
  }

  private async getVsAgentInfo(config: ProvisioningConfig): Promise<{ did: string; isInitialized: boolean }> {
    const res = await axios.get(`${this.vsAgentBaseUrl(config)}/v1/agent`);
    // vs-agent returns the DID as `publicDid`, not `did`
    const data = res.data;
    return { ...data, did: data.publicDid || data.did };
  }

  private async fetchEcsDIDDocument(): Promise<Record<string, unknown>> {
    if (this.ecsMock.isEnabled()) return this.ecsMock.getDIDDocument();
    const res = await axios.get(`${this.ecsUrl}/.well-known/did.json`);
    return res.data;
  }

  private extractServiceUrl(didDoc: Record<string, unknown>, type: 'org' | 'service'): string {
    if (this.ecsMock.isEnabled()) {
      return type === 'org'
        ? 'http://mock-ecs.local/schemas/organization'
        : 'http://mock-ecs.local/schemas/service';
    }
    const services = didDoc.service as Array<{ type: string; serviceEndpoint: string }>;
    const match = services?.find((s) => s.type.toLowerCase().includes(type));
    if (!match) throw new Error(`No se encontró endpoint del schema ${type} en el DID Document del ECS`);
    return match.serviceEndpoint;
  }

  private async requestOrgCredential(
    _vtjscUrl: string,
    claims: { name: string; country: string; registryId?: string },
  ): Promise<string> {
    if (this.ecsMock.isEnabled()) return this.ecsMock.requestOrgCredential(claims as Record<string, string>);
    const res = await axios.post(`${this.ecsUrl}/v1/credentials/organization`, claims);
    return res.data.credentialId;
  }

  private async linkCredential(config: ProvisioningConfig, credentialId: string): Promise<void> {
    if (this.ecsMock.isEnabled()) return;
    await axios.post(`${this.vsAgentBaseUrl(config)}/v1/vt/linked-credentials`, {
      credentialId,
    });
  }

  private async createIssuerPermission(did: string): Promise<void> {
    if (this.ecsMock.isEnabled()) return;
    execSync(
      `veranad tx perm create-perm --did "${did}" --network ${process.env.VERANA_NETWORK || 'testnet'}`,
      { stdio: 'pipe' },
    );
  }

  private async waitPermissionEffective(): Promise<void> {
    const waitMs = this.ecsMock.isEnabled() ? 500 : 18_000;
    await new Promise((r) => setTimeout(r, waitMs));
  }

  private async selfIssueServiceCredential(
    config: ProvisioningConfig,
    service: { name: string; type: string; termsUrl?: string; privacyUrl?: string; vtjscUrl: string },
  ): Promise<string> {
    if (this.ecsMock.isEnabled()) return 'mock-service-credential-id';
    const res = await axios.post(`${this.vsAgentBaseUrl(config)}/v1/vt/issue-credential`, {
      schemaUrl: service.vtjscUrl,
      claims: {
        name: service.name,
        type: service.type,
        termsUrl: service.termsUrl || '',
        privacyUrl: service.privacyUrl || '',
      },
    });
    return res.data.credentialId || 'service-credential-issued';
  }

  private async verifyTrustResolver(did: string): Promise<boolean> {
    if (this.ecsMock.isEnabled()) return this.ecsMock.verifyTrustResolver(did);
    const res = await axios.get(`${this.trustResolverUrl}?did=${encodeURIComponent(did)}`);
    return res.data?.trusted === true;
  }
}
