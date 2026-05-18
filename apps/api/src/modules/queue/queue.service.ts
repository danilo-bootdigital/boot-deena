import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUES } from '@agente-ia/shared';

export interface InboundMessageJob {
  instanceName: string;
  remoteJid: string;
  messageId: string;
  pushName?: string;
  message: { type: string; content: string; mediaUrl?: string; mimetype?: string };
  timestamp?: number;
}

export interface OutboundMessageJob {
  instanceName: string;
  remoteJid: string;
  content: string;
  conversationId: string;
  messageId: string;
}

@Injectable()
export class QueueService {
  constructor(
    @InjectQueue(QUEUES.INBOUND) private inboundQueue: Queue,
    @InjectQueue(QUEUES.OUTBOUND) private outboundQueue: Queue,
    @InjectQueue(QUEUES.RAG) private ragQueue: Queue,
  ) {}

  async addInboundMessage(data: InboundMessageJob) {
    return this.inboundQueue.add('process', data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: 1000,
      removeOnFail: 5000,
    });
  }

  async addOutboundMessage(data: OutboundMessageJob) {
    return this.outboundQueue.add('send', data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: 1000,
      removeOnFail: 5000,
    });
  }

  async addRagProcessing(data: {
    documentId: string;
    knowledgeBaseId: string;
    organizationId: string;
  }) {
    return this.ragQueue.add('process-document', data, {
      attempts: 2,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: 100,
      removeOnFail: 500,
    });
  }
}
