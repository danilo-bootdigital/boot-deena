-- ============================================================
-- Migration: Vincular membros a WhatsApp e Pipeline
-- Data: 2025-05-19
-- ============================================================

-- Tabela de vinculação membro → instância WhatsApp
CREATE TABLE IF NOT EXISTS public.member_whatsapp_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  whatsapp_instance_id UUID NOT NULL REFERENCES public.whatsapp_instances(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, whatsapp_instance_id)
);

ALTER TABLE public.member_whatsapp_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on member_whatsapp_access"
  ON public.member_whatsapp_access FOR ALL
  USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_member_whatsapp_user ON public.member_whatsapp_access(user_id);
CREATE INDEX IF NOT EXISTS idx_member_whatsapp_instance ON public.member_whatsapp_access(whatsapp_instance_id);

-- Tabela de vinculação membro → pipeline (stages visíveis)
CREATE TABLE IF NOT EXISTS public.member_pipeline_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  can_view BOOLEAN NOT NULL DEFAULT true,
  can_move BOOLEAN NOT NULL DEFAULT true,
  can_create BOOLEAN NOT NULL DEFAULT false,
  can_delete BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, organization_id)
);

ALTER TABLE public.member_pipeline_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on member_pipeline_access"
  ON public.member_pipeline_access FOR ALL
  USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_member_pipeline_user ON public.member_pipeline_access(user_id);
