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
