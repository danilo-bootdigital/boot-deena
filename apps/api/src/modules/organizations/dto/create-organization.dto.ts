import { z } from 'zod';

export const createOrganizationSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
});

export const updateOrganizationSchema = createOrganizationSchema.partial();

export const inviteMemberSchema = z.object({
  email: z.string().email(),
  full_name: z.string().min(1).max(100).optional(),
  password: z.string().min(6).max(100).optional(),
  role: z.enum(['company_admin', 'manager', 'attendant', 'viewer', 'admin', 'operator']).default('attendant'),
  all_agents: z.boolean().default(false),
  agent_ids: z.array(z.string().uuid()).optional(),
});

export const updateMemberRoleSchema = z.object({
  role: z.enum(['company_admin', 'manager', 'attendant', 'viewer', 'admin', 'operator']),
  all_agents: z.boolean().optional(),
  agent_ids: z.array(z.string().uuid()).optional(),
});

export type CreateOrganizationDto = z.infer<typeof createOrganizationSchema>;
export type UpdateOrganizationDto = z.infer<typeof updateOrganizationSchema>;
export type InviteMemberDto = z.infer<typeof inviteMemberSchema>;
export type UpdateMemberRoleDto = z.infer<typeof updateMemberRoleSchema>;
