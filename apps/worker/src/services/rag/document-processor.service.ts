import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createSupabaseAdmin } from '@agente-ia/database';
import { chunkText, generateEmbeddings } from '@agente-ia/ai';

@Injectable()
export class DocumentProcessorService {
  private readonly logger = new Logger(DocumentProcessorService.name);
  private supabase;

  constructor(private configService: ConfigService) {
    this.supabase = createSupabaseAdmin(
      this.configService.getOrThrow('worker.supabaseUrl'),
      this.configService.getOrThrow('worker.supabaseServiceRoleKey'),
    );
  }

  async processDocument(documentId: string, knowledgeBaseId: string, organizationId: string) {
    this.logger.log(`Processing document ${documentId}`);

    // Update status to processing
    await this.supabase
      .from('documents')
      .update({ status: 'processing' })
      .eq('id', documentId);

    try {
      // Get document and KB settings
      const { data: document, error: docError } = await this.supabase
        .from('documents')
        .select('*, knowledge_bases(chunk_size, chunk_overlap)')
        .eq('id', documentId)
        .single();

      if (docError || !document) {
        throw new Error(`Document not found: ${documentId}`);
      }

      // Download file content from storage
      const content = await this.downloadDocumentContent(document.source_url);

      // Chunk the text
      const kb = document.knowledge_bases;
      const chunks = chunkText(content, {
        chunkSize: kb?.chunk_size || 512,
        chunkOverlap: kb?.chunk_overlap || 50,
      });

      this.logger.log(`Document ${documentId}: ${chunks.length} chunks created`);

      // Generate embeddings in batches
      const batchSize = 100;
      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);
        const texts = batch.map((c) => c.content);
        const embeddings = await generateEmbeddings(texts);

        // Insert chunks with embeddings
        const rows = batch.map((chunk, idx) => ({
          document_id: documentId,
          knowledge_base_id: knowledgeBaseId,
          organization_id: organizationId,
          content: chunk.content,
          embedding: JSON.stringify(embeddings[idx]),
          chunk_index: chunk.index,
          token_count: chunk.tokenCount,
        }));

        const { error: insertError } = await this.supabase
          .from('document_chunks')
          .insert(rows);

        if (insertError) {
          throw new Error(`Failed to insert chunks: ${insertError.message}`);
        }
      }

      // Update document status
      await this.supabase
        .from('documents')
        .update({ status: 'ready', chunk_count: chunks.length })
        .eq('id', documentId);

      this.logger.log(`Document ${documentId} processed successfully: ${chunks.length} chunks`);
    } catch (error) {
      const message = (error as Error).message;
      this.logger.error(`Failed to process document ${documentId}: ${message}`);

      await this.supabase
        .from('documents')
        .update({ status: 'error', error_message: message })
        .eq('id', documentId);

      throw error;
    }
  }

  private async downloadDocumentContent(sourceUrl: string | null): Promise<string> {
    if (!sourceUrl) {
      throw new Error('Document has no source URL');
    }

    // If it's a Supabase storage URL, download from storage
    if (sourceUrl.startsWith('storage/')) {
      const { data, error } = await this.supabase.storage
        .from('documents')
        .download(sourceUrl.replace('storage/', ''));

      if (error || !data) {
        throw new Error(`Failed to download from storage: ${error?.message}`);
      }

      return await data.text();
    }

    // External URL
    const response = await fetch(sourceUrl);
    if (!response.ok) {
      throw new Error(`Failed to download document: ${response.status}`);
    }
    return response.text();
  }
}
