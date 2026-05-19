import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createSupabaseAdmin } from '@agente-ia/database';
import type { CreateLeadDto, UpdateLeadDto, MoveLeadDto } from './dto/lead.dto';

@Injectable()
export class LeadsService {
  private supabase;

  constructor(private configService: ConfigService) {
    this.supabase = createSupabaseAdmin(
      this.configService.getOrThrow('app.supabaseUrl'),
      this.configService.getOrThrow('app.supabaseServiceRoleKey'),
    );
  }

  async findAll(organizationId: string, stage?: string) {
    let query = this.supabase
      .from('leads')
      .select('*, agents(id, name)')
      .eq('organization_id', organizationId)
      .order('updated_at', { ascending: false });

    if (stage) {
      query = query.eq('stage', stage);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  async findOne(id: string, organizationId: string) {
    const { data, error } = await this.supabase
      .from('leads')
      .select('*, agents(id, name)')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single();

    if (error || !data) throw new NotFoundException('Lead not found');
    return data;
  }

  async create(organizationId: string, dto: CreateLeadDto) {
    const { data, error } = await this.supabase
      .from('leads')
      .insert({ ...dto, organization_id: organizationId })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async update(id: string, organizationId: string, dto: UpdateLeadDto) {
    const { data, error } = await this.supabase
      .from('leads')
      .update(dto)
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error || !data) throw new NotFoundException('Lead not found');
    return data;
  }

  async move(id: string, organizationId: string, dto: MoveLeadDto) {
    const updateData: Record<string, unknown> = { stage: dto.stage };
    if (dto.lost_reason) updateData.lost_reason = dto.lost_reason;
    if (dto.stage === 'won' || dto.stage === 'lost') {
      updateData.last_contact_at = new Date().toISOString();
    }

    const { data, error } = await this.supabase
      .from('leads')
      .update(updateData)
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error || !data) throw new NotFoundException('Lead not found');
    return data;
  }

  async remove(id: string, organizationId: string) {
    const { error } = await this.supabase
      .from('leads')
      .delete()
      .eq('id', id)
      .eq('organization_id', organizationId);

    if (error) throw error;
    return { deleted: true };
  }

  async getStats(organizationId: string) {
    const { data, error } = await this.supabase
      .from('leads')
      .select('stage, temperature')
      .eq('organization_id', organizationId);

    if (error) throw error;

    const stages: Record<string, number> = {};
    const temps: Record<string, number> = {};
    (data || []).forEach((lead) => {
      stages[lead.stage] = (stages[lead.stage] || 0) + 1;
      temps[lead.temperature] = (temps[lead.temperature] || 0) + 1;
    });

    return { total: data?.length || 0, by_stage: stages, by_temperature: temps };
  }
}
