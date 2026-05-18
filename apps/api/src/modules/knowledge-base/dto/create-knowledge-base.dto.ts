import { z } from 'zod';

export const createKnowledgeBaseSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  chunk_size: z.number().min(100).max(2000).default(512),
  chunk_overlap: z.number().min(0).max(200).default(50),
});

export const updateKnowledgeBaseSchema = createKnowledgeBaseSchema.partial();

export const addDocumentSchema = z.object({
  name: z.string().min(1).max(200),
  source_url: z.string().url().max(2000),
  mime_type: z.string().max(100).optional(),
  size_bytes: z.number().min(0).max(104857600).optional(),
});

export type CreateKnowledgeBaseDto = z.infer<typeof createKnowledgeBaseSchema>;
export type UpdateKnowledgeBaseDto = z.infer<typeof updateKnowledgeBaseSchema>;
export type AddDocumentDto = z.infer<typeof addDocumentSchema>;
