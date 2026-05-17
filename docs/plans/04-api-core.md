# Plano 04 — API Core (NestJS)

## Objetivo
Implementar a API principal com NestJS + Fastify, incluindo: módulos base, autenticação via Supabase JWT, CRUD de organizações e agentes, webhook para receber mensagens do Evolution API, e integração com BullMQ para enfileirar processamento.

## Pré-requisitos
- Plano 01 concluído (monorepo)
- Plano 02 concluído (Redis e Supabase rodando)
- Plano 03 concluído (schema e tipos gerados)

## Estrutura de Arquivos Criados

```
apps/api/src/
├── main.ts
├── app.module.ts
├── common/
│   ├── guards/
│   │   └── supabase-auth.guard.ts
│   ├── decorators/
│   │   ├── current-user.decorator.ts
│   │   └── current-org.decorator.ts
│   ├── interceptors/
│   │   └── transform.interceptor.ts
│   ├── filters/
│   │   └── http-exception.filter.ts
│   ├── pipes/
│   │   └── zod-validation.pipe.ts
│   └── interfaces/
│       └── request.interface.ts
├── modules/
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts
│   │   └── auth.service.ts
│   ├── organizations/
│   │   ├── organizations.module.ts
│   │   ├── organizations.controller.ts
│   │   ├── organizations.service.ts
│   │   └── dto/
│   │       ├── create-organization.dto.ts
│   │       └── update-organization.dto.ts
│   ├── agents/
│   │   ├── agents.module.ts
│   │   ├── agents.controller.ts
│   │   ├── agents.service.ts
│   │   └── dto/
│   │       ├── create-agent.dto.ts
│   │       └── update-agent.dto.ts
│   ├── conversations/
│   │   ├── conversations.module.ts
│   │   ├── conversations.controller.ts
│   │   └── conversations.service.ts
│   ├── webhook/
│   │   ├── webhook.module.ts
│   │   ├── webhook.controller.ts
│   │   └── webhook.service.ts
│   ├── whatsapp/
│   │   ├── whatsapp.module.ts
│   │   ├── whatsapp.controller.ts
│   │   └── whatsapp.service.ts
│   └── queue/
│       ├── queue.module.ts
│       └── queue.service.ts
├── config/
│   ├── app.config.ts
│   ├── redis.config.ts
│   └── supabase.config.ts
└── nest-cli.json
```

## Steps

### 1. Instalar dependências adicionais

```bash
cd apps/api
pnpm add @nestjs/config @nestjs/bullmq bullmq @supabase/supabase-js zod ioredis class-transformer
pnpm add -D @types/node
```

### 2. Criar app.module.ts

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { AuthModule } from './modules/auth/auth.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { AgentsModule } from './modules/agents/agents.module';
import { ConversationsModule } from './modules/conversations/conversations.module';
import { WebhookModule } from './modules/webhook/webhook.module';
import { WhatsappModule } from './modules/whatsapp/whatsapp.module';
import { QueueModule } from './modules/queue/queue.module';
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
    AuthModule,
    OrganizationsModule,
    AgentsModule,
    ConversationsModule,
    WebhookModule,
    WhatsappModule,
    QueueModule,
  ],
})
export class AppModule {}
```

### 3. Criar config files

**config/app.config.ts:**
```typescript
import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  port: parseInt(process.env.PORT || '3001'),
  nodeEnv: process.env.NODE_ENV || 'development',
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  evolutionApiUrl: process.env.EVOLUTION_API_URL,
  evolutionApiKey: process.env.EVOLUTION_API_KEY,
}));
```

**config/redis.config.ts:**
```typescript
import { registerAs } from '@nestjs/config';

export const redisConfig = registerAs('redis', () => ({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  url: process.env.REDIS_URL || 'redis://localhost:6379',
}));
```

### 4. Criar Supabase Auth Guard

**common/guards/supabase-auth.guard.ts:**
```typescript
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid authorization header');
    }

    const token = authHeader.substring(7);
    const supabase = createClient(
      this.configService.get('app.supabaseUrl'),
      this.configService.get('app.supabaseAnonKey'),
    );

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      throw new UnauthorizedException('Invalid token');
    }

    request.user = user;
    return true;
  }
}
```

### 5. Criar decorators

**common/decorators/current-user.decorator.ts:**
```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);
```

**common/decorators/current-org.decorator.ts:**
```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentOrg = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.headers['x-organization-id'];
  },
);
```

### 6. Criar Zod Validation Pipe

**common/pipes/zod-validation.pipe.ts:**
```typescript
import { PipeTransform, BadRequestException } from '@nestjs/common';
import type { ZodSchema } from 'zod';

export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: result.error.flatten().fieldErrors,
      });
    }
    return result.data;
  }
}
```

### 7. Criar módulo de Webhook (Evolution API)

**modules/webhook/webhook.controller.ts:**
```typescript
import { Controller, Post, Body, Headers, HttpCode, Logger } from '@nestjs/common';
import { WebhookService } from './webhook.service';

@Controller('webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(private webhookService: WebhookService) {}

  @Post('evolution')
  @HttpCode(200)
  async handleEvolutionWebhook(
    @Body() body: any,
    @Headers('apikey') apiKey: string,
  ) {
    this.logger.log(`Webhook received: ${body.event}`);
    await this.webhookService.processEvent(body);
    return { received: true };
  }
}
```

**modules/webhook/webhook.service.ts:**
```typescript
import { Injectable, Logger } from '@nestjs/common';
import { QueueService } from '../queue/queue.service';

interface EvolutionWebhookPayload {
  event: string;
  instance: string;
  data: {
    key: {
      remoteJid: string;
      fromMe: boolean;
      id: string;
    };
    message?: {
      conversation?: string;
      extendedTextMessage?: { text: string };
      imageMessage?: any;
      audioMessage?: any;
      documentMessage?: any;
    };
    pushName?: string;
    messageTimestamp?: number;
  };
}

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(private queueService: QueueService) {}

  async processEvent(payload: EvolutionWebhookPayload) {
    switch (payload.event) {
      case 'messages.upsert':
        if (!payload.data.key.fromMe) {
          await this.queueService.addInboundMessage({
            instanceName: payload.instance,
            remoteJid: payload.data.key.remoteJid,
            messageId: payload.data.key.id,
            pushName: payload.data.pushName,
            message: this.extractMessageContent(payload.data.message),
            timestamp: payload.data.messageTimestamp,
          });
        }
        break;

      case 'connection.update':
        this.logger.log(`Connection update: ${payload.instance}`);
        break;

      default:
        this.logger.debug(`Unhandled event: ${payload.event}`);
    }
  }

  private extractMessageContent(message: any): { type: string; content: string } {
    if (!message) return { type: 'text', content: '' };

    if (message.conversation) {
      return { type: 'text', content: message.conversation };
    }
    if (message.extendedTextMessage?.text) {
      return { type: 'text', content: message.extendedTextMessage.text };
    }
    if (message.imageMessage) {
      return { type: 'image', content: message.imageMessage.caption || '' };
    }
    if (message.audioMessage) {
      return { type: 'audio', content: '' };
    }
    if (message.documentMessage) {
      return { type: 'document', content: message.documentMessage.fileName || '' };
    }

    return { type: 'text', content: '' };
  }
}
```

### 8. Criar módulo de Queue

**modules/queue/queue.module.ts:**
```typescript
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QueueService } from './queue.service';

export const QUEUES = {
  INBOUND: 'inbound-messages',
  OUTBOUND: 'outbound-messages',
  RAG: 'rag-processing',
} as const;

@Module({
  imports: [
    BullModule.registerQueue(
      { name: QUEUES.INBOUND },
      { name: QUEUES.OUTBOUND },
      { name: QUEUES.RAG },
    ),
  ],
  providers: [QueueService],
  exports: [QueueService],
})
export class QueueModule {}
```

**modules/queue/queue.service.ts:**
```typescript
import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUES } from './queue.module';

export interface InboundMessageJob {
  instanceName: string;
  remoteJid: string;
  messageId: string;
  pushName?: string;
  message: { type: string; content: string };
  timestamp?: number;
}

export interface OutboundMessageJob {
  instanceName: string;
  remoteJid: string;
  content: string;
  conversationId: string;
  messageId: string;
}

@Injectable()
export class QueueService {
  constructor(
    @InjectQueue(QUEUES.INBOUND) private inboundQueue: Queue,
    @InjectQueue(QUEUES.OUTBOUND) private outboundQueue: Queue,
    @InjectQueue(QUEUES.RAG) private ragQueue: Queue,
  ) {}

  async addInboundMessage(data: InboundMessageJob) {
    return this.inboundQueue.add('process', data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: 1000,
      removeOnFail: 5000,
    });
  }

  async addOutboundMessage(data: OutboundMessageJob) {
    return this.outboundQueue.add('send', data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: 1000,
      removeOnFail: 5000,
    });
  }

  async addRagProcessing(data: { documentId: string; knowledgeBaseId: string; organizationId: string }) {
    return this.ragQueue.add('process-document', data, {
      attempts: 2,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: 100,
      removeOnFail: 500,
    });
  }
}
```

### 9. Criar módulo de WhatsApp (Evolution API client)

**modules/whatsapp/whatsapp.service.ts:**
```typescript
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(private configService: ConfigService) {
    this.baseUrl = this.configService.get('app.evolutionApiUrl');
    this.apiKey = this.configService.get('app.evolutionApiKey');
  }

  private async request(path: string, options: RequestInit = {}) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        apikey: this.apiKey,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`Evolution API error: ${response.status} - ${error}`);
      throw new Error(`Evolution API error: ${response.status}`);
    }

    return response.json();
  }

  async createInstance(instanceName: string) {
    return this.request('/instance/create', {
      method: 'POST',
      body: JSON.stringify({
        instanceName,
        integration: 'WHATSAPP-BAILEYS',
        qrcode: true,
        webhook: {
          url: `${process.env.API_PUBLIC_URL || 'http://localhost:3001'}/webhook/evolution`,
          events: ['messages.upsert', 'connection.update', 'messages.update'],
        },
      }),
    });
  }

  async getInstanceStatus(instanceName: string) {
    return this.request(`/instance/connectionState/${instanceName}`);
  }

  async getQrCode(instanceName: string) {
    return this.request(`/instance/connect/${instanceName}`);
  }

  async sendText(instanceName: string, remoteJid: string, text: string) {
    return this.request(`/message/sendText/${instanceName}`, {
      method: 'POST',
      body: JSON.stringify({
        number: remoteJid,
        text,
      }),
    });
  }

  async deleteInstance(instanceName: string) {
    return this.request(`/instance/delete/${instanceName}`, {
      method: 'DELETE',
    });
  }

  async listInstances() {
    return this.request('/instance/fetchInstances');
  }
}
```

### 10. Criar módulo de Agents (CRUD)

**modules/agents/agents.controller.ts:**
```typescript
import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, UsePipes } from '@nestjs/common';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { CurrentOrg } from '../../common/decorators/current-org.decorator';
import { AgentsService } from './agents.service';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { createAgentSchema, updateAgentSchema } from './dto/create-agent.dto';

@Controller('agents')
@UseGuards(SupabaseAuthGuard)
export class AgentsController {
  constructor(private agentsService: AgentsService) {}

  @Get()
  findAll(@CurrentOrg() orgId: string) {
    return this.agentsService.findAll(orgId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentOrg() orgId: string) {
    return this.agentsService.findOne(id, orgId);
  }

  @Post()
  @UsePipes(new ZodValidationPipe(createAgentSchema))
  create(@Body() body: any, @CurrentOrg() orgId: string) {
    return this.agentsService.create(orgId, body);
  }

  @Put(':id')
  @UsePipes(new ZodValidationPipe(updateAgentSchema))
  update(@Param('id') id: string, @Body() body: any, @CurrentOrg() orgId: string) {
    return this.agentsService.update(id, orgId, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentOrg() orgId: string) {
    return this.agentsService.remove(id, orgId);
  }
}
```

**modules/agents/dto/create-agent.dto.ts:**
```typescript
import { z } from 'zod';

export const createAgentSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  system_prompt: z.string().min(1),
  provider: z.enum(['openai', 'anthropic', 'google']).default('openai'),
  model: z.enum(['gpt-4o', 'gpt-4o-mini', 'claude-sonnet-4-6', 'claude-haiku-4-5', 'gemini-2.0-flash']).default('gpt-4o-mini'),
  temperature: z.number().min(0).max(2).default(0.7),
  max_tokens: z.number().min(100).max(8192).default(1024),
});

export const updateAgentSchema = createAgentSchema.partial();

export type CreateAgentDto = z.infer<typeof createAgentSchema>;
export type UpdateAgentDto = z.infer<typeof updateAgentSchema>;
```

**modules/agents/agents.service.ts:**
```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createSupabaseAdmin } from '@agente-ia/database';
import type { CreateAgentDto, UpdateAgentDto } from './dto/create-agent.dto';

@Injectable()
export class AgentsService {
  private supabase;

  constructor(private configService: ConfigService) {
    this.supabase = createSupabaseAdmin(
      this.configService.get('app.supabaseUrl'),
      this.configService.get('app.supabaseServiceRoleKey'),
    );
  }

  async findAll(organizationId: string) {
    const { data, error } = await this.supabase
      .from('agents')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async findOne(id: string, organizationId: string) {
    const { data, error } = await this.supabase
      .from('agents')
      .select('*, agent_tools(*), agent_knowledge_bases(knowledge_base_id)')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single();

    if (error || !data) throw new NotFoundException('Agent not found');
    return data;
  }

  async create(organizationId: string, dto: CreateAgentDto) {
    const { data, error } = await this.supabase
      .from('agents')
      .insert({ ...dto, organization_id: organizationId })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async update(id: string, organizationId: string, dto: UpdateAgentDto) {
    const { data, error } = await this.supabase
      .from('agents')
      .update(dto)
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error || !data) throw new NotFoundException('Agent not found');
    return data;
  }

  async remove(id: string, organizationId: string) {
    const { error } = await this.supabase
      .from('agents')
      .delete()
      .eq('id', id)
      .eq('organization_id', organizationId);

    if (error) throw error;
    return { deleted: true };
  }
}
```

### 11. Atualizar main.ts com global pipes e filters

```typescript
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  app.enableCors({
    origin: process.env.DASHBOARD_URL || 'http://localhost:3000',
    credentials: true,
  });

  app.setGlobalPrefix('api/v1');
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  const port = process.env.PORT || 3001;
  await app.listen(port, '0.0.0.0');
  console.log(`API running on http://localhost:${port}`);
}

bootstrap();
```

### 12. Criar nest-cli.json

```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "deleteOutDir": true
  }
}
```

## Endpoints da API (resumo)

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | /webhook/evolution | Recebe webhooks do Evolution API |
| GET | /api/v1/agents | Lista agentes da org |
| POST | /api/v1/agents | Cria agente |
| GET | /api/v1/agents/:id | Detalhe do agente |
| PUT | /api/v1/agents/:id | Atualiza agente |
| DELETE | /api/v1/agents/:id | Remove agente |
| GET | /api/v1/conversations | Lista conversas |
| GET | /api/v1/conversations/:id/messages | Mensagens de uma conversa |
| POST | /api/v1/whatsapp/instances | Cria instância WhatsApp |
| GET | /api/v1/whatsapp/instances/:name/qr | QR Code |
| GET | /api/v1/whatsapp/instances/:name/status | Status da conexão |

## Dependências
- Plano 01 (monorepo)
- Plano 02 (Redis + Supabase rodando)
- Plano 03 (schema + tipos)

## Critérios de Conclusão
- [ ] `pnpm --filter @agente-ia/api dev` inicia sem erros
- [ ] Auth guard valida JWT do Supabase corretamente
- [ ] CRUD de agents funciona via REST
- [ ] Webhook do Evolution API recebe e enfileira mensagens
- [ ] BullMQ cria jobs nas filas corretas
- [ ] Validação com Zod rejeita payloads inválidos
- [ ] Prefixo `/api/v1` aplicado em todas as rotas
