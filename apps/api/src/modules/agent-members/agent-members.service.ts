import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createSupabaseAdmin } from '@agente-ia/database';
import type { AssignAgentMemberDto, UpdateAgentMemberDto } from './dto/agent-member.dto';

@Injectable()
export class AgentMembersService {
  private supabase;

  constructor(private configService: ConfigService) {
    this.supabase = createSupabaseAdmin(
      this.configService.getOrThrow('app.supabaseUrl'),
      this.configService.getOrThrow('app.supabaseServiceRoleKey'),
    );
  }

  private async verifyAgentBelongsToOrg(agentId: string, organizationId: string) {
    const { data } = await this.supabase
      .from('agents')
      .select('id')
      .eq('id', agentId)
      .eq('organization_id', organizationId)
      .single();

    if (!data) {
      throw new NotFoundException('Agent not found in this organization');
    }
  }

  private async verifyUserBelongsToOrg(userId: string, agentId: string) {
    const { data: agent } = await this.supabase
      .from('agents')
      .select('organization_id')
      .eq('id', agentId)
      .single();

    if (!agent) throw new NotFoundException('Agent not found');

    const { data: membership } = await this.supabase
      .from('org_members')
      .select('user_id')
      .eq('user_id', userId)
      .eq('organization_id', agent.organization_id)
      .single();

    if (!membership) {
      throw new ForbiddenException('User does not belong to this organization');
    }
  }

  async findByAgent(agentId: string, organizationId: string) {
    await this.verifyAgentBelongsToOrg(agentId, organizationId);

    const { data, error } = await this.supabase
      .from('agent_members')
      .select('*, profiles(id, full_name, display_name, avatar_url)')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async findByUser(userId: string, organizationId: string) {
    const { data, error } = await this.supabase
      .from('agent_members')
      .select('*, agents!inner(id, name, status, organization_id)')
      .eq('user_id', userId)
      .eq('agents.organization_id', organizationId);

    if (error) throw error;
    return data || [];
  }

  async assign(agentId: string, organizationId: string, dto: AssignAgentMemberDto, assignedBy: string) {
    await this.verifyAgentBelongsToOrg(agentId, organizationId);
    await this.verifyUserBelongsToOrg(dto.user_id, agentId);

    const { data: existing } = await this.supabase
      .from('agent_members')
      .select('id')
      .eq('agent_id', agentId)
      .eq('user_id', dto.user_id)
      .single();

    if (existing) {
      throw new ConflictException('User is already assigned to this agent');
    }

    const { data, error } = await this.supabase
      .from('agent_members')
      .insert({
        agent_id: agentId,
        user_id: dto.user_id,
        permission: dto.permission,
        role_type: dto.role_type || 'team',
        assigned_by: assignedBy,
      })
      .select('*, profiles(id, full_name, display_name, avatar_url)')
      .single();

    if (error) throw error;
    return data;
  }

  async updatePermission(agentId: string, organizationId: string, userId: string, dto: UpdateAgentMemberDto) {
    await this.verifyAgentBelongsToOrg(agentId, organizationId);

    const updateData: Record<string, string> = {};
    if (dto.permission) updateData.permission = dto.permission;
    if (dto.role_type) updateData.role_type = dto.role_type;

    const { data, error } = await this.supabase
      .from('agent_members')
      .update(updateData)
      .eq('agent_id', agentId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error || !data) throw new NotFoundException('Agent member not found');
    return data;
  }

  async remove(agentId: string, organizationId: string, userId: string) {
    await this.verifyAgentBelongsToOrg(agentId, organizationId);

    const { data: existing } = await this.supabase
      .from('agent_members')
      .select('id')
      .eq('agent_id', agentId)
      .eq('user_id', userId)
      .single();

    if (!existing) throw new NotFoundException('Agent member not found');

    const { error } = await this.supabase
      .from('agent_members')
      .delete()
      .eq('agent_id', agentId)
      .eq('user_id', userId);

    if (error) throw error;
    return { removed: true };
  }
}
