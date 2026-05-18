-- ============================================================
-- Migration: Adicionar configurações de voz nos agentes
-- Data: 2025-05-18
-- ============================================================

-- Adicionar campos de voz na tabela agents (dentro de settings JSONB)
-- Não precisa de coluna nova pois settings já é JSONB
-- Mas vamos adicionar colunas dedicadas para facilitar queries

ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS voice_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS voice_id TEXT NOT NULL DEFAULT 'nova' 
  CHECK (voice_id IN ('alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'));

COMMENT ON COLUMN public.agents.voice_enabled IS 'Se true, o agente responde com áudio (TTS) via WhatsApp';
COMMENT ON COLUMN public.agents.voice_id IS 'Voz do OpenAI TTS: alloy, echo, fable, onyx, nova, shimmer';
