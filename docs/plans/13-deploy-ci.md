# Plano 13 — Deploy & CI

## Objetivo
Configurar o ambiente de produção com Docker Compose otimizado, Dockerfiles multi-stage para cada serviço, reverse proxy com Nginx, health checks, scripts de deploy, e pipeline de CI básico com GitHub Actions.

## Pré-requisitos
- Todos os planos anteriores concluídos (app funcional em dev)
- VPS com Docker e Docker Compose instalados
- Domínio configurado (DNS apontando para VPS)
- Acesso SSH à VPS

## Estrutura de Arquivos

```
/
├── docker/
│   ├── docker-compose.yml              (base - já existe do plano 02)
│   ├── docker-compose.prod.yml         (override produção)
│   ├── Dockerfile.api                  (já existe, otimizar)
│   ├── Dockerfile.worker               (já existe, otimizar)
│   ├── Dockerfile.dashboard            (já existe, otimizar)
│   ├── nginx/
│   │   ├── nginx.conf
│   │   └── ssl/                        (certs - gitignored)
│   └── scripts/
│       ├── deploy.sh
│       ├── backup-db.sh
│       └── health-check.sh
├── .github/
│   └── workflows/
│       ├── ci.yml                      (lint + build + test)
│       └── deploy.yml                  (deploy para VPS)
└── .env.production.example
```

## Steps

### 1. Criar docker-compose.prod.yml (override)

```yaml
version: '3.8'

services:
  # --- App Services ---
  api:
    build:
      context: ..
      dockerfile: docker/Dockerfile.api
    restart: always
    environment:
      NODE_ENV: production
      PORT: 3001
      SUPABASE_URL: ${SUPABASE_URL}
      SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY}
      SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_ROLE_KEY}
      REDIS_HOST: redis
      REDIS_PORT: 6379
      EVOLUTION_API_URL: http://evolution-api:8080
      EVOLUTION_API_KEY: ${EVOLUTION_API_KEY}
      API_PUBLIC_URL: ${API_PUBLIC_URL}
    depends_on:
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3001/api/v1/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'

  worker:
    build:
      context: ..
      dockerfile: docker/Dockerfile.worker
    restart: always
    environment:
      NODE_ENV: production
      SUPABASE_URL: ${SUPABASE_URL}
      SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_ROLE_KEY}
      REDIS_HOST: redis
      REDIS_PORT: 6379
      EVOLUTION_API_URL: http://evolution-api:8080
      EVOLUTION_API_KEY: ${EVOLUTION_API_KEY}
      WORKER_CONCURRENCY: ${WORKER_CONCURRENCY:-5}
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}
    depends_on:
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "node", "-e", "process.exit(0)"]
      interval: 30s
      timeout: 10s
      retries: 3
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '1.0'

  dashboard:
    build:
      context: ..
      dockerfile: docker/Dockerfile.dashboard
      args:
        NEXT_PUBLIC_SUPABASE_URL: ${SUPABASE_URL}
        NEXT_PUBLIC_SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY}
        NEXT_PUBLIC_API_URL: ${API_PUBLIC_URL}
    restart: always
    environment:
      NODE_ENV: production
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000"]
      interval: 30s
      timeout: 10s
      retries: 3
    deploy:
      resources:
        limits:
          memory: 256M
          cpus: '0.25'

  # --- Infraestrutura ---
  redis:
    image: redis:7-alpine
    restart: always
    command: redis-server --appendonly yes --maxmemory 512mb --maxmemory-policy allkeys-lru --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]
      interval: 10s
      timeout: 5s
      retries: 3

  evolution-api:
    image: atendai/evolution-api:v2.2.3
    restart: always
    environment:
      AUTHENTICATION_API_KEY: ${EVOLUTION_API_KEY}
      DATABASE_PROVIDER: postgresql
      DATABASE_CONNECTION_URI: ${EVOLUTION_DB_URL}
      CACHE_REDIS_ENABLED: "true"
      CACHE_REDIS_URI: redis://:${REDIS_PASSWORD}@redis:6379/1
      CACHE_LOCAL_ENABLED: "false"
    volumes:
      - evolution_instances:/evolution/instances
    depends_on:
      redis:
        condition: service_healthy

  nginx:
    image: nginx:alpine
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - certbot_data:/var/www/certbot:ro
    depends_on:
      - api
      - dashboard

  certbot:
    image: certbot/certbot
    volumes:
      - ./nginx/ssl:/etc/letsencrypt
      - certbot_data:/var/www/certbot
    entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew; sleep 12h & wait $${!}; done;'"

volumes:
  redis_data:
  evolution_instances:
  certbot_data:

networks:
  default:
    name: agente-ia-prod
```

### 2. Criar nginx.conf

```nginx
events {
    worker_connections 1024;
}

http {
    upstream api {
        server api:3001;
    }

    upstream dashboard {
        server dashboard:3000;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=30r/s;
    limit_req_zone $binary_remote_addr zone=webhook_limit:10m rate=100r/s;

    # Redirect HTTP → HTTPS
    server {
        listen 80;
        server_name _;

        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        location / {
            return 301 https://$host$request_uri;
        }
    }

    # API
    server {
        listen 443 ssl;
        server_name api.seudominio.com;

        ssl_certificate /etc/nginx/ssl/live/api.seudominio.com/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/live/api.seudominio.com/privkey.pem;

        # Webhook (rate limit mais alto)
        location /webhook {
            limit_req zone=webhook_limit burst=50 nodelay;
            proxy_pass http://api;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # API routes
        location / {
            limit_req zone=api_limit burst=20 nodelay;
            proxy_pass http://api;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }

    # Dashboard
    server {
        listen 443 ssl;
        server_name app.seudominio.com;

        ssl_certificate /etc/nginx/ssl/live/app.seudominio.com/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/live/app.seudominio.com/privkey.pem;

        location / {
            proxy_pass http://dashboard;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

### 3. Criar script de deploy (docker/scripts/deploy.sh)

```bash
#!/bin/bash
set -e

DEPLOY_DIR="/opt/agente-ia"
COMPOSE_FILE="docker/docker-compose.prod.yml"

echo "=== Deploy Agente IA ==="
echo "Timestamp: $(date)"

cd $DEPLOY_DIR

# Pull latest code
echo "→ Pulling latest code..."
git pull origin main

# Build images
echo "→ Building images..."
docker compose -f $COMPOSE_FILE build --parallel

# Run migrations (se necessário)
echo "→ Running migrations..."
docker compose -f $COMPOSE_FILE run --rm api npx supabase db push || true

# Rolling restart
echo "→ Restarting services..."
docker compose -f $COMPOSE_FILE up -d --remove-orphans

# Wait for health checks
echo "→ Waiting for health checks..."
sleep 10

# Verify
echo "→ Verifying..."
docker compose -f $COMPOSE_FILE ps

# Health check
./docker/scripts/health-check.sh

echo "=== Deploy complete ==="
```

### 4. Criar script de health check (docker/scripts/health-check.sh)

```bash
#!/bin/bash

API_URL="${API_PUBLIC_URL:-http://localhost:3001}"
DASHBOARD_URL="${DASHBOARD_URL:-http://localhost:3000}"

echo "Checking API..."
if curl -sf "$API_URL/api/v1/health" > /dev/null; then
    echo "  ✓ API is healthy"
else
    echo "  ✗ API is DOWN"
    exit 1
fi

echo "Checking Dashboard..."
if curl -sf "$DASHBOARD_URL" > /dev/null; then
    echo "  ✓ Dashboard is healthy"
else
    echo "  ✗ Dashboard is DOWN"
    exit 1
fi

echo "Checking Redis..."
if docker compose -f docker/docker-compose.prod.yml exec -T redis redis-cli ping | grep -q PONG; then
    echo "  ✓ Redis is healthy"
else
    echo "  ✗ Redis is DOWN"
    exit 1
fi

echo ""
echo "All services healthy ✓"
```

### 5. Criar script de backup (docker/scripts/backup-db.sh)

```bash
#!/bin/bash
set -e

BACKUP_DIR="/opt/backups/agente-ia"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=7

mkdir -p $BACKUP_DIR

echo "=== Backup Database ==="
echo "Timestamp: $DATE"

# Dump do Supabase/Postgres
docker compose -f docker/docker-compose.prod.yml exec -T supabase-db \
    pg_dump -U postgres agente_ia | gzip > "$BACKUP_DIR/db_$DATE.sql.gz"

echo "Backup saved: $BACKUP_DIR/db_$DATE.sql.gz"

# Limpar backups antigos
find $BACKUP_DIR -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete
echo "Old backups cleaned (retention: ${RETENTION_DAYS} days)"
```

### 6. Criar GitHub Actions CI (.github/workflows/ci.yml)

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  lint-and-build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Lint
        run: pnpm lint

      - name: Type check
        run: pnpm build

      - name: Format check
        run: pnpm format:check

  docker-build:
    runs-on: ubuntu-latest
    needs: lint-and-build
    steps:
      - uses: actions/checkout@v4

      - name: Build API image
        run: docker build -f docker/Dockerfile.api -t agente-ia/api:test .

      - name: Build Worker image
        run: docker build -f docker/Dockerfile.worker -t agente-ia/worker:test .

      - name: Build Dashboard image
        run: |
          docker build -f docker/Dockerfile.dashboard \
            --build-arg NEXT_PUBLIC_SUPABASE_URL=http://test \
            --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=test \
            --build-arg NEXT_PUBLIC_API_URL=http://test \
            -t agente-ia/dashboard:test .
```

### 7. Criar GitHub Actions Deploy (.github/workflows/deploy.yml)

```yaml
name: Deploy

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    needs: []
    steps:
      - name: Deploy to VPS
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /opt/agente-ia
            bash docker/scripts/deploy.sh
```

### 8. Criar .env.production.example

```env
# === App ===
NODE_ENV=production
API_PUBLIC_URL=https://api.seudominio.com
DASHBOARD_URL=https://app.seudominio.com

# === Supabase ===
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# === Redis ===
REDIS_PASSWORD=strong-redis-password-here

# === Evolution API ===
EVOLUTION_API_KEY=strong-evolution-key-here
EVOLUTION_DB_URL=postgres://postgres:password@supabase-db:5432/evolution

# === AI Providers ===
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# === Worker ===
WORKER_CONCURRENCY=10

# === Secrets (GitHub Actions) ===
# VPS_HOST=your-vps-ip
# VPS_USER=deploy
# VPS_SSH_KEY=your-private-key
```

### 9. Adicionar health endpoint na API

```typescript
// apps/api/src/modules/health/health.controller.ts
import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }
}
```

### 10. Otimizar Dockerfiles para produção

Melhorias nos Dockerfiles existentes:
- Adicionar `NODE_ENV=production` no build stage
- Usar `--production` no install final
- Adicionar `.dockerignore` para excluir node_modules, .git, docs
- Adicionar labels (version, maintainer)
- Usar user não-root no runner stage

### 11. Criar .dockerignore

```
node_modules
.git
.github
docs
*.md
.env*
.turbo
dist
.next
coverage
```

### 12. Setup inicial na VPS

```bash
# Na VPS (manual, uma vez):
sudo apt update && sudo apt install -y docker.io docker-compose-plugin git
sudo usermod -aG docker $USER

# Criar diretório
sudo mkdir -p /opt/agente-ia
sudo chown $USER:$USER /opt/agente-ia

# Clone
cd /opt/agente-ia
git clone git@github.com:seu-user/agente-ia.git .

# Configurar env
cp .env.production.example .env

# Gerar certificados SSL
docker compose -f docker/docker-compose.prod.yml run --rm certbot \
  certonly --webroot -w /var/www/certbot \
  -d api.seudominio.com -d app.seudominio.com

# Primeiro deploy
bash docker/scripts/deploy.sh

# Cron de backup (diário às 3h)
echo "0 3 * * * /opt/agente-ia/docker/scripts/backup-db.sh" | crontab -
```

## Dependências
- Todos os planos anteriores (app funcional)
- VPS com Docker
- Domínio com DNS configurado
- GitHub repo com secrets configurados

## Critérios de Conclusão
- [ ] `docker compose -f docker-compose.prod.yml build` builda todos os serviços
- [ ] `docker compose -f docker-compose.prod.yml up -d` sobe tudo
- [ ] Health checks passam para API, Dashboard, Redis
- [ ] Nginx faz proxy reverso corretamente
- [ ] SSL funciona (HTTPS)
- [ ] Rate limiting aplicado no Nginx
- [ ] CI roda lint + build + docker build em PRs
- [ ] Deploy automático ao push na main
- [ ] Script de backup funciona
- [ ] Graceful restart sem downtime perceptível
- [ ] Logs acessíveis via `docker compose logs`
- [ ] Resource limits aplicados (memory/cpu)
