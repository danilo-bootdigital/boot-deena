import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createSupabaseAdmin } from '@agente-ia/database';
import { generateEmbedding } from '@agente-ia/ai';

export interface SearchResult {
  id: string;
  documentId: string;
  content: string;
  similarity: number;
  metadata: Record<string, unknown>;
}

@Injectable()
export class VectorSearchService {
  private readonly logger = new Logger(VectorSearchService.name);
  private supabase;

  constructor(private configService: ConfigService) {
    this.supabase = createSupabaseAdmin(
      this.configService.getOrThrow('worker.supabaseUrl'),
      this.configService.getOrThrow('worker.supabaseServiceRoleKey'),
    );
  }

  async search(
    query: string,
    knowledgeBaseIds: string[],
    options: { threshold?: number; limit?: number } = {},
  ): Promise<SearchResult[]> {
    const { threshold = 0.7, limit = 5 } = options;

    const embedding = await generateEmbedding(query);

    const { data, error } = await this.supabase.rpc('match_document_chunks', {
      query_embedding: JSON.stringify(embedding),
      knowledge_base_ids: knowledgeBaseIds,
      match_threshold: threshold,
      match_count: limit,
    });

    if (error) {
      this.logger.error(`Vector search failed: ${error.message}`);
      return [];
    }

    return (data || []).map((row: Record<string, unknown>) => ({
      id: row.id as string,
      documentId: row.document_id as string,
      content: row.content as string,
      similarity: row.similarity as number,
      metadata: (row.metadata as Record<string, unknown>) || {},
    }));
  }

  async buildRagContext(query: string, knowledgeBaseIds: string[]): Promise<string> {
    if (knowledgeBaseIds.length === 0) return '';

    const results = await this.search(query, knowledgeBaseIds);

    if (results.length === 0) return '';

    return results
      .map((r, i) => `[${i + 1}] ${r.content}`)
      .join('\n\n');
  }
}
