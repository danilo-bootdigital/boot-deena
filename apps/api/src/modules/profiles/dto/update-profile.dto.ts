import { z } from 'zod';

export const updateProfileSchema = z.object({
  full_name: z.string().min(1).max(200).optional(),
  display_name: z.string().max(100).nullable().optional(),
  avatar_url: z.string().url().nullable().optional(),
  phone: z.string().max(20).nullable().optional(),
  job_title: z.string().max(100).nullable().optional(),
  bio: z.string().max(500).nullable().optional(),
  preferences: z.record(z.string(), z.unknown()).optional(),
});

export type UpdateProfileDto = z.infer<typeof updateProfileSchema>;
