import { z } from 'zod';

export const assignAgentMemberSchema = z.object({
  user_id: z.string().uuid(),
  permission: z.enum(['manage', 'operate', 'view']).default('view'),
});

export const updateAgentMemberSchema = z.object({
  permission: z.enum(['manage', 'operate', 'view']),
});

export type AssignAgentMemberDto = z.infer<typeof assignAgentMemberSchema>;
export type UpdateAgentMemberDto = z.infer<typeof updateAgentMemberSchema>;
