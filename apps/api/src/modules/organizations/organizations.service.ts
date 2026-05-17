import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createSupabaseAdmin } from '@agente-ia/database';
import type { CreateOrganizationDto, UpdateOrganizationDto, InviteMemberDto } from './dto/create-organization.dto';

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
    // Check slug uniqueness
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

    // Add creator as owner
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
    // Look up user by email
    const { data: users } = await this.supabase.auth.admin.listUsers();
    const user = users?.users?.find((u) => u.email === dto.email);

    if (!user) {
      throw new NotFoundException('User not found with this email');
    }

    // Check if already a member
    const { data: existing } = await this.supabase
      .from('org_members')
      .select('user_id')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .single();

    if (existing) {
      throw new ConflictException('User is already a member');
    }

    const { error } = await this.supabase
      .from('org_members')
      .insert({
        organization_id: organizationId,
        user_id: user.id,
        role: dto.role,
      });

    if (error) throw error;
    return { invited: true, userId: user.id };
  }

  async removeMember(organizationId: string, userId: string) {
    const { error } = await this.supabase
      .from('org_members')
      .delete()
      .eq('organization_id', organizationId)
      .eq('user_id', userId);

    if (error) throw error;
    return { removed: true };
  }
}
