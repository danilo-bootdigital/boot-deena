import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createSupabaseAdmin } from '@agente-ia/database';

interface ResolvedConversation {
  conversationId: string;
  agentId: string;
  organizationId: string;
  isNew: boolean;
}

@Injectable()
export class ConversationResolverService {
  private supabase;

  constructor(private configService: ConfigService) {
    this.supabase = createSupabaseAdmin(
      this.configService.getOrThrow('worker.supabaseUrl'),
      this.configService.getOrThrow('worker.supabaseServiceRoleKey'),
    );
  }

  async resolve(instanceName: string, remoteJid: string, pushName?: string): Promise<ResolvedConversation> {
    const { data: instance } = await this.supabase
      .from('whatsapp_instances')
      .select('id, organization_id')
      .eq('instance_name', instanceName)
      .single();

    if (!instance) {
      throw new Error(`Instance not found: ${instanceName}`);
    }

    const { data: agent } = await this.supabase
      .from('agents')
      .select('id')
      .eq('whatsapp_instance_id', instance.id)
      .eq('status', 'active')
      .single();

    if (!agent) {
      throw new Error(`No active agent for instance: ${instanceName}`);
    }

    const phone = remoteJid.replace('@s.whatsapp.net', '');

    const { data: existingConversation } = await this.supabase
      .from('conversations')
      .select('id')
      .eq('organization_id', instance.organization_id)
      .eq('agent_id', agent.id)
      .eq('contact_phone', phone)
      .eq('status', 'active')
      .single();

    if (existingConversation) {
      return {
        conversationId: existingConversation.id,
        agentId: agent.id,
        organizationId: instance.organization_id,
        isNew: false,
      };
    }

    const { data: newConversation, error } = await this.supabase
      .from('conversations')
      .insert({
        organization_id: instance.organization_id,
        agent_id: agent.id,
        contact_phone: phone,
        contact_push_name: pushName,
        channel: 'whatsapp',
        status: 'active',
      })
      .select('id')
      .single();

    if (error || !newConversation) {
      throw new Error(`Failed to create conversation: ${error?.message || 'unknown error'}`);
    }

    return {
      conversationId: newConversation.id,
      agentId: agent.id,
      organizationId: instance.organization_id,
      isNew: true,
    };
  }
}
