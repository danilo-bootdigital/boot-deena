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
  settings: Record<string, unknown>;
}

export interface GenerateParams {
  agent: AgentConfig;
  messages: CoreMessage[];
  userMessage: string;
  tools?: ToolDefinition[];
  ragContext?: string;
}

export interface GenerateResult {
  content: string;
  tokensInput: number;
  tokensOutput: number;
  toolCalls?: ToolCallResult[];
  finishReason: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parametersSchema: Record<string, unknown>;
  type: 'function' | 'api_call' | 'webhook' | 'builtin';
  endpointUrl?: string;
  headers?: Record<string, string>;
}

export interface ToolCallResult {
  toolName: string;
  args: Record<string, unknown>;
  result: unknown;
}
