#!/bin/bash
set -e

echo "🚀 Agente IA - Setup Local"
echo "=========================="
echo ""

# Check Docker
if ! command -v docker &> /dev/null; then
  echo "❌ Docker não encontrado. Instale o Docker Desktop:"
  echo "   https://docs.docker.com/desktop/"
  exit 1
fi

if ! docker info &> /dev/null; then
  echo "❌ Docker não está rodando. Inicie o Docker Desktop e tente novamente."
  exit 1
fi

echo "✅ Docker rodando"

# Check pnpm
if ! command -v pnpm &> /dev/null; then
  echo "❌ pnpm não encontrado. Instale com: npm install -g pnpm"
  exit 1
fi

echo "✅ pnpm disponível"

# Install dependencies
echo ""
echo "📦 Instalando dependências..."
pnpm install

# Start Supabase
echo ""
echo "🗄️  Iniciando Supabase local..."
npx supabase start

# Get Supabase credentials
echo ""
echo "📋 Credenciais do Supabase:"
npx supabase status

# Start Redis
echo ""
echo "🔴 Iniciando Redis..."
docker run -d --name agente-ia-redis -p 6379:6379 redis:7-alpine 2>/dev/null || \
  docker start agente-ia-redis 2>/dev/null || true

echo "✅ Redis rodando na porta 6379"

# Run migrations
echo ""
echo "🗃️  Aplicando migrations..."
for f in packages/database/supabase/migrations/*.sql; do
  echo "  → $(basename $f)"
  npx supabase db execute --file "$f" 2>/dev/null || true
done

echo ""
echo "✅ Migrations aplicadas"

# Build packages
echo ""
echo "🔨 Buildando packages..."
pnpm build

echo ""
echo "=========================="
echo "✅ Setup completo!"
echo ""
echo "Para iniciar o desenvolvimento:"
echo "  pnpm dev"
echo ""
echo "Acessos:"
echo "  Dashboard:    http://localhost:3000"
echo "  API:          http://localhost:3001/api/v1/health"
echo "  Supabase:     http://127.0.0.1:54323 (Studio)"
echo ""
echo "Para parar tudo:"
echo "  npx supabase stop"
echo "  docker stop agente-ia-redis"
echo "=========================="
