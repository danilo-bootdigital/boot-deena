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
