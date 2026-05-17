import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createSupabaseAdmin } from '@agente-ia/database';
import type { CreateFlowDto, UpdateFlowDto } from './dto/create-flow.dto';

@Injectable()
export class FlowsService {
  private supabase;

  constructor(private configService: ConfigService) {
    this.supabase = createSupabaseAdmin(
      this.configService.getOrThrow('app.supabaseUrl'),
      this.configService.getOrThrow('app.supabaseServiceRoleKey'),
    );
  }

  async findAll(organizationId: string) {
    const { data, error } = await this.supabase
      .from('flows')
      .select('*, flow_steps(count)')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async findOne(id: string, organizationId: string) {
    const { data, error } = await this.supabase
      .from('flows')
      .select('*, flow_steps(*)')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single();

    if (error || !data) throw new NotFoundException('Flow not found');
    return data;
  }

  async create(organizationId: string, dto: CreateFlowDto) {
    const { steps, ...flowData } = dto;

    const { data: flow, error } = await this.supabase
      .from('flows')
      .insert({ ...flowData, organization_id: organizationId })
      .select()
      .single();

    if (error) throw error;

    if (steps && steps.length > 0) {
      const stepsWithFlowId = steps.map((step) => ({
        ...step,
        flow_id: flow.id,
      }));

      const { error: stepsError } = await this.supabase
        .from('flow_steps')
        .insert(stepsWithFlowId);

      if (stepsError) throw stepsError;
    }

    return this.findOne(flow.id, organizationId);
  }

  async update(id: string, organizationId: string, dto: UpdateFlowDto) {
    const { steps, ...flowData } = dto;

    if (Object.keys(flowData).length > 0) {
      const { error } = await this.supabase
        .from('flows')
        .update(flowData)
        .eq('id', id)
        .eq('organization_id', organizationId);

      if (error) throw error;
    }

    if (steps) {
      // Replace all steps
      await this.supabase
        .from('flow_steps')
        .delete()
        .eq('flow_id', id);

      if (steps.length > 0) {
        const stepsWithFlowId = steps.map((step) => ({
          ...step,
          flow_id: id,
        }));

        const { error: stepsError } = await this.supabase
          .from('flow_steps')
          .insert(stepsWithFlowId);

        if (stepsError) throw stepsError;
      }
    }

    return this.findOne(id, organizationId);
  }

  async remove(id: string, organizationId: string) {
    const { error } = await this.supabase
      .from('flows')
      .delete()
      .eq('id', id)
      .eq('organization_id', organizationId);

    if (error) throw error;
    return { deleted: true };
  }

  async attachToAgent(agentId: string, flowId: string, priority = 0) {
    const { error } = await this.supabase
      .from('agent_flows')
      .upsert({ agent_id: agentId, flow_id: flowId, priority });

    if (error) throw error;
    return { attached: true };
  }

  async detachFromAgent(agentId: string, flowId: string) {
    const { error } = await this.supabase
      .from('agent_flows')
      .delete()
      .eq('agent_id', agentId)
      .eq('flow_id', flowId);

    if (error) throw error;
    return { detached: true };
  }
}
