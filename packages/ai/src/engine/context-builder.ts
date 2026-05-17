import type { CoreMessage } from 'ai';
import type { AgentConfig } from '../types';
import { applySlidingWindow } from '../memory/sliding-window';

interface ContextBuilderParams {
  agent: AgentConfig;
  conversationHistory: Array<{ role: string; content: string }>;
  userMessage: string;
  ragContext?: string;
}

export function buildContext(params: ContextBuilderParams): CoreMessage[] {
  const { agent, conversationHistory, userMessage, ragContext } = params;

  let systemContent = agent.systemPrompt;
  if (ragContext) {
    systemContent += `\n\n---\nContexto relevante da base de conhecimento:\n${ragContext}`;
  }

  const messages: CoreMessage[] = [];
  messages.push({ role: 'system', content: systemContent });

  for (const msg of conversationHistory) {
    if (msg.role === 'user') {
      messages.push({ role: 'user', content: msg.content || '' });
    } else if (msg.role === 'assistant') {
      messages.push({ role: 'assistant', content: msg.content || '' });
    }
  }

  messages.push({ role: 'user', content: userMessage });

  const systemMsg = messages[0]!;
  const conversationMsgs = messages.slice(1);
  const trimmed = applySlidingWindow(conversationMsgs, { maxMessages: 40 });

  return [systemMsg, ...trimmed];
}
