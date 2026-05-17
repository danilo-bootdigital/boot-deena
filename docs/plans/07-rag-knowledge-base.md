# Plano 07 — RAG & Knowledge Base

## Objetivo
Implementar o sistema completo de RAG (Retrieval-Augmented Generation): upload de documentos, extração de texto, chunking, geração de embeddings, armazenamento vetorial com pgvector, e busca semântica integrada ao motor de IA.

## Pré-requisitos
- Plano 01 concluído (monorepo)
- Plano 02 concluído (Supabase com pgvector habilitado)
- Plano 03 concluído (tabelas knowledge_bases, documents, document_chunks)
- Plano 05 concluído (worker com fila RAG)
- Plano 06 concluído (motor de IA com tool calling)

## Estrutura de Arquivos Criados

```
packages/ai/src/
├── rag/
│   ├── index.ts
│   ├── chunker.ts
│   ├── embeddings.ts
│   ├── retriever.ts
│   └── document-processor.ts

apps/api/src/modules/
├── knowledge-bases/
│   ├── knowledge-bases.module.ts
│   ├── knowledge-bases.controller.ts
│   ├── knowledge-bases.service.ts
│   └── dto/
│       └── create-knowledge-base.dto.ts
├── documents/
│   ├── documents.module.ts
│   ├── documents.controller.ts
│   └── documents.service.ts

apps/worker/src/processors/
└── rag.processor.ts              (atualizar implementação)
```

## Steps

### 1. Instalar dependências

```bash
# No packages/ai
cd packages/ai
pnpm add @ai-sdk/openai pdf-parse

# No apps/api (upload)
cd apps/api
pnpm add @fastify/multipart
```

### 2. Criar packages/ai/src/rag/chunker.ts

```typescript
interface ChunkOptions {
  chunkSize: number;
  chunkOverlap: number;
  separator?: string;
}

interface Chunk {
  content: string;
  index: number;
  tokenCount: number;
}

const DEFAULT_OPTIONS: ChunkOptions = {
  chunkSize: 512,
  chunkOverlap: 50,
  separator: '\n\n',
};

export function chunkText(text: string, options: Partial<ChunkOptions> = {}): Chunk[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const chunks: Chunk[] = [];

  // Primeiro, dividir por separador natural (parágrafos)
  const paragraphs = text.split(opts.separator!).filter((p) => p.trim().length > 0);

  let currentChunk = '';
  let chunkIndex = 0;

  for (const paragraph of paragraphs) {
    const potentialChunk = currentChunk ? `${currentChunk}\n\n${paragraph}` : paragraph;
    const tokenEstimate = Math.ceil(potentialChunk.length / 3.5);

    if (tokenEstimate > opts.chunkSize && currentChunk) {
      // Salvar chunk atual
      chunks.push({
        content: currentChunk.trim(),
        index: chunkIndex,
        tokenCount: Math.ceil(currentChunk.length / 3.5),
      });
      chunkIndex++;

      // Overlap: pegar últimas palavras do chunk anterior
      const words = currentChunk.split(' ');
      const overlapWords = words.slice(-Math.ceil(opts.chunkOverlap * 3.5 / 5));
      currentChunk = overlapWords.join(' ') + '\n\n' + paragraph;
    } else {
      currentChunk = potentialChunk;
    }
  }

  // Último chunk
  if (currentChunk.trim()) {
    chunks.push({
      content: currentChunk.trim(),
      index: chunkIndex,
      tokenCount: Math.ceil(currentChunk.length / 3.5),
    });
  }

  return chunks;
}

export function chunkByTokens(text: string, maxTokens: number, overlap: number): Chunk[] {
  const words = text.split(/\s+/);
  const chunks: Chunk[] = [];
  let chunkIndex = 0;
  let i = 0;

  while (i < words.length) {
    const chunkWords: string[] = [];
    let tokenCount = 0;

    while (i < words.length && tokenCount < maxTokens) {
      chunkWords.push(words[i]);
      tokenCount = Math.ceil(chunkWords.join(' ').length / 3.5);
      i++;
    }

    chunks.push({
      content: chunkWords.join(' '),
      index: chunkIndex,
      tokenCount,
    });
    chunkIndex++;

    // Overlap
    const overlapWordCount = Math.ceil(overlap * 3.5 / 5);
    i -= overlapWordCount;
  }

  return chunks;
}
```

### 3. Criar packages/ai/src/rag/embeddings.ts

```typescript
import { embed, embedMany } from 'ai';
import { openai } from '@ai-sdk/openai';

const EMBEDDING_MODEL = openai.embedding('text-embedding-3-small');
const BATCH_SIZE = 100;

export async function generateEmbedding(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model: EMBEDDING_MODEL,
    value: text,
  });
  return embedding;
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const allEmbeddings: number[][] = [];

  // Processar em batches para não exceder limites da API
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const { embeddings } = await embedMany({
      model: EMBEDDING_MODEL,
      values: batch,
    });
    allEmbeddings.push(...embeddings);
  }

  return allEmbeddings;
}
```

### 4. Criar packages/ai/src/rag/retriever.ts

```typescript
import { generateEmbedding } from './embeddings';

interface RetrievalResult {
  content: string;
  similarity: number;
  documentId: string;
  chunkIndex: number;
  metadata: Record<string, any>;
}

interface RetrieverOptions {
  topK: number;
  similarityThreshold: number;
}

const DEFAULT_OPTIONS: RetrieverOptions = {
  topK: 5,
  similarityThreshold: 0.7,
};

export async function retrieve(
  query: string,
  knowledgeBaseIds: string[],
  supabase: any,
  options: Partial<RetrieverOptions> = {},
): Promise<RetrievalResult[]> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // 1. Gerar embedding da query
  const queryEmbedding = await generateEmbedding(query);

  // 2. Buscar chunks similares via pgvector
  const { data, error } = await supabase.rpc('match_document_chunks', {
    query_embedding: queryEmbedding,
    knowledge_base_ids: knowledgeBaseIds,
    match_threshold: opts.similarityThreshold,
    match_count: opts.topK,
  });

  if (error) {
    throw new Error(`Retrieval failed: ${error.message}`);
  }

  return (data || []).map((row: any) => ({
    content: row.content,
    similarity: row.similarity,
    documentId: row.document_id,
    chunkIndex: row.chunk_index,
    metadata: row.metadata,
  }));
}

export function formatRetrievalContext(results: RetrievalResult[]): string {
  if (results.length === 0) return '';

  return results
    .map((r, i) => `[${i + 1}] (relevância: ${(r.similarity * 100).toFixed(0)}%)\n${r.content}`)
    .join('\n\n---\n\n');
}
```

### 5. Criar função RPC no Supabase (adicionar migration)

**Nova migration: 00011_rag_functions.sql**

```sql
-- Função de busca vetorial para RAG
CREATE OR REPLACE FUNCTION match_document_chunks(
  query_embedding vector(1536),
  knowledge_base_ids UUID[],
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  knowledge_base_id UUID,
  content TEXT,
  chunk_index INT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.document_id,
    dc.knowledge_base_id,
    dc.content,
    dc.chunk_index,
    dc.metadata,
    1 - (dc.embedding <=> query_embedding) AS similarity
  FROM document_chunks dc
  WHERE dc.knowledge_base_id = ANY(knowledge_base_ids)
    AND 1 - (dc.embedding <=> query_embedding) > match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

### 6. Criar packages/ai/src/rag/document-processor.ts

```typescript
import { chunkText } from './chunker';
import { generateEmbeddings } from './embeddings';

interface ProcessDocumentParams {
  content: string;
  documentId: string;
  knowledgeBaseId: string;
  organizationId: string;
  chunkSize: number;
  chunkOverlap: number;
  supabase: any;
}

export async function processDocument(params: ProcessDocumentParams) {
  const { content, documentId, knowledgeBaseId, organizationId, chunkSize, chunkOverlap, supabase } = params;

  // 1. Chunkar o texto
  const chunks = chunkText(content, { chunkSize, chunkOverlap });

  if (chunks.length === 0) {
    throw new Error('No chunks generated from document');
  }

  // 2. Gerar embeddings para todos os chunks
  const texts = chunks.map((c) => c.content);
  const embeddings = await generateEmbeddings(texts);

  // 3. Salvar chunks com embeddings no banco
  const chunkRecords = chunks.map((chunk, i) => ({
    document_id: documentId,
    knowledge_base_id: knowledgeBaseId,
    organization_id: organizationId,
    content: chunk.content,
    embedding: JSON.stringify(embeddings[i]),
    chunk_index: chunk.index,
    token_count: chunk.tokenCount,
    metadata: {},
  }));

  // Inserir em batches de 50
  const BATCH_SIZE = 50;
  for (let i = 0; i < chunkRecords.length; i += BATCH_SIZE) {
    const batch = chunkRecords.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('document_chunks').insert(batch);
    if (error) {
      throw new Error(`Failed to insert chunks: ${error.message}`);
    }
  }

  // 4. Atualizar documento com contagem de chunks
  await supabase
    .from('documents')
    .update({ status: 'ready', chunk_count: chunks.length })
    .eq('id', documentId);

  return { chunksCreated: chunks.length };
}
```

### 7. Criar packages/ai/src/rag/index.ts

```typescript
export { chunkText, chunkByTokens } from './chunker';
export { generateEmbedding, generateEmbeddings } from './embeddings';
export { retrieve, formatRetrievalContext } from './retriever';
export { processDocument } from './document-processor';
```

### 8. Atualizar packages/ai/src/index.ts

```typescript
// ... exports existentes
export * from './rag';
```

### 9. Implementar RagProcessor completo no Worker

```typescript
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import { createSupabaseAdmin } from '@agente-ia/database';
import { processDocument } from '@agente-ia/ai';

interface RagJob {
  documentId: string;
  knowledgeBaseId: string;
  organizationId: string;
}

@Processor('rag-processing', { concurrency: 2 })
export class RagProcessor extends WorkerHost {
  private readonly logger = new Logger(RagProcessor.name);
  private supabase;

  constructor(private configService: ConfigService) {
    super();
    this.supabase = createSupabaseAdmin(
      this.configService.get('worker.supabaseUrl'),
      this.configService.get('worker.supabaseServiceRoleKey'),
    );
  }

  async process(job: Job<RagJob>): Promise<void> {
    const { documentId, knowledgeBaseId, organizationId } = job.data;
    this.logger.log(`Processing document ${documentId}`);

    try {
      // 1. Atualizar status para processing
      await this.supabase
        .from('documents')
        .update({ status: 'processing' })
        .eq('id', documentId);

      // 2. Buscar documento e knowledge base config
      const { data: document } = await this.supabase
        .from('documents')
        .select('*, knowledge_bases!inner(chunk_size, chunk_overlap)')
        .eq('id', documentId)
        .single();

      if (!document) throw new Error('Document not found');

      // 3. Buscar conteúdo do arquivo (Supabase Storage)
      const { data: fileData } = await this.supabase.storage
        .from('documents')
        .download(`${organizationId}/${documentId}`);

      if (!fileData) throw new Error('File not found in storage');

      // 4. Extrair texto baseado no mime type
      const content = await this.extractText(fileData, document.mime_type);

      // 5. Processar (chunk + embed + store)
      const result = await processDocument({
        content,
        documentId,
        knowledgeBaseId,
        organizationId,
        chunkSize: document.knowledge_bases.chunk_size,
        chunkOverlap: document.knowledge_bases.chunk_overlap,
        supabase: this.supabase,
      });

      this.logger.log(`Document ${documentId} processed: ${result.chunksCreated} chunks`);

      // 6. Atualizar progresso do job
      await job.updateProgress(100);
    } catch (error) {
      this.logger.error(`Failed to process document ${documentId}: ${error.message}`);

      await this.supabase
        .from('documents')
        .update({ status: 'error', error_message: error.message })
        .eq('id', documentId);

      throw error;
    }
  }

  private async extractText(file: Blob, mimeType: string): Promise<string> {
    const buffer = Buffer.from(await file.arrayBuffer());

    switch (mimeType) {
      case 'text/plain':
      case 'text/markdown':
      case 'text/csv':
        return buffer.toString('utf-8');

      case 'application/pdf': {
        const pdfParse = require('pdf-parse');
        const pdf = await pdfParse(buffer);
        return pdf.text;
      }

      case 'application/json':
        return buffer.toString('utf-8');

      default:
        throw new Error(`Unsupported mime type: ${mimeType}`);
    }
  }
}
```

### 10. Criar API de Knowledge Bases

**modules/knowledge-bases/knowledge-bases.controller.ts:**
```typescript
import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { CurrentOrg } from '../../common/decorators/current-org.decorator';
import { KnowledgeBasesService } from './knowledge-bases.service';

@Controller('knowledge-bases')
@UseGuards(SupabaseAuthGuard)
export class KnowledgeBasesController {
  constructor(private kbService: KnowledgeBasesService) {}

  @Get()
  findAll(@CurrentOrg() orgId: string) {
    return this.kbService.findAll(orgId);
  }

  @Post()
  create(@Body() body: any, @CurrentOrg() orgId: string) {
    return this.kbService.create(orgId, body);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentOrg() orgId: string) {
    return this.kbService.findOne(id, orgId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentOrg() orgId: string) {
    return this.kbService.remove(id, orgId);
  }
}
```

### 11. Criar API de Documents (upload)

**modules/documents/documents.controller.ts:**
```typescript
import { Controller, Get, Post, Delete, Param, UseGuards, Req } from '@nestjs/common';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { CurrentOrg } from '../../common/decorators/current-org.decorator';
import { DocumentsService } from './documents.service';
import type { FastifyRequest } from 'fastify';

@Controller('knowledge-bases/:kbId/documents')
@UseGuards(SupabaseAuthGuard)
export class DocumentsController {
  constructor(private documentsService: DocumentsService) {}

  @Get()
  findAll(@Param('kbId') kbId: string, @CurrentOrg() orgId: string) {
    return this.documentsService.findAll(kbId, orgId);
  }

  @Post('upload')
  async upload(
    @Param('kbId') kbId: string,
    @CurrentOrg() orgId: string,
    @Req() req: FastifyRequest,
  ) {
    const file = await req.file();
    if (!file) throw new Error('No file uploaded');

    return this.documentsService.upload(kbId, orgId, {
      filename: file.filename,
      mimetype: file.mimetype,
      buffer: await file.toBuffer(),
    });
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentOrg() orgId: string) {
    return this.documentsService.remove(id, orgId);
  }
}
```

### 12. Integrar RAG no fluxo de geração (atualizar InboundMessageProcessor)

```typescript
// No InboundMessageProcessor, antes de chamar generate():
import { retrieve, formatRetrievalContext } from '@agente-ia/ai';

// Buscar knowledge bases do agente
const { data: agentKBs } = await this.supabase
  .from('agent_knowledge_bases')
  .select('knowledge_base_id')
  .eq('agent_id', resolved.agentId);

let ragContext = '';
if (agentKBs && agentKBs.length > 0) {
  const kbIds = agentKBs.map((kb) => kb.knowledge_base_id);
  const results = await retrieve(message.content, kbIds, this.supabase);
  ragContext = formatRetrievalContext(results);
}

// Passar ragContext para o context builder
const messages = buildContext({
  agent: agentConfig,
  conversationHistory: history as any,
  userMessage: message.content,
  ragContext,
});
```

## Endpoints da API (novos)

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | /api/v1/knowledge-bases | Lista KBs da org |
| POST | /api/v1/knowledge-bases | Cria KB |
| GET | /api/v1/knowledge-bases/:id | Detalhe da KB |
| DELETE | /api/v1/knowledge-bases/:id | Remove KB |
| GET | /api/v1/knowledge-bases/:id/documents | Lista documentos |
| POST | /api/v1/knowledge-bases/:id/documents/upload | Upload de documento |
| DELETE | /api/v1/knowledge-bases/:id/documents/:docId | Remove documento |

## Dependências
- Plano 03 (pgvector + tabelas)
- Plano 05 (worker com fila RAG)
- Plano 06 (motor de IA)

## Critérios de Conclusão
- [ ] Upload de documento (PDF, TXT, MD) funciona
- [ ] Documento é processado: chunked + embeddings gerados
- [ ] Chunks salvos no banco com embeddings vetoriais
- [ ] Busca semântica retorna chunks relevantes
- [ ] RAG integrado no fluxo de geração (contexto injetado no prompt)
- [ ] Função RPC `match_document_chunks` funciona corretamente
- [ ] Status do documento atualiza (pending → processing → ready/error)
- [ ] Múltiplas knowledge bases podem ser associadas a um agente
