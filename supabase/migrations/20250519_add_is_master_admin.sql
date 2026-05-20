-- ============================================================
-- Migration: Adicionar flag is_master_admin em profiles
-- Data: 2025-05-19
-- ============================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_master_admin BOOLEAN NOT NULL DEFAULT false;
