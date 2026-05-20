import { z } from 'zod';

export const createAgentSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  system_prompt: z.string().min(1),
  provider: z.enum(['openai', 'anthropic']).default('openai'),
  model: z
    .enum(['gpt-4o', 'gpt-4o-mini', 'claude-sonnet-4-20250514', 'claude-haiku-4-20250514'])
    .default('gpt-4o-mini'),
  temperature: z.number().min(0).max(2).default(0.7),
  max_tokens: z.number().min(100).max(8192).default(1024),
  voice_enabled: z.boolean().default(false),
  voice_id: z.enum(['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']).default('nova'),
  status: z.enum(['active', 'inactive', 'draft']).default('draft'),
  settings: z.record(z.string(), z.unknown()).optional(),
});

export const updateAgentSchema = createAgentSchema.partial();

export const chatSchema = z.object({
  message: z.string().min(1).max(10000),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string().max(50000),
  })).max(100).optional().default([]),
});

export type CreateAgentDto = z.infer<typeof createAgentSchema>;
export type UpdateAgentDto = z.infer<typeof updateAgentSchema>;
export type ChatDto = z.infer<typeof chatSchema>;
