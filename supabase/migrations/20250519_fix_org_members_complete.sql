-- ============================================================
-- Migration: Garantir estrutura completa de org_members e roles
-- Data: 2025-05-19
-- Consolida todas as alterações necessárias
-- ============================================================

-- 1. Garantir que os valores do enum existem
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'manager' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'org_role')) THEN
    ALTER TYPE org_role ADD VALUE IF NOT EXISTS 'manager';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'operator' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'org_role')) THEN
    ALTER TYPE org_role ADD VALUE IF NOT EXISTS 'operator';
  END IF;
END$$;

-- 2. Coluna all_agents em org_members
ALTER TABLE public.org_members ADD COLUMN IF NOT EXISTS all_agents BOOLEAN NOT NULL DEFAULT false;

-- 3. Admins e owners sempre têm acesso a todos
UPDATE public.org_members SET all_agents = true WHERE role IN ('owner', 'admin');

-- 4. Garantir tabela agent_members existe com estrutura correta
CREATE TABLE IF NOT EXISTS public.agent_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission TEXT NOT NULL DEFAULT 'view' CHECK (permission IN ('manage', 'operate', 'view')),
  role_type TEXT NOT NULL DEFAULT 'team' CHECK (role_type IN ('owner', 'manager', 'team')),
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(agent_id, user_id)
);

ALTER TABLE public.agent_members ENABLE ROW LEVEL SECURITY;

-- Se a tabela já existia, garantir colunas
ALTER TABLE public.agent_members ADD COLUMN IF NOT EXISTS role_type TEXT 
  NOT NULL DEFAULT 'team';
ALTER TABLE public.agent_members ADD COLUMN IF NOT EXISTS assigned_by UUID;

-- 5. RLS para agent_members
CREATE POLICY IF NOT EXISTS "Service role full access on agent_members"
  ON public.agent_members FOR ALL
  USING (auth.role() = 'service_role');

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_agent_members_agent ON public.agent_members(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_members_user ON public.agent_members(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_members_role_type ON public.agent_members(role_type);
CREATE INDEX IF NOT EXISTS idx_org_members_role ON public.org_members(role);

-- 7. Garantir coluna email em profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- 8. Função RPC get_user_id_by_email
CREATE OR REPLACE FUNCTION public.get_user_id_by_email(email_input TEXT)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT id FROM auth.users WHERE email = email_input LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_id_by_email(TEXT) TO service_role;
