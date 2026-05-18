import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { createSupabaseAdmin } from '@agente-ia/database';
import { EvolutionSenderService } from '../services/evolution-sender.service';
import { MessageStoreService } from '../services/message-store.service';

interface ScheduledMessageJob {
  type: 'process_pending';
}

@Processor('scheduled-messages', {
  concurrency: 2,
})
export class ScheduledMessageProcessor extends WorkerHost {
  private readonly logger = new Logger(ScheduledMessageProcessor.name);
  private supabase;

  constructor(
    private configService: ConfigService,
    private evolutionSender: EvolutionSenderService,
    private messageStore: MessageStoreService,
  ) {
    super();
    this.supabase = createSupabaseAdmin(
      this.configService.getOrThrow('worker.supabaseUrl'),
      this.configService.getOrThrow('worker.supabaseServiceRoleKey'),
    );
  }

  async process(_job: Job<ScheduledMessageJob>): Promise<void> {
    this.logger.log('Processing scheduled messages...');

    try {
      // Buscar mensagens pendentes que já passaram do horário
      const { data: messages, error } = await this.supabase
        .from('scheduled_messages')
        .select('*')
        .eq('status', 'pending')
        .lte('scheduled_for', new Date().toISOString())
        .order('scheduled_for', { ascending: true })
        .limit(50);

      if (error) {
        this.logger.error(`Failed to fetch scheduled messages: ${error.message}`);
        return;
      }

      if (!messages || messages.length === 0) {
        return;
      }

      this.logger.log(`Found ${messages.length} scheduled messages to send`);

      for (const msg of messages) {
        try {
          // Verificar se a conversa ainda está ativa (não cancelada pelo paciente)
          if (msg.conversation_id) {
            const { data: conversation } = await this.supabase
              .from('conversations')
              .select('status')
              .eq('id', msg.conversation_id)
              .single();

            // Se a conversa foi encerrada, cancelar a mensagem
            if (conversation?.status === 'closed' || conversation?.status === 'archived') {
              await this.supabase
                .from('scheduled_messages')
                .update({ status: 'cancelled', updated_at: new Date().toISOString() })
                .eq('id', msg.id);
              continue;
            }
          }

          // Interpolar variáveis no conteúdo
          const content = this.interpolateVariables(msg.content, msg.variables || {});

          // Enviar via Evolution API
          await this.evolutionSender.sendText(msg.instance_name, msg.contact_phone, content);

          // Salvar no histórico de mensagens
          if (msg.conversation_id) {
            await this.messageStore.saveAssistantMessage({
              conversationId: msg.conversation_id,
              organizationId: msg.organization_id,
              content,
              tokensInput: 0,
              tokensOutput: 0,
            });
            await this.messageStore.updateLastMessageAt(msg.conversation_id);
          }

          // Marcar como enviada
          await this.supabase
            .from('scheduled_messages')
            .update({
              status: 'sent',
              sent_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', msg.id);

          this.logger.log(`Scheduled message sent: ${msg.id} (${msg.message_type})`);
        } catch (err) {
          const errorMessage = (err as Error).message;
          this.logger.error(`Failed to send scheduled message ${msg.id}: ${errorMessage}`);

          await this.supabase
            .from('scheduled_messages')
            .update({
              status: 'failed',
              error_message: errorMessage,
              updated_at: new Date().toISOString(),
            })
            .eq('id', msg.id);
        }
      }
    } catch (error) {
      this.logger.error(`Scheduled message processor error: ${(error as Error).message}`);
      throw error;
    }
  }

  private interpolateVariables(template: string, variables: Record<string, unknown>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      return String(variables[key] ?? `{{${key}}}`);
    });
  }
}
