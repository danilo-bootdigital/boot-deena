import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { createSupabaseAdmin } from '@agente-ia/database';
import { generate, transcribeAudio, textToSpeech } from '@agente-ia/ai';
import { ConversationResolverService } from '../services/conversation-resolver.service';
import { MessageStoreService } from '../services/message-store.service';
import { EvolutionSenderService } from '../services/evolution-sender.service';
import { AgentLoaderService } from '../services/agent-loader.service';
import { FlowEngineService } from '../services/flow/flow-engine.service';

interface InboundMessageJob {
  instanceName: string;
  remoteJid: string;
  messageId: string;
  pushName?: string;
  message: { type: string; content: string; mediaUrl?: string; mimetype?: string };
  timestamp?: number;
}

interface FlowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, any>;
}

interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
}

@Processor('inbound-messages', {
  concurrency: 5,
  limiter: { max: 10, duration: 1000 },
})
export class InboundMessageProcessor extends WorkerHost {
  private readonly logger = new Logger(InboundMessageProcessor.name);
  private supabase;

  constructor(
    private configService: ConfigService,
    private conversationResolver: ConversationResolverService,
    private messageStore: MessageStoreService,
    private evolutionSender: EvolutionSenderService,
    private agentLoader: AgentLoaderService,
    private flowEngine: FlowEngineService,
  ) {
    super();
    this.supabase = createSupabaseAdmin(
      this.configService.getOrThrow('worker.supabaseUrl'),
      this.configService.getOrThrow('worker.supabaseServiceRoleKey'),
    );
  }

  async process(job: Job<InboundMessageJob>): Promise<void> {
    const { instanceName, remoteJid, messageId, pushName, message } = job.data;

    this.logger.log(`Processing inbound message: ${messageId} from ${remoteJid}`);

    try {
      const resolved = await this.conversationResolver.resolve(instanceName, remoteJid, pushName);

      // Se é uma nova conversa, criar lead automaticamente no pipeline
      if (resolved.isNew) {
        const phone = remoteJid.replace('@s.whatsapp.net', '');
        await this.supabase
          .from('leads')
          .insert({
            organization_id: resolved.organizationId,
            conversation_id: resolved.conversationId,
            agent_id: resolved.agentId,
            name: pushName || null,
            phone,
            stage: 'new',
            temperature: 'cold',
            source: 'whatsapp',
            last_contact_at: new Date().toISOString(),
          });
        this.logger.log(`Lead created for new conversation: ${phone}`);
      } else {
        // Atualizar last_contact_at do lead existente
        await this.supabase
          .from('leads')
          .update({ last_contact_at: new Date().toISOString() })
          .eq('conversation_id', resolved.conversationId);
      }

      // Cancelar follow-ups pendentes quando o paciente responde
      await this.supabase
        .from('scheduled_messages')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('conversation_id', resolved.conversationId)
        .eq('status', 'pending')
        .in('message_type', ['follow_up_1h', 'follow_up_24h', 'follow_up_3d']);

      // Se for áudio, transcrever primeiro
      let messageContent = message.content;
      if (message.type === 'audio') {
        try {
          const media = await this.evolutionSender.downloadMedia(instanceName, messageId);
          const audioBuffer = Buffer.from(media.base64, 'base64');
          messageContent = await transcribeAudio(audioBuffer, media.mimetype);
          this.logger.log(`Audio transcribed: "${messageContent.slice(0, 100)}..."`);
        } catch (err) {
          this.logger.error(`Failed to transcribe audio: ${(err as Error).message}`);
          messageContent = '[Áudio não transcrito]';
        }
      }

      // Se for documento ou imagem, baixar e salvar no Storage
      if (message.type === 'document' || message.type === 'image') {
        try {
          const media = await this.evolutionSender.downloadMedia(instanceName, messageId);
          const fileBuffer = Buffer.from(media.base64, 'base64');
          const ext = media.mimetype.split('/')[1]?.split(';')[0] || 'bin';
          const fileName = message.content || `${message.type}_${Date.now()}.${ext}`;
          const storagePath = `${resolved.organizationId}/${resolved.conversationId}/${Date.now()}_${fileName}`;

          // Upload para Supabase Storage
          const { error: uploadError } = await this.supabase.storage
            .from('attachments')
            .upload(storagePath, fileBuffer, {
              contentType: media.mimetype,
              upsert: false,
            });

          if (!uploadError) {
            const { data: urlData } = this.supabase.storage
              .from('attachments')
              .getPublicUrl(storagePath);

            // Registrar na tabela de anexos
            await this.supabase
              .from('conversation_attachments')
              .insert({
                organization_id: resolved.organizationId,
                conversation_id: resolved.conversationId,
                file_name: fileName,
                file_type: message.type,
                mimetype: media.mimetype,
                file_size: fileBuffer.length,
                storage_path: storagePath,
                public_url: urlData?.publicUrl || null,
                uploaded_by: 'patient',
              });

            messageContent = message.type === 'image'
              ? `[Imagem recebida: ${fileName}]`
              : `[Documento recebido: ${fileName}]`;
            this.logger.log(`Attachment saved: ${storagePath}`);
          } else {
            this.logger.error(`Failed to upload attachment: ${uploadError.message}`);
            messageContent = `[${message.type === 'image' ? 'Imagem' : 'Documento'} recebido mas não salvo]`;
          }
        } catch (err) {
          this.logger.error(`Failed to process attachment: ${(err as Error).message}`);
          messageContent = `[${message.type === 'image' ? 'Imagem' : 'Documento'} não processado]`;
        }
      }

      await this.messageStore.saveUserMessage({
        conversationId: resolved.conversationId,
        organizationId: resolved.organizationId,
        content: messageContent,
        type: message.type,
        whatsappMessageId: messageId,
      });

      const agent = await this.agentLoader.load(resolved.agentId);

      // Try visual flow first
      let responseContent: string | undefined;
      let tokensInput = 0;
      let tokensOutput = 0;

      const flowData = agent.settings as any;
      if (flowData?.flow?.nodes?.length > 0) {
        const flowResult = await this.executeVisualFlow(flowData.flow, messageContent, resolved);
        if (flowResult?.response) {
          responseContent = flowResult.response;
        }
        if (flowResult?.handoff) {
          responseContent = 'Vou encaminhar sua conversa para nossa equipe dar continuidade com mais segurança.';
        }
      }

      // Fallback to AI with system prompt
      if (!responseContent) {
        const history = await this.messageStore.getConversationHistory(resolved.conversationId);
        const aiResponse = await generate({
          agent,
          messages: history as any,
          userMessage: messageContent,
        });
        responseContent = aiResponse.content;
        tokensInput = aiResponse.tokensInput;
        tokensOutput = aiResponse.tokensOutput;
      }

      await this.messageStore.saveAssistantMessage({
        conversationId: resolved.conversationId,
        organizationId: resolved.organizationId,
        content: responseContent,
        tokensInput,
        tokensOutput,
      });

      // Enviar resposta: áudio (TTS) ou texto
      const voiceEnabled = (agent.settings as any)?.voice_enabled === true;
      if (voiceEnabled && responseContent.length <= 4096) {
        try {
          const voiceId = (agent.settings as any)?.voice_id || 'nova';
          const audioBuffer = await textToSpeech(responseContent, voiceId);
          const audioBase64 = audioBuffer.toString('base64');
          await this.evolutionSender.sendAudio(instanceName, remoteJid, audioBase64);
        } catch (err) {
          this.logger.warn(`TTS failed, falling back to text: ${(err as Error).message}`);
          await this.evolutionSender.sendText(instanceName, remoteJid, responseContent);
        }
      } else {
        await this.evolutionSender.sendText(instanceName, remoteJid, responseContent);
      }

      await this.messageStore.updateLastMessageAt(resolved.conversationId);

      this.logger.log(`Message processed successfully: ${messageId}`);
    } catch (error) {
      this.logger.error(
        `Failed to process message ${messageId}: ${(error as Error).message}`,
      );
      throw error;
    }
  }

  private async executeVisualFlow(
    flow: { nodes: FlowNode[]; edges: FlowEdge[] },
    userMessage: string,
    resolved: { conversationId: string; organizationId: string; agentId: string },
  ) {
    const { nodes, edges } = flow;
    if (!nodes || nodes.length === 0) return null;

    // Convert React Flow format to flow_steps format
    const steps = nodes
      .sort((a, b) => a.position.y - b.position.y)
      .map((node, index) => {
        const outEdges = edges.filter((e) => e.source === node.id);
        const nextEdge = outEdges.find((e) => !e.sourceHandle || e.sourceHandle === 'true');
        const falseEdge = outEdges.find((e) => e.sourceHandle === 'false');

        return {
          id: node.id,
          type: node.type || 'message',
          position: index,
          config: {
            message: node.data?.message,
            label: node.data?.label,
            field: node.data?.field,
            operator: node.data?.operator,
            value: node.data?.value,
            reason: node.data?.reason,
            variable_name: node.data?.variable_name,
            endpoint_url: node.data?.endpoint_url,
            delay_minutes: node.data?.delay_minutes,
            message_type: node.data?.message_type,
          },
          next_step_id: nextEdge?.target || null,
          condition_true_step_id: node.type === 'condition' ? nextEdge?.target || null : null,
          condition_false_step_id: node.type === 'condition' ? falseEdge?.target || null : null,
        };
      });

    const context = {
      conversationId: resolved.conversationId,
      organizationId: resolved.organizationId,
      agentId: resolved.agentId,
      userMessage,
      variables: {},
    };

    return this.flowEngine.executeFlow(steps, context);
  }
}
