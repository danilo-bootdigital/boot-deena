import { z } from 'zod';

export const createScheduledMessageSchema = z.object({
  conversation_id: z.string().uuid().optional(),
  agent_id: z.string().uuid().optional(),
  contact_phone: z.string().min(1).max(50),
  instance_name: z.string().min(1).max(100),
  message_type: z.enum([
    'follow_up_1h', 'follow_up_24h', 'follow_up_3d',
    'confirmation_24h', 'no_show', 'post_consultation', 'reactivation',
    'custom',
  ]),
  content: z.string().min(1).max(2000),
  variables: z.record(z.string(), z.unknown()).optional().default({}),
  scheduled_for: z.string(),
});

export type CreateScheduledMessageDto = z.infer<typeof createScheduledMessageSchema>;
