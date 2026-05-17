import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createSupabaseAdmin } from '@agente-ia/database';

@Injectable()
export class ConversationsService {
  private supabase;

  constructor(private configService: ConfigService) {
    this.supabase = createSupabaseAdmin(
      this.configService.getOrThrow('app.supabaseUrl'),
      this.configService.getOrThrow('app.supabaseServiceRoleKey'),
    );
  }

  async findAll(organizationId: string, status?: string, search?: string) {
    let query = this.supabase
      .from('conversations')
      .select('*, agents(id, name)')
      .eq('organization_id', organizationId)
      .order('last_message_at', { ascending: false, nullsFirst: false });

    if (status) {
      query = query.eq('status', status);
    }
    if (search) {
      const sanitized = search.replace(/[%_\\]/g, '\\$&');
      query = query.or(
        `contact_phone.ilike.%${sanitized}%,contact_push_name.ilike.%${sanitized}%`,
      );
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  async getMessages(conversationId: string, organizationId: string) {
    const { data, error } = await this.supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data;
  }

  async sendMessage(conversationId: string, organizationId: string, content: string) {
    const { data, error } = await this.supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        organization_id: organizationId,
        role: 'assistant',
        type: 'text',
        content,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}
