import { tool } from 'ai';
import { z } from 'zod';

export function createHumanHandoffTool(handoffFn: (reason: string) => Promise<void>) {
  return tool({
    description:
      'Transfer the conversation to a human agent when you cannot help or the user requests it',
    parameters: z.object({
      reason: z.string().describe('Why the conversation is being transferred'),
    }),
    execute: async ({ reason }) => {
      await handoffFn(reason);
      return { transferred: true, reason };
    },
  });
}
