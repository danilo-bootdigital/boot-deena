import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { join } from 'path';
import { AgentsModule } from './modules/agents/agents.module';
import { ConversationsModule } from './modules/conversations/conversations.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { WebhookModule } from './modules/webhook/webhook.module';
import { WhatsappModule } from './modules/whatsapp/whatsapp.module';
import { QueueModule } from './modules/queue/queue.module';
import { KnowledgeBaseModule } from './modules/knowledge-base/knowledge-base.module';
import { FlowsModule } from './modules/flows/flows.module';
import { HealthModule } from './modules/health/health.module';
import { ProfilesModule } from './modules/profiles/profiles.module';
import { AccessLevelsModule } from './modules/access-levels/access-levels.module';
import { AgentMembersModule } from './modules/agent-members/agent-members.module';
import { appConfig } from './config/app.config';
import { redisConfig } from './config/redis.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [join(__dirname, '..', '..', '..', '.env'), '.env'],
      load: [appConfig, redisConfig],
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
    HealthModule,
    ProfilesModule,
    AccessLevelsModule,
    AgentMembersModule,
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
