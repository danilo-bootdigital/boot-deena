import { streamText } from 'ai';
import { getModel } from '../providers/registry';
import { buildContext } from './context-builder';
import type { AgentConfig, GenerateResult } from '../types';
import type { CoreMessage } from 'ai';

interface StreamParams {
  agent: AgentConfig;
  messages: CoreMessage[];
  userMessage: string;
  ragContext?: string;
  onChunk?: (chunk: string) => void;
  onFinish?: (result: GenerateResult) => void;
}

export function generateStream(params: StreamParams) {
  const { agent, messages: conversationHistory, userMessage, ragContext, onFinish } = params;

  const messages = buildContext({
    agent,
    conversationHistory: conversationHistory as Array<{ role: string; content: string }>,
    userMessage,
    ragContext,
  });

  const model = getModel(agent.provider, agent.model);

  return streamText({
    model,
    messages,
    maxTokens: agent.maxTokens,
    temperature: agent.temperature,
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
}
