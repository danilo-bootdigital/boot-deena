import OpenAI, { toFile } from 'openai';

let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

/**
 * Transcreve áudio usando OpenAI Whisper
 * @param audioBuffer - Buffer do arquivo de áudio
 * @param mimetype - Tipo MIME (ex: audio/ogg, audio/mpeg)
 * @returns Texto transcrito
 */
export async function transcribeAudio(audioBuffer: Buffer, mimetype?: string): Promise<string> {
  const openai = getOpenAI();

  const ext = mimetype?.includes('mpeg') ? 'mp3'
    : mimetype?.includes('mp4') ? 'mp4'
    : mimetype?.includes('wav') ? 'wav'
    : mimetype?.includes('webm') ? 'webm'
    : 'ogg';

  const file = await toFile(audioBuffer, `audio.${ext}`, { type: mimetype || 'audio/ogg' });

  const response = await openai.audio.transcriptions.create({
    model: 'whisper-1',
    file,
    language: 'pt',
  });

  return response.text;
}
