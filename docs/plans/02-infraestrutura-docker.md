# Plano 02 — Infraestrutura Docker

## Objetivo
Configurar Docker Compose com todos os serviços de infraestrutura (Redis, Supabase, Evolution API) e os containers da aplicação (API, Worker, Dashboard) para desenvolvimento local e produção.

## Pré-requisitos
- Plano 01 concluído (monorepo configurado)
- Docker e Docker Compose instalados
- Portas 3000, 3001, 5432, 6379, 8080, 54321 disponíveis

## Estrutura de Arquivos Criados

```
docker/
├── docker-compose.yml            (desenvolvimento)
├── docker-compose.prod.yml       (produção - override)
├── .env.docker                   (variáveis para compose)
├── Dockerfile.api
├── Dockerfile.worker
├── Dockerfile.dashboard
├── nginx/
│   └── nginx.conf                (reverse proxy - produção)
└── volumes/                      (gitignored, dados locais)
```

## Steps

### 1. Criar docker-compose.yml (desenvolvimento)

```yaml
version: '3.8'

services:
  # --- Infraestrutura ---
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 3

  supabase-db:
    image: supabase/postgres:15.6.1.143
    ports:
      - "5432:5432"
    environment:
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-postgres}
      POSTGRES_DB: agente_ia
    volumes:
      - supabase_db_data:/var/lib/postgresql/data
      - ./supabase/migrations:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  supabase-studio:
    image: supabase/studio:20241202-71e5240
    ports:
      - "54323:3000"
    environment:
      STUDIO_PG_META_URL: http://supabase-meta:8080
      SUPABASE_URL: http://supabase-kong:8000
      SUPABASE_REST_URL: http://supabase-kong:8000/rest/v1/
    depends_on:
      supabase-db:
        condition: service_healthy

  supabase-auth:
    image: supabase/gotrue:v2.164.0
    ports:
      - "9999:9999"
    environment:
      GOTRUE_API_HOST: 0.0.0.0
      GOTRUE_API_PORT: 9999
      API_EXTERNAL_URL: http://localhost:54321
      GOTRUE_DB_DRIVER: postgres
      GOTRUE_DB_DATABASE_URL: postgres://supabase_auth_admin:postgres@supabase-db:5432/agente_ia
      GOTRUE_SITE_URL: http://localhost:3000
      GOTRUE_JWT_SECRET: ${JWT_SECRET:-super-secret-jwt-token-with-at-least-32-characters}
      GOTRUE_JWT_EXP: 3600
      GOTRUE_DISABLE_SIGNUP: "false"
    depends_on:
      supabase-db:
        condition: service_healthy

  supabase-rest:
    image: postgrest/postgrest:v12.2.3
    ports:
      - "3100:3000"
    environment:
      PGRST_DB_URI: postgres://authenticator:postgres@supabase-db:5432/agente_ia
      PGRST_DB_SCHEMAS: public,storage
      PGRST_DB_ANON_ROLE: anon
      PGRST_JWT_SECRET: ${JWT_SECRET:-super-secret-jwt-token-with-at-least-32-characters}
    depends_on:
      supabase-db:
        condition: service_healthy

  evolution-api:
    image: atendai/evolution-api:v2.2.3
    ports:
      - "8080:8080"
    environment:
      AUTHENTICATION_API_KEY: ${EVOLUTION_API_KEY:-your-evolution-api-key}
      DATABASE_PROVIDER: postgresql
      DATABASE_CONNECTION_URI: postgres://postgres:postgres@supabase-db:5432/evolution
      DATABASE_CONNECTION_CLIENT_NAME: evolution
      CACHE_REDIS_ENABLED: "true"
      CACHE_REDIS_URI: redis://redis:6379/1
      CACHE_LOCAL_ENABLED: "false"
    volumes:
      - evolution_instances:/evolution/instances
    depends_on:
      redis:
        condition: service_healthy
      supabase-db:
        condition: service_healthy

volumes:
  redis_data:
  supabase_db_data:
  evolution_instances:

networks:
  default:
    name: agente-ia-network
```

### 2. Criar .env.docker

```env
# Postgres
POSTGRES_PASSWORD=postgres

# JWT (Supabase Auth)
JWT_SECRET=super-secret-jwt-token-with-at-least-32-characters-long

# Evolution API
EVOLUTION_API_KEY=your-evolution-api-key-change-me

# Redis
REDIS_URL=redis://redis:6379/0

# App
NODE_ENV=development
```

### 3. Criar Dockerfile.api

```dockerfile
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
COPY packages/database/package.json ./packages/database/
RUN pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/packages/database/node_modules ./packages/database/node_modules
COPY . .
RUN pnpm --filter @agente-ia/shared build
RUN pnpm --filter @agente-ia/database build
RUN pnpm --filter @agente-ia/api build

FROM base AS runner
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/node_modules ./node_modules
COPY --from=builder /app/apps/api/package.json ./

EXPOSE 3001
CMD ["node", "dist/main.js"]
```

### 4. Criar Dockerfile.worker

```dockerfile
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/worker/package.json ./apps/worker/
COPY packages/shared/package.json ./packages/shared/
COPY packages/database/package.json ./packages/database/
COPY packages/ai/package.json ./packages/ai/
RUN pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/worker/node_modules ./apps/worker/node_modules
COPY --from=deps /app/packages/ ./packages/
COPY . .
RUN pnpm --filter @agente-ia/shared build
RUN pnpm --filter @agente-ia/database build
RUN pnpm --filter @agente-ia/ai build
RUN pnpm --filter @agente-ia/worker build

FROM base AS runner
COPY --from=builder /app/apps/worker/dist ./dist
COPY --from=builder /app/apps/worker/node_modules ./node_modules
COPY --from=builder /app/apps/worker/package.json ./

CMD ["node", "dist/main.js"]
```

### 5. Criar Dockerfile.dashboard

```dockerfile
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/dashboard/package.json ./apps/dashboard/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/dashboard/node_modules ./apps/dashboard/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @agente-ia/shared build
RUN pnpm --filter @agente-ia/dashboard build

FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=builder /app/apps/dashboard/.next/standalone ./
COPY --from=builder /app/apps/dashboard/.next/static ./.next/static
COPY --from=builder /app/apps/dashboard/public ./public

EXPOSE 3000
CMD ["node", "server.js"]
```

### 6. Comandos de uso

```bash
# Subir infraestrutura (dev)
docker compose up -d redis supabase-db evolution-api

# Subir tudo
docker compose up -d

# Ver logs
docker compose logs -f evolution-api

# Parar tudo
docker compose down

# Limpar volumes (reset total)
docker compose down -v
```

## Dependências
- Plano 01 (monorepo precisa existir para os Dockerfiles)

## Critérios de Conclusão
- [ ] `docker compose up -d` sobe todos os serviços sem erro
- [ ] Redis responde em `localhost:6379`
- [ ] Postgres responde em `localhost:5432`
- [ ] Evolution API responde em `localhost:8080`
- [ ] Health checks passam para todos os serviços
- [ ] Containers da app (api, worker, dashboard) buildam com sucesso
- [ ] Network compartilhada permite comunicação entre serviços
