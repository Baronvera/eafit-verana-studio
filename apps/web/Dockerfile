FROM node:20-alpine AS base

# Instalar pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copiar archivos de configuración del workspace
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY tsconfig.base.json ./

# Copiar el código fuente
COPY apps/web ./apps/web
COPY packages ./packages

# Instalar dependencias
RUN pnpm install --frozen-lockfile

# Deshabilitar telemetría de Next.js y aumentar memoria para el build worker
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max_old_space_size=4096"

# NEXT_PUBLIC_API_URL: URL pública del API (usada por el browser/client-side)
ENV NEXT_PUBLIC_API_URL=https://studio.team-b.teams.eafit.testnet.verana.network/api

# INTERNAL_API_URL: URL interna del API en K8s (usada por Next.js server-side rewrites)
ENV INTERNAL_API_URL=http://vas-api:3000

# Construir la Web
RUN pnpm --filter "@vas/web" build

# Copiar assets estáticos al directorio standalone (requerido por Next.js standalone)
RUN cp -r apps/web/.next/static apps/web/.next/standalone/apps/web/.next/static

# Copiar public folder si existe
RUN if [ -d apps/web/public ]; then cp -r apps/web/public apps/web/.next/standalone/apps/web/public; fi

# Exponer puerto
EXPOSE 3000

# Modo standalone: node server.js en puerto 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
CMD ["node", "apps/web/.next/standalone/apps/web/server.js"]
