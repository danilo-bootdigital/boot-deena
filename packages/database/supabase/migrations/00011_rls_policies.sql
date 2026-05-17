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

-- Organizations
CREATE POLICY "Members can view their organizations"
  ON organizations FOR SELECT
  USING (id IN (SELECT get_user_org_ids()));

CREATE POLICY "Owners can update their organizations"
  ON organizations FOR UPDATE
  USING (id IN (
    SELECT organization_id FROM org_members
    WHERE user_id = auth.uid() AND role = 'owner'
  ));

-- Org Members
CREATE POLICY "Members can view org members"
  ON org_members FOR SELECT
  USING (organization_id IN (SELECT get_user_org_ids()));

-- Agents
CREATE POLICY "Org members can view agents"
  ON agents FOR SELECT
  USING (organization_id IN (SELECT get_user_org_ids()));

CREATE POLICY "Org admins can manage agents"
  ON agents FOR ALL
  USING (organization_id IN (
    SELECT organization_id FROM org_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));

-- Conversations
CREATE POLICY "Org members can view conversations"
  ON conversations FOR SELECT
  USING (organization_id IN (SELECT get_user_org_ids()));

-- Messages
CREATE POLICY "Org members can view messages"
  ON messages FOR SELECT
  USING (organization_id IN (SELECT get_user_org_ids()));

-- Knowledge Bases
CREATE POLICY "Org members can view knowledge bases"
  ON knowledge_bases FOR SELECT
  USING (organization_id IN (SELECT get_user_org_ids()));

CREATE POLICY "Org admins can manage knowledge bases"
  ON knowledge_bases FOR ALL
  USING (organization_id IN (
    SELECT organization_id FROM org_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));

-- Documents
CREATE POLICY "Org members can view documents"
  ON documents FOR SELECT
  USING (organization_id IN (SELECT get_user_org_ids()));

-- Document Chunks
CREATE POLICY "Org members can view chunks"
  ON document_chunks FOR SELECT
  USING (organization_id IN (SELECT get_user_org_ids()));

-- Agent Tools
CREATE POLICY "Org members can view agent tools"
  ON agent_tools FOR SELECT
  USING (organization_id IN (SELECT get_user_org_ids()));

CREATE POLICY "Org admins can manage agent tools"
  ON agent_tools FOR ALL
  USING (organization_id IN (
    SELECT organization_id FROM org_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));

-- Flows
CREATE POLICY "Org members can view flows"
  ON flows FOR SELECT
  USING (organization_id IN (SELECT get_user_org_ids()));

CREATE POLICY "Org admins can manage flows"
  ON flows FOR ALL
  USING (organization_id IN (
    SELECT organization_id FROM org_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));

-- Flow Steps (via flow ownership)
CREATE POLICY "Org members can view flow steps"
  ON flow_steps FOR SELECT
  USING (flow_id IN (
    SELECT id FROM flows WHERE organization_id IN (SELECT get_user_org_ids())
  ));

-- WhatsApp Instances
CREATE POLICY "Org members can view whatsapp instances"
  ON whatsapp_instances FOR SELECT
  USING (organization_id IN (SELECT get_user_org_ids()));

CREATE POLICY "Org admins can manage whatsapp instances"
  ON whatsapp_instances FOR ALL
  USING (organization_id IN (
    SELECT organization_id FROM org_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));
