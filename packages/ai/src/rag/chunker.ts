export interface ChunkOptions {
  chunkSize: number;
  chunkOverlap: number;
}

const DEFAULT_OPTIONS: ChunkOptions = {
  chunkSize: 512,
  chunkOverlap: 50,
};

export interface Chunk {
  content: string;
  index: number;
  tokenCount: number;
}

export function chunkText(text: string, options: Partial<ChunkOptions> = {}): Chunk[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const chunks: Chunk[] = [];

  const sentences = splitIntoSentences(text);
  let currentChunk = '';
  let chunkIndex = 0;

  for (const sentence of sentences) {
    const estimatedTokens = Math.ceil((currentChunk + sentence).length / 3.5);

    if (estimatedTokens > opts.chunkSize && currentChunk.length > 0) {
      chunks.push({
        content: currentChunk.trim(),
        index: chunkIndex,
        tokenCount: Math.ceil(currentChunk.trim().length / 3.5),
      });
      chunkIndex++;

      // Apply overlap: keep last N characters
      const overlapChars = Math.floor(opts.chunkOverlap * 3.5);
      currentChunk = currentChunk.slice(-overlapChars) + sentence;
    } else {
      currentChunk += sentence;
    }
  }

  if (currentChunk.trim().length > 0) {
    chunks.push({
      content: currentChunk.trim(),
      index: chunkIndex,
      tokenCount: Math.ceil(currentChunk.trim().length / 3.5),
    });
  }

  return chunks;
}

function splitIntoSentences(text: string): string[] {
  return text.split(/(?<=[.!?\n])\s+/).filter((s) => s.length > 0);
}
