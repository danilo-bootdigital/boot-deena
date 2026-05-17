import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { EvolutionSenderService } from '../services/evolution-sender.service';

interface OutboundMessageJob {
  instanceName: string;
  remoteJid: string;
  content: string;
  conversationId: string;
  messageId: string;
}

@Processor('outbound-messages', { concurrency: 10 })
export class OutboundMessageProcessor extends WorkerHost {
  private readonly logger = new Logger(OutboundMessageProcessor.name);

  constructor(private evolutionSender: EvolutionSenderService) {
    super();
  }

  async process(job: Job<OutboundMessageJob>): Promise<void> {
    const { instanceName, remoteJid, content } = job.data;
    this.logger.log(`Sending outbound message to ${remoteJid}`);
    await this.evolutionSender.sendText(instanceName, remoteJid, content);
  }
}
