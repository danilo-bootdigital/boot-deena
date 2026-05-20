import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createSupabaseAdmin } from '@agente-ia/database';
import type { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class ProfilesService {
  private supabase;

  constructor(private configService: ConfigService) {
    this.supabase = createSupabaseAdmin(
      this.configService.getOrThrow('app.supabaseUrl'),
      this.configService.getOrThrow('app.supabaseServiceRoleKey'),
    );
  }

  async findOne(userId: string) {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !data) throw new NotFoundException('Profile not found');
    return data;
  }

  async update(userId: string, dto: UpdateProfileDto) {
    const { data, error } = await this.supabase
      .from('profiles')
      .update(dto)
      .eq('id', userId)
      .select()
      .single();

    if (error || !data) throw new NotFoundException('Profile not found');
    return data;
  }

  async findByOrganization(organizationId: string) {
    // Buscar membros da org
    const { data: members, error } = await this.supabase
      .from('org_members')
      .select('role, user_id')
      .eq('organization_id', organizationId);

    if (error) throw error;
    if (!members || members.length === 0) return [];

    // Buscar profiles de todos os user_ids
    const userIds = members.map((m: any) => m.user_id);
    const { data: profiles } = await this.supabase
      .from('profiles')
      .select('id, full_name, display_name, avatar_url, job_title, email')
      .in('id', userIds);

    const profileMap = new Map<string, any>();
    (profiles || []).forEach((p: any) => profileMap.set(p.id, p));

    // Buscar emails do auth para membros sem profile
    const { data: authUsers } = await (this.supabase.auth.admin as any).listUsers({
      page: 1,
      perPage: 1000,
    });
    const authMap = new Map<string, string>();
    (authUsers?.users || []).forEach((u: any) => {
      if (u.email) authMap.set(u.id, u.email);
    });

    return members.map((m: any) => {
      const profile = profileMap.get(m.user_id);
      return {
        id: m.user_id,
        user_id: m.user_id,
        full_name: profile?.full_name || authMap.get(m.user_id)?.split('@')[0] || 'Usuário',
        display_name: profile?.display_name || null,
        avatar_url: profile?.avatar_url || null,
        job_title: profile?.job_title || null,
        email: profile?.email || authMap.get(m.user_id) || null,
        role: m.role,
      };
    });
  }
}
