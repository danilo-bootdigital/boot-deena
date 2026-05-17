# Plano 03 — Database & Schema

## Objetivo
Definir o schema completo do banco de dados com suporte multi-tenant, criar migrations Supabase, configurar Row Level Security (RLS), habilitar pgvector para RAG, e gerar tipos TypeScript automaticamente.

## Pré-requisitos
- Plano 01 concluído (monorepo)
- Plano 02 concluído (Supabase rodando via Docker)
- Supabase CLI instalado (`pnpm add -D supabase` no packages/database)

## Estrutura de Arquivos Criados

```
packages/database/
├── supabase/
│   ├── config.toml
│   ├── migrations/
│   │   ├── 00001_extensions.sql
│   │   ├── 00002_organizations.sql
│   │   ├── 00003_agents.sql
│   │   ├── 00004_conversations.sql
│   │   ├── 00005_messages.sql
│   │   ├── 00006_knowledge_bases.sql
│   │   ├── 00007_documents.sql
│   │   ├── 00008_agent_tools.sql
│   │   ├── 00009_flows.sql
│   │   └── 00010_rls_policies.sql
│   └── seed.sql
├── src/
│   ├── index.ts
│   ├── client.ts
│   ├── admin.ts
│   └── types/
│       └── supabase.ts          (gerado automaticamente)
```

## Schema (Diagrama ER Simplificado)

```
organizations
  ├── members (org_members)
  ├── agents
  │   ├── agent_tools
  │   ├── agent_knowledge_bases (junction)
  │   └── agent_flows
  ├── conversations
  │   └── messages
  ├── knowledge_bases
  │   └── documents
  │       └── document_chunks (embeddings)
  ├── flows
  │   └── flow_steps
  └── whatsapp_instances
```

## Steps

### 1. Inicializar Supabase no package database

```bash
cd packages/database
npx supabase init
```

### 2. Migration: Extensions (00001_extensions.sql)

```sql
-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";        -- pgvector para RAG
CREATE EXTENSION IF NOT EXISTS "pg_trgm";       -- busca fuzzy
CREATE EXTENSION IF NOT EXISTS "moddatetime";   -- updated_at automático
```

### 3. Migration: Organizations (00002_organizations.sql)

```sql
CREATE TYPE org_role AS ENUM ('owner', 'admin', 'member');
CREATE TYPE subscription_plan AS ENUM ('free', 'starter', 'pro', 'enterprise');

CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  plan subscription_plan NOT NULL DEFAULT 'free',
  settings JSONB NOT NULL DEFAULT '{}',
  max_agents INTEGER NOT NULL DEFAULT 3,
  max_conversations_per_month INTEGER NOT NULL DEFAULT 1000,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE org_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role org_role NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

CREATE INDEX idx_org_members_user ON org_members(user_id);
CREATE INDEX idx_org_members_org ON org_members(organization_id);

CREATE TRIGGER organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);
```

### 4. Migration: Agents (00003_agents.sql)

```sql
CREATE TYPE agent_status AS ENUM ('active', 'inactive', 'draft');
CREATE TYPE ai_provider AS ENUM ('openai', 'anthropic', 'google');
CREATE TYPE ai_model AS ENUM (
  'gpt-4o', 'gpt-4o-mini',
  'claude-sonnet-4-6', 'claude-haiku-4-5',
  'gemini-2.0-flash'
);

CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status agent_status NOT NULL DEFAULT 'draft',
  system_prompt TEXT NOT NULL DEFAULT '',
  provider ai_provider NOT NULL DEFAULT 'openai',
  model ai_model NOT NULL DEFAULT 'gpt-4o-mini',
  temperature DECIMAL(3,2) NOT NULL DEFAULT 0.7 CHECK (temperature >= 0 AND temperature <= 2),
  max_tokens INTEGER NOT NULL DEFAULT 1024,
  settings JSONB NOT NULL DEFAULT '{}',
  whatsapp_instance_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_agents_org ON agents(organization_id);
CREATE INDEX idx_agents_status ON agents(organization_id, status);

CREATE TRIGGER agents_updated_at
  BEFORE UPDATE ON agents
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);
```

### 5. Migration: Conversations (00004_conversations.sql)

```sql
CREATE TYPE conversation_status AS ENUM ('active', 'closed', 'archived', 'waiting_human');
CREATE TYPE conversation_channel AS ENUM ('whatsapp', 'web', 'api');

CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE SET NULL,
  contact_phone TEXT,
  contact_name TEXT,
  contact_push_name TEXT,
  channel conversation_channel NOT NULL DEFAULT 'whatsapp',
  status conversation_status NOT NULL DEFAULT 'active',
  metadata JSONB NOT NULL DEFAULT '{}',
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_conversations_org ON conversations(organization_id);
CREATE INDEX idx_conversations_agent ON conversations(agent_id);
CREATE INDEX idx_conversations_contact ON conversations(organization_id, contact_phone);
CREATE INDEX idx_conversations_status ON conversations(organization_id, status);
CREATE INDEX idx_conversations_last_msg ON conversations(organization_id, last_message_at DESC);

CREATE TRIGGER conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);
```

### 6. Migration: Messages (00005_messages.sql)

```sql
CREATE TYPE message_role AS ENUM ('user', 'assistant', 'system', 'tool');
CREATE TYPE message_type AS ENUM ('text', 'image', 'audio', 'video', 'document', 'location', 'sticker');

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role message_role NOT NULL,
  type message_type NOT NULL DEFAULT 'text',
  content TEXT,
  media_url TEXT,
  media_mime_type TEXT,
  tool_calls JSONB,
  tool_results JSONB,
  tokens_input INTEGER,
  tokens_output INTEGER,
  cost_cents DECIMAL(10,4),
  whatsapp_message_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at);
CREATE INDEX idx_messages_org ON messages(organization_id);
CREATE INDEX idx_messages_whatsapp_id ON messages(whatsapp_message_id) WHERE whatsapp_message_id IS NOT NULL;
```

### 7. Migration: Knowledge Bases (00006_knowledge_bases.sql)

```sql
CREATE TYPE kb_status AS ENUM ('active', 'processing', 'error');

CREATE TABLE knowledge_bases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status kb_status NOT NULL DEFAULT 'active',
  embedding_model TEXT NOT NULL DEFAULT 'text-embedding-3-small',
  chunk_size INTEGER NOT NULL DEFAULT 512,
  chunk_overlap INTEGER NOT NULL DEFAULT 50,
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE agent_knowledge_bases (
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  knowledge_base_id UUID NOT NULL REFERENCES knowledge_bases(id) ON DELETE CASCADE,
  PRIMARY KEY (agent_id, knowledge_base_id)
);

CREATE INDEX idx_kb_org ON knowledge_bases(organization_id);

CREATE TRIGGER knowledge_bases_updated_at
  BEFORE UPDATE ON knowledge_bases
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);
```

### 8. Migration: Documents (00007_documents.sql)

```sql
CREATE TYPE document_status AS ENUM ('pending', 'processing', 'ready', 'error');

CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  knowledge_base_id UUID NOT NULL REFERENCES knowledge_bases(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  source_url TEXT,
  mime_type TEXT,
  size_bytes INTEGER,
  status document_status NOT NULL DEFAULT 'pending',
  error_message TEXT,
  chunk_count INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE document_chunks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  knowledge_base_id UUID NOT NULL REFERENCES knowledge_bases(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding vector(1536),
  chunk_index INTEGER NOT NULL,
  token_count INTEGER,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_documents_kb ON documents(knowledge_base_id);
CREATE INDEX idx_chunks_document ON document_chunks(document_id);
CREATE INDEX idx_chunks_kb ON document_chunks(knowledge_base_id);
CREATE INDEX idx_chunks_embedding ON document_chunks
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

CREATE TRIGGER documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);
```

### 9. Migration: Agent Tools (00008_agent_tools.sql)

```sql
CREATE TYPE tool_type AS ENUM ('function', 'api_call', 'webhook', 'builtin');

CREATE TABLE agent_tools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  type tool_type NOT NULL DEFAULT 'function',
  parameters_schema JSONB NOT NULL DEFAULT '{}',
  endpoint_url TEXT,
  headers JSONB,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_agent_tools_agent ON agent_tools(agent_id);

CREATE TRIGGER agent_tools_updated_at
  BEFORE UPDATE ON agent_tools
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);
```

### 10. Migration: Flows (00009_flows.sql)

```sql
CREATE TYPE flow_status AS ENUM ('active', 'inactive', 'draft');
CREATE TYPE flow_step_type AS ENUM ('message', 'condition', 'tool_call', 'handoff', 'wait', 'set_variable');

CREATE TABLE flows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status flow_status NOT NULL DEFAULT 'draft',
  trigger_keywords TEXT[],
  trigger_intent TEXT,
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE flow_steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  flow_id UUID NOT NULL REFERENCES flows(id) ON DELETE CASCADE,
  type flow_step_type NOT NULL,
  position INTEGER NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  next_step_id UUID REFERENCES flow_steps(id),
  condition_true_step_id UUID REFERENCES flow_steps(id),
  condition_false_step_id UUID REFERENCES flow_steps(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE agent_flows (
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  flow_id UUID NOT NULL REFERENCES flows(id) ON DELETE CASCADE,
  priority INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (agent_id, flow_id)
);

CREATE INDEX idx_flows_org ON flows(organization_id);
CREATE INDEX idx_flow_steps_flow ON flow_steps(flow_id, position);

CREATE TRIGGER flows_updated_at
  BEFORE UPDATE ON flows
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);
```

### 11. Migration: WhatsApp Instances (adicionar tabela)

```sql
CREATE TYPE instance_status AS ENUM ('connected', 'disconnected', 'connecting', 'qr_pending');

CREATE TABLE whatsapp_instances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  instance_name TEXT NOT NULL,
  instance_id TEXT UNIQUE,
  phone_number TEXT,
  status instance_status NOT NULL DEFAULT 'disconnected',
  evolution_instance_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE agents
  ADD CONSTRAINT fk_agents_whatsapp_instance
  FOREIGN KEY (whatsapp_instance_id) REFERENCES whatsapp_instances(id) ON DELETE SET NULL;

CREATE INDEX idx_whatsapp_instances_org ON whatsapp_instances(organization_id);

CREATE TRIGGER whatsapp_instances_updated_at
  BEFORE UPDATE ON whatsapp_instances
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);
```

### 12. Migration: RLS Policies (00010_rls_policies.sql)

```sql
-- Habilitar RLS em todas as tabelas
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_bases ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE flow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_instances ENABLE ROW LEVEL SECURITY;

-- Função helper: retorna org_ids do usuário atual
CREATE OR REPLACE FUNCTION get_user_org_ids()
RETURNS SETOF UUID AS $$
  SELECT organization_id FROM org_members WHERE user_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Organizations: membros podem ver suas orgs
CREATE POLICY "Members can view their organizations"
  ON organizations FOR SELECT
  USING (id IN (SELECT get_user_org_ids()));

CREATE POLICY "Owners can update their organizations"
  ON organizations FOR UPDATE
  USING (id IN (
    SELECT organization_id FROM org_members
    WHERE user_id = auth.uid() AND role = 'owner'
  ));

-- Agents: membros da org podem ver/editar
CREATE POLICY "Org members can view agents"
  ON agents FOR SELECT
  USING (organization_id IN (SELECT get_user_org_ids()));

CREATE POLICY "Org admins can manage agents"
  ON agents FOR ALL
  USING (organization_id IN (
    SELECT organization_id FROM org_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));

-- Conversations: membros da org podem ver
CREATE POLICY "Org members can view conversations"
  ON conversations FOR SELECT
  USING (organization_id IN (SELECT get_user_org_ids()));

-- Messages: membros da org podem ver
CREATE POLICY "Org members can view messages"
  ON messages FOR SELECT
  USING (organization_id IN (SELECT get_user_org_ids()));

-- Knowledge Bases: membros da org
CREATE POLICY "Org members can view knowledge bases"
  ON knowledge_bases FOR SELECT
  USING (organization_id IN (SELECT get_user_org_ids()));

CREATE POLICY "Org admins can manage knowledge bases"
  ON knowledge_bases FOR ALL
  USING (organization_id IN (
    SELECT organization_id FROM org_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));

-- Service role bypass (para API/Worker)
-- O service_role key bypassa RLS automaticamente no Supabase
```

### 13. Criar seed.sql

```sql
-- Seed para desenvolvimento
INSERT INTO organizations (id, name, slug, plan) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Dev Organization', 'dev-org', 'pro');
```

### 14. Configurar client TypeScript (packages/database/src/client.ts)

```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types/supabase';

export function createSupabaseClient(supabaseUrl: string, supabaseKey: string) {
  return createClient<Database>(supabaseUrl, supabaseKey);
}

export type SupabaseClient = ReturnType<typeof createSupabaseClient>;
```

### 15. Configurar admin client (packages/database/src/admin.ts)

```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types/supabase';

export function createSupabaseAdmin(supabaseUrl: string, serviceRoleKey: string) {
  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export type SupabaseAdmin = ReturnType<typeof createSupabaseAdmin>;
```

### 16. Gerar tipos TypeScript

```bash
cd packages/database
npx supabase gen types typescript --local > src/types/supabase.ts
```

### 17. Rodar migrations

```bash
cd packages/database
npx supabase db push
npx supabase db reset  # aplica migrations + seed
```

## Dependências
- Plano 01 (monorepo)
- Plano 02 (Supabase rodando)

## Critérios de Conclusão
- [ ] Todas as migrations rodam sem erro (`supabase db reset`)
- [ ] Tipos TypeScript gerados corretamente
- [ ] RLS policies funcionam (teste com anon key vs service_role)
- [ ] pgvector habilitado e index criado
- [ ] Seed data inserido com sucesso
- [ ] `@agente-ia/database` exporta client e tipos corretamente
