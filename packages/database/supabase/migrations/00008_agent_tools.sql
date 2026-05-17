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
