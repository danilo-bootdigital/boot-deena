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
    const { data, error } = await this.supabase
      .from('org_members')
      .select('role, user_id, profiles(id, full_name, display_name, avatar_url, job_title, email)')
      .eq('organization_id', organizationId);

    if (error) throw error;
    return data?.map((m) => ({
      id: m.profiles?.id || m.user_id,
      user_id: m.user_id,
      full_name: m.profiles?.full_name || 'Usuário',
      display_name: m.profiles?.display_name || null,
      avatar_url: m.profiles?.avatar_url || null,
      job_title: m.profiles?.job_title || null,
      email: m.profiles?.email || null,
      role: m.role,
    })) || [];
  }
}
