import type { CoreMessage } from 'ai';

interface SlidingWindowOptions {
  maxMessages: number;
}

const DEFAULT_OPTIONS: SlidingWindowOptions = {
  maxMessages: 40,
};

export function applySlidingWindow(
  messages: CoreMessage[],
  options: Partial<SlidingWindowOptions> = {},
): CoreMessage[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  if (messages.length <= opts.maxMessages) {
    return messages;
  }

  const trimmed = messages.slice(-opts.maxMessages);

  // Ensure the conversation starts with a 'user' message (required by some providers)
  const firstUserIdx = trimmed.findIndex((m) => m.role === 'user');
  if (firstUserIdx > 0) {
    return trimmed.slice(firstUserIdx);
  }
  if (firstUserIdx === -1) {
    // No user message found — return empty to avoid invalid state
    return [];
  }

  return trimmed;
}
