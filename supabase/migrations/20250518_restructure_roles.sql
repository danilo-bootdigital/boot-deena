-- ============================================================
-- Migration: Reestruturar Roles para Admin/Gerente/Operador
-- Data: 2025-05-18
-- ============================================================

-- 1. Alterar constraint de role em org_members
ALTER TABLE public.org_members DROP CONSTRAINT IF EXISTS org_members_role_check;
ALTER TABLE public.org_members ADD CONSTRAINT org_members_role_check 
  CHECK (role IN ('owner', 'admin', 'manager', 'operator'));

-- Migrar dados existentes (member → manager, viewer → operator)
UPDATE public.org_members SET role = 'manager' WHERE role = 'member';
UPDATE public.org_members SET role = 'operator' WHERE role = 'viewer';

-- 2. Alterar constraint em access_levels
ALTER TABLE public.access_levels DROP CONSTRAINT IF EXISTS access_levels_role_check;
ALTER TABLE public.access_levels ADD CONSTRAINT access_levels_role_check 
  CHECK (role IN ('owner', 'admin', 'manager', 'operator'));

-- Migrar dados existentes
UPDATE public.access_levels SET role = 'manager' WHERE role = 'member';
UPDATE public.access_levels SET role = 'operator' WHERE role = 'viewer';

-- 3. Adicionar role_type em agent_members (responsável/gerente/equipe)
ALTER TABLE public.agent_members ADD COLUMN IF NOT EXISTS role_type TEXT 
  NOT NULL DEFAULT 'team' CHECK (role_type IN ('owner', 'manager', 'team'));

-- 4. Adicionar campo all_agents em org_members (acesso a todos os agentes)
ALTER TABLE public.org_members ADD COLUMN IF NOT EXISTS all_agents BOOLEAN NOT NULL DEFAULT false;

-- Admins e owners sempre têm acesso a todos
UPDATE public.org_members SET all_agents = true WHERE role IN ('owner', 'admin');

-- 5. Index para performance na filtragem
CREATE INDEX IF NOT EXISTS idx_agent_members_role_type ON public.agent_members(role_type);
CREATE INDEX IF NOT EXISTS idx_org_members_role ON public.org_members(role);
