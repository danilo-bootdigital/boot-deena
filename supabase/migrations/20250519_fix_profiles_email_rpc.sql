-- ============================================================
-- Migration: Adicionar coluna email em profiles + RPC get_user_id_by_email
-- Data: 2025-05-19
-- ============================================================

-- 1. Adicionar coluna email na tabela profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. Criar função RPC para buscar user_id por email
CREATE OR REPLACE FUNCTION public.get_user_id_by_email(email_input TEXT)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT id FROM auth.users WHERE email = email_input LIMIT 1;
$$;

-- 3. Garantir que service_role pode executar
GRANT EXECUTE ON FUNCTION public.get_user_id_by_email(TEXT) TO service_role;
