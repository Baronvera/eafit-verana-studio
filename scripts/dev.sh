#!/usr/bin/env bash
# Script de inicio del entorno de desarrollo Verana Agent Studio

set -e

echo "=== Verana Agent Studio — Dev Setup ==="

# 1. Copiar .env si no existe
if [ ! -f .env ]; then
  cp .env.example .env
  echo "[OK] .env creado desde .env.example — edita las claves antes de continuar"
fi

# 2. Levantar infraestructura Docker
echo ""
echo "Levantando PostgreSQL, Redis y MinIO..."
docker compose -f docker-compose.dev.yml up -d
echo "[OK] Infraestructura lista"

# 3. Instalar dependencias
echo ""
echo "Instalando dependencias pnpm..."
pnpm install

# 4. Generar cliente Prisma y correr migrations
echo ""
echo "Corriendo migrations Prisma..."
cd apps/api
pnpm exec prisma migrate dev --name init
pnpm exec prisma db seed
cd ../..
echo "[OK] Base de datos lista"

echo ""
echo "=== Todo listo! ==="
echo "Inicia el servidor con: pnpm dev"
echo ""
echo "URLs:"
echo "  API:        http://localhost:3000"
echo "  Swagger:    http://localhost:3000/docs"
echo "  Web:        http://localhost:3001"
echo "  MCP Bridge: http://localhost:3002"
echo "  MinIO UI:   http://localhost:9001  (minioadmin / minioadmin)"
