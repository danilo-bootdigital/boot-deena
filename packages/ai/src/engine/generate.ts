import { generateText } from 'ai';
import { getModel } from '../providers/registry';
import { buildContext } from './context-builder';
import type { GenerateParams, GenerateResult } from '../types';

export async function generate(params: GenerateParams): Promise<GenerateResult> {
  const { agent, messages: conversationHistory, userMessage, ragContext } = params;

  const messages = buildContext({
    agent,
    conversationHistory: conversationHistory as Array<{ role: string; content: string }>,
    userMessage,
    ragContext,
  });

  const model = getModel(agent.provider, agent.model);

  const result = await generateText({
    model,
    messages,
    maxTokens: agent.maxTokens,
    temperature: agent.temperature,
  });

  return {
    content: result.text,
    tokensInput: result.usage?.promptTokens || 0,
    tokensOutput: result.usage?.completionTokens || 0,
    finishReason: result.finishReason,
  };
}
