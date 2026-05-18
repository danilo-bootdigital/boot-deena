import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { join } from 'path';
import { QUEUES } from '@agente-ia/shared';
import { InboundMessageProcessor } from './processors/inbound-message.processor';
import { OutboundMessageProcessor } from './processors/outbound-message.processor';
import { RagProcessor } from './processors/rag.processor';
import { ScheduledMessageProcessor } from './processors/scheduled-message.processor';
import { ConversationResolverService } from './services/conversation-resolver.service';
import { MessageStoreService } from './services/message-store.service';
import { EvolutionSenderService } from './services/evolution-sender.service';
import { AgentLoaderService } from './services/agent-loader.service';
import { DocumentProcessorService } from './services/rag/document-processor.service';
import { VectorSearchService } from './services/rag/vector-search.service';
import { FlowEngineService } from './services/flow/flow-engine.service';
import { workerConfig } from './config/worker.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [join(__dirname, '..', '..', '..', '.env'), '.env'],
      load: [workerConfig],
    }),
    BullModule.forRootAsync({
      useFactory: () => {
        const redisUrl = process.env.REDIS_URL;
        if (redisUrl) {
          return { connection: { url: redisUrl, maxRetriesPerRequest: null } };
        }
        return {
          connection: {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
            password: process.env.REDIS_PASSWORD || undefined,
            maxRetriesPerRequest: null,
          },
        };
      },
    }),
    BullModule.registerQueue(
      { name: QUEUES.INBOUND },
      { name: QUEUES.OUTBOUND },
      { name: QUEUES.RAG },
      { name: QUEUES.SCHEDULED },
    ),
  ],
  providers: [
    InboundMessageProcessor,
    OutboundMessageProcessor,
    RagProcessor,
    ScheduledMessageProcessor,
    ConversationResolverService,
    MessageStoreService,
    EvolutionSenderService,
    AgentLoaderService,
    DocumentProcessorService,
    VectorSearchService,
    FlowEngineService,
  ],
})
export class WorkerModule {}
