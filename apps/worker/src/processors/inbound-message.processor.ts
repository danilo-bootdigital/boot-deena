import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { generate } from '@agente-ia/ai';
import { ConversationResolverService } from '../services/conversation-resolver.service';
import { MessageStoreService } from '../services/message-store.service';
import { EvolutionSenderService } from '../services/evolution-sender.service';
import { AgentLoaderService } from '../services/agent-loader.service';

interface InboundMessageJob {
  instanceName: string;
  remoteJid: string;
  messageId: string;
  pushName?: string;
  message: { type: string; content: string };
  timestamp?: number;
}

@Processor('inbound-messages', {
  concurrency: 5,
  limiter: { max: 10, duration: 1000 },
})
export class InboundMessageProcessor extends WorkerHost {
  private readonly logger = new Logger(InboundMessageProcessor.name);

  constructor(
    private conversationResolver: ConversationResolverService,
    private messageStore: MessageStoreService,
    private evolutionSender: EvolutionSenderService,
    private agentLoader: AgentLoaderService,
  ) {
    super();
  }

  async process(job: Job<InboundMessageJob>): Promise<void> {
    const { instanceName, remoteJid, messageId, pushName, message } = job.data;

    this.logger.log(`Processing inbound message: ${messageId} from ${remoteJid}`);

    try {
      const resolved = await this.conversationResolver.resolve(instanceName, remoteJid, pushName);

      await this.messageStore.saveUserMessage({
        conversationId: resolved.conversationId,
        organizationId: resolved.organizationId,
        content: message.content,
        type: message.type,
        whatsappMessageId: messageId,
      });

      const agent = await this.agentLoader.load(resolved.agentId);
      const history = await this.messageStore.getConversationHistory(resolved.conversationId);

      const aiResponse = await generate({
        agent,
        messages: history as any,
        userMessage: message.content,
      });

      await this.messageStore.saveAssistantMessage({
        conversationId: resolved.conversationId,
        organizationId: resolved.organizationId,
        content: aiResponse.content,
        tokensInput: aiResponse.tokensInput,
        tokensOutput: aiResponse.tokensOutput,
      });

      await this.evolutionSender.sendText(instanceName, remoteJid, aiResponse.content);
      await this.messageStore.updateLastMessageAt(resolved.conversationId);

      this.logger.log(`Message processed successfully: ${messageId}`);
    } catch (error) {
      this.logger.error(
        `Failed to process message ${messageId}: ${(error as Error).message}`,
      );
      throw error;
    }
  }
}
