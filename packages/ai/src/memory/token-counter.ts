export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3.5);
}

export function estimateMessagesTokens(messages: { content?: string }[]): number {
  return messages.reduce((total, msg) => {
    return total + estimateTokens(msg.content || '') + 4;
  }, 0);
}
