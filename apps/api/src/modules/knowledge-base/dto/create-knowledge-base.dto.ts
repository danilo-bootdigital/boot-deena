import { z } from 'zod';

export const createKnowledgeBaseSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  chunk_size: z.number().min(100).max(2000).default(512),
  chunk_overlap: z.number().min(0).max(200).default(50),
});

export const updateKnowledgeBaseSchema = createKnowledgeBaseSchema.partial();

export type CreateKnowledgeBaseDto = z.infer<typeof createKnowledgeBaseSchema>;
export type UpdateKnowledgeBaseDto = z.infer<typeof updateKnowledgeBaseSchema>;
