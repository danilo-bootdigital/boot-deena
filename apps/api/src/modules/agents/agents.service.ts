import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createSupabaseAdmin } from '@agente-ia/database';
import { generate } from '@agente-ia/ai';
import type { CreateAgentDto, UpdateAgentDto } from './dto/create-agent.dto';

@Injectable()
export class AgentsService {
  private supabase;

  constructor(private configService: ConfigService) {
    this.supabase = createSupabaseAdmin(
      this.configService.getOrThrow('app.supabaseUrl'),
      this.configService.getOrThrow('app.supabaseServiceRoleKey'),
    );
  }

  async findAll(organizationId: string, userId: string, filter: any) {
    // Se tem acesso total, retornar todos
    if (filter.allAccess) {
      const { data, error } = await this.supabase
        .from('agents')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    }

    // Caso contrário, apenas agentes vinculados
    const agentIds = filter.agentIds || [];
    if (agentIds.length === 0) return [];

    const { data, error } = await this.supabase
      .from('agents')
      .select('*')
      .eq('organization_id', organizationId)
      .in('id', agentIds)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async findOne(id: string, organizationId: string) {
    const { data, error } = await this.supabase
      .from('agents')
      .select('*, agent_tools(*)')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single();

    if (error || !data) throw new NotFoundException('Agent not found');
    return data;
  }

  async create(organizationId: string, dto: CreateAgentDto) {
    const { data, error } = await this.supabase
      .from('agents')
      .insert({ ...dto, organization_id: organizationId })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async update(id: string, organizationId: string, dto: UpdateAgentDto) {
    const { data, error } = await this.supabase
      .from('agents')
      .update(dto)
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error || !data) throw new NotFoundException('Agent not found');
    return data;
  }

  async remove(id: string, organizationId: string) {
    const { error } = await this.supabase
      .from('agents')
      .delete()
      .eq('id', id)
      .eq('organization_id', organizationId);

    if (error) throw error;
    return { deleted: true };
  }

  async duplicate(id: string, organizationId: string) {
    const { data: original, error: findError } = await this.supabase
      .from('agents')
      .select('*')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single();

    if (findError || !original) throw new NotFoundException('Agent not found');

    const { id: _id, created_at: _ca, updated_at: _ua, ...agentData } = original;

    const { data, error } = await this.supabase
      .from('agents')
      .insert({
        ...agentData,
        name: `${original.name} (cópia)`,
        status: 'draft',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async chat(id: string, organizationId: string, message: string, history: Array<{ role: string; content: string }>) {
    const agent = await this.findOne(id, organizationId);

    const agentConfig = {
      id: agent.id,
      organizationId: agent.organization_id,
      name: agent.name,
      systemPrompt: agent.system_prompt,
      provider: agent.provider,
      model: agent.model,
      temperature: Number(agent.temperature),
      maxTokens: agent.max_tokens,
      settings: agent.settings || {},
    };

    const result = await generate({
      agent: agentConfig,
      messages: history as any,
      userMessage: message,
    });

    return {
      content: result.content,
      tokensInput: result.tokensInput,
      tokensOutput: result.tokensOutput,
    };
  }
}
