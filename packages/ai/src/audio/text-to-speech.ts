import OpenAI from 'openai';

let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

export type VoiceId = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';

/**
 * Gera áudio a partir de texto usando OpenAI TTS
 * @param text - Texto para converter em áudio
 * @param voice - Voz a usar (default: nova)
 * @returns Buffer do áudio em formato mp3
 */
export async function textToSpeech(text: string, voice: VoiceId = 'nova'): Promise<Buffer> {
  const openai = getOpenAI();

  // Limitar texto a 4096 chars (limite da API)
  const truncated = text.length > 4096 ? text.slice(0, 4096) : text;

  const response = await openai.audio.speech.create({
    model: 'tts-1',
    voice,
    input: truncated,
    response_format: 'mp3',
  });

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
