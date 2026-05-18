import { z } from 'zod';

export const assignAgentMemberSchema = z.object({
  user_id: z.string().uuid(),
  permission: z.enum(['manage', 'operate', 'view']).default('view'),
  role_type: z.enum(['owner', 'manager', 'team']).default('team'),
});

export const updateAgentMemberSchema = z.object({
  permission: z.enum(['manage', 'operate', 'view']).optional(),
  role_type: z.enum(['owner', 'manager', 'team']).optional(),
});

export type AssignAgentMemberDto = z.infer<typeof assignAgentMemberSchema>;
export type UpdateAgentMemberDto = z.infer<typeof updateAgentMemberSchema>;
