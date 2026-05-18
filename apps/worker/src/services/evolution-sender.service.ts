import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EvolutionSenderService {
  private readonly logger = new Logger(EvolutionSenderService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(private configService: ConfigService) {
    this.baseUrl = this.configService.getOrThrow('worker.evolutionApiUrl');
    this.apiKey = this.configService.getOrThrow('worker.evolutionApiKey');
  }

  async sendText(instanceName: string, remoteJid: string, text: string) {
    const response = await fetch(`${this.baseUrl}/message/sendText/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: this.apiKey,
      },
      body: JSON.stringify({ number: remoteJid, text }),
    });

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`Failed to send message: ${error}`);
      throw new Error(`Evolution API send failed: ${response.status}`);
    }

    return response.json();
  }

  async sendAudio(instanceName: string, remoteJid: string, audioBase64: string) {
    const response = await fetch(`${this.baseUrl}/message/sendWhatsAppAudio/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: this.apiKey,
      },
      body: JSON.stringify({
        number: remoteJid,
        audio: audioBase64,
        encoding: true,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`Failed to send audio: ${error}`);
      throw new Error(`Evolution API sendAudio failed: ${response.status}`);
    }

    return response.json();
  }

  async downloadMedia(instanceName: string, messageId: string): Promise<{ base64: string; mimetype: string }> {
    const response = await fetch(`${this.baseUrl}/chat/getBase64FromMediaMessage/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: this.apiKey,
      },
      body: JSON.stringify({ message: { key: { id: messageId } } }),
    });

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`Failed to download media: ${error}`);
      throw new Error(`Evolution API downloadMedia failed: ${response.status}`);
    }

    const data = await response.json() as { base64: string; mimetype?: string };
    return { base64: data.base64, mimetype: data.mimetype || 'audio/ogg' };
  }
}
