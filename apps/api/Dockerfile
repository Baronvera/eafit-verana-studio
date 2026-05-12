FROM node:20-alpine AS base

# Instalar pnpm y helm (sin bash: descarga el binario directamente)
ENV HELM_VERSION=v3.14.4
RUN apk add --no-cache curl tar openssl \
    && npm install -g pnpm \
    && curl -fsSL https://get.helm.sh/helm-${HELM_VERSION}-linux-amd64.tar.gz -o helm.tar.gz \
    && tar -zxvf helm.tar.gz \
    && mv linux-amd64/helm /usr/local/bin/helm \
    && rm -rf helm.tar.gz linux-amd64 \
    && helm version

WORKDIR /app

# 1. Copiar solo manifiestos para cachear pnpm install
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY tsconfig.base.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/api/prisma ./apps/api/prisma
COPY apps/api/nest-cli.json ./apps/api/
COPY apps/api/tsconfig.json ./apps/api/
COPY packages ./packages

# 2. Instalar dependencias (cacheado mientras package.json no cambie)
RUN pnpm install --frozen-lockfile

# 3. Copiar solo el SOURCE (sin dist ni tsbuildinfo)
# ARG CACHEBUST invalida cache cuando cambia el source
ARG CACHEBUST=1
COPY apps/api/src ./apps/api/src

# 4. Generar el cliente de Prisma
RUN pnpm --filter "@vas/api" exec prisma generate

# 5. Compilar TypeScript sin modo incremental
RUN cd apps/api && \
    echo '{"extends":"./tsconfig.json","compilerOptions":{"incremental":false,"outDir":"./dist"}}' > tsconfig.docker.json && \
    node_modules/.bin/tsc -p tsconfig.docker.json && \
    rm tsconfig.docker.json

# Exponer puerto
EXPOSE 3000

# Iniciar con el script correcto
CMD ["node", "apps/api/dist/main"]
