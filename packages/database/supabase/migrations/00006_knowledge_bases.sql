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
