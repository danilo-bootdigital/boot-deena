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

  private async getAllowedAgentIds(userId: string, userRole: string, organizationId: string): Promise<string[] | null> {
    if (userRole === 'owner' || userRole === 'admin') {
      return null; // null = sem filtro, vê tudo
    }

    const { data } = await this.supabase
      .from('agent_members')
      .select('agent_id, agents!inner(organization_id)')
      .eq('user_id', userId)
      .eq('agents.organization_id', organizationId);

    return data?.map((m) => m.agent_id) || [];
  }

  async findAll(organizationId: string, status?: string, search?: string, userId?: string, userRole?: string) {
    const allowedAgentIds = userId && userRole
      ? await this.getAllowedAgentIds(userId, userRole, organizationId)
      : null;

    let query = this.supabase
      .from('conversations')
      .select('*, agents(id, name)')
      .eq('organization_id', organizationId)
      .order('last_message_at', { ascending: false, nullsFirst: false });

    if (allowedAgentIds !== null) {
      if (allowedAgentIds.length === 0) return [];
      query = query.in('agent_id', allowedAgentIds);
    }

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

  async getAttachments(conversationId: string, organizationId: string) {
    const { data, error } = await this.supabase
      .from('conversation_attachments')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }
}
