import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { DocumentProcessorService } from '../services/rag/document-processor.service';

interface RagJob {
  documentId: string;
  knowledgeBaseId: string;
  organizationId: string;
}

@Processor('rag-processing', { concurrency: 2 })
export class RagProcessor extends WorkerHost {
  private readonly logger = new Logger(RagProcessor.name);

  constructor(private documentProcessor: DocumentProcessorService) {
    super();
  }

  async process(job: Job<RagJob>): Promise<void> {
    const { documentId, knowledgeBaseId, organizationId } = job.data;
    this.logger.log(`Processing document ${documentId} for KB ${knowledgeBaseId}`);

    await this.documentProcessor.processDocument(documentId, knowledgeBaseId, organizationId);
  }
}
