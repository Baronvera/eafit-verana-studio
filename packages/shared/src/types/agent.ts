import { AgentNetwork, AgentStatus, CredentialStatus, CredentialType, LLMProvider } from './enums';

export interface Agent {
  id: string;
  name: string;
  type: string;
  description?: string;
  did?: string;
  status: AgentStatus;
  network: AgentNetwork;
  llmProvider: LLMProvider;
  model: string;
  prompt: string;
  temperature?: number;
  orgId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentStack {
  id: string;
  agentId: string;
  vsAgentContainerId?: string;
  aiAgentContainerId?: string;
  postgresContainerId?: string;
  redisContainerId?: string;
  networkId?: string;
  adminPort?: number;
  publicPort?: number;
  domain?: string;
}

export interface AgentCredential {
  id: string;
  agentId: string;
  type: CredentialType;
  status: CredentialStatus;
  issuedAt?: Date;
  raw?: Record<string, unknown>;
}

export interface CreateAgentDto {
  name: string;
  type: string;
  description?: string;
  network: AgentNetwork;
  llmProvider: LLMProvider;
  model: string;
  llmApiKey: string;
  prompt: string;
  temperature?: number;
  organization: {
    name: string;
    country: string;
    registryId?: string;
  };
  service: {
    termsUrl?: string;
    privacyUrl?: string;
  };
}

export interface UpdateAgentDto {
  prompt?: string;
  model?: string;
  llmProvider?: LLMProvider;
  llmApiKey?: string;
  temperature?: number;
  description?: string;
}

export interface ProvisioningStep {
  step: number;
  name: string;
  status: 'pending' | 'running' | 'done' | 'error';
  message?: string;
}
