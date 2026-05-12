export interface ConnectorTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: 'sse' | 'stdio';
  authType: 'api_key' | 'bearer' | 'oauth2' | 'none';
  urlTemplate?: string;
  credentialFields: {
    key: string;
    label: string;
    type: 'text' | 'password' | 'url';
    required: boolean;
  }[];
  tools: {
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
  }[];
}

export const CONNECTOR_CATALOG: ConnectorTemplate[] = [
  // ── Notion ─────────────────────────────────────────────────────────────
  {
    id: 'notion',
    name: 'Notion',
    description: 'Consulta y gestiona páginas y bases de datos de Notion',
    icon: '📝',
    type: 'sse',
    authType: 'bearer',
    urlTemplate: 'https://mcp.notion.so/sse',
    credentialFields: [
      { key: 'token', label: 'Integration Token', type: 'password', required: true },
    ],
    tools: [
      {
        name: 'search',
        description: 'Buscar páginas y bases de datos en Notion',
        inputSchema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
      },
      {
        name: 'get_page',
        description: 'Obtener contenido de una página por ID',
        inputSchema: { type: 'object', properties: { page_id: { type: 'string' } }, required: ['page_id'] },
      },
      {
        name: 'query_database',
        description: 'Consultar una base de datos de Notion',
        inputSchema: {
          type: 'object',
          properties: {
            database_id: { type: 'string' },
            filter: { type: 'object' },
          },
          required: ['database_id'],
        },
      },
      {
        name: 'create_page',
        description: 'Crear una nueva página en Notion',
        inputSchema: {
          type: 'object',
          properties: {
            parent_id: { type: 'string' },
            title: { type: 'string' },
            content: { type: 'string' },
          },
          required: ['parent_id', 'title'],
        },
      },
    ],
  },

  // ── GitHub ─────────────────────────────────────────────────────────────
  {
    id: 'github',
    name: 'GitHub',
    description: 'Accede a issues, PRs y código de tus repositorios',
    icon: '🐙',
    type: 'sse',
    authType: 'bearer',
    urlTemplate: 'https://api.githubcopilot.com/mcp/v1/sse',
    credentialFields: [
      { key: 'token', label: 'Personal Access Token', type: 'password', required: true },
    ],
    tools: [
      {
        name: 'list_issues',
        description: 'Listar issues de un repositorio',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string' },
            repo: { type: 'string' },
            state: { type: 'string', enum: ['open', 'closed', 'all'] },
          },
          required: ['owner', 'repo'],
        },
      },
      {
        name: 'get_issue',
        description: 'Obtener detalle de un issue',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string' },
            repo: { type: 'string' },
            issue_number: { type: 'number' },
          },
          required: ['owner', 'repo', 'issue_number'],
        },
      },
      {
        name: 'list_prs',
        description: 'Listar pull requests de un repositorio',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string' },
            repo: { type: 'string' },
            state: { type: 'string', enum: ['open', 'closed', 'all'] },
          },
          required: ['owner', 'repo'],
        },
      },
      {
        name: 'search_code',
        description: 'Buscar código en GitHub',
        inputSchema: {
          type: 'object',
          properties: { query: { type: 'string' } },
          required: ['query'],
        },
      },
    ],
  },

  // ── Slack ──────────────────────────────────────────────────────────────
  {
    id: 'slack',
    name: 'Slack',
    description: 'Envía mensajes y busca en canales de Slack',
    icon: '💬',
    type: 'sse',
    authType: 'bearer',
    urlTemplate: 'https://mcp.slack.com/sse',
    credentialFields: [
      { key: 'token', label: 'Bot Token (xoxb-...)', type: 'password', required: true },
    ],
    tools: [
      {
        name: 'post_message',
        description: 'Enviar mensaje a un canal',
        inputSchema: {
          type: 'object',
          properties: {
            channel: { type: 'string' },
            text: { type: 'string' },
          },
          required: ['channel', 'text'],
        },
      },
      {
        name: 'search_messages',
        description: 'Buscar mensajes en Slack',
        inputSchema: {
          type: 'object',
          properties: { query: { type: 'string' } },
          required: ['query'],
        },
      },
      {
        name: 'list_channels',
        description: 'Listar canales disponibles',
        inputSchema: { type: 'object', properties: {} },
      },
    ],
  },

  // ── Google Drive ───────────────────────────────────────────────────────
  {
    id: 'google-drive',
    name: 'Google Drive',
    description: 'Lista y lee archivos de Google Drive',
    icon: '📂',
    type: 'sse',
    authType: 'oauth2',
    credentialFields: [
      { key: 'client_id', label: 'Client ID', type: 'text', required: true },
      { key: 'client_secret', label: 'Client Secret', type: 'password', required: true },
    ],
    tools: [
      {
        name: 'list_files',
        description: 'Listar archivos en Google Drive',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string' },
            page_size: { type: 'number' },
          },
        },
      },
      {
        name: 'read_file',
        description: 'Leer el contenido de un archivo',
        inputSchema: {
          type: 'object',
          properties: { file_id: { type: 'string' } },
          required: ['file_id'],
        },
      },
      {
        name: 'search',
        description: 'Buscar archivos por nombre o contenido',
        inputSchema: {
          type: 'object',
          properties: { query: { type: 'string' } },
          required: ['query'],
        },
      },
    ],
  },

  // ── Generic HTTP ───────────────────────────────────────────────────────
  {
    id: 'generic-http',
    name: 'API Personalizada',
    description: 'Conecta cualquier REST API como tool del agente',
    icon: '🔌',
    type: 'sse',
    authType: 'api_key',
    credentialFields: [
      { key: 'url', label: 'URL del MCP Server (SSE)', type: 'url', required: true },
      { key: 'header', label: 'Nombre del header de API Key', type: 'text', required: false },
      { key: 'value', label: 'Valor de la API Key', type: 'password', required: false },
    ],
    tools: [], // las tools se descubren dinámicamente desde el MCP server
  },
];
