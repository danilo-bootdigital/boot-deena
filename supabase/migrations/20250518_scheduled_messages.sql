-- ============================================================
-- Migration: Sistema de Mensagens Agendadas
-- Data: 2025-05-18
-- ============================================================

CREATE TABLE IF NOT EXISTS public.scheduled_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  contact_phone TEXT NOT NULL,
  instance_name TEXT NOT NULL,
  message_type TEXT NOT NULL CHECK (message_type IN (
    'follow_up_1h', 'follow_up_24h', 'follow_up_3d',
    'confirmation_24h', 'no_show', 'post_consultation', 'reactivation',
    'custom'
  )),
  content TEXT NOT NULL,
  variables JSONB DEFAULT '{}',
  scheduled_for TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'cancelled', 'failed')),
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.scheduled_messages ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Org members can view scheduled messages"
  ON public.scheduled_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.org_members
      WHERE org_members.organization_id = scheduled_messages.organization_id
        AND org_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Org owners/admins can manage scheduled messages"
  ON public.scheduled_messages FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.org_members
      WHERE org_members.organization_id = scheduled_messages.organization_id
        AND org_members.user_id = auth.uid()
        AND org_members.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Service role full access on scheduled_messages"
  ON public.scheduled_messages FOR ALL
  USING (auth.role() = 'service_role');

-- Indexes
CREATE INDEX idx_scheduled_messages_pending ON public.scheduled_messages(status, scheduled_for) WHERE status = 'pending';
CREATE INDEX idx_scheduled_messages_conversation ON public.scheduled_messages(conversation_id);
CREATE INDEX idx_scheduled_messages_org ON public.scheduled_messages(organization_id);
CREATE INDEX idx_scheduled_messages_agent ON public.scheduled_messages(agent_id);

-- Trigger updated_at
CREATE TRIGGER scheduled_messages_updated_at
  BEFORE UPDATE ON public.scheduled_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
