import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createSupabaseAdmin } from '@agente-ia/database';
import type { CreateOrganizationDto, UpdateOrganizationDto, InviteMemberDto, UpdateMemberRoleDto } from './dto/create-organization.dto';

@Injectable()
export class OrganizationsService {
  private supabase;

  constructor(private configService: ConfigService) {
    this.supabase = createSupabaseAdmin(
      this.configService.getOrThrow('app.supabaseUrl'),
      this.configService.getOrThrow('app.supabaseServiceRoleKey'),
    );
  }

  async findAllForUser(userId: string) {
    const { data, error } = await this.supabase
      .from('org_members')
      .select('role, organizations(id, name, slug, created_at)')
      .eq('user_id', userId);

    if (error) throw error;
    return data?.map((m) => ({ ...m.organizations, role: m.role })) || [];
  }

  async findOne(id: string) {
    const { data, error } = await this.supabase
      .from('organizations')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) throw new NotFoundException('Organization not found');
    return data;
  }

  async create(userId: string, dto: CreateOrganizationDto) {
    const { data: existing } = await this.supabase
      .from('organizations')
      .select('id')
      .eq('slug', dto.slug)
      .single();

    if (existing) {
      throw new ConflictException('Slug already in use');
    }

    const { data: org, error } = await this.supabase
      .from('organizations')
      .insert(dto)
      .select()
      .single();

    if (error) throw error;

    await this.supabase
      .from('org_members')
      .insert({
        organization_id: org.id,
        user_id: userId,
        role: 'owner',
      });

    return org;
  }

  async update(id: string, dto: UpdateOrganizationDto) {
    if (dto.slug) {
      const { data: existing } = await this.supabase
        .from('organizations')
        .select('id')
        .eq('slug', dto.slug)
        .neq('id', id)
        .single();

      if (existing) {
        throw new ConflictException('Slug already in use');
      }
    }

    const { data, error } = await this.supabase
      .from('organizations')
      .update(dto)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) throw new NotFoundException('Organization not found');
    return data;
  }

  async getMembers(organizationId: string) {
    const { data, error } = await this.supabase
      .from('org_members')
      .select('user_id, role, created_at')
      .eq('organization_id', organizationId);

    if (error) throw error;
    return data;
  }

  async inviteMember(organizationId: string, dto: InviteMemberDto) {
    let userId: string | null = null;

    // Tentar encontrar o usuário pelo e-mail
    const { data: userData, error: userError } = await this.supabase
      .rpc('get_user_id_by_email', { email_input: dto.email });

    if (!userError && userData) {
      userId = userData;
    } else {
      // Buscar no auth
      const { data: users } = await this.supabase.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });
      const user = users?.users?.find((u) => u.email === dto.email);
      if (user) {
        userId = user.id;
      }
    }

    // Se não encontrou, criar o usuário automaticamente
    if (!userId) {
      if (!dto.password) {
        throw new NotFoundException('Usuário não encontrado. Informe uma senha para criar a conta.');
      }
      const { data: newUser, error: createError } = await this.supabase.auth.admin.createUser({
        email: dto.email,
        password: dto.password,
        email_confirm: true,
        user_metadata: { full_name: dto.full_name || dto.email.split('@')[0] },
      });

      if (createError || !newUser?.user) {
        throw new ConflictException(createError?.message || 'Erro ao criar usuário');
      }
      userId = newUser.user.id;

      // Criar perfil
      await this.supabase
        .from('profiles')
        .upsert({
          id: userId,
          full_name: dto.full_name || dto.email.split('@')[0],
          email: dto.email,
        }, { onConflict: 'id' });
    }

    // Verificar se já é membro
    const { data: existing } = await this.supabase
      .from('org_members')
      .select('user_id')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .single();

    if (existing) {
      throw new ConflictException('Usuário já é membro desta organização');
    }

    const allAgents = dto.role === 'admin' ? true : (dto.all_agents || false);

    const { error } = await this.supabase
      .from('org_members')
      .insert({
        organization_id: organizationId,
        user_id: userId,
        role: dto.role,
        all_agents: allAgents,
      });

    if (error) throw error;

    // Se não tem acesso a todos e foram especificados agentes, vincular
    if (!allAgents && dto.agent_ids && dto.agent_ids.length > 0) {
      const agentMembers = dto.agent_ids.map((agentId) => ({
        agent_id: agentId,
        user_id: userId!,
        permission: dto.role === 'manager' ? 'manage' : 'view',
        role_type: dto.role === 'manager' ? 'manager' : 'team',
        assigned_by: null,
      }));

      await this.supabase
        .from('agent_members')
        .upsert(agentMembers, { onConflict: 'agent_id,user_id' });
    }

    return { invited: true, userId, created: !existing };
  }

  async updateMemberRole(organizationId: string, userId: string, dto: UpdateMemberRoleDto) {
    const { data: member } = await this.supabase
      .from('org_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .single();

    if (!member) {
      throw new NotFoundException('Membro não encontrado');
    }

    if (member.role === 'owner') {
      throw new ForbiddenException('Não é possível alterar o nível do proprietário');
    }

    const allAgents = dto.role === 'admin' ? true : (dto.all_agents ?? false);

    const { error } = await this.supabase
      .from('org_members')
      .update({ role: dto.role, all_agents: allAgents })
      .eq('organization_id', organizationId)
      .eq('user_id', userId);

    if (error) throw error;

    // Atualizar vinculação de agentes
    if (!allAgents && dto.agent_ids && dto.agent_ids.length > 0) {
      // Remover vinculações antigas
      await this.supabase
        .from('agent_members')
        .delete()
        .eq('user_id', userId);

      // Criar novas
      const agentMembers = dto.agent_ids.map((agentId) => ({
        agent_id: agentId,
        user_id: userId,
        permission: dto.role === 'manager' ? 'manage' : 'view',
        role_type: dto.role === 'manager' ? 'manager' : 'team',
        assigned_by: null,
      }));

      await this.supabase
        .from('agent_members')
        .upsert(agentMembers, { onConflict: 'agent_id,user_id' });
    } else if (allAgents) {
      // Se tem acesso a todos, remover vinculações específicas
      await this.supabase
        .from('agent_members')
        .delete()
        .eq('user_id', userId);
    }

    return { updated: true };
  }

  async removeMember(organizationId: string, userId: string) {
    const { data: member } = await this.supabase
      .from('org_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .single();

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    if (member.role === 'owner') {
      throw new ForbiddenException('Cannot remove the organization owner');
    }

    const { error } = await this.supabase
      .from('org_members')
      .delete()
      .eq('organization_id', organizationId)
      .eq('user_id', userId);

    if (error) throw error;
    return { removed: true };
  }
}
