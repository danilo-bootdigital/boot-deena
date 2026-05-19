CREATE TABLE flows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  trigger_keywords TEXT[] DEFAULT '{}',
  trigger_intent VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE flow_steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  flow_id UUID NOT NULL REFERENCES flows(id) ON DELETE CASCADE,
  type VARCHAR(30) NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  config JSONB NOT NULL DEFAULT '{}',
  next_step_id UUID REFERENCES flow_steps(id) ON DELETE SET NULL,
  condition_true_step_id UUID REFERENCES flow_steps(id) ON DELETE SET NULL,
  condition_false_step_id UUID REFERENCES flow_steps(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE agent_flows (
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  flow_id UUID NOT NULL REFERENCES flows(id) ON DELETE CASCADE,
  priority INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (agent_id, flow_id)
);

CREATE INDEX idx_flows_org ON flows(organization_id);
CREATE INDEX idx_flow_steps_flow ON flow_steps(flow_id);
CREATE INDEX idx_agent_flows_agent ON agent_flows(agent_id);

-- RLS
ALTER TABLE flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE flow_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_flows" ON flows
  FOR ALL USING (organization_id = current_setting('app.current_org_id')::uuid);

CREATE POLICY "org_flow_steps" ON flow_steps
  FOR ALL USING (
    flow_id IN (SELECT id FROM flows WHERE organization_id = current_setting('app.current_org_id')::uuid)
  );
