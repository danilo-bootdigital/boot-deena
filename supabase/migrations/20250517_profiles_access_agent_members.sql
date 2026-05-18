-- ============================================================
-- Migration: Profiles, Access Levels, Agent Members
-- Data: 2025-05-17
-- ============================================================

-- 1. PROFILES — dados complementares do usuário (auth.users é gerenciado pelo Supabase)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  display_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  job_title TEXT,
  bio TEXT,
  preferences JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Usuário pode ver seu próprio perfil
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Membros da mesma org podem ver perfis uns dos outros
CREATE POLICY "Org members can view each others profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.org_members om1
      JOIN public.org_members om2 ON om1.organization_id = om2.organization_id
      WHERE om1.user_id = auth.uid()
        AND om2.user_id = profiles.id
    )
  );

-- Usuário pode atualizar seu próprio perfil
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Usuário pode inserir seu próprio perfil
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Service role bypass (para o backend com service_role_key)
CREATE POLICY "Service role full access on profiles"
  ON public.profiles FOR ALL
  USING (auth.role() = 'service_role');

-- Trigger para criar profile automaticamente ao criar usuário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. ACCESS LEVELS — permissões granulares por role na organização
CREATE TABLE IF NOT EXISTS public.access_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  permissions JSONB NOT NULL DEFAULT '{}',
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, role)
);

ALTER TABLE public.access_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view access levels"
  ON public.access_levels FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.org_members
      WHERE org_members.organization_id = access_levels.organization_id
        AND org_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Org owners/admins can manage access levels"
  ON public.access_levels FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.org_members
      WHERE org_members.organization_id = access_levels.organization_id
        AND org_members.user_id = auth.uid()
        AND org_members.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Service role full access on access_levels"
  ON public.access_levels FOR ALL
  USING (auth.role() = 'service_role');

-- 3. AGENT MEMBERS — vinculação de usuários a agentes específicos
CREATE TABLE IF NOT EXISTS public.agent_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission TEXT NOT NULL DEFAULT 'view' CHECK (permission IN ('manage', 'operate', 'view')),
  assigned_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(agent_id, user_id)
);

ALTER TABLE public.agent_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agent members can view their assignments"
  ON public.agent_members FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.agents a
      JOIN public.org_members om ON om.organization_id = a.organization_id
      WHERE a.id = agent_members.agent_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Org owners/admins can manage agent members"
  ON public.agent_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.agents a
      JOIN public.org_members om ON om.organization_id = a.organization_id
      WHERE a.id = agent_members.agent_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Service role full access on agent_members"
  ON public.agent_members FOR ALL
  USING (auth.role() = 'service_role');

-- 4. COMENTÁRIOS DE DOCUMENTAÇÃO
COMMENT ON TABLE public.access_levels IS 'Permissões granulares por role. permissions JSONB segue o formato:
{
  "agents": { "create": bool, "edit": bool, "delete": bool, "view": bool },
  "conversations": { "view": bool, "intervene": bool, "export": bool },
  "knowledge_base": { "create": bool, "edit": bool, "delete": bool, "view": bool },
  "members": { "invite": bool, "remove": bool, "change_role": bool },
  "settings": { "edit": bool, "view": bool },
  "billing": { "view": bool, "manage": bool }
}';

COMMENT ON TABLE public.agent_members IS 'Vinculação de usuários a agentes. Permissions:
- manage: pode editar config, fluxo, prompt do agente
- operate: pode intervir em conversas, ver métricas
- view: apenas visualiza conversas e status';

-- 5. INDEXES
CREATE INDEX idx_agent_members_agent ON public.agent_members(agent_id);
CREATE INDEX idx_agent_members_user ON public.agent_members(user_id);
CREATE INDEX idx_access_levels_org ON public.access_levels(organization_id);
CREATE INDEX idx_profiles_display_name ON public.profiles(display_name);

-- 6. UPDATED_AT TRIGGER
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER access_levels_updated_at
  BEFORE UPDATE ON public.access_levels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
