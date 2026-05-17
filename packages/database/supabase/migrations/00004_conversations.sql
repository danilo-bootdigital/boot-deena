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
