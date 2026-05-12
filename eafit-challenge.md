# Reto IA Generativa: Agentes IA Verificables con Hologram

**Verana Foundation × NODO EAFIT — Beca IA Ser ANDI**

---

## Tabla de Contenidos

1. [Presentación del Reto](#1-presentación-del-reto)
2. [Software y Herramientas](#2-software-y-herramientas)
3. [Preparación del Entorno de Desarrollo](#3-preparación-del-entorno-de-desarrollo)
4. [Cómo Obtener Ayuda](#4-cómo-obtener-ayuda)
- [Paso 1 — Primeros Pasos con Chatbots IA y Hologram](#paso-1--primeros-pasos-con-chatbots-ia-y-hologram)
- [Paso 2 — Desplegar tu Bot en Kubernetes](#paso-2--desplegar-tu-bot-en-kubernetes)
- [Paso 3 — El Reto: Servicio Online para Crear Persona AI Agents](#paso-3--el-reto-servicio-online-para-crear-persona-ai-agents)
- [Evaluación y Calificación](#evaluación-y-calificación)

---

## 1. Presentación del Reto

### Propósito

Los chatbots y agentes IA actuales viven en plataformas centralizadas. No hay forma de verificar quién los opera, qué políticas siguen o si son legítimos. El usuario confía ciegamente.

Verana es una capa abierta de confianza para internet, basada en identidad descentralizada (DIDs) y credenciales verificables (W3C). Hologram es una app de mensajería que funciona como navegador de agentes IA verificables: antes de interactuar con un bot, el usuario puede confirmar quién lo opera.

En este reto, construirás una plataforma web que permita a cualquier persona — sin conocimientos técnicos — crear, configurar y publicar su propio agente IA personal (Persona AI Agent), accesible desde Hologram.

### Qué Aprenderás

- Desarrollo de chatbots con IA generativa (LLMs, RAG, prompts, MCP)
- Integración con protocolos de identidad descentralizada (DIDs, Credenciales Verificables)
- Despliegue de servicios con Docker y Kubernetes
- Desarrollo de aplicaciones web full-stack
- Trabajo con repositorios open-source y colaboración en GitHub
- Tecnologías cutting-edge: estándares W3C, DIF, ToIP

### Qué Entregarás

1. **Chatbot de prueba personalizado** — un bot IA funcionando en Hologram (Paso 1)
2. **Bot desplegado en Kubernetes** — tu chatbot accesible públicamente (Paso 2)
3. **Plataforma web "Persona AI Agent Creator"** — una aplicación web completa que permite a usuarios no técnicos crear y gestionar sus propios agentes IA personales (Paso 3)
4. **Código publicado en GitHub** — en tu fork del repositorio `verana-labs/verana-eafit`, bajo licencia open-source
5. **Documentación** — README con instrucciones de instalación y uso

---

## 2. Software y Herramientas

### Editor de Código (IDE)

Usa uno de los siguientes editores. Todos son gratuitos y soportan TypeScript/JavaScript:

| IDE | Descripción | Descarga |
|-----|-------------|----------|
| VS Code | El más popular, extensiones para todo | https://code.visualstudio.com |
| Windsurf | IDE con IA integrada (basado en VS Code) | https://windsurf.com |
| Cursor | IDE con IA integrada (basado en VS Code) | https://cursor.sh |

Cualquiera de los tres funciona. Si nunca has usado ninguno, empieza con VS Code.

### Git y GitHub

- **Git**: sistema de control de versiones. Descarga: https://git-scm.com/downloads
- **GitHub**: plataforma para alojar código. Crea una cuenta gratuita en https://github.com si no tienes una.

Verifica que Git está instalado:

```bash
git --version
# Debe mostrar algo como: git version 2.x.x
```

### Node.js y pnpm

El proyecto usa Node.js (entorno de ejecución de JavaScript) y pnpm (gestor de paquetes).

1. Instala Node.js v20 o superior: https://nodejs.org (descarga la versión LTS)
2. Instala pnpm:

```bash
npm install -g pnpm
```

Verifica:

```bash
node --version
# Debe mostrar v20.x.x o superior

pnpm --version
# Debe mostrar 8.x.x o superior
```

### Docker

Docker permite ejecutar aplicaciones en contenedores aislados. Lo usarás para correr el chatbot y sus servicios asociados (Redis, PostgreSQL, etc.).

- Docker Desktop: https://www.docker.com/products/docker-desktop/

Después de instalar, verifica:

```bash
docker --version
# Debe mostrar: Docker version 2x.x.x

docker compose version
# Debe mostrar: Docker Compose version v2.x.x
```

### ngrok

ngrok crea un túnel público hacia tu máquina local. Esto permite que Hologram se conecte a tu chatbot durante el desarrollo.

1. Crea una cuenta gratuita en https://ngrok.com
2. Descarga e instala: https://ngrok.com/download
3. Autentícate con tu token:

```bash
ngrok config add-authtoken TU_TOKEN_AQUI
```

4. Verifica:

```bash
ngrok version
```

### Hologram Messaging

Hologram es la app de mensajería donde los usuarios interactúan con agentes IA verificables. La necesitarás para probar tu chatbot.

- **iOS**: Busca "Hologram Messaging" en App Store
- **Android**: Busca "Hologram Messaging" en Google Play
- **Web**: https://hologram.zone

Instala la app en tu teléfono. La usarás para escanear códigos QR y chatear con tu bot.

### kubectl (para el Paso 2)

`kubectl` es la herramienta de línea de comandos para interactuar con Kubernetes.

- Instalación: https://kubernetes.io/docs/tasks/tools/

```bash
kubectl version --client
```

### Repositorios Clave

| Repositorio | Descripción |
|-------------|-------------|
| [verana-labs/verana-eafit](https://github.com/verana-labs/verana-eafit) | **Tu repositorio de trabajo** — contiene el código base del chatbot, scripts de despliegue k8s y plantillas |
| [2060-io/hologram-generic-ai-agent-vs](https://github.com/2060-io/hologram-generic-ai-agent-vs) | Agente IA genérico para Hologram (upstream del chatbot) |
| [verana-labs/vs-agent](https://github.com/verana-labs/vs-agent) | VS Agent — framework para construir Servicios Verificables con Hologram |
| [verana-labs/verana-demos](https://github.com/verana-labs/verana-demos) | Demos y scripts del ecosistema Verana |

### Documentación de Referencia

- Documentación Verana: https://docs.verana.io
- Especificación Verifiable Trust: https://verana-labs.github.io/verifiable-trust-spec/
- Especificación VPR: https://verana-labs.github.io/verifiable-trust-vpr-spec/
- Hologram: https://hologram.zone

---

## 3. Preparación del Entorno de Desarrollo

Sigue estos pasos **en orden** para tener tu entorno listo.

### 3.1. Instalar las herramientas

Asegúrate de tener instalado todo lo listado en la sección anterior:

- [ ] Editor de código (VS Code, Windsurf o Cursor)
- [ ] Git
- [ ] Cuenta de GitHub
- [ ] Node.js v20+
- [ ] pnpm
- [ ] Docker Desktop
- [ ] ngrok (con cuenta y token configurado)
- [ ] Hologram Messaging en tu teléfono
- [ ] kubectl

### 3.2. Configurar Git

Si es la primera vez que usas Git, configura tu nombre y correo:

```bash
git config --global user.name "Tu Nombre"
git config --global user.email "tu.correo@ejemplo.com"
```

### 3.3. Configurar tu clave SSH en GitHub (recomendado)

Esto te permite hacer push/pull sin escribir tu contraseña cada vez.

1. Genera una clave SSH:

```bash
ssh-keygen -t ed25519 -C "tu.correo@ejemplo.com"
```

2. Presiona Enter para aceptar la ubicación por defecto. Opcionalmente agrega un passphrase.

3. Copia tu clave pública:

```bash
# macOS
cat ~/.ssh/id_ed25519.pub | pbcopy

# Linux
cat ~/.ssh/id_ed25519.pub | xclip -selection clipboard

# Windows (Git Bash)
cat ~/.ssh/id_ed25519.pub | clip
```

4. Ve a GitHub → Settings → SSH and GPG keys → New SSH key y pega tu clave.

5. Verifica la conexión:

```bash
ssh -T git@github.com
# Debe responder: Hi tu-usuario! You've successfully authenticated...
```

### 3.4. Obtener una API key de un proveedor LLM

Tu chatbot necesita conectarse a un modelo de lenguaje. Tienes varias opciones:

| Proveedor | Modelo recomendado | Cómo obtener API key |
|-----------|-------------------|----------------------|
| OpenAI | gpt-4o-mini | https://platform.openai.com/api-keys |
| Anthropic | claude-3-haiku | https://console.anthropic.com |
| Ollama (local, gratis) | llama3 | https://ollama.ai — no requiere API key |

> **Recomendación para estudiantes**: Si no quieres gastar dinero, usa Ollama con el modelo llama3. Se ejecuta localmente en tu máquina. Necesitas al menos 8 GB de RAM.

Para instalar Ollama:

```bash
# macOS/Linux
curl -fsSL https://ollama.ai/install.sh | sh

# Descargar el modelo llama3
ollama pull llama3
```

### 3.5. Solicitar credenciales de Kubernetes

Para el Paso 2, necesitarás un archivo kubeconfig que te dará acceso a un namespace en el cluster de Kubernetes de Verana.

Solicita tus credenciales en el canal de Discord (ver sección siguiente). Te asignarán un namespace con el formato: `eafit-TUNOMBRE`.

---

## 4. Cómo Obtener Ayuda

### Discord de Verana

Únete al servidor de Discord de Verana y usa el canal **#eafit-challenges** para:

- Hacer preguntas técnicas
- Reportar problemas
- Compartir tu progreso
- Solicitar tu kubeconfig para k8s

Enlace de invitación: https://discord.com/invite/edjaFn252q

Tu mentor técnico de Verana estará disponible en este canal. No dudes en preguntar.

### Recursos adicionales

- Consulta la documentación en https://docs.verana.io
- Revisa los README de cada directorio del repositorio

---

## Paso 1 — Primeros Pasos con Chatbots IA y Hologram

**Objetivo**: Aprender a configurar, personalizar y ejecutar un chatbot IA que se conecta con Hologram Messaging.

**Qué aprenderás:**
- Cómo funciona un chatbot IA basado en LLMs
- Configuración de prompts, RAG y agent packs
- Cómo funciona la comunicación con Hologram a través de VS Agent
- Docker Compose para orquestar múltiples servicios

**Qué entregarás:**
- Un chatbot personalizado funcionando localmente, accesible desde Hologram

### 1.1. Fork del repositorio

1. Ve a https://github.com/verana-labs/verana-eafit
2. Haz clic en el botón "Fork" (esquina superior derecha)
3. Selecciona tu cuenta personal como destino
4. Esto creará una copia del repositorio en `https://github.com/TU-USUARIO/verana-eafit`

### 1.2. Clonar el repositorio en tu máquina

Abre tu terminal y ejecuta:

```bash
# Reemplaza TU-USUARIO con tu nombre de usuario de GitHub
git clone git@github.com:TU-USUARIO/verana-eafit.git

# Entra al directorio
cd verana-eafit
```

Si no configuraste SSH, puedes usar HTTPS en su lugar:

```bash
git clone https://github.com/TU-USUARIO/verana-eafit.git
```

### 1.3. Explorar la estructura del proyecto

Abre el proyecto en tu editor:

```bash
code .      # para VS Code
# o
windsurf .  # para Windsurf
# o
cursor .    # para Cursor
```

Navega al directorio `ai-chatbot/`. Este directorio contiene el código del chatbot basado en `hologram-generic-ai-agent-vs`. Encontrarás:

```
ai-chatbot/
├── agent-packs/        # Configuraciones declarativas del agente
│   └── my-agent/       # Tu configuración personalizada
│       └── agent-pack.yaml
├── docs/               # Documentos para RAG (base de conocimiento)
├── docker-compose.yml  # Orquestación de todos los servicios
├── .env.example        # Plantilla de variables de entorno
├── Dockerfile          # Para construir la imagen del chatbot
└── README.md           # Instrucciones específicas del chatbot
```

### 1.4. Configurar las variables de entorno

Copia el archivo de ejemplo y edítalo:

```bash
cd ai-chatbot
cp .env.example .env
```

Abre `.env` en tu editor y configura al menos las siguientes variables:

```env
# === LLM Provider ===
# Opción A: OpenAI (requiere API key)
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-tu-api-key-aqui
OPENAI_MODEL=gpt-4o-mini

# Opción B: Ollama (local, gratis)
# LLM_PROVIDER=ollama
# OLLAMA_ENDPOINT=http://ollama:11435
# OLLAMA_MODEL=llama3

# === Agent Pack ===
AGENT_PACK_PATH=./agent-packs/my-agent

# === Redis (para memoria del chatbot) ===
REDIS_URL=redis://redis:6379
AGENT_MEMORY_BACKEND=redis
AGENT_MEMORY_WINDOW=8

# === Vector Store (para RAG) ===
VECTOR_STORE=redis
VECTOR_INDEX_NAME=eafit-chatbot
RAG_PROVIDER=vectorstore
RAG_DOCS_PATH=/app/rag/docs

# === VS Agent (comunicación con Hologram) ===
VS_AGENT_ADMIN_URL=http://vs-agent:3001
EVENTS_BASE_URL=http://chatbot:3000

# === PostgreSQL ===
POSTGRES_HOST=postgres
POSTGRES_USER=eafit
POSTGRES_PASSWORD=eafit2025
POSTGRES_DB_NAME=chatbot-agent

# === Application ===
APP_PORT=3000
LOG_LEVEL=3
```

### 1.5. Personalizar tu Agent Pack

El archivo `agent-pack.yaml` define la personalidad, idiomas, prompt y comportamiento de tu chatbot.

Edita `ai-chatbot/agent-packs/my-agent/agent-pack.yaml`:

```yaml
metadata:
  id: eafit-mi-agente
  displayName: Mi Agente EAFIT
  description: >-
    Agente IA personalizado creado por [TU NOMBRE] para el reto EAFIT.
  defaultLanguage: es
  tags:
    - eafit
    - reto

languages:
  es:
    greetingMessage: >-
      ¡Hola! 👋 Soy tu asistente IA de EAFIT. ¿En qué puedo ayudarte hoy?
    systemPrompt: >-
      Eres un asistente IA amigable y profesional. Respondes preguntas de
      manera clara y concisa.
    strings:
      ROOT_TITLE: '¡Bienvenido!'
      ERROR_MESSAGES: 'El servicio no está disponible. Intenta más tarde.'
  en:
    greetingMessage: >-
      Hi! 👋 I'm your EAFIT AI assistant. How can I help you today?
    systemPrompt: >-
      You are a friendly and professional AI assistant. You answer questions
      clearly and concisely.
    strings:
      ROOT_TITLE: 'Welcome!'
      ERROR_MESSAGES: 'Service unavailable. Please try again later.'

llm:
  provider: ${LLM_PROVIDER}
  model: ${OPENAI_MODEL}
  temperature: 0.3
  maxTokens: 1000

rag:
  provider: vectorstore
  docsPath: ./docs
  chunkSize: 1000
  chunkOverlap: 200
  vectorStore:
    type: redis
    indexName: eafit-chatbot

memory:
  backend: redis
  window: 8
  redisUrl: ${REDIS_URL}

flows:
  welcome:
    enabled: true
    sendOnProfile: true
    templateKey: greetingMessage

integrations:
  vsAgent:
    adminUrl: ${VS_AGENT_ADMIN_URL}
  postgres:
    host: ${POSTGRES_HOST}
    user: ${POSTGRES_USER}
    password: ${POSTGRES_PASSWORD}
    dbName: ${POSTGRES_DB_NAME}
```

> **Personaliza**: Cambia el nombre del agente, los mensajes de bienvenida, el prompt del sistema, los idiomas, etc. ¡Haz que sea tuyo!

### 1.6. Agregar documentos para RAG (base de conocimiento)

Si quieres que tu chatbot responda preguntas sobre temas específicos, coloca archivos en el directorio `ai-chatbot/docs/`. Formatos soportados:

- `.txt` — texto plano
- `.md` — markdown
- `.pdf` — documentos PDF
- `.csv` — datos tabulares

Ejemplo: puedes agregar información sobre EAFIT, tu carrera, o cualquier tema de tu interés.

### 1.7. Iniciar el chatbot con Docker Compose

Asegúrate de que Docker Desktop esté corriendo, luego:

```bash
cd ai-chatbot
docker compose up --build
```

Esto levantará varios servicios:

| Servicio | Puerto | Descripción |
|----------|--------|-------------|
| chatbot | 3000 | Tu agente IA (API) |
| vs-agent | 3001 | Servicio de comunicación con Hologram (DIDComm) |
| redis | 6379 | Almacenamiento de memoria y vectores |
| postgres | 5432 | Base de datos para sesiones |

La primera vez tardará unos minutos mientras descarga las imágenes Docker.

Verifica que todo esté corriendo:

```bash
docker compose ps
```

Todos los servicios deben mostrar estado `Up` o `running`.

### 1.8. Exponer tu servicio con ngrok

Para que Hologram pueda conectarse a tu chatbot local, necesitas exponer el puerto del VS Agent:

```bash
# En una nueva terminal
ngrok http 3001
```

ngrok mostrará una URL pública como:

```
Forwarding https://abc123.ngrok-free.app -> http://localhost:3001
```

Copia esa URL (la que empieza con `https://`). La necesitarás para configurar el endpoint del VS Agent.

Ahora actualiza tu `.env` con la URL de ngrok:

```env
AGENT_ENDPOINT=https://abc123.ngrok-free.app
```

Y reinicia los servicios:

```bash
docker compose down
docker compose up --build
```

### 1.9. Obtener las credenciales de invitación

Una vez que el VS Agent esté corriendo y expuesto vía ngrok, necesitas obtener la URL de invitación para conectar con Hologram.

Accede a la API del VS Agent para obtener la invitación:

```bash
curl http://localhost:3001/
```

Esto muestra un código QR que puedes escanear con Hologram.

### 1.10. Conectar con Hologram y probar

1. Abre la app Hologram Messaging en tu teléfono
2. Escanea el código QR de invitación (o usa la URL)
3. El chatbot te enviará su mensaje de bienvenida
4. ¡Empieza a chatear y verifica que responde correctamente!

**Experimenta:**
- Cambia el prompt en `agent-pack.yaml` y reinicia
- Agrega más documentos a `docs/` para enriquecer el RAG
- Prueba diferentes modelos de LLM
- Cambia el idioma por defecto

### 1.11. Commit de tus cambios

Una vez que tu chatbot funcione, guarda tus cambios:

```bash
git add .
git commit -m "feat: configure my custom AI agent"
git push origin main
```

---

## Paso 2 — Desplegar tu Bot en Kubernetes

**Objetivo**: Aprender a desplegar tu chatbot en un cluster Kubernetes para que sea accesible públicamente sin depender de ngrok ni de tu máquina local.

**Qué aprenderás:**
- Conceptos básicos de Kubernetes (pods, deployments, services, ingress)
- Configuración con manifiestos YAML
- Despliegue en un cluster real con kubectl

**Qué entregarás:**
- Tu chatbot desplegado y accesible públicamente en `tunombre.eafit.testnet.verana.network`

### 2.1. Verificar tus credenciales de Kubernetes

Debes haber recibido un archivo kubeconfig del equipo de Verana (solicitado en el Paso 3.5 de la preparación). Este archivo te da acceso a tu namespace en el cluster.

Configura kubectl para usar tu kubeconfig:

```bash
# Opción A: variable de entorno (recomendado)
export KUBECONFIG=~/path/to/your/kubeconfig.yaml

# Opción B: copiar al directorio por defecto
cp ~/path/to/your/kubeconfig.yaml ~/.kube/config
```

Verifica la conexión:

```bash
kubectl get pods
# Debe mostrar una lista (posiblemente vacía) sin errores
```

### 2.2. Analizar los scripts de despliegue

En tu repositorio, navega al directorio `k8s/`. Encontrarás manifiestos YAML para Kubernetes:

```
k8s/
├── deployment.yaml   # Define los pods (contenedores) de tu chatbot
├── service.yaml      # Expone los pods dentro del cluster
├── ingress.yaml      # Configura el acceso público (dominio)
├── configmap.yaml    # Variables de configuración
├── secrets.yaml      # Datos sensibles (API keys)
└── deploy.sh         # Script para desplegar todo de una vez
```

### 2.3. Personalizar la configuración

Edita los archivos YAML para personalizar tu despliegue:

**`configmap.yaml`** — Variables de entorno de tu chatbot:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: chatbot-config
  namespace: eafit-TUNOMBRE
data:
  LLM_PROVIDER: "openai"
  OPENAI_MODEL: "gpt-4o-mini"
  AGENT_PACK_PATH: "./agent-packs/my-agent"
  # ... más variables según tu configuración
```

**`secrets.yaml`** — API keys y contraseñas (codificadas en base64):

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: chatbot-secrets
  namespace: eafit-TUNOMBRE
type: Opaque
data:
  OPENAI_API_KEY: c2stdHUtYXBpLWtleQ==  # echo -n "tu-api-key" | base64
```

**`ingress.yaml`** — Tu dominio público:

```yaml
# Asegúrate de que el host apunte a tu subdominio
spec:
  rules:
    - host: miagente.tunombre.eafit.testnet.verana.network
```

### 2.4. Desplegar

Ejecuta el script de despliegue o aplica los manifiestos manualmente:

```bash
# Opción A: usar el script
cd k8s
chmod +x deploy.sh
./deploy.sh

# Opción B: aplicar manualmente
kubectl apply -f k8s/
```

Verifica que los pods estén corriendo:

```bash
kubectl get pods -n eafit-TUNOMBRE
# Deben mostrar STATUS: Running

kubectl get ingress -n eafit-TUNOMBRE
# Debe mostrar tu dominio configurado
```

### 2.5. Probar el despliegue

Una vez que los pods estén en `Running`:

1. Abre Hologram Messaging
2. Escanea el QR o accede a la URL de invitación de tu bot desplegado (ya no usarás ngrok)
3. Verifica que el chatbot responde correctamente

### 2.6. Commit y push

```bash
git add .
git commit -m "feat: add k8s deployment configuration"
git push origin main
```

---

## Paso 3 — El Reto: Servicio Online para Crear Persona AI Agents

**Objetivo**: Construir una aplicación web completa que permita a usuarios sin conocimientos técnicos crear, configurar y desplegar sus propios agentes IA personales a través de una interfaz intuitiva.

**Qué aprenderás:**
- Desarrollo de aplicaciones web full-stack
- Gestión de despliegues programáticos en Kubernetes
- Diseño de interfaces de usuario (UI/UX)
- Integración de múltiples servicios (LLMs, MCP, RAG, k8s)
- Autenticación de usuarios

**Qué entregarás:**
- Una aplicación web funcional para crear y gestionar Persona AI Agents
- Al menos 2 integraciones MCP funcionales
- Documentación de usuario y técnica

### ¿Qué es un Persona AI Agent?

Un Persona AI Agent es un agente IA que representa a una persona y puede ejecutar acciones en su nombre.

**Ejemplo**: Un plomero puede tener un AI Agent que gestione su calendario. Los clientes se conectan al agente a través de Hologram y tienen una conversación para agendar una intervención.

### 3.1. Requisitos de la Aplicación Web

Tu aplicación debe proporcionar:

#### Interfaz Web
- Una aplicación web moderna con interfaz intuitiva
- Responsive (funcionar en desktop y móvil)
- Tecnología sugerida: React, Next.js, Vue.js, o la que prefieras

#### Configuración Global
Un archivo de configuración (`.env` o similar) que defina:
- **kubeconfig**: ruta al archivo de credenciales k8s para desplegar los bots en el cluster
- **Dominio base**: sufijo para las URLs de los chatbots de los usuarios, con el formato: `nombre.eafit.testnet.verana.network`

#### Autenticación de Usuarios
- Login / registro de usuarios
- Opcional: autenticación con Google (OAuth)
- Logout

#### Gestión de Bots ("My AI Bots")
- **Listar mis bots**: ver todos los agentes IA que he creado
- **Crear nuevo bot**: formulario paso a paso para configurar un nuevo agente
- **Ver bot**: página de detalle con la configuración del bot
- **Editar**: modificar la configuración
- **Guardar**: persistir los cambios
- **Publicar**: desplegar el bot en k8s y hacerlo accesible en Hologram
- **Despublicar**: remover el bot del cluster
- **Link al bot**: botón que lleva a la URL pública del bot para escanearlo con Hologram

### 3.2. Opciones de Configuración del Bot

Cada bot debe poder configurarse con:

| Opción | Descripción |
|--------|-------------|
| Atributos de Persona | Nombre, profesión, descripción, foto — definen la identidad del agente (Persona Credential) |
| Atributos del Servicio | Nombre del servicio, descripción, categoría — definen el servicio que ofrece (Service Credential) |
| Prompt | Instrucciones de personalidad y comportamiento del agente IA |
| Servicios MCP | Herramientas externas que el agente puede usar (calendario, redes sociales, etc.) |
| RAG | Base de conocimiento: documentos que el agente usa para responder preguntas |

### 3.3. Servicios MCP (Model Context Protocol)

MCP permite que el agente IA acceda a herramientas y datos externos durante la conversación. Debes implementar **al menos 2 servidores MCP funcionales**.

Ejemplos de MCP servers útiles:

| Servicio MCP | Descripción | Caso de uso |
|--------------|-------------|-------------|
| Google Calendar | Leer/crear eventos en Google Calendar | Agendar citas con el profesional |
| X (Twitter) | Publicar tweets, leer timeline | Promocionar servicios, compartir novedades |
| Gmail | Enviar/leer correos | Confirmar citas, enviar información |
| Google Sheets | Leer/escribir hojas de cálculo | Gestionar inventario, precios |
| Weather API | Consultar clima | Planificar servicios al aire libre |
| Wikipedia | Buscar información | Responder preguntas generales |

Cuando el usuario crea un bot, debe poder seleccionar uno o más de los servidores MCP disponibles en tu plataforma.

### 3.4. Flujo de Creación de un Bot

```
[Usuario] → Login → "New Bot" → Configurar:
    1. Datos de Persona (nombre, profesión, foto)
    2. Datos del Servicio (nombre, descripción)
    3. Escribir prompt de personalidad
    4. Seleccionar servidores MCP
    5. Subir documentos para RAG (opcional)
→ "Save" → "Publish"
→ Bot desplegado en k8s
→ URL disponible para Hologram ✅
```

### 3.5. Arquitectura Sugerida

```
┌────────────────────────────────────────────┐
│             Web Frontend                   │
│         (React/Next.js/Vue)                │
│   - Login, Dashboard, Bot Creator          │
└─────────────────┬──────────────────────────┘
                  │ API REST
┌─────────────────▼──────────────────────────┐
│              Backend API                   │
│        (Node.js / Express / NestJS)        │
│      - Auth, Bot CRUD, k8s deploy          │
└──┬──────────────┬──────────────────────────┘
   │              │
   ▼              ▼
┌──────┐  ┌──────────────────────────────────┐
│  DB  │  │       Kubernetes Cluster         │
│(SQLite│  │  - Bot Pod 1 (chatbot + vs-agent)│
│  /PG)│  │  - Bot Pod 2 (chatbot + vs-agent)│
└──────┘  │  - ...                           │
          └──────────────────────────────────┘
```

### 3.6. Commit y documentación final

```bash
git add .
git commit -m "feat: persona AI agent creator web app"
git push origin main
```

Asegúrate de incluir:
- `README.md` con instrucciones de instalación y uso
- Capturas de pantalla de la interfaz
- Descripción de las integraciones MCP implementadas

---

## Evaluación y Calificación

| Criterio | Peso | Descripción |
|----------|------|-------------|
| Paso 1 — Chatbot funcionando | 20% | Bot personalizado corriendo localmente y accesible desde Hologram |
| Paso 2 — Despliegue k8s | 15% | Bot desplegado correctamente en el cluster Kubernetes |
| Paso 3 — Aplicación web | 40% | Funcionalidad completa de la plataforma de creación de bots |
| Integraciones MCP | 10% | Al menos 2 servidores MCP funcionales e integrados |
| Calidad del código | 5% | Código limpio, organizado, con buenas prácticas |
| Documentación | 5% | README claro, guía de uso, capturas de pantalla |
| Creatividad e innovación | 5% | Ideas originales, UX cuidada, funcionalidades extra |

### Puntos Bonus

- Integrar más de 2 servidores MCP (+5%)
- Implementar RAG con documentos reales útiles (+5%)
- UI/UX excepcional con diseño responsive (+5%)
- Tests automatizados (+5%)
- Demo en video mostrando el flujo completo (+5%)

---

> ¡Buena suerte! Recuerda: pregunta en el Discord de Verana (**#eafit-challenges**) si tienes dudas. Tu mentor técnico de Verana está ahí para ayudarte. 🚀
