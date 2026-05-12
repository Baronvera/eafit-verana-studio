export enum AgentStatus {
  PENDING = 'pending',
  PROVISIONING = 'provisioning',
  RUNNING = 'running',
  STOPPED = 'stopped',
  ERROR = 'error',
}

export enum AgentNetwork {
  DEVNET = 'devnet',
  TESTNET = 'testnet',
  MAINNET = 'mainnet',
}

export enum LLMProvider {
  ANTHROPIC = 'anthropic',
  OPENAI = 'openai',
  OLLAMA = 'ollama',
}

export enum CredentialType {
  ORGANIZATION = 'organization',
  SERVICE = 'service',
}

export enum CredentialStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  REVOKED = 'revoked',
}

export enum DocumentStatus {
  UPLOADING = 'uploading',
  INDEXING = 'indexing',
  READY = 'ready',
  ERROR = 'error',
}

export enum McpAuthType {
  API_KEY = 'api_key',
  BEARER = 'bearer',
  OAUTH2 = 'oauth2',
  NONE = 'none',
}

export enum McpServerType {
  SSE = 'sse',
  STDIO = 'stdio',
}

export enum UserRole {
  OWNER = 'owner',
  EDITOR = 'editor',
  VIEWER = 'viewer',
}
