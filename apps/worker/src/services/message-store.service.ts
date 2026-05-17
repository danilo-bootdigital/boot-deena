import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createSupabaseAdmin } from '@agente-ia/database';

@Injectable()
export class MessageStoreService {
  private supabase;

  constructor(private configService: ConfigService) {
    this.supabase = createSupabaseAdmin(
      this.configService.getOrThrow('worker.supabaseUrl'),
      this.configService.getOrThrow('worker.supabaseServiceRoleKey'),
    );
  }

  async saveUserMessage(params: {
    conversationId: string;
    organizationId: string;
    content: string;
    type: string;
    whatsappMessageId?: string;
  }) {
    const { data, error } = await this.supabase
      .from('messages')
      .insert({
        conversation_id: params.conversationId,
        organization_id: params.organizationId,
        role: 'user',
        type: params.type,
        content: params.content,
        whatsapp_message_id: params.whatsappMessageId,
      })
      .select('id')
      .single();

    if (error || !data) {
      throw new Error(`Failed to save user message: ${error?.message || 'unknown error'}`);
    }

    return data.id;
  }

  async saveAssistantMessage(params: {
    conversationId: string;
    organizationId: string;
    content: string;
    tokensInput?: number;
    tokensOutput?: number;
    toolCalls?: unknown;
  }) {
    const { data, error } = await this.supabase
      .from('messages')
      .insert({
        conversation_id: params.conversationId,
        organization_id: params.organizationId,
        role: 'assistant',
        type: 'text',
        content: params.content,
        tokens_input: params.tokensInput,
        tokens_output: params.tokensOutput,
        tool_calls: params.toolCalls,
      })
      .select('id')
      .single();

    if (error || !data) {
      throw new Error(`Failed to save assistant message: ${error?.message || 'unknown error'}`);
    }

    return data.id;
  }

  async getConversationHistory(conversationId: string, limit = 20) {
    const { data } = await this.supabase
      .from('messages')
      .select('role, content, tool_calls, tool_results')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(limit);

    return data || [];
  }

  async updateLastMessageAt(conversationId: string) {
    await this.supabase
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversationId);
  }
}
