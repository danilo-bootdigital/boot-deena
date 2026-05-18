-- ============================================================
-- Migration: Reestruturar Roles para Admin/Gerente/Operador
-- Data: 2025-05-18
-- ============================================================

-- 1. Verificar e alterar o tipo ENUM org_role (se existir)
-- Adicionar novos valores ao enum
DO $$
BEGIN
  -- Adicionar 'manager' se não existir
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'manager' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'org_role')) THEN
    ALTER TYPE org_role ADD VALUE IF NOT EXISTS 'manager';
  END IF;
  -- Adicionar 'operator' se não existir
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'operator' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'org_role')) THEN
    ALTER TYPE org_role ADD VALUE IF NOT EXISTS 'operator';
  END IF;
END$$;

-- 2. Migrar dados existentes (member → manager, viewer → operator)
UPDATE public.org_members SET role = 'manager' WHERE role = 'member';
UPDATE public.org_members SET role = 'operator' WHERE role = 'viewer';

-- 3. Alterar access_levels para usar TEXT em vez de enum (mais flexível)
-- Primeiro verificar se a coluna role é enum ou text
DO $$
BEGIN
  -- Se access_levels.role é enum, converter para text
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'access_levels' AND column_name = 'role' 
    AND udt_name = 'org_role'
  ) THEN
    ALTER TABLE public.access_levels ALTER COLUMN role TYPE TEXT;
  END IF;
END$$;

-- Atualizar constraint em access_levels
ALTER TABLE public.access_levels DROP CONSTRAINT IF EXISTS access_levels_role_check;
ALTER TABLE public.access_levels ADD CONSTRAINT access_levels_role_check 
  CHECK (role IN ('owner', 'admin', 'manager', 'operator'));

-- Migrar dados existentes em access_levels
UPDATE public.access_levels SET role = 'manager' WHERE role = 'member';
UPDATE public.access_levels SET role = 'operator' WHERE role = 'viewer';

-- 4. Adicionar role_type em agent_members (responsável/gerente/equipe)
ALTER TABLE public.agent_members ADD COLUMN IF NOT EXISTS role_type TEXT 
  NOT NULL DEFAULT 'team' CHECK (role_type IN ('owner', 'manager', 'team'));

-- 5. Adicionar campo all_agents em org_members (acesso a todos os agentes)
ALTER TABLE public.org_members ADD COLUMN IF NOT EXISTS all_agents BOOLEAN NOT NULL DEFAULT false;

-- Admins e owners sempre têm acesso a todos
UPDATE public.org_members SET all_agents = true WHERE role IN ('owner', 'admin');

-- 6. Indexes para performance
CREATE INDEX IF NOT EXISTS idx_agent_members_role_type ON public.agent_members(role_type);
CREATE INDEX IF NOT EXISTS idx_org_members_role ON public.org_members(role);
