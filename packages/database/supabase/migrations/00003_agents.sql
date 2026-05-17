CREATE TYPE agent_status AS ENUM ('active', 'inactive', 'draft');
CREATE TYPE ai_provider AS ENUM ('openai', 'anthropic');
CREATE TYPE ai_model AS ENUM (
  'gpt-4o', 'gpt-4o-mini',
  'claude-sonnet-4-20250514', 'claude-haiku-4-20250514'
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
