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
