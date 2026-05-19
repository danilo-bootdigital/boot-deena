-- ============================================================
-- Migration: Tabela de anexos de conversas (exames, documentos, imagens)
-- Data: 2025-05-18
-- ============================================================

CREATE TABLE IF NOT EXISTS public.conversation_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  mimetype TEXT NOT NULL,
  file_size INTEGER,
  storage_path TEXT NOT NULL,
  public_url TEXT,
  uploaded_by TEXT NOT NULL DEFAULT 'patient' CHECK (uploaded_by IN ('patient', 'agent', 'operator')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.conversation_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view attachments"
  ON public.conversation_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.org_members
      WHERE org_members.organization_id = conversation_attachments.organization_id
        AND org_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role full access on attachments"
  ON public.conversation_attachments FOR ALL
  USING (auth.role() = 'service_role');

CREATE INDEX idx_attachments_conversation ON public.conversation_attachments(conversation_id);
CREATE INDEX idx_attachments_org ON public.conversation_attachments(organization_id);
