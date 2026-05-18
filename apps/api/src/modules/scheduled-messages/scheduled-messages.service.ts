import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createSupabaseAdmin } from '@agente-ia/database';
import type { CreateScheduledMessageDto } from './dto/scheduled-message.dto';

@Injectable()
export class ScheduledMessagesService {
  private supabase;

  constructor(private configService: ConfigService) {
    this.supabase = createSupabaseAdmin(
      this.configService.getOrThrow('app.supabaseUrl'),
      this.configService.getOrThrow('app.supabaseServiceRoleKey'),
    );
  }

  async findAll(organizationId: string, filters?: { conversation_id?: string; agent_id?: string; status?: string }) {
    let query = this.supabase
      .from('scheduled_messages')
      .select('*')
      .eq('organization_id', organizationId)
      .order('scheduled_for', { ascending: true });

    if (filters?.conversation_id) {
      query = query.eq('conversation_id', filters.conversation_id);
    }
    if (filters?.agent_id) {
      query = query.eq('agent_id', filters.agent_id);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  async create(organizationId: string, dto: CreateScheduledMessageDto) {
    const { data, error } = await this.supabase
      .from('scheduled_messages')
      .insert({
        organization_id: organizationId,
        ...dto,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async cancel(id: string, organizationId: string) {
    const { data, error } = await this.supabase
      .from('scheduled_messages')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('organization_id', organizationId)
      .eq('status', 'pending')
      .select()
      .single();

    if (error || !data) throw new NotFoundException('Scheduled message not found or already processed');
    return data;
  }

  async remove(id: string, organizationId: string) {
    const { data } = await this.supabase
      .from('scheduled_messages')
      .select('status')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single();

    if (!data) throw new NotFoundException('Scheduled message not found');

    const { error } = await this.supabase
      .from('scheduled_messages')
      .delete()
      .eq('id', id)
      .eq('organization_id', organizationId);

    if (error) throw error;
    return { deleted: true };
  }

  async cancelAllForConversation(conversationId: string) {
    await this.supabase
      .from('scheduled_messages')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .eq('status', 'pending');
  }
}
