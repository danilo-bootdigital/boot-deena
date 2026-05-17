import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { AgentsModule } from './modules/agents/agents.module';
import { ConversationsModule } from './modules/conversations/conversations.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { WebhookModule } from './modules/webhook/webhook.module';
import { WhatsappModule } from './modules/whatsapp/whatsapp.module';
import { QueueModule } from './modules/queue/queue.module';
import { KnowledgeBaseModule } from './modules/knowledge-base/knowledge-base.module';
import { FlowsModule } from './modules/flows/flows.module';
import { HealthModule } from './modules/health/health.module';
import { appConfig } from './config/app.config';
import { redisConfig } from './config/redis.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, redisConfig],
    }),
    BullModule.forRootAsync({
      useFactory: () => ({
        connection: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
        },
      }),
    }),
    HealthModule,
    OrganizationsModule,
    AgentsModule,
    ConversationsModule,
    KnowledgeBaseModule,
    FlowsModule,
    WebhookModule,
    WhatsappModule,
    QueueModule,
  ],
})
export class AppModule {}
