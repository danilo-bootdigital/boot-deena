import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(private configService: ConfigService) {
    this.baseUrl = this.configService.get('app.evolutionApiUrl') || '';
    this.apiKey = this.configService.get('app.evolutionApiKey') || '';
  }

  private assertConfigured() {
    if (!this.baseUrl) {
      throw new Error('Evolution API not configured. Set EVOLUTION_API_URL.');
    }
  }

  private async request(path: string, options: RequestInit = {}) {
    this.assertConfigured();
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        apikey: this.apiKey,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`Evolution API error: ${response.status} - ${error}`);
      throw new Error(`Evolution API error: ${response.status}`);
    }

    return response.json();
  }

  async createInstance(instanceName: string, webhookUrl: string) {
    return this.request('/instance/create', {
      method: 'POST',
      body: JSON.stringify({
        instanceName,
        integration: 'WHATSAPP-BAILEYS',
        qrcode: true,
        webhook: {
          url: webhookUrl,
          events: ['messages.upsert', 'connection.update', 'messages.update'],
        },
      }),
    });
  }

  async getInstanceStatus(instanceName: string) {
    return this.request(`/instance/connectionState/${instanceName}`);
  }

  async getQrCode(instanceName: string) {
    return this.request(`/instance/connect/${instanceName}`);
  }

  async sendText(instanceName: string, remoteJid: string, text: string) {
    return this.request(`/message/sendText/${instanceName}`, {
      method: 'POST',
      body: JSON.stringify({ number: remoteJid, text }),
    });
  }

  async deleteInstance(instanceName: string) {
    return this.request(`/instance/delete/${instanceName}`, { method: 'DELETE' });
  }

  async listInstances() {
    return this.request('/instance/fetchInstances');
  }
}
