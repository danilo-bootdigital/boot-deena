import { z } from 'zod';

const permissionGroup = z.object({
  create: z.boolean().optional(),
  edit: z.boolean().optional(),
  delete: z.boolean().optional(),
  view: z.boolean().optional(),
  intervene: z.boolean().optional(),
  export: z.boolean().optional(),
  invite: z.boolean().optional(),
  remove: z.boolean().optional(),
  change_role: z.boolean().optional(),
  manage: z.boolean().optional(),
});

export const updateAccessLevelSchema = z.object({
  permissions: z.object({
    agents: permissionGroup.optional(),
    conversations: permissionGroup.optional(),
    knowledge_base: permissionGroup.optional(),
    members: permissionGroup.optional(),
    settings: permissionGroup.optional(),
    billing: permissionGroup.optional(),
  }),
  description: z.string().max(200).nullable().optional(),
});

export type UpdateAccessLevelDto = z.infer<typeof updateAccessLevelSchema>;
