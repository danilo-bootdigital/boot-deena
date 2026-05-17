# Plano 06 — Motor de IA (Vercel AI SDK)

## Objetivo
Implementar o pacote `@agente-ia/ai` com Vercel AI SDK, suportando múltiplos providers (OpenAI, Anthropic), streaming, tool calling, contexto de conversa com memory/sliding window, e integração com o worker para gerar respostas dos agentes.

## Pré-requisitos
- Plano 01 concluído (monorepo)
- Plano 03 concluído (schema — tabela agents com provider/model/system_prompt)
- Plano 05 concluído (worker chama o motor de IA)
- API keys dos providers (OpenAI, Anthropic)

## Estrutura de Arquivos Criados

```
packages/ai/src/
├── index.ts
├── providers/
│   ├── index.ts
│   ├── registry.ts
│   └── config.ts
├── engine/
│   ├── generate.ts
│   ├── stream.ts
│   └── context-builder.ts
├── tools/
│   ├── index.ts
│   ├── tool-registry.ts
│   ├── builtin/
│   │   ├── search-knowledge-base.ts
│   │   ├── get-current-time.ts
│   │   └── human-handoff.ts
│   └── dynamic/
│       └── api-call-tool.ts
├── memory/
│   ├── sliding-window.ts
│   ├── summary.ts
│   └── token-counter.ts
└── types.ts
```

## Steps

### 1. Instalar dependências no packages/ai

```bash
cd packages/ai
pnpm add ai @ai-sdk/openai @ai-sdk/anthropic zod
pnpm add -D typescript @types/node
```

### 2. Criar types.ts

```typescript
import type { CoreMessage } from 'ai';

export interface AgentConfig {
  id: string;
  organizationId: string;
  name: string;
  systemPrompt: string;
  provider: 'openai' | 'anthropic' | 'google';
  model: string;
  temperature: number;
  maxTokens: number;
  settings: Record<string, any>;
}

export interface GenerateParams {
  agent: AgentConfig;
  messages: CoreMessage[];
  userMessage: string;
  tools?: ToolDefinition[];
  knowledgeBaseIds?: string[];
  onToolCall?: (toolName: string, args: any) => Promise<any>;
}

export interface GenerateResult {
  content: string;
  tokensInput: number;
  tokensOutput: number;
  toolCalls?: ToolCallResult[];
  finishReason: string;
}

export interface StreamParams extends GenerateParams {
  onChunk?: (chunk: string) => void;
  onFinish?: (result: GenerateResult) => void;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parametersSchema: Record<string, any>;
  type: 'function' | 'api_call' | 'webhook' | 'builtin';
  endpointUrl?: string;
  headers?: Record<string, string>;
}

export interface ToolCallResult {
  toolName: string;
  args: Record<string, any>;
  result: any;
}
```

### 3. Criar providers/registry.ts

```typescript
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import type { LanguageModel } from 'ai';

const providerMap = {
  openai: (model: string) => openai(model),
  anthropic: (model: string) => anthropic(model),
} as const;

export function getModel(provider: string, model: string): LanguageModel {
  const factory = providerMap[provider as keyof typeof providerMap];
  if (!factory) {
    throw new Error(`Unsupported provider: ${provider}`);
  }
  return factory(model);
}
```

### 4. Criar memory/sliding-window.ts

```typescript
import type { CoreMessage } from 'ai';

interface SlidingWindowOptions {
  maxMessages: number;
  maxTokens: number;
  alwaysKeepSystemPrompt: boolean;
}

const DEFAULT_OPTIONS: SlidingWindowOptions = {
  maxMessages: 40,
  maxTokens: 8000,
  alwaysKeepSystemPrompt: true,
};

export function applySlidingWindow(
  messages: CoreMessage[],
  options: Partial<SlidingWindowOptions> = {},
): CoreMessage[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  if (messages.length <= opts.maxMessages) {
    return messages;
  }

  // Manter as últimas N mensagens
  const trimmed = messages.slice(-opts.maxMessages);

  // Garantir que começa com uma mensagem do user (não cortar no meio de um par)
  const firstUserIdx = trimmed.findIndex((m) => m.role === 'user');
  if (firstUserIdx > 0) {
    return trimmed.slice(firstUserIdx);
  }

  return trimmed;
}
```

### 5. Criar memory/token-counter.ts

```typescript
export function estimateTokens(text: string): number {
  // Estimativa simples: ~4 chars por token (inglês)
  // Para português, ~3.5 chars por token
  return Math.ceil(text.length / 3.5);
}

export function estimateMessagesTokens(messages: { content?: string }[]): number {
  return messages.reduce((total, msg) => {
    return total + estimateTokens(msg.content || '') + 4; // overhead por mensagem
  }, 0);
}
```

### 6. Criar engine/context-builder.ts

```typescript
import type { CoreMessage } from 'ai';
import type { AgentConfig } from '../types';
import { applySlidingWindow } from '../memory/sliding-window';

interface ContextBuilderParams {
  agent: AgentConfig;
  conversationHistory: Array<{ role: string; content: string; tool_calls?: any; tool_results?: any }>;
  userMessage: string;
  ragContext?: string;
}

export function buildContext(params: ContextBuilderParams): CoreMessage[] {
  const { agent, conversationHistory, userMessage, ragContext } = params;

  const messages: CoreMessage[] = [];

  // System prompt com contexto RAG injetado
  let systemContent = agent.systemPrompt;
  if (ragContext) {
    systemContent += `\n\n---\nContexto relevante da base de conhecimento:\n${ragContext}`;
  }

  messages.push({ role: 'system', content: systemContent });

  // Histórico da conversa
  for (const msg of conversationHistory) {
    if (msg.role === 'user') {
      messages.push({ role: 'user', content: msg.content || '' });
    } else if (msg.role === 'assistant') {
      messages.push({ role: 'assistant', content: msg.content || '' });
    }
  }

  // Mensagem atual do usuário
  messages.push({ role: 'user', content: userMessage });

  // Aplicar sliding window
  const systemMsg = messages[0];
  const conversationMsgs = messages.slice(1);
  const trimmed = applySlidingWindow(conversationMsgs, {
    maxMessages: 40,
    maxTokens: agent.maxTokens * 4,
  });

  return [systemMsg, ...trimmed];
}
```

### 7. Criar tools/tool-registry.ts

```typescript
import { tool } from 'ai';
import { z } from 'zod';
import type { ToolDefinition } from '../types';

export function buildToolsFromDefinitions(definitions: ToolDefinition[]) {
  const tools: Record<string, any> = {};

  for (const def of definitions) {
    if (def.type === 'builtin') {
      continue; // Builtins são registrados separadamente
    }

    tools[def.name] = tool({
      description: def.description,
      parameters: jsonSchemaToZod(def.parametersSchema),
      execute: async (args) => {
        if (def.type === 'api_call' && def.endpointUrl) {
          return executeApiCall(def.endpointUrl, args, def.headers);
        }
        if (def.type === 'webhook' && def.endpointUrl) {
          return executeWebhook(def.endpointUrl, args, def.headers);
        }
        return { error: 'Unknown tool type' };
      },
    });
  }

  return tools;
}

async function executeApiCall(url: string, args: any, headers?: Record<string, string>) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(args),
  });

  if (!response.ok) {
    return { error: `API call failed: ${response.status}` };
  }

  return response.json();
}

async function executeWebhook(url: string, args: any, headers?: Record<string, string>) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(args),
  });

  return { status: response.status, sent: true };
}

function jsonSchemaToZod(schema: Record<string, any>): z.ZodType<any> {
  // Simplificação: aceita qualquer objeto
  // Em produção, usar uma lib como json-schema-to-zod
  if (!schema || !schema.properties) {
    return z.object({});
  }

  const shape: Record<string, z.ZodType<any>> = {};
  for (const [key, prop] of Object.entries(schema.properties as Record<string, any>)) {
    switch (prop.type) {
      case 'string':
        shape[key] = prop.description ? z.string().describe(prop.description) : z.string();
        break;
      case 'number':
        shape[key] = z.number();
        break;
      case 'boolean':
        shape[key] = z.boolean();
        break;
      default:
        shape[key] = z.any();
    }

    if (!schema.required?.includes(key)) {
      shape[key] = shape[key].optional();
    }
  }

  return z.object(shape);
}
```

### 8. Criar tools/builtin/search-knowledge-base.ts

```typescript
import { tool } from 'ai';
import { z } from 'zod';

export function createSearchKnowledgeBaseTool(searchFn: (query: string, kbIds: string[]) => Promise<string>) {
  return tool({
    description: 'Search the knowledge base for relevant information to answer the user question',
    parameters: z.object({
      query: z.string().describe('The search query to find relevant information'),
    }),
    execute: async ({ query }) => {
      return searchFn(query, []);
    },
  });
}
```

### 9. Criar tools/builtin/human-handoff.ts

```typescript
import { tool } from 'ai';
import { z } from 'zod';

export function createHumanHandoffTool(handoffFn: (reason: string) => Promise<void>) {
  return tool({
    description: 'Transfer the conversation to a human agent when you cannot help the user or they explicitly request it',
    parameters: z.object({
      reason: z.string().describe('Why the conversation is being transferred to a human'),
    }),
    execute: async ({ reason }) => {
      await handoffFn(reason);
      return { transferred: true, reason };
    },
  });
}
```

### 10. Criar engine/generate.ts (função principal)

```typescript
import { generateText } from 'ai';
import { getModel } from '../providers/registry';
import { buildContext } from './context-builder';
import { buildToolsFromDefinitions } from '../tools/tool-registry';
import type { GenerateParams, GenerateResult } from '../types';

export async function generate(params: GenerateParams): Promise<GenerateResult> {
  const { agent, messages: conversationHistory, userMessage, tools: toolDefs } = params;

  // 1. Construir contexto (system prompt + histórico + sliding window)
  const messages = buildContext({
    agent,
    conversationHistory: conversationHistory as any,
    userMessage,
  });

  // 2. Construir tools
  const tools = toolDefs ? buildToolsFromDefinitions(toolDefs) : undefined;

  // 3. Obter modelo
  const model = getModel(agent.provider, agent.model);

  // 4. Gerar resposta
  const result = await generateText({
    model,
    messages,
    tools,
    maxTokens: agent.maxTokens,
    temperature: agent.temperature,
    maxSteps: 5, // Permite até 5 tool calls em sequência
  });

  return {
    content: result.text,
    tokensInput: result.usage?.promptTokens || 0,
    tokensOutput: result.usage?.completionTokens || 0,
    toolCalls: result.toolCalls?.map((tc) => ({
      toolName: tc.toolName,
      args: tc.args,
      result: null,
    })),
    finishReason: result.finishReason,
  };
}
```

### 11. Criar engine/stream.ts (para uso futuro no dashboard)

```typescript
import { streamText } from 'ai';
import { getModel } from '../providers/registry';
import { buildContext } from './context-builder';
import { buildToolsFromDefinitions } from '../tools/tool-registry';
import type { StreamParams, GenerateResult } from '../types';

export async function generateStream(params: StreamParams) {
  const { agent, messages: conversationHistory, userMessage, tools: toolDefs, onChunk, onFinish } = params;

  const messages = buildContext({
    agent,
    conversationHistory: conversationHistory as any,
    userMessage,
  });

  const tools = toolDefs ? buildToolsFromDefinitions(toolDefs) : undefined;
  const model = getModel(agent.provider, agent.model);

  const result = streamText({
    model,
    messages,
    tools,
    maxTokens: agent.maxTokens,
    temperature: agent.temperature,
    maxSteps: 5,
    onChunk: ({ chunk }) => {
      if (chunk.type === 'text-delta' && onChunk) {
        onChunk(chunk.textDelta);
      }
    },
    onFinish: ({ text, usage, finishReason }) => {
      if (onFinish) {
        onFinish({
          content: text,
          tokensInput: usage.promptTokens,
          tokensOutput: usage.completionTokens,
          finishReason,
        });
      }
    },
  });

  return result;
}
```

### 12. Criar index.ts (exports públicos)

```typescript
export { generate } from './engine/generate';
export { generateStream } from './engine/stream';
export { getModel } from './providers/registry';
export { buildContext } from './engine/context-builder';
export { buildToolsFromDefinitions } from './tools/tool-registry';
export { createSearchKnowledgeBaseTool } from './tools/builtin/search-knowledge-base';
export { createHumanHandoffTool } from './tools/builtin/human-handoff';
export { applySlidingWindow } from './memory/sliding-window';
export { estimateTokens, estimateMessagesTokens } from './memory/token-counter';
export type * from './types';
```

### 13. Integrar no Worker (atualizar InboundMessageProcessor)

Substituir o placeholder no `inbound-message.processor.ts`:

```typescript
// Importar
import { generate } from '@agente-ia/ai';
import type { AgentConfig } from '@agente-ia/ai';

// No método process(), substituir o placeholder:
// Buscar config do agente
const { data: agentData } = await this.supabase
  .from('agents')
  .select('*, agent_tools(*)')
  .eq('id', resolved.agentId)
  .single();

const agentConfig: AgentConfig = {
  id: agentData.id,
  organizationId: agentData.organization_id,
  name: agentData.name,
  systemPrompt: agentData.system_prompt,
  provider: agentData.provider,
  model: agentData.model,
  temperature: Number(agentData.temperature),
  maxTokens: agentData.max_tokens,
  settings: agentData.settings,
};

const aiResponse = await generate({
  agent: agentConfig,
  messages: history as any,
  userMessage: message.content,
  tools: agentData.agent_tools,
});
```

## Dependências
- Plano 01 (monorepo)
- Plano 03 (schema de agents)
- Plano 05 (worker consome o motor)

## Critérios de Conclusão
- [ ] `@agente-ia/ai` compila sem erros
- [ ] `generate()` retorna resposta usando OpenAI
- [ ] `generate()` retorna resposta usando Anthropic
- [ ] Tool calling funciona (tool é chamada e resultado usado na resposta)
- [ ] Sliding window limita histórico corretamente
- [ ] Context builder monta mensagens no formato correto
- [ ] Worker integrado chama `generate()` e recebe resposta
- [ ] Tokens de uso são contabilizados
- [ ] maxSteps permite múltiplas tool calls em sequência
