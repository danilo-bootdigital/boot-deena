import { z } from 'zod';

export const createLeadSchema = z.object({
  name: z.string().max(200).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(30).optional(),
  company: z.string().max(200).optional(),
  segment: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  stage: z.enum(['new', 'qualified', 'meeting_scheduled', 'proposal_sent', 'negotiation', 'won', 'lost']).default('new'),
  temperature: z.enum(['cold', 'warm', 'hot']).default('cold'),
  source: z.string().max(50).default('whatsapp'),
  interest: z.string().max(500).optional(),
  pain_points: z.string().max(1000).optional(),
  objectives: z.string().max(1000).optional(),
  notes: z.string().max(2000).optional(),
  conversation_id: z.string().uuid().optional(),
  agent_id: z.string().uuid().optional(),
  assigned_to: z.string().uuid().optional(),
});

export const updateLeadSchema = createLeadSchema.partial();

export const moveLeadSchema = z.object({
  stage: z.enum(['new', 'qualified', 'meeting_scheduled', 'proposal_sent', 'negotiation', 'won', 'lost']),
  lost_reason: z.string().max(500).optional(),
});

export type CreateLeadDto = z.infer<typeof createLeadSchema>;
export type UpdateLeadDto = z.infer<typeof updateLeadSchema>;
export type MoveLeadDto = z.infer<typeof moveLeadSchema>;
