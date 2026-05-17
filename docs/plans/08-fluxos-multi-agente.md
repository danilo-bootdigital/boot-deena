# Plano 08 — Fluxos Multi-Agente

## Objetivo
Implementar o sistema de orquestração de agentes com fluxos condicionais, handoff entre agentes, state machine para controle de estado da conversa, e execução de fluxos multi-step com variáveis e condições.

## Pré-requisitos
- Plano 03 concluído (tabelas flows, flow_steps, agent_flows)
- Plano 05 concluído (worker processando mensagens)
- Plano 06 concluído (motor de IA com tool calling)

## Estrutura de Arquivos Criados

```
packages/ai/src/
├── orchestrator/
│   ├── index.ts
│   ├── orchestrator.ts
│   ├── state-machine.ts
│   ├── flow-executor.ts
│   ├── intent-detector.ts
│   └── handoff.ts

apps/api/src/modules/
├── flows/
│   ├── flows.module.ts
│   ├── flows.controller.ts
│   ├── flows.service.ts
│   └── dto/
│       ├── create-flow.dto.ts
│       └── create-flow-step.dto.ts
```

## Conceitos

### State Machine da Conversa
Cada conversa tem um estado que determina como a próxima mensagem é processada:

```
States:
  - idle          → Agente principal responde normalmente
  - in_flow       → Executando um fluxo específico (step by step)
  - waiting_input → Aguardando input do usuário para continuar fluxo
  - handoff       → Transferido para outro agente
  - human         → Transferido para atendente humano
```

### Fluxo de Decisão
```
Mensagem recebida
  → Verificar estado da conversa
    → Se idle: detectar intent / keyword trigger
      → Se match: iniciar fluxo
      → Se não: resposta normal do agente
    → Se in_flow: executar próximo step
    → Se waiting_input: processar input e continuar
    → Se handoff: redirecionar para agente alvo
    → Se human: ignorar (humano responde)
```

## Steps

### 1. Criar packages/ai/src/orchestrator/state-machine.ts

```typescript
export type ConversationState =
  | 'idle'
  | 'in_flow'
  | 'waiting_input'
  | 'handoff'
  | 'human';

export interface ConversationContext {
  state: ConversationState;
  currentFlowId?: string;
  currentStepId?: string;
  targetAgentId?: string;
  variables: Record<string, any>;
  stepHistory: string[];
}

export function createInitialContext(): ConversationContext {
  return {
    state: 'idle',
    variables: {},
    stepHistory: [],
  };
}

export function transitionTo(
  context: ConversationContext,
  newState: ConversationState,
  updates: Partial<ConversationContext> = {},
): ConversationContext {
  return {
    ...context,
    ...updates,
    state: newState,
  };
}

export function setVariable(
  context: ConversationContext,
  key: string,
  value: any,
): ConversationContext {
  return {
    ...context,
    variables: { ...context.variables, [key]: value },
  };
}

export function clearFlowState(context: ConversationContext): ConversationContext {
  return {
    ...context,
    state: 'idle',
    currentFlowId: undefined,
    currentStepId: undefined,
    targetAgentId: undefined,
    stepHistory: [],
  };
}
```

### 2. Criar packages/ai/src/orchestrator/intent-detector.ts

```typescript
import { generateText } from 'ai';
import { getModel } from '../providers/registry';

interface Flow {
  id: string;
  name: string;
  description?: string;
  triggerKeywords?: string[];
  triggerIntent?: string;
}

interface DetectionResult {
  matched: boolean;
  flowId?: string;
  confidence: number;
}

export function detectByKeyword(message: string, flows: Flow[]): DetectionResult {
  const normalizedMessage = message.toLowerCase().trim();

  for (const flow of flows) {
    if (!flow.triggerKeywords?.length) continue;

    for (const keyword of flow.triggerKeywords) {
      if (normalizedMessage.includes(keyword.toLowerCase())) {
        return { matched: true, flowId: flow.id, confidence: 1.0 };
      }
    }
  }

  return { matched: false, confidence: 0 };
}

export async function detectByIntent(
  message: string,
  flows: Flow[],
  provider: string,
  model: string,
): Promise<DetectionResult> {
  const flowDescriptions = flows
    .filter((f) => f.triggerIntent)
    .map((f) => `- "${f.triggerIntent}" → flow_id: ${f.id}`)
    .join('\n');

  if (!flowDescriptions) {
    return { matched: false, confidence: 0 };
  }

  const llmModel = getModel(provider, model);

  const result = await generateText({
    model: llmModel,
    messages: [
      {
        role: 'system',
        content: `You are an intent classifier. Given a user message, determine if it matches any of the following intents. Respond with JSON only: {"flowId": "id_or_null", "confidence": 0.0-1.0}

Available intents:
${flowDescriptions}`,
      },
      { role: 'user', content: message },
    ],
    maxTokens: 100,
    temperature: 0,
  });

  try {
    const parsed = JSON.parse(result.text);
    if (parsed.flowId && parsed.confidence > 0.7) {
      return { matched: true, flowId: parsed.flowId, confidence: parsed.confidence };
    }
  } catch {
    // Parse failed, no match
  }

  return { matched: false, confidence: 0 };
}
```

### 3. Criar packages/ai/src/orchestrator/flow-executor.ts

```typescript
import type { ConversationContext } from './state-machine';
import { transitionTo, setVariable, clearFlowState } from './state-machine';
import { generate } from '../engine/generate';
import type { AgentConfig } from '../types';

interface FlowStep {
  id: string;
  type: 'message' | 'condition' | 'tool_call' | 'handoff' | 'wait' | 'set_variable';
  config: Record<string, any>;
  nextStepId?: string;
  conditionTrueStepId?: string;
  conditionFalseStepId?: string;
}

interface ExecuteStepResult {
  response?: string;
  context: ConversationContext;
  completed: boolean;
  nextStepId?: string;
}

export async function executeStep(
  step: FlowStep,
  context: ConversationContext,
  userMessage: string,
  agent: AgentConfig,
  supabase: any,
): Promise<ExecuteStepResult> {
  switch (step.type) {
    case 'message':
      return executeMessageStep(step, context);

    case 'condition':
      return executeConditionStep(step, context, userMessage);

    case 'tool_call':
      return executeToolCallStep(step, context, agent);

    case 'handoff':
      return executeHandoffStep(step, context);

    case 'wait':
      return executeWaitStep(step, context);

    case 'set_variable':
      return executeSetVariableStep(step, context, userMessage);

    default:
      return { context: clearFlowState(context), completed: true };
  }
}

function executeMessageStep(step: FlowStep, context: ConversationContext): ExecuteStepResult {
  let message = step.config.message as string;

  // Substituir variáveis no template
  for (const [key, value] of Object.entries(context.variables)) {
    message = message.replace(`{{${key}}}`, String(value));
  }

  const updatedContext = {
    ...context,
    stepHistory: [...context.stepHistory, step.id],
  };

  return {
    response: message,
    context: updatedContext,
    completed: false,
    nextStepId: step.nextStepId,
  };
}

function executeConditionStep(
  step: FlowStep,
  context: ConversationContext,
  userMessage: string,
): ExecuteStepResult {
  const { variable, operator, value } = step.config;
  const actualValue = variable === '$last_message' ? userMessage : context.variables[variable];

  let conditionMet = false;

  switch (operator) {
    case 'equals':
      conditionMet = String(actualValue).toLowerCase() === String(value).toLowerCase();
      break;
    case 'contains':
      conditionMet = String(actualValue).toLowerCase().includes(String(value).toLowerCase());
      break;
    case 'not_empty':
      conditionMet = !!actualValue && String(actualValue).trim().length > 0;
      break;
    case 'greater_than':
      conditionMet = Number(actualValue) > Number(value);
      break;
    case 'regex':
      conditionMet = new RegExp(value, 'i').test(String(actualValue));
      break;
  }

  return {
    context: { ...context, stepHistory: [...context.stepHistory, step.id] },
    completed: false,
    nextStepId: conditionMet ? step.conditionTrueStepId : step.conditionFalseStepId,
  };
}

async function executeToolCallStep(
  step: FlowStep,
  context: ConversationContext,
  agent: AgentConfig,
): Promise<ExecuteStepResult> {
  const { toolName, args } = step.config;

  // Substituir variáveis nos args
  const resolvedArgs: Record<string, any> = {};
  for (const [key, value] of Object.entries(args || {})) {
    if (typeof value === 'string' && value.startsWith('{{') && value.endsWith('}}')) {
      const varName = value.slice(2, -2);
      resolvedArgs[key] = context.variables[varName];
    } else {
      resolvedArgs[key] = value;
    }
  }

  // Executar tool via endpoint
  const endpoint = step.config.endpoint;
  if (endpoint) {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(resolvedArgs),
    });
    const result = await response.json();

    const updatedContext = setVariable(context, `tool_result_${toolName}`, result);
    return {
      context: { ...updatedContext, stepHistory: [...updatedContext.stepHistory, step.id] },
      completed: false,
      nextStepId: step.nextStepId,
    };
  }

  return {
    context: { ...context, stepHistory: [...context.stepHistory, step.id] },
    completed: false,
    nextStepId: step.nextStepId,
  };
}

function executeHandoffStep(step: FlowStep, context: ConversationContext): ExecuteStepResult {
  const { targetAgentId, message } = step.config;

  const updatedContext = transitionTo(context, 'handoff', { targetAgentId });

  return {
    response: message || 'Transferindo para outro atendente...',
    context: updatedContext,
    completed: true,
  };
}

function executeWaitStep(step: FlowStep, context: ConversationContext): ExecuteStepResult {
  const updatedContext = transitionTo(context, 'waiting_input', {
    currentStepId: step.nextStepId,
  });

  return {
    response: step.config.prompt || 'Aguardando sua resposta...',
    context: updatedContext,
    completed: false,
  };
}

function executeSetVariableStep(
  step: FlowStep,
  context: ConversationContext,
  userMessage: string,
): ExecuteStepResult {
  const { variableName, source } = step.config;

  let value: any;
  if (source === 'last_message') {
    value = userMessage;
  } else if (source === 'static') {
    value = step.config.value;
  }

  const updatedContext = setVariable(context, variableName, value);

  return {
    context: { ...updatedContext, stepHistory: [...updatedContext.stepHistory, step.id] },
    completed: false,
    nextStepId: step.nextStepId,
  };
}
```

### 4. Criar packages/ai/src/orchestrator/orchestrator.ts

```typescript
import type { ConversationContext } from './state-machine';
import { createInitialContext, transitionTo, clearFlowState } from './state-machine';
import { detectByKeyword, detectByIntent } from './intent-detector';
import { executeStep } from './flow-executor';
import { generate } from '../engine/generate';
import type { AgentConfig, GenerateResult } from '../types';

interface OrchestratorParams {
  agent: AgentConfig;
  conversationHistory: any[];
  userMessage: string;
  context: ConversationContext | null;
  flows: any[];
  flowSteps: Map<string, any[]>;
  tools?: any[];
  ragContext?: string;
  supabase: any;
}

interface OrchestratorResult {
  response: string;
  context: ConversationContext;
  tokensInput: number;
  tokensOutput: number;
  flowExecuted?: string;
}

export async function orchestrate(params: OrchestratorParams): Promise<OrchestratorResult> {
  const {
    agent,
    conversationHistory,
    userMessage,
    flows,
    flowSteps,
    tools,
    ragContext,
    supabase,
  } = params;

  let context = params.context || createInitialContext();

  // Estado: waiting_input → capturar input e continuar fluxo
  if (context.state === 'waiting_input' && context.currentStepId) {
    return continueFlow(context, userMessage, agent, flowSteps, supabase);
  }

  // Estado: in_flow → continuar executando steps
  if (context.state === 'in_flow' && context.currentFlowId && context.currentStepId) {
    return continueFlow(context, userMessage, agent, flowSteps, supabase);
  }

  // Estado: handoff → redirecionar para outro agente
  if (context.state === 'handoff' && context.targetAgentId) {
    // Buscar agente alvo e gerar resposta com ele
    // (simplificado: resetar e usar agente alvo)
    context = clearFlowState(context);
  }

  // Estado: idle → detectar intent ou responder normalmente
  if (context.state === 'idle' && flows.length > 0) {
    // Tentar keyword match primeiro (rápido, sem custo)
    const keywordResult = detectByKeyword(userMessage, flows);

    if (keywordResult.matched && keywordResult.flowId) {
      return startFlow(keywordResult.flowId, context, userMessage, agent, flowSteps, supabase);
    }

    // Tentar intent detection (usa LLM, mais lento)
    const intentFlows = flows.filter((f) => f.triggerIntent);
    if (intentFlows.length > 0) {
      const intentResult = await detectByIntent(userMessage, intentFlows, agent.provider, agent.model);
      if (intentResult.matched && intentResult.flowId) {
        return startFlow(intentResult.flowId, context, userMessage, agent, flowSteps, supabase);
      }
    }
  }

  // Nenhum fluxo detectado → resposta normal do agente
  const result = await generate({
    agent,
    messages: conversationHistory,
    userMessage,
    tools,
  });

  return {
    response: result.content,
    context,
    tokensInput: result.tokensInput,
    tokensOutput: result.tokensOutput,
  };
}

async function startFlow(
  flowId: string,
  context: ConversationContext,
  userMessage: string,
  agent: AgentConfig,
  flowSteps: Map<string, any[]>,
  supabase: any,
): Promise<OrchestratorResult> {
  const steps = flowSteps.get(flowId) || [];
  if (steps.length === 0) {
    return {
      response: 'Fluxo não configurado.',
      context,
      tokensInput: 0,
      tokensOutput: 0,
    };
  }

  // Ordenar por position e pegar primeiro step
  const sortedSteps = steps.sort((a, b) => a.position - b.position);
  const firstStep = sortedSteps[0];

  const updatedContext = transitionTo(context, 'in_flow', {
    currentFlowId: flowId,
    currentStepId: firstStep.id,
  });

  return executeFlowSteps(updatedContext, firstStep, userMessage, agent, steps, supabase);
}

async function continueFlow(
  context: ConversationContext,
  userMessage: string,
  agent: AgentConfig,
  flowSteps: Map<string, any[]>,
  supabase: any,
): Promise<OrchestratorResult> {
  const steps = flowSteps.get(context.currentFlowId!) || [];
  const currentStep = steps.find((s) => s.id === context.currentStepId);

  if (!currentStep) {
    return {
      response: 'Fluxo finalizado.',
      context: clearFlowState(context),
      tokensInput: 0,
      tokensOutput: 0,
    };
  }

  return executeFlowSteps(context, currentStep, userMessage, agent, steps, supabase);
}

async function executeFlowSteps(
  context: ConversationContext,
  startStep: any,
  userMessage: string,
  agent: AgentConfig,
  allSteps: any[],
  supabase: any,
): Promise<OrchestratorResult> {
  let currentStep = startStep;
  let currentContext = context;
  const responses: string[] = [];
  let maxIterations = 10; // Prevenir loops infinitos

  while (currentStep && maxIterations > 0) {
    maxIterations--;

    const result = await executeStep(currentStep, currentContext, userMessage, agent, supabase);
    currentContext = result.context;

    if (result.response) {
      responses.push(result.response);
    }

    if (result.completed) {
      currentContext = clearFlowState(currentContext);
      break;
    }

    // Se é um wait step, parar e aguardar próxima mensagem
    if (currentStep.type === 'wait') {
      break;
    }

    // Avançar para próximo step
    if (result.nextStepId) {
      currentStep = allSteps.find((s) => s.id === result.nextStepId);
      currentContext = { ...currentContext, currentStepId: result.nextStepId };
    } else {
      // Sem próximo step, fluxo terminou
      currentContext = clearFlowState(currentContext);
      break;
    }
  }

  return {
    response: responses.join('\n\n'),
    context: currentContext,
    tokensInput: 0,
    tokensOutput: 0,
    flowExecuted: context.currentFlowId,
  };
}
```

### 5. Criar packages/ai/src/orchestrator/handoff.ts

```typescript
import type { ConversationContext } from './state-machine';
import { transitionTo } from './state-machine';

export interface HandoffConfig {
  targetAgentId: string;
  reason: string;
  preserveContext: boolean;
}

export function initiateHandoff(
  context: ConversationContext,
  config: HandoffConfig,
): ConversationContext {
  return transitionTo(context, 'handoff', {
    targetAgentId: config.targetAgentId,
    variables: config.preserveContext
      ? context.variables
      : {},
  });
}

export function initiateHumanHandoff(
  context: ConversationContext,
  reason: string,
): ConversationContext {
  return transitionTo(context, 'human', {
    variables: { ...context.variables, handoff_reason: reason },
  });
}
```

### 6. Criar packages/ai/src/orchestrator/index.ts

```typescript
export { orchestrate } from './orchestrator';
export { createInitialContext, transitionTo, clearFlowState, setVariable } from './state-machine';
export type { ConversationContext, ConversationState } from './state-machine';
export { detectByKeyword, detectByIntent } from './intent-detector';
export { executeStep } from './flow-executor';
export { initiateHandoff, initiateHumanHandoff } from './handoff';
```

### 7. Atualizar packages/ai/src/index.ts

```typescript
// ... exports existentes
export * from './orchestrator';
```

### 8. Criar API de Flows

**modules/flows/flows.controller.ts:**
```typescript
import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { CurrentOrg } from '../../common/decorators/current-org.decorator';
import { FlowsService } from './flows.service';

@Controller('flows')
@UseGuards(SupabaseAuthGuard)
export class FlowsController {
  constructor(private flowsService: FlowsService) {}

  @Get()
  findAll(@CurrentOrg() orgId: string) {
    return this.flowsService.findAll(orgId);
  }

  @Post()
  create(@Body() body: any, @CurrentOrg() orgId: string) {
    return this.flowsService.create(orgId, body);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentOrg() orgId: string) {
    return this.flowsService.findOne(id, orgId);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: any, @CurrentOrg() orgId: string) {
    return this.flowsService.update(id, orgId, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentOrg() orgId: string) {
    return this.flowsService.remove(id, orgId);
  }

  @Post(':id/steps')
  addStep(@Param('id') flowId: string, @Body() body: any, @CurrentOrg() orgId: string) {
    return this.flowsService.addStep(flowId, orgId, body);
  }

  @Put(':id/steps/:stepId')
  updateStep(
    @Param('id') flowId: string,
    @Param('stepId') stepId: string,
    @Body() body: any,
    @CurrentOrg() orgId: string,
  ) {
    return this.flowsService.updateStep(flowId, stepId, orgId, body);
  }

  @Delete(':id/steps/:stepId')
  removeStep(
    @Param('id') flowId: string,
    @Param('stepId') stepId: string,
    @CurrentOrg() orgId: string,
  ) {
    return this.flowsService.removeStep(flowId, stepId, orgId);
  }
}
```

### 9. Armazenar contexto da conversa (Redis)

```typescript
// Adicionar ao worker: salvar/recuperar contexto no Redis
import Redis from 'ioredis';
import type { ConversationContext } from '@agente-ia/ai';

const CONTEXT_TTL = 60 * 60 * 24; // 24 horas

export async function getConversationContext(
  redis: Redis,
  conversationId: string,
): Promise<ConversationContext | null> {
  const data = await redis.get(`conv:context:${conversationId}`);
  return data ? JSON.parse(data) : null;
}

export async function saveConversationContext(
  redis: Redis,
  conversationId: string,
  context: ConversationContext,
): Promise<void> {
  await redis.set(
    `conv:context:${conversationId}`,
    JSON.stringify(context),
    'EX',
    CONTEXT_TTL,
  );
}
```

### 10. Integrar orquestrador no Worker

```typescript
// Atualizar InboundMessageProcessor para usar orchestrate() ao invés de generate()
import { orchestrate } from '@agente-ia/ai';

// Buscar flows do agente
const { data: agentFlows } = await this.supabase
  .from('agent_flows')
  .select('flow_id, flows(*)')
  .eq('agent_id', resolved.agentId);

const flows = agentFlows?.map((af) => af.flows) || [];

// Buscar steps de cada flow
const flowSteps = new Map();
for (const flow of flows) {
  const { data: steps } = await this.supabase
    .from('flow_steps')
    .select('*')
    .eq('flow_id', flow.id)
    .order('position');
  flowSteps.set(flow.id, steps || []);
}

// Recuperar contexto do Redis
const context = await getConversationContext(this.redis, resolved.conversationId);

// Orquestrar
const result = await orchestrate({
  agent: agentConfig,
  conversationHistory: history,
  userMessage: message.content,
  context,
  flows,
  flowSteps,
  tools: agentData.agent_tools,
  ragContext,
  supabase: this.supabase,
});

// Salvar contexto atualizado
await saveConversationContext(this.redis, resolved.conversationId, result.context);
```

## Dependências
- Plano 03 (tabelas flows)
- Plano 05 (worker)
- Plano 06 (motor de IA)

## Critérios de Conclusão
- [ ] State machine gerencia estados da conversa corretamente
- [ ] Keyword trigger inicia fluxo automaticamente
- [ ] Intent detection via LLM funciona
- [ ] Flow executor processa steps em sequência
- [ ] Condições (if/else) funcionam nos fluxos
- [ ] Wait step pausa e retoma na próxima mensagem
- [ ] Handoff transfere para outro agente
- [ ] Human handoff marca conversa como `waiting_human`
- [ ] Variáveis são substituídas em templates de mensagem
- [ ] Contexto persiste no Redis entre mensagens
- [ ] Proteção contra loops infinitos (max 10 iterations)
- [ ] CRUD de flows e steps funciona via API
