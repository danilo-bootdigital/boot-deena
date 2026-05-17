import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { QUEUES } from '@agente-ia/shared';
import { InboundMessageProcessor } from './processors/inbound-message.processor';
import { OutboundMessageProcessor } from './processors/outbound-message.processor';
import { RagProcessor } from './processors/rag.processor';
import { ConversationResolverService } from './services/conversation-resolver.service';
import { MessageStoreService } from './services/message-store.service';
import { EvolutionSenderService } from './services/evolution-sender.service';
import { DocumentProcessorService } from './services/rag/document-processor.service';
import { VectorSearchService } from './services/rag/vector-search.service';
import { FlowEngineService } from './services/flow/flow-engine.service';
import { workerConfig } from './config/worker.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [workerConfig],
    }),
    BullModule.forRootAsync({
      useFactory: () => ({
        connection: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
        },
      }),
    }),
    BullModule.registerQueue(
      { name: QUEUES.INBOUND },
      { name: QUEUES.OUTBOUND },
      { name: QUEUES.RAG },
    ),
  ],
  providers: [
    InboundMessageProcessor,
    OutboundMessageProcessor,
    RagProcessor,
    ConversationResolverService,
    MessageStoreService,
    EvolutionSenderService,
    DocumentProcessorService,
    VectorSearchService,
    FlowEngineService,
  ],
})
export class WorkerModule {}
