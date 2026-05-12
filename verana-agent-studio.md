# 🤖 Verana Agent Studio
### Plataforma para crear, configurar y desplegar agentes de IA verificables en Hologram

> **5 fases · 205 ítems · ~13 semanas de desarrollo**  
> Versión: 1.0 · Abril 2026

---

## Tabla de Contenidos

1. [¿Qué es Verana?](#qué-es-verana)
2. [¿Qué es la Plataforma?](#qué-es-la-plataforma)
3. [Cómo Funciona](#cómo-funciona)
4. [Stack por Agente](#stack-por-agente)
5. [Arquitectura General](#arquitectura-general)
6. [Mapa de Ruta](#mapa-de-ruta)
7. [Checklist F1 — Fundamentos](#checklist-f1--fundamentos-sem-1-3)
8. [Checklist F2 — Conocimiento](#checklist-f2--conocimiento-sem-4-5)
9. [Checklist F3 — MCP Bridge](#checklist-f3--mcp-bridge-sem-6-8)
10. [Checklist F4 — Credenciales](#checklist-f4--credenciales-sem-9-10)
11. [Checklist F5 — Producción](#checklist-f5--producción-sem-11-13)
12. [Dependencias Críticas](#dependencias-críticas)
13. [Riesgos y Mitigaciones](#riesgos-y-mitigaciones)

---

## ¿Qué es Verana?

Verana es una **capa de identidad verificable para internet**, construida sobre blockchain.

Resuelve un problema concreto: cuando te conectas a un chatbot, una app o un agente de IA, **no tienes forma de saber quién lo opera realmente**. Verana le da a cada servicio digital un **DID** (Decentralized Identifier) — una identidad criptográfica registrada on-chain — junto con credenciales verificables que prueban quién lo opera, qué hace y qué está autorizado a hacer.

**Hologram** es la app móvil que usa el usuario final: escanea un QR, ve quién opera el servicio (verificado on-chain), y se conecta por un canal cifrado punto a punto (DIDComm).

> En una frase: **es el DNI digital para agentes, servicios y organizaciones en internet**, y Hologram es el lector de ese DNI.

### Problemas que resuelve

| Problema | Solución Verana |
|---|---|
| **Crisis de confianza** — sin identidad criptográfica nativa en internet | 🔐 Cryptographic Trust — cada interacción es verificable |
| **Ilusión de propiedad** — las plataformas controlan tus datos | 🗝 True Ownership — tú controlas servicios, datos y audiencia |
| **Monopolio de descubrimiento** — visibilidad controlada por ads y algoritmos | 🧭 Fair Discovery — te encuentran por lo que demuestras, no por lo que pagas |

### Componentes clave

- **Verifiable Service (VS):** Servicio identificado por un DID que puede autenticarse ante cualquier par presentando Verifiable Credentials *antes* de iniciar cualquier conexión.
- **DID (Decentralized Identifier):** Identidad criptográfica única, ej: `did:webvh:Qm7xK2...mi-servicio.com`
- **ECS (Essential Credential Schemas):** Credenciales obligatorias — Organization (quién opera) y Service (qué hace).
- **VPR (Verifiable Public Registry):** Blockchain pública donde se registran trust registries, schemas y permisos.
- **Trust Resolver:** Resuelve un DID, verifica sus credenciales contra el VPR y emite un Proof-of-Trust.
- **Hologram:** Primera Verifiable User Agent — app móvil que verifica la identidad del servicio antes de conectar.

---

## ¿Qué es la Plataforma?

Un **panel de control** donde cualquier persona u organización puede crear, configurar y publicar agentes de IA conversacionales verificables en Hologram, **sin tocar una sola línea de código ni un servidor**.

Piénsalo como un "Botpress" o "Typebot", pero donde cada agente tiene identidad legal verificable on-chain y los usuarios se conectan a través de un canal cifrado y descentralizado.

### Qué la hace única frente a un chatbot normal

| Aspecto | Chatbot normal | Verana Agent Studio |
|---|---|---|
| Identidad del operador | No verificable | DID on-chain, criptográficamente verificable |
| Canal de comunicación | HTTP/WebSocket estándar | DIDComm cifrado extremo a extremo |
| Propiedad | Del proveedor de la plataforma | Del creador (puede migrar con sus claves) |
| Credenciales de usuario | No soportado | AnonCreds W3C (selective disclosure) |
| Descubrimiento | Algoritmos del proveedor | DID Directory público y descentralizado |
| Portabilidad | Dependiente del proveedor | Exporta claves, corre en cualquier servidor |

### Casos de uso

- **Empresa de salud:** agente con PDFs de tratamientos + CRM conectado via MCP para consultar citas.
- **Universidad:** agente de admisiones multilenguaje que emite credenciales AnonCreds de "aspirante registrado".
- **Desarrollador independiente:** asistente personal conectado a Notion y GitHub via MCP, accesible desde Hologram.
- **Floricultura / comercio:** agente de atención al cliente verificable, con catálogo indexado como knowledge base.

### Features

| Feature | Descripción |
|---|---|
| Wizard de creación | 5 pasos guiados, deploy automático, sin código |
| DID on-chain | Identidad verificable en Verana testnet/mainnet |
| Knowledge base | Upload de PDF, MD, CSV, TXT — indexado RAG automático |
| RAG contextual | El agente busca en tus docs antes de responder |
| MCP Bridge | Conecta Notion, GitHub, Slack, tu API, cualquier MCP server |
| Multi-LLM | Claude (Anthropic), GPT-4o (OpenAI), Llama3 (Ollama local) |
| Multilenguaje | ES, EN, FR con detección automática |
| Emisión de credenciales | AnonCreds para diplomas, membresías, IDs verificables |
| QR Hologram | Listo para publicar y compartir |
| Panel de métricas | Conexiones, uso, estado en tiempo real |
| Hot-reload | Cambios de docs y config sin downtime |
| Dominios personalizados | `agent.tuempresa.com` con TLS automático |

---

## Cómo Funciona

### Flujo completo de punta a punta

#### Paso 1 — El creador configura el agente

Entra al panel, hace clic en "Nuevo agente" y un wizard lo guía por cinco secciones:

1. **Identidad (Organización):** Nombre, país, registro legal → credencial de Organization on-chain en Verana.
2. **Servicio (qué hace):** Nombre del agente, tipo, descripción, términos y privacidad → credencial de Service.
3. **Personalidad (LLM):** Prompt base, proveedor LLM (Claude/GPT-4o/Llama3), modelo y temperatura.
4. **Conocimiento (RAG):** Upload de PDFs, Docs, CSVs → indexado en vector store → el agente los usa para responder.
5. **Herramientas (MCP):** Conecta Notion, GitHub, Slack o cualquier API → el agente los llama en tiempo real.

#### Paso 2 — Deploy automático (9 pasos internos)

```
1. Levantar contenedor vs-agent → generar DID (did:webvh:...)
2. Esperar isInitialized: true en GET /v1/agent
3. Solicitar Organization credential al ECS Trust Registry
4. Crear permiso ISSUER en blockchain Verana
5. Esperar 15-21s que el permiso sea efectivo
6. Auto-emitir Service credential
7. Vincular ambas como Linked Verifiable Presentations en DID Document
8. Levantar stack IA (NestJS + PostgreSQL + Redis) con config del usuario
9. Verificar Trust Resolver → agente trusted y disponible
```

#### Paso 3 — El usuario se conecta en Hologram

```
Usuario escanea QR
      ↓
Hologram resuelve el DID del agente
      ↓
Descarga credenciales de Organization y Service
      ↓
Las verifica criptográficamente contra la blockchain Verana
      ↓
Muestra: "Este agente es operado por [Org], registrada en [País]"
      ↓
Usuario acepta → canal DIDComm cifrado establecido
```

#### Paso 4 — La conversación ocurre

```
Usuario escribe en Hologram
      ↓
Mensaje cifrado DIDComm → vs-agent (puerto 3001)
      ↓
vs-agent pasa mensaje al AI backend (puerto 3000)
      ↓
AI backend: busca en vector store (RAG) + memoria de conversación
      ↓
Si necesita tool: llama MCP Bridge → MCP server real → resultado
      ↓
LLM genera respuesta con todo el contexto
      ↓
Respuesta cifrada DIDComm → Hologram → usuario
```

#### Paso 5 — El creador gestiona en tiempo real

- Ver conexiones, conversaciones y métricas
- Subir nuevos documentos → re-indexado automático sin apagar el agente
- Cambiar prompt, modelo o LLM provider → hot-reload
- Agregar/quitar MCPs → auto-sync de tools config
- Emitir y revocar credenciales AnonCreds

---

## Stack por Agente

Cada agente desplegado corre su propio stack aislado:

```
┌─── Hologram App (usuario) ─────────────────────────────────┐
│  Escanea QR → DIDComm WebSocket (wss://tu-dominio:3001)    │
└────────────────────────┬───────────────────────────────────┘
                         │
┌─── vs-agent (puerto 3001 público / 3000 admin) ────────────┐
│  • Genera y mantiene DID (did:webvh)                       │
│  • Maneja DIDComm (conexiones, mensajes cifrados)          │
│  • Gestiona credenciales ECS (Org + Service)               │
│  • Expone DID Document con Linked VPs                      │
│  • Imagen: veranalabs/vs-agent:latest                      │
└────────────────────────┬───────────────────────────────────┘
                         │ POST /chatbot/ask (connectionId)
┌─── hologram-generic-ai-agent-vs (NestJS) ──────────────────┐
│  • LLM: Anthropic Claude / OpenAI GPT / Ollama local       │
│  • RAG: búsqueda en vector store con documentos del usuario │
│  • Memory: Redis (ventana de contexto por sesión)          │
│  • Tools: MCP Bridge endpoints como tools del LLM          │
│  • Multilenguaje: ES/EN/FR con detección automática        │
│  • Imagen: 2060-io/hologram-generic-ai-agent-vs            │
└────────┬───────────────────┬───────────────────────────────┘
         │                   │
   PostgreSQL              Redis
   (sesiones,            (memoria de
    estado del           conversación,
    agente)              queues)
                              │
┌─── MCP Bridge (tu plataforma) ─────────────────────────────┐
│  Traduce MCPs → HTTP REST endpoints consumibles por el LLM │
│  GET /bridge/{agentId}/{toolName}?query={input}            │
└────────────────────────────────────────────────────────────┘
                              │
┌─── Knowledge API (tu plataforma) ──────────────────────────┐
│  Recibe uploads → S3/MinIO → URLs firmadas → RAG_REMOTE_URLS│
│  POST /agents/:id/knowledge/upload                         │
└────────────────────────────────────────────────────────────┘
```

### Variables de entorno críticas por agente

| Variable | Descripción |
|---|---|
| `AGENT_PUBLIC_DID` | DID del agente (did:webvh:...) |
| `VS_AGENT_ADMIN_URL` | URL interna del admin API del vs-agent |
| `LLM_PROVIDER` | `anthropic` / `openai` / `ollama` |
| `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` | Credencial del LLM |
| `OPENAI_MODEL` / `ANTHROPIC_MODEL` | Modelo específico |
| `AGENT_PROMPT` | Personalidad e instrucciones del agente |
| `RAG_REMOTE_URLS` | URLs de documentos indexados (CSV) |
| `RAG_CHUNK_SIZE` | Tamaño de fragmentos RAG (default: 1000) |
| `RAG_CHUNK_OVERLAP` | Overlap entre fragmentos (default: 200) |
| `LLM_TOOLS_CONFIG` | JSON con tools del MCP Bridge |
| `CREDENTIAL_DEFINITION_ID` | Para flujos de autenticación AnonCreds |
| `REDIS_URL` | Redis de memoria y queues |
| `POSTGRES_*` | Credenciales PostgreSQL del agente |

---

## Arquitectura General

```
┌─── UI Plataforma (Next.js 14) ─────────────────────────────┐
│  Wizard creación · Knowledge upload · MCP config           │
│  Dashboard · Métricas · Credenciales · QR Hologram         │
└────────────────────────┬───────────────────────────────────┘
                         │ REST API / SSE
┌─── Backend Plataforma (NestJS) ────────────────────────────┐
│  AgentOrchestrator   → ciclo de vida Docker/Helm           │
│  VeranaProvisioningService → 9 pasos automáticos           │
│  KnowledgeService    → upload, S3, URLs, re-indexado       │
│  McpBridgeService    → traduce MCP → REST endpoints        │
│  Auth / Billing      → JWT multi-tenant + Stripe           │
└──────┬─────────────────┬──────────────────────────────────┘
       │                  │
  Docker / Helm        PostgreSQL plataforma
  (stacks por agente)  (users, orgs, agents, docs, mcps)
       │
┌──── Stack por agente (aislado) ────────────────────────────┐
│  vs-agent · ai-agent-vs · PostgreSQL · Redis               │
└────────────────────────────────────────────────────────────┘
                         │
┌─── Red Verana (Blockchain) ────────────────────────────────┐
│  ECS Trust Registry · VPR · DID Directory                  │
│  Testnet: testnet.verana.network                           │
└────────────────────────────────────────────────────────────┘
                         │
┌─── Hologram (app móvil) ───────────────────────────────────┐
│  Verifica DID · Muestra info del operador · Chat DIDComm   │
└────────────────────────────────────────────────────────────┘
```

### APIs de la plataforma

#### Agents API
```
POST   /agents                          Crear agente + deploy automático
GET    /agents                          Listar agentes del usuario
GET    /agents/:id                      Detalle: config, DID, credenciales
PATCH  /agents/:id                      Actualizar config
DELETE /agents/:id                      Destruir stack y eliminar
POST   /agents/:id/restart              Reiniciar ai-agent-vs
GET    /agents/:id/logs                 Stream de logs via SSE
```

#### Knowledge API
```
POST   /agents/:id/knowledge/upload     Subir archivo (multipart)
GET    /agents/:id/knowledge            Listar documentos indexados
DELETE /agents/:id/knowledge/:docId     Eliminar y re-indexar
POST   /agents/:id/knowledge/reindex    Forzar re-indexado completo
```

#### MCP API
```
POST   /agents/:id/mcp                  Registrar MCP server
GET    /agents/:id/mcp                  Listar MCPs activos + tools
DELETE /agents/:id/mcp/:mcpId           Desconectar MCP
GET    /mcp-bridge/:agentId/:tool       Endpoint REST para el LLM
POST   /mcp-config/:agentId/auth        Guardar credenciales OAuth/APIKey
```

---

## Mapa de Ruta

```
Semana  1  2  3  4  5  6  7  8  9  10 11 12 13
        ├──────────┤
F1 Fundamentos ████████████
                    ├──────┤
F2 Conocimiento          ██████
                          ├──────────┤
F3 MCP Bridge                  ████████████
                                      ├──────┤
F4 Credenciales                            ██████
                                              ├──────────┤
F5 Producción                                      ████████████

F5-Auth puede iniciar en semana 4 en paralelo con F2
```

| Fase | Semanas | Ítems | Stack principal |
|---|---|---|---|
| F1 Fundamentos | 1–3 | 52 | Next.js 14, NestJS, Docker SDK, Prisma, vs-agent |
| F2 Conocimiento | 4–5 | 32 | S3/MinIO, Multer, Bull queues, LangChain |
| F3 MCP Bridge | 6–8 | 40 | @modelcontextprotocol/sdk, NestJS, OAuth2 |
| F4 Credenciales | 9–10 | 23 | AnonCreds, DIDComm, Hologram wallet |
| F5 Producción | 11–13 | 58 | Helm/K8s, Stripe, Prometheus, Grafana, Sentry |

**Total: 205 ítems · ~13 semanas · 1 desarrollador full-time**  
Con 2 desarrolladores: ~8 semanas para tener todo excepto F5.

---

## Checklist F1 — Fundamentos `Sem 1–3`

> **Objetivo:** Infraestructura base, orquestador Docker, despliegue automático de agentes con DID on-chain y credenciales ECS. Al terminar esta fase tienes un agente real corriendo en Hologram.

### 🗂️ Monorepo & Entorno

- [ ] Inicializar monorepo con pnpm workspaces (apps/web, apps/api, apps/mcp-bridge)
- [ ] Configurar TypeScript base + ESLint + Prettier compartidos
- [ ] Docker Compose de desarrollo local (api, web, postgres, redis)
- [ ] Variables de entorno base (.env.example documentado)
- [ ] CI básico con GitHub Actions (lint + build en PR)

### 🗄️ Base de Datos

- [ ] Configurar Prisma ORM con PostgreSQL
- [ ] Entidad User (id, email, password hash, createdAt)
- [ ] Entidad Organization (id, name, country, registryId, logoUrl, userId)
- [ ] Entidad Agent (id, name, type, description, did, status, network, llmProvider, model, prompt, orgId)
- [ ] Entidad AgentStack (id, agentId, containerId, adminPort, publicPort, domain)
- [ ] Entidad Credential (id, agentId, type: org|service, status, issuedAt, raw JSON)
- [ ] Migrations iniciales y seed de desarrollo

### 🐳 AgentOrchestrator (Docker)

- [ ] Instalar dockerode y configurar conexión al socket Docker
- [ ] Función pullImage() para veranalabs/vs-agent:latest y 2060-io/hologram-generic-ai-agent-vs
- [ ] Función createAgentNetwork() — red Docker aislada por agente
- [ ] Función startVsAgent() — crea contenedor con env vars, puertos, volumen persistente
- [ ] Función startAiAgent() — crea contenedor NestJS con config LLM y RAG
- [ ] Función startPostgres() y startRedis() dentro de la network del agente
- [ ] Función waitUntilInitialized() — polling GET /v1/agent hasta isInitialized: true
- [ ] Función stopAgent() y destroyAgent() con limpieza de contenedores y volúmenes

### 🔐 VeranaProvisioningService

- [ ] Función fetchEcsDIDDocument() — obtiene DID Document del ECS Trust Registry
- [ ] Función discoverOrgVtjscUrl() — extrae URL del schema Organization desde DID Document
- [ ] Función requestOrgCredential() — llama admin API del ECS TR con claims del creador
- [ ] Función linkCredential() — POST /v1/vt/linked-credentials en vs-agent
- [ ] Función discoverServiceVtjscUrl() — extrae URL del schema Service
- [ ] Función createIssuerPermission() — ejecuta veranad tx perm create-perm via CLI child process
- [ ] Función waitPermissionEffective() — espera los 15–21 segundos requeridos
- [ ] Función selfIssueServiceCredential() — POST /v1/vt/issue-credential en vs-agent
- [ ] Función verifyTrustResolver() — GET /trust-resolve?did=... valida que el agente es trusted
- [ ] Orquestar los 9 pasos anteriores con manejo de errores y rollback

### 🌐 API REST Base

- [ ] POST /agents — crea agente en DB, dispara orquestación completa, devuelve jobId
- [ ] GET /agents — lista agentes del usuario con status en tiempo real
- [ ] GET /agents/:id — detalle completo: config, DID, credenciales, stack info
- [ ] PATCH /agents/:id — actualiza config del agente (prompt, modelo, etc.)
- [ ] DELETE /agents/:id — destruye stack Docker y elimina de DB
- [ ] POST /agents/:id/restart — reinicia ai-agent-vs solamente
- [ ] GET /agents/:id/logs — stream de logs vía SSE (Server-Sent Events)
- [ ] Auth guard JWT básico en todos los endpoints

### 🧙 UI — Wizard de Creación

- [ ] Layout base Next.js 14 App Router con sidebar y navegación
- [ ] Paso 1: formulario Organización (nombre, país, registryId, logo upload)
- [ ] Paso 2: formulario Servicio (nombre, tipo, descripción, terms URL, privacy URL)
- [ ] Paso 3: configuración LLM (provider, API key, modelo, prompt, temperatura)
- [ ] Paso 4: placeholder Knowledge (mensaje 'disponible en F2')
- [ ] Paso 5: Deploy — selección red (devnet/testnet) y modo (docker/helm)
- [ ] Terminal de deploy en tiempo real via SSE que muestra los 9 pasos de provisioning
- [ ] Pantalla de éxito con DID del agente y QR de Hologram generado

### 📊 UI — Dashboard

- [ ] Lista de agentes con status dot animado (running / pending / stopped)
- [ ] Card por agente: nombre, org, DID truncado, red, LLM, conexiones
- [ ] Panel de detalle: tabs Overview / Credenciales / Terminal / QR
- [ ] Tab QR: código QR Hologram con URL de invitación y botón copiar
- [ ] Acciones: iniciar, detener, reiniciar ai-agent, eliminar agente
- [ ] Stats top: total agentes, activos, total conexiones Hologram

---

## Checklist F2 — Conocimiento `Sem 4–5`

> **Objetivo:** Upload de documentos desde la UI, indexado RAG automático, re-indexado en caliente sin downtime. El creador sube un PDF y en minutos el agente lo usa para responder.

### 📁 Storage & Upload

- [ ] Configurar AWS S3 o MinIO (self-hosted) con bucket por tenant
- [ ] Multer middleware para multipart/form-data con validación de tipo y tamaño (máx 50MB)
- [ ] Aceptar extensiones: .pdf, .md, .txt, .csv, .docx
- [ ] Subir archivo a S3 con path agents/{agentId}/docs/{docId}/{filename}
- [ ] Guardar metadata en DB: Document (id, agentId, name, size, mimetype, s3Key, status, indexedAt)
- [ ] Endpoint POST /agents/:id/knowledge/upload
- [ ] Endpoint GET /agents/:id/knowledge — lista documentos con status
- [ ] Endpoint DELETE /agents/:id/knowledge/:docId — elimina de S3 y DB

### 🔗 URLs Firmadas & Config RAG

- [ ] Generar pre-signed URL S3 por documento (TTL 7 días)
- [ ] Función buildRagRemoteUrls() — concatena todas las URLs activas del agente
- [ ] Función updateAgentRagConfig() — actualiza env vars RAG_REMOTE_URLS en contenedor
- [ ] Job de renovación automática de URLs expiradas (cron diario)

### ⚡ Indexing Queue

- [ ] Configurar Bull con Redis para queue 'knowledge-indexing'
- [ ] Job worker: recibe agentId + docId, actualiza RAG_REMOTE_URLS, hace docker restart ai-agent-vs
- [ ] Status tracking: documento pasa por estados indexing → ready | error
- [ ] Endpoint POST /agents/:id/knowledge/reindex — fuerza re-indexado completo
- [ ] Webhook al terminar indexado: actualiza Document.indexedAt y notifica UI via SSE
- [ ] Reintentos automáticos (máx 3) con backoff exponencial en caso de error

### 🖥️ UI — Knowledge Base

- [ ] Tab 'Conocimiento' en panel de detalle del agente
- [ ] Zona drag & drop con preview de archivos antes de subir
- [ ] Progress bar por archivo durante upload (xhr con eventos de progreso)
- [ ] Lista de documentos: nombre, tamaño, tipo, status (chip animado indexando/listo/error)
- [ ] Indicador 'Última indexación: hace X minutos'
- [ ] Botón eliminar documento con confirmación y re-indexado automático
- [ ] Botón 'Re-indexar todo' manual
- [ ] Contador: X docs · Y MB usados de Z MB disponibles (según plan)

### ✅ QA & Validación RAG

- [ ] Subir PDF de prueba con contenido específico y verificar indexado exitoso
- [ ] Conectar en Hologram y hacer pregunta cuya respuesta solo está en el PDF
- [ ] Verificar que la respuesta cita correctamente el contenido del documento
- [ ] Probar eliminación de doc y confirmar que el agente ya no responde con esa info
- [ ] Ajustar RAG_CHUNK_SIZE y RAG_CHUNK_OVERLAP según calidad de respuestas
- [ ] Test de carga: subir 10 documentos simultáneamente y verificar queue

---

## Checklist F3 — MCP Bridge `Sem 6–8`

> **Objetivo:** Capa de traducción MCP → HTTP REST. El agente puede usar cualquier MCP server como tool nativa en conversación. El creador conecta Notion, GitHub, Slack o su propia API sin código.

### 🔌 Núcleo del Bridge

- [ ] Crear app NestJS independiente apps/mcp-bridge
- [ ] Instalar @modelcontextprotocol/sdk
- [ ] Entidad McpServer (id, agentId, name, type: sse|stdio, url, authType, encryptedCreds, status)
- [ ] Entidad McpTool (id, mcpServerId, name, description, inputSchema JSON)
- [ ] McpConnectionService — conecta a MCP server SSE y mantiene sesión activa
- [ ] Función listTools() — obtiene catálogo de herramientas disponibles del MCP server
- [ ] Función callTool(toolName, input) — invoca herramienta y retorna resultado
- [ ] Reconexión automática con backoff si el MCP server se desconecta

### 🌐 HTTP Endpoints por Agente

- [ ] GET /bridge/:agentId/:toolName?query={input} — endpoint REST que llama el ai-agent-vs
- [ ] Soporte para POST con body JSON cuando el tool requiere múltiples parámetros
- [ ] Función buildToolsConfig() — genera JSON LLM_TOOLS_CONFIG con todos los tools activos del agente
- [ ] Validar que solo el ai-agent-vs del mismo agente puede llamar sus endpoints (API key interna)
- [ ] Caché de resultados por tool + TTL configurable (evitar spam de llamadas)
- [ ] Logs de invocaciones por tool: timestamp, input, output, duración, error

### 🔑 Auth Manager

- [ ] Soporte API Key: almacenar cifrado con AES-256, inyectar en header en cada llamada
- [ ] Soporte Bearer Token: igual que API Key con prefijo Bearer
- [ ] Soporte OAuth2 Authorization Code Flow: generar URL de autorización, callback handler
- [ ] Almacenar access_token + refresh_token cifrados en DB
- [ ] Refresh automático de tokens OAuth2 expirados antes de cada tool call
- [ ] Endpoint POST /mcp-config/:agentId/auth — guarda credenciales del usuario

### 🔧 Conectores Predefinidos

- [ ] Conector Notion: query database, get page, create page, search
- [ ] Conector GitHub: list issues, get issue, list PRs, search code
- [ ] Conector Slack: post message, search messages, list channels
- [ ] Conector Google Drive: list files, read file content, search
- [ ] Conector Generic HTTP: cualquier REST API definida por el usuario (método, URL, headers)
- [ ] Template YAML por conector: define tools disponibles y parámetros requeridos
- [ ] Tests de integración por conector con mocks del MCP server

### 🔄 Auto-sync con Agente

- [ ] Hook: al agregar/quitar MCP → recalcular LLM_TOOLS_CONFIG → actualizar env del contenedor
- [ ] Hot-reload del ai-agent-vs al cambiar tools (docker restart solo ese contenedor)
- [ ] Endpoint GET /agents/:id/mcp — lista MCPs activos con tools disponibles por cada uno
- [ ] Endpoint POST /agents/:id/mcp — registra nuevo MCP server
- [ ] Endpoint DELETE /agents/:id/mcp/:mcpId — desconecta MCP y actualiza tools config

### 🖥️ UI — MCP & Herramientas

- [ ] Tab 'Herramientas' en panel de detalle del agente
- [ ] Galería de conectores predefinidos con logo, descripción y botón 'Conectar'
- [ ] Opción 'API Personalizada': formulario con URL, método, headers, descripción
- [ ] Flujo OAuth con popup: redirige, captura callback, guarda token, cierra popup
- [ ] Flujo API Key: campo de texto + botón 'Verificar conexión'
- [ ] Lista de tools activas por conector con toggle on/off individual
- [ ] Panel de test inline: input de texto → invocar tool → ver respuesta JSON
- [ ] Log de invocaciones recientes: tool, timestamp, duración, status

---

## Checklist F4 — Credenciales `Sem 9–10`

> **Objetivo:** Emisión y verificación de credenciales AnonCreds desde el agente. El creador diseña flujos sin código; el usuario recibe credenciales verificables en su wallet de Hologram.

### 🎨 Credential Type Designer

- [ ] Entidad CredentialType (id, agentId, name, version, attributes JSON, credDefId, vtjscId)
- [ ] Formulario: nombre del tipo, versión, lista de atributos (nombre + tipo: text|date|image|number)
- [ ] Llamar POST /v1/credential-types en vs-agent del agente y guardar credDefId en DB
- [ ] Mostrar Credential Definition ID resultante y estado de registro on-chain
- [ ] Lista de tipos de credencial existentes por agente con opción de ver atributos

### 📤 Issuance Flow Builder

- [ ] Entidad IssuanceFlow (id, agentId, credTypeId, triggerType, claimsConfig JSON, active)
- [ ] Trigger types: on_connect (al conectar), on_auth (tras autenticar), on_command (frase trigger)
- [ ] Claims config: cada atributo puede ser valor fijo, variable de sesión, o resultado de tool MCP
- [ ] Función generateCredentialOffer() — POST /v1/invitation/credential-offer en vs-agent
- [ ] Endpoint GET /agents/:id/credential-offers/:offerId — status del intercambio
- [ ] UI: selector de tipo → configurar trigger → mapear claims → activar

### 📥 Verification Request Builder

- [ ] Entidad VerificationFlow (id, agentId, credDefId, requestedAttributes[], callbackUrl, active)
- [ ] Selector de atributos a solicitar (selective disclosure — solo los necesarios)
- [ ] Función generatePresentationRequest() — POST /v1/invitation/presentation-request en vs-agent
- [ ] Webhook callback handler: recibe resultado verificado y actualiza estado de sesión
- [ ] Acción post-verificación configurable: continuar conversación, bloquear, respuesta personalizada
- [ ] UI: selector credencial → atributos a pedir → acción post-verificación → activar

### 📊 Dashboard de Credenciales

- [ ] Tab 'Credenciales' en panel del agente: sub-tabs Emitidas / Verificaciones / Tipos
- [ ] Lista de credenciales emitidas: credDefId, fecha, status (activa/revocada), connectionId
- [ ] Botón revocar individual con confirmación
- [ ] Revocación masiva por tipo de credencial
- [ ] Stats: total emitidas, activas, revocadas, verificaciones exitosas / fallidas
- [ ] Test end-to-end: flujo completo emisión → wallet Hologram → presentación → verificación

---

## Checklist F5 — Producción `Sem 11–13`

> **Objetivo:** SaaS production-ready con auth multi-tenant, billing Stripe, Kubernetes/Helm, observabilidad completa y analytics de conversaciones.

### 👤 Auth Multi-tenant

- [ ] Registro con email + password (bcrypt hash) y verificación de email
- [ ] Login con JWT (access token 15min + refresh token 7 días, rotación)
- [ ] OAuth social: Google y GitHub como providers
- [ ] Aislamiento de tenant: todos los queries filtran por userId/orgId automáticamente
- [ ] RBAC básico: roles owner / editor / viewer por organización
- [ ] Invitación de miembros por email con link firmado (TTL 48h)
- [ ] UI: pantallas login, registro, forgot password, settings de cuenta y equipo

### ⚙️ Kubernetes + Helm

- [ ] Crear Helm chart vs-agent-stack con subchart por componente (vs-agent, ai-agent, postgres, redis)
- [ ] HelmOrchestrator service — reemplaza DockerOrchestrator usando @kubernetes/client-node
- [ ] Namespace aislado por agente: agents-{agentId}
- [ ] Ingress con cert-manager para TLS automático (Let's Encrypt)
- [ ] Resource limits por plan: cpu/memory requests y limits en values.yaml
- [ ] PersistentVolumeClaim para datos del vs-agent (claves DID)
- [ ] Liveness y readiness probes por contenedor
- [ ] Estrategia de rollout: RollingUpdate para ai-agent-vs, Recreate para vs-agent

### 🌐 Dominios Personalizados

- [ ] Endpoint POST /agents/:id/domain — el creador ingresa su dominio (agent.miempresa.com)
- [ ] Instrucciones de CNAME generadas dinámicamente para que el creador configure su DNS
- [ ] Verificación automática de propagación DNS (polling cada 5min)
- [ ] Crear Ingress + cert-manager Certificate para el dominio verificado
- [ ] Actualizar AGENT_PUBLIC_DID del vs-agent con el nuevo dominio y re-provisionar credenciales

### 💳 Billing & Planes

- [ ] Configurar Stripe con productos: Free, Pro, Enterprise
- [ ] Plan Free: 1 agente, 100 conversaciones/mes, 100MB knowledge, sin MCPs
- [ ] Plan Pro: 5 agentes, 1000 conversaciones, 500MB, MCPs ilimitados, dominios personalizados
- [ ] Plan Enterprise: agentes ilimitados, storage ilimitado, SLA 99.9%, soporte dedicado
- [ ] Usage metering: contar conversaciones y tokens por agente (Stripe metered billing)
- [ ] Webhooks Stripe: manejar subscription.created, updated, deleted, payment_failed
- [ ] UI: página de planes, checkout Stripe, portal de facturación, historial
- [ ] Enforcement de límites: bloquear deploy si agentes > plan, warnings al 80% de uso

### 📡 Observabilidad

- [ ] Prometheus metrics endpoint en api y mcp-bridge (/metrics)
- [ ] Métricas por agente: request_count, error_rate, response_latency_p95, token_usage
- [ ] Grafana dashboard: estado de todos los agentes, alertas, top talkers
- [ ] Logs centralizados con Loki + Promtail desde todos los contenedores
- [ ] Alerta: agente caído > 2min → notificación email/Slack al creador
- [ ] Alerta: error rate > 5% en últimos 5min
- [ ] Alerta: uso de tokens al 80% del límite del plan
- [ ] Sentry para error tracking en api, web y mcp-bridge

### 📈 Analytics de Conversaciones

- [ ] Guardar transcripciones anonimizadas (connectionId hash, sin PII) por agente
- [ ] Dashboard: mensajes por día (chart), horas pico, duración promedio de sesión
- [ ] Top intents: clustering básico de preguntas frecuentes (embeddings + k-means)
- [ ] Documentos más citados por el RAG en respuestas
- [ ] Thumbs up/down desde Hologram → satisfaction score por agente
- [ ] Export de métricas a CSV desde el dashboard

---

## Dependencias Críticas

```
F1-T1 (monorepo)
  └─► F1-T2 (DB) → F1-T3 (Docker Orch) → F1-T4 (Verana Prov) → F1-T5 (API Base)
                                                                         │
                         ┌───────────────────────────────────────────────┤
                         │                   │                   │       │
                      F2-T1              F3-T1              F4-T1    F5-T1
                   (Knowledge)         (MCP Core)         (Cred Type) (Auth)
                         │                   │
                      F2-T3              F3-T2 → F3-T3 → F3-T4 → F3-T5
                   (Queue+Restart)      (HTTP endpoints)
                         │
                      F2-T4 → F2-T5
                      (UI → QA)

F1-T3 (Docker Orch)
  └─► F5-T2 (Helm Orch) → F5-T3 (Dominios)
```

---

## Riesgos y Mitigaciones

| Riesgo | Probabilidad | Mitigación |
|---|---|---|
| ECS Trust Registry en testnet con downtime | Media | Implementar mock local del ECS TR para desarrollo |
| Docker SDK en producción con alta carga | Alta | Migrar a Helm/K8s en F5 lo antes posible |
| MCPs con OAuth2 tienen flujos complejos | Alta | Priorizar API Key first, OAuth2 en segunda iteración |
| RAG con baja calidad de respuestas | Media | Tests exhaustivos en F2-T5, ajustar chunk_size |
| vs-agent genera nuevo SCID al resetear volumen | Alta | PersistentVolumeClaim en K8s, backup automático de claves |
| Límites de rate del LLM provider | Media | Queue de requests, retry con backoff, alertas de uso |

---

## Referencias

### Repositorios

- [verana-labs/vs-agent](https://github.com/verana-labs/vs-agent) — Framework VS Agent
- [verana-labs/verana](https://github.com/verana-labs/verana) — Implementación blockchain (cosmos-sdk)
- [verana-labs/verana-demos](https://github.com/verana-labs/verana-demos) — Scripts de demo y CI/CD
- [2060-io/hologram-generic-ai-agent-vs](https://github.com/2060-io/hologram-generic-ai-agent-vs) — AI Agent NestJS
- [verana-labs/verre](https://github.com/verana-labs/verre) — Trust Resolver

### Documentación

- [docs.verana.io](https://docs.verana.io) — Documentación oficial Verana (v4 next)
- [Verifiable Trust Spec](https://verana-labs.github.io/verifiable-trust-spec/) — Especificación VT
- [VPR Spec](https://verana-labs.github.io/verifiable-trust-vpr-spec/) — Especificación VPR
- [Trust Registry Query Protocol](https://trustoverip.github.io/tswg-trust-registry-protocol/)

### Redes

- Testnet RPC: `https://rpc.testnet.verana.network`
- Testnet Faucet: `https://faucet-vs.testnet.verana.network/invitation`
- Trust Resolver: `https://resolver.testnet.verana.network/v1/trust-resolve`
- ECS Trust Registry Admin: `https://admin-ecs-trust-registry.testnet.verana.network`

### Comunidad

- [Discord Verana](https://discord.gg/edjaFn252q)
- [LinkedIn Verana Foundation](https://www.linkedin.com/company/verana-foundation)
- [X/Twitter @Verana_io](https://x.com/Verana_io)

---

*Documento generado el 6 de abril de 2026 · Verana Agent Studio v1.0*
