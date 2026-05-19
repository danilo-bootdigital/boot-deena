import { Injectable, Logger } from '@nestjs/common';
import { QueueService } from '../queue/queue.service';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(private queueService: QueueService) {}

  async processEvent(payload: Record<string, unknown>) {
    const event = payload.event as string;
    const instance = payload.instance as string;
    const data = payload.data as Record<string, unknown>;

    switch (event) {
      case 'messages.upsert':
        await this.handleMessageUpsert(instance, data);
        break;
      case 'connection.update':
        this.logger.log(`Connection update: ${instance}`);
        break;
      default:
        this.logger.debug(`Unhandled event: ${event}`);
    }
  }

  private async handleMessageUpsert(instanceName: string, data: Record<string, unknown>) {
    const key = data.key as Record<string, unknown>;
    if (key?.fromMe) return;

    const message = data.message as Record<string, unknown> | undefined;
    const content = this.extractMessageContent(message);

    await this.queueService.addInboundMessage({
      instanceName,
      remoteJid: key.remoteJid as string,
      messageId: key.id as string,
      pushName: data.pushName as string | undefined,
      message: content,
      timestamp: data.messageTimestamp as number | undefined,
    });
  }

  private extractMessageContent(
    message: Record<string, unknown> | undefined,
  ): { type: string; content: string; mediaUrl?: string; mimetype?: string } {
    if (!message) return { type: 'text', content: '' };

    if (message.conversation) {
      return { type: 'text', content: message.conversation as string };
    }
    const extended = message.extendedTextMessage as Record<string, unknown> | undefined;
    if (extended?.text) {
      return { type: 'text', content: extended.text as string };
    }
    if (message.imageMessage) {
      const img = message.imageMessage as Record<string, unknown>;
      return { type: 'image', content: (img.caption as string) || '', mediaUrl: (img.url as string) || '', mimetype: (img.mimetype as string) || 'image/jpeg' };
    }
    if (message.audioMessage) {
      const audio = message.audioMessage as Record<string, unknown>;
      return { type: 'audio', content: '', mediaUrl: (audio.url as string) || '', mimetype: (audio.mimetype as string) || 'audio/ogg' };
    }
    if (message.documentMessage) {
      const doc = message.documentMessage as Record<string, unknown>;
      return { type: 'document', content: (doc.fileName as string) || '', mediaUrl: (doc.url as string) || '', mimetype: (doc.mimetype as string) || 'application/octet-stream' };
    }

    return { type: 'text', content: '' };
  }
}
