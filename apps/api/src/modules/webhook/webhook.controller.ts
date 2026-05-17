import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WebhookService } from './webhook.service';

@Controller('webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);
  private readonly apiKey: string;

  constructor(
    private webhookService: WebhookService,
    private configService: ConfigService,
  ) {
    this.apiKey = this.configService.get('app.evolutionApiKey') || '';
  }

  @Post('evolution')
  @HttpCode(200)
  async handleEvolutionWebhook(
    @Body() body: Record<string, unknown>,
    @Headers('apikey') apiKey: string,
  ) {
    if (!apiKey || apiKey !== this.apiKey) {
      throw new UnauthorizedException('Invalid webhook API key');
    }

    this.logger.log(`Webhook received: ${body.event}`);
    await this.webhookService.processEvent(body);
    return { received: true };
  }
}
