import { tool } from 'ai';
import { z } from 'zod';

export function createSearchKnowledgeBaseTool(
  searchFn: (query: string) => Promise<string>,
) {
  return tool({
    description: 'Search the knowledge base for relevant information to answer the user question',
    parameters: z.object({
      query: z.string().describe('The search query to find relevant information'),
    }),
    execute: async ({ query }) => {
      return searchFn(query);
    },
  });
}
