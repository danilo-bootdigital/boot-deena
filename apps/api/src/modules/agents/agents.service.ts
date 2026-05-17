import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createSupabaseAdmin } from '@agente-ia/database';
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

  async findAll(organizationId: string) {
    const { data, error } = await this.supabase
      .from('agents')
      .select('*')
      .eq('organization_id', organizationId)
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
}
