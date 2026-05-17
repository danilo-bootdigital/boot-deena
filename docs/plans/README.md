# Planos do Projeto — Agente IA

## Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                        NGINX (Proxy)                         │
├──────────────────────────┬──────────────────────────────────┤
│   Dashboard (Next.js)    │         API (NestJS)             │
│   app.dominio.com        │         api.dominio.com          │
└──────────────────────────┴──────────────┬───────────────────┘
                                          │ BullMQ
                                          ▼
                                   ┌─────────────┐
                                   │   Worker     │
                                   │  (NestJS)    │
                                   └──────┬──────┘
                          ┌───────────────┼───────────────┐
                          ▼               ▼               ▼
                    ┌──────────┐   ┌──────────┐   ┌──────────────┐
                    │  Redis   │   │ Supabase │   │ Evolution API│
                    │(BullMQ)  │   │(Postgres)│   │  (WhatsApp)  │
                    └──────────┘   └──────────┘   └──────────────┘
```

## Stack
- **Backend:** NestJS + Fastify + TypeScript
- **Frontend:** Next.js 15 (App Router) + Tailwind CSS
- **AI:** Vercel AI SDK (OpenAI, Anthropic)
- **Database:** Supabase (Postgres + Auth + Storage + pgvector)
- **Queue:** BullMQ + Redis
- **WhatsApp:** Evolution API v2
- **Monorepo:** Turborepo + pnpm
- **Deploy:** Docker Compose em VPS + Nginx + Let's Encrypt

## Planos (ordem de execução)

| # | Plano | Arquivo | Depende de |
|---|-------|---------|------------|
| 01 | Setup do Monorepo | [01-setup-monorepo.md](./01-setup-monorepo.md) | — |
| 02 | Infraestrutura Docker | [02-infraestrutura-docker.md](./02-infraestrutura-docker.md) | 01 |
| 03 | Database & Schema | [03-database-schema.md](./03-database-schema.md) | 01, 02 |
| 04 | API Core (NestJS) | [04-api-core.md](./04-api-core.md) | 01, 02, 03 |
| 05 | Worker (BullMQ) | [05-worker-bullmq.md](./05-worker-bullmq.md) | 01, 02, 03, 04 |
| 06 | Motor de IA | [06-motor-ia.md](./06-motor-ia.md) | 01, 03, 05 |
| 07 | RAG & Knowledge Base | [07-rag-knowledge-base.md](./07-rag-knowledge-base.md) | 03, 05, 06 |
| 08 | Fluxos Multi-Agente | [08-fluxos-multi-agente.md](./08-fluxos-multi-agente.md) | 03, 05, 06 |
| 09 | Dashboard: Auth & Layout | [09-dashboard-auth-layout.md](./09-dashboard-auth-layout.md) | 01, 02, 03 |
| 10 | Dashboard: Inbox | [10-dashboard-inbox.md](./10-dashboard-inbox.md) | 04, 09 |
| 11 | Dashboard: Gestão de Agentes | [11-dashboard-gestao-agentes.md](./11-dashboard-gestao-agentes.md) | 04, 06, 07, 09 |
| 12 | Dashboard: Evolution API | [12-dashboard-evolution-api.md](./12-dashboard-evolution-api.md) | 04, 09 |
| 13 | Deploy & CI | [13-deploy-ci.md](./13-deploy-ci.md) | Todos |

## Grafo de Dependências

```
01 ──→ 02 ──→ 03 ──→ 04 ──→ 05 ──→ 06 ──→ 07
                │                    │       ↓
                │                    └──→ 08
                │
                └──→ 09 ──→ 10
                      │──→ 11
                      └──→ 12

                            Todos ──→ 13
```

## Paralelização Possível

Após o plano 06, os seguintes podem ser feitos em paralelo:
- 07 (RAG) e 08 (Fluxos) — independentes entre si
- 10 (Inbox), 11 (Agentes), 12 (WhatsApp) — independentes entre si (todos dependem do 09)

## Como Executar

Para executar cada plano, basta abrir o arquivo correspondente e seguir os steps em ordem. Cada plano é auto-contido com:
- Objetivo claro
- Pré-requisitos listados
- Estrutura de arquivos a criar
- Steps numerados com código completo
- Critérios de conclusão (checklist)
