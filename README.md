# Agente IA

Plataforma de agentes de IA para atendimento via WhatsApp com suporte a RAG, fluxos conversacionais e multi-tenancy.

## Arquitetura

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Dashboard  │────▶│   API       │────▶│   Worker    │
│  (Next.js)  │     │  (NestJS)   │     │  (BullMQ)   │
└─────────────┘     └──────┬──────┘     └──────┬──────┘
                           │                    │
                    ┌──────┴──────┐      ┌──────┴──────┐
                    │  Supabase   │      │    Redis    │
                    │  (Postgres) │      │   (Filas)   │
                    └─────────────┘      └─────────────┘
                           │
                    ┌──────┴──────┐
                    │  Evolution  │
                    │  API (WA)   │
                    └─────────────┘
```

## Stack

- **Frontend**: Next.js 15, React 19, Tailwind CSS v4
- **Backend**: NestJS 10, Fastify, BullMQ
- **Database**: Supabase (PostgreSQL + Auth + Storage)
- **AI**: Vercel AI SDK (OpenAI, Anthropic)
- **WhatsApp**: Evolution API
- **Infra**: Docker, Turborepo, pnpm workspaces

## Estrutura do Monorepo

```
apps/
  api/          → API REST (NestJS + Fastify)
  worker/       → Processador de filas (BullMQ)
  dashboard/    → Painel administrativo (Next.js)
packages/
  shared/       → Tipos e constantes compartilhados
  database/     → Client Supabase e migrations
  ai/           → Motor de IA (generate, stream, RAG, tools)
```

## Pré-requisitos

- Node.js 20+
- pnpm 9+
- Docker e Docker Compose
- Conta Supabase (ou Supabase local)
- Chave de API OpenAI e/ou Anthropic

## Setup Local

```bash
# 1. Clonar e instalar
git clone <repo-url>
cd agente-ia
pnpm install

# 2. Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com suas credenciais

# 3. Subir infraestrutura
docker compose up -d

# 4. Rodar migrations
pnpm --filter @agente-ia/database migrate

# 5. Desenvolvimento
pnpm dev
```

## Scripts

| Comando | Descrição |
|---------|-----------|
| `pnpm dev` | Inicia todos os apps em modo desenvolvimento |
| `pnpm build` | Build de produção de todos os packages |
| `pnpm lint` | Lint em todos os packages |
| `pnpm --filter @agente-ia/api dev` | Apenas a API |
| `pnpm --filter @agente-ia/worker dev` | Apenas o Worker |
| `pnpm --filter @agente-ia/dashboard dev` | Apenas o Dashboard |

## Deploy (Produção)

```bash
# Build e start com Docker Compose
docker compose -f docker-compose.prod.yml up -d --build
```

## Módulos da API

| Endpoint | Descrição |
|----------|-----------|
| `GET /api/v1/health` | Health check |
| `CRUD /api/v1/organizations` | Organizações (multi-tenant) |
| `CRUD /api/v1/agents` | Agentes de IA |
| `CRUD /api/v1/conversations` | Conversas |
| `CRUD /api/v1/knowledge-bases` | Bases de conhecimento + documentos |
| `CRUD /api/v1/flows` | Fluxos conversacionais |
| `GET/POST /api/v1/whatsapp/instances` | Instâncias WhatsApp |
| `POST /api/v1/webhook/evolution` | Webhook Evolution API |

## Segurança

- Autenticação via Supabase JWT (Bearer token)
- Verificação de pertencimento à organização em cada request
- Webhook protegido por API key
- Validação de input com Zod em todos os endpoints
- Rate limiting no processamento de mensagens

## Variáveis de Ambiente

Veja `.env.example` para a lista completa.

## Licença

Proprietário - Todos os direitos reservados.
