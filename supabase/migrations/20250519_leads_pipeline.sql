-- ============================================================
-- Migration: CRM / Pipeline de Leads
-- Data: 2025-05-19
-- ============================================================

CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,

  -- Dados do lead
  name TEXT,
  email TEXT,
  phone TEXT,
  company TEXT,
  segment TEXT,
  city TEXT,

  -- Pipeline
  stage TEXT NOT NULL DEFAULT 'new' CHECK (stage IN (
    'new', 'qualified', 'meeting_scheduled', 'proposal_sent', 'negotiation', 'won', 'lost'
  )),
  score INTEGER DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  temperature TEXT DEFAULT 'cold' CHECK (temperature IN ('cold', 'warm', 'hot')),

  -- Contexto
  source TEXT DEFAULT 'whatsapp',
  interest TEXT,
  pain_points TEXT,
  objectives TEXT,
  notes TEXT,
  lost_reason TEXT,

  -- Metadados
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  last_contact_at TIMESTAMPTZ,
  next_follow_up_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on leads"
  ON public.leads FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Org members can view leads"
  ON public.leads FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.org_members
      WHERE org_members.organization_id = leads.organization_id
        AND org_members.user_id = auth.uid()
    )
  );

CREATE INDEX idx_leads_org ON public.leads(organization_id);
CREATE INDEX idx_leads_stage ON public.leads(organization_id, stage);
CREATE INDEX idx_leads_conversation ON public.leads(conversation_id);

CREATE TRIGGER leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
