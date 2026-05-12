import { Injectable, Logger } from '@nestjs/common';

/**
 * Mock local del ECS Trust Registry para desarrollo.
 * Activo cuando USE_MOCK_ECS=true en .env
 * Permite desarrollar sin depender del testnet de Verana.
 */
@Injectable()
export class EcsMockService {
  private readonly logger = new Logger(EcsMockService.name);

  isEnabled(): boolean {
    return process.env.USE_MOCK_ECS === 'true';
  }

  async getDIDDocument(): Promise<Record<string, unknown>> {
    this.logger.warn('[MOCK ECS] getDIDDocument');
    return {
      id: 'did:webvh:mock-ecs-trust-registry.local',
      service: [
        {
          id: '#org-vtjsc',
          type: 'VTJSCEndpoint',
          serviceEndpoint: 'http://mock-ecs.local/schemas/organization',
        },
        {
          id: '#service-vtjsc',
          type: 'VTJSCEndpoint',
          serviceEndpoint: 'http://mock-ecs.local/schemas/service',
        },
      ],
    };
  }

  async requestOrgCredential(claims: Record<string, string>): Promise<string> {
    this.logger.warn('[MOCK ECS] requestOrgCredential', claims);
    return `mock-org-credential-${Date.now()}`;
  }

  async createIssuerPermission(did: string): Promise<void> {
    this.logger.warn(`[MOCK ECS] createIssuerPermission for ${did}`);
  }

  async verifyTrustResolver(did: string): Promise<boolean> {
    this.logger.warn(`[MOCK ECS] verifyTrustResolver for ${did}`);
    return true;
  }
}
