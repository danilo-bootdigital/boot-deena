# Plano 05 — Worker (BullMQ)

## Objetivo
Implementar o worker separado que processa mensagens da fila BullMQ: recebe mensagens inbound do WhatsApp, resolve o agente/conversa, chama o motor de IA, e envia a resposta de volta via Evolution API. Também processa filas de RAG (ingestão de documentos).

## Pré-requisitos
- Plano 01 concluído (monorepo)
- Plano 02 concluído (Redis rodando)
- Plano 03 concluído (schema)
- Plano 04 concluído (API enfileirando jobs)

## Estrutura de Arquivos Criados

```
apps/worker/src/
├── main.ts
├── worker.module.ts
├── processors/
│   ├── inbound-message.processor.ts
│   ├── outbound-message.processor.ts
│   └── rag.processor.ts
├── services/
│   ├── conversation-resolver.service.ts
│   ├── message-store.service.ts
│   └── evolution-sender.service.ts
└── config/
    └── worker.config.ts
```

## Steps

### 1. Instalar dependências

```bash
cd apps/worker
pnpm add @nestjs/config @nestjs/bullmq bullmq @supabase/supabase-js ioredis
pnpm add @agente-ia/shared @agente-ia/database @agente-ia/ai
```

### 2. Criar worker.module.ts

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { InboundMessageProcessor } from './processors/inbound-message.processor';
import { OutboundMessageProcessor } from './processors/outbound-message.processor';
import { RagProcessor } from './processors/rag.processor';
import { ConversationResolverService } from './services/conversation-resolver.service';
import { MessageStoreService } from './services/message-store.service';
import { EvolutionSenderService } from './services/evolution-sender.service';
import { workerConfig } from './config/worker.config';

const QUEUES = {
  INBOUND: 'inbound-messages',
  OUTBOUND: 'outbound-messages',
  RAG: 'rag-processing',
};

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
  ],
})
export class WorkerModule {}
```

### 3. Criar config/worker.config.ts

```typescript
import { registerAs } from '@nestjs/config';

export const workerConfig = registerAs('worker', () => ({
  concurrency: parseInt(process.env.WORKER_CONCURRENCY || '5'),
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  evolutionApiUrl: process.env.EVOLUTION_API_URL,
  evolutionApiKey: process.env.EVOLUTION_API_KEY,
  redisHost: process.env.REDIS_HOST || 'localhost',
  redisPort: parseInt(process.env.REDIS_PORT || '6379'),
}));
```

### 4. Criar ConversationResolverService

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createSupabaseAdmin } from '@agente-ia/database';

interface ResolvedConversation {
  conversationId: string;
  agentId: string;
  organizationId: string;
  isNew: boolean;
}

@Injectable()
export class ConversationResolverService {
  private readonly logger = new Logger(ConversationResolverService.name);
  private supabase;

  constructor(private configService: ConfigService) {
    this.supabase = createSupabaseAdmin(
      this.configService.get('worker.supabaseUrl'),
      this.configService.get('worker.supabaseServiceRoleKey'),
    );
  }

  async resolve(instanceName: string, remoteJid: string, pushName?: string): Promise<ResolvedConversation> {
    // 1. Encontrar a instância WhatsApp e a org associada
    const { data: instance } = await this.supabase
      .from('whatsapp_instances')
      .select('id, organization_id')
      .eq('instance_name', instanceName)
      .single();

    if (!instance) {
      throw new Error(`Instance not found: ${instanceName}`);
    }

    // 2. Encontrar o agente vinculado a essa instância
    const { data: agent } = await this.supabase
      .from('agents')
      .select('id')
      .eq('whatsapp_instance_id', instance.id)
      .eq('status', 'active')
      .single();

    if (!agent) {
      throw new Error(`No active agent for instance: ${instanceName}`);
    }

    // 3. Buscar ou criar conversa
    const phone = remoteJid.replace('@s.whatsapp.net', '');

    const { data: existingConversation } = await this.supabase
      .from('conversations')
      .select('id')
      .eq('organization_id', instance.organization_id)
      .eq('agent_id', agent.id)
      .eq('contact_phone', phone)
      .eq('status', 'active')
      .single();

    if (existingConversation) {
      return {
        conversationId: existingConversation.id,
        agentId: agent.id,
        organizationId: instance.organization_id,
        isNew: false,
      };
    }

    // Criar nova conversa
    const { data: newConversation } = await this.supabase
      .from('conversations')
      .insert({
        organization_id: instance.organization_id,
        agent_id: agent.id,
        contact_phone: phone,
        contact_push_name: pushName,
        channel: 'whatsapp',
        status: 'active',
      })
      .select('id')
      .single();

    return {
      conversationId: newConversation!.id,
      agentId: agent.id,
      organizationId: instance.organization_id,
      isNew: true,
    };
  }
}
```

### 5. Criar MessageStoreService

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createSupabaseAdmin } from '@agente-ia/database';

@Injectable()
export class MessageStoreService {
  private supabase;

  constructor(private configService: ConfigService) {
    this.supabase = createSupabaseAdmin(
      this.configService.get('worker.supabaseUrl'),
      this.configService.get('worker.supabaseServiceRoleKey'),
    );
  }

  async saveUserMessage(params: {
    conversationId: string;
    organizationId: string;
    content: string;
    type: string;
    whatsappMessageId?: string;
  }) {
    const { data } = await this.supabase
      .from('messages')
      .insert({
        conversation_id: params.conversationId,
        organization_id: params.organizationId,
        role: 'user',
        type: params.type as any,
        content: params.content,
        whatsapp_message_id: params.whatsappMessageId,
      })
      .select('id')
      .single();

    return data!.id;
  }

  async saveAssistantMessage(params: {
    conversationId: string;
    organizationId: string;
    content: string;
    tokensInput?: number;
    tokensOutput?: number;
    toolCalls?: any;
  }) {
    const { data } = await this.supabase
      .from('messages')
      .insert({
        conversation_id: params.conversationId,
        organization_id: params.organizationId,
        role: 'assistant',
        type: 'text',
        content: params.content,
        tokens_input: params.tokensInput,
        tokens_output: params.tokensOutput,
        tool_calls: params.toolCalls,
      })
      .select('id')
      .single();

    return data!.id;
  }

  async getConversationHistory(conversationId: string, limit = 20) {
    const { data } = await this.supabase
      .from('messages')
      .select('role, content, tool_calls, tool_results')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(limit);

    return data || [];
  }

  async updateLastMessageAt(conversationId: string) {
    await this.supabase
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversationId);
  }
}
```

### 6. Criar EvolutionSenderService

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EvolutionSenderService {
  private readonly logger = new Logger(EvolutionSenderService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(private configService: ConfigService) {
    this.baseUrl = this.configService.get('worker.evolutionApiUrl');
    this.apiKey = this.configService.get('worker.evolutionApiKey');
  }

  async sendText(instanceName: string, remoteJid: string, text: string) {
    const response = await fetch(`${this.baseUrl}/message/sendText/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: this.apiKey,
      },
      body: JSON.stringify({ number: remoteJid, text }),
    });

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`Failed to send message: ${error}`);
      throw new Error(`Evolution API send failed: ${response.status}`);
    }

    return response.json();
  }
}
```

### 7. Criar InboundMessageProcessor

```typescript
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ConversationResolverService } from '../services/conversation-resolver.service';
import { MessageStoreService } from '../services/message-store.service';
import { EvolutionSenderService } from '../services/evolution-sender.service';
// import { AIService } from '@agente-ia/ai'; // Plano 06

interface InboundMessageJob {
  instanceName: string;
  remoteJid: string;
  messageId: string;
  pushName?: string;
  message: { type: string; content: string };
  timestamp?: number;
}

@Processor('inbound-messages', {
  concurrency: 5,
  limiter: { max: 10, duration: 1000 },
})
export class InboundMessageProcessor extends WorkerHost {
  private readonly logger = new Logger(InboundMessageProcessor.name);

  constructor(
    private conversationResolver: ConversationResolverService,
    private messageStore: MessageStoreService,
    private evolutionSender: EvolutionSenderService,
  ) {
    super();
  }

  async process(job: Job<InboundMessageJob>): Promise<void> {
    const { instanceName, remoteJid, messageId, pushName, message } = job.data;

    this.logger.log(`Processing inbound message: ${messageId} from ${remoteJid}`);

    try {
      // 1. Resolver conversa (encontrar/criar)
      const resolved = await this.conversationResolver.resolve(
        instanceName,
        remoteJid,
        pushName,
      );

      // 2. Salvar mensagem do usuário
      await this.messageStore.saveUserMessage({
        conversationId: resolved.conversationId,
        organizationId: resolved.organizationId,
        content: message.content,
        type: message.type,
        whatsappMessageId: messageId,
      });

      // 3. Buscar histórico da conversa
      const history = await this.messageStore.getConversationHistory(
        resolved.conversationId,
      );

      // 4. Chamar motor de IA (Plano 06 - por agora placeholder)
      // const aiResponse = await this.aiService.generateResponse({
      //   agentId: resolved.agentId,
      //   organizationId: resolved.organizationId,
      //   messages: history,
      //   userMessage: message.content,
      // });
      const aiResponse = {
        content: `[Placeholder] Recebi: "${message.content}"`,
        tokensInput: 0,
        tokensOutput: 0,
      };

      // 5. Salvar resposta do assistente
      await this.messageStore.saveAssistantMessage({
        conversationId: resolved.conversationId,
        organizationId: resolved.organizationId,
        content: aiResponse.content,
        tokensInput: aiResponse.tokensInput,
        tokensOutput: aiResponse.tokensOutput,
      });

      // 6. Enviar resposta via WhatsApp
      await this.evolutionSender.sendText(instanceName, remoteJid, aiResponse.content);

      // 7. Atualizar timestamp da última mensagem
      await this.messageStore.updateLastMessageAt(resolved.conversationId);

      this.logger.log(`Message processed successfully: ${messageId}`);
    } catch (error) {
      this.logger.error(`Failed to process message ${messageId}: ${error.message}`);
      throw error; // BullMQ vai fazer retry
    }
  }
}
```

### 8. Criar OutboundMessageProcessor

```typescript
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { EvolutionSenderService } from '../services/evolution-sender.service';

interface OutboundMessageJob {
  instanceName: string;
  remoteJid: string;
  content: string;
  conversationId: string;
  messageId: string;
}

@Processor('outbound-messages', { concurrency: 10 })
export class OutboundMessageProcessor extends WorkerHost {
  private readonly logger = new Logger(OutboundMessageProcessor.name);

  constructor(private evolutionSender: EvolutionSenderService) {
    super();
  }

  async process(job: Job<OutboundMessageJob>): Promise<void> {
    const { instanceName, remoteJid, content } = job.data;

    this.logger.log(`Sending outbound message to ${remoteJid}`);
    await this.evolutionSender.sendText(instanceName, remoteJid, content);
  }
}
```

### 9. Criar RagProcessor (placeholder para Plano 07)

```typescript
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

interface RagJob {
  documentId: string;
  knowledgeBaseId: string;
  organizationId: string;
}

@Processor('rag-processing', { concurrency: 2 })
export class RagProcessor extends WorkerHost {
  private readonly logger = new Logger(RagProcessor.name);

  async process(job: Job<RagJob>): Promise<void> {
    const { documentId, knowledgeBaseId } = job.data;
    this.logger.log(`Processing document ${documentId} for KB ${knowledgeBaseId}`);

    // Implementação completa no Plano 07
    // 1. Buscar documento do storage
    // 2. Extrair texto (PDF, DOCX, TXT)
    // 3. Chunkar texto
    // 4. Gerar embeddings
    // 5. Salvar chunks no banco
    // 6. Atualizar status do documento

    this.logger.log(`Document ${documentId} processed (placeholder)`);
  }
}
```

### 10. Atualizar main.ts do worker

```typescript
import { NestFactory } from '@nestjs/core';
import { WorkerModule } from './worker.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Worker');
  const app = await NestFactory.createApplicationContext(WorkerModule);

  logger.log('Worker started and processing jobs...');
  logger.log(`Concurrency: ${process.env.WORKER_CONCURRENCY || 5}`);

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    logger.log('SIGTERM received, shutting down gracefully...');
    await app.close();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    logger.log('SIGINT received, shutting down gracefully...');
    await app.close();
    process.exit(0);
  });
}

bootstrap();
```

## Fluxo de Processamento

```
1. Evolution API → Webhook → API
2. API → BullMQ (inbound-messages queue)
3. Worker pega job da fila
4. Worker resolve conversa (instance → org → agent → conversation)
5. Worker salva mensagem do usuário
6. Worker busca histórico
7. Worker chama AI (Plano 06)
8. Worker salva resposta
9. Worker envia via Evolution API
```

## Dependências
- Plano 01 (monorepo)
- Plano 02 (Redis)
- Plano 03 (schema)
- Plano 04 (API enfileira jobs)
- Plano 06 (motor de IA — placeholder até lá)

## Critérios de Conclusão
- [ ] `pnpm --filter @agente-ia/worker dev` inicia sem erros
- [ ] Worker conecta no Redis e escuta as filas
- [ ] InboundMessageProcessor processa jobs corretamente
- [ ] Conversa é criada/encontrada automaticamente
- [ ] Mensagens são salvas no banco (user + assistant)
- [ ] Resposta é enviada via Evolution API
- [ ] Retry funciona em caso de falha (3 tentativas com backoff)
- [ ] Graceful shutdown funciona (SIGTERM/SIGINT)
- [ ] Rate limiting aplicado (10 msgs/segundo)
