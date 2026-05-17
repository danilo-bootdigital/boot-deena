import { openai } from '@ai-sdk/openai';
import { embedMany, embed } from 'ai';

const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536;

export async function generateEmbedding(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model: openai.embedding(EMBEDDING_MODEL, { dimensions: EMBEDDING_DIMENSIONS }),
    value: text,
  });
  return embedding;
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const { embeddings } = await embedMany({
    model: openai.embedding(EMBEDDING_MODEL, { dimensions: EMBEDDING_DIMENSIONS }),
    values: texts,
  });
  return embeddings;
}
