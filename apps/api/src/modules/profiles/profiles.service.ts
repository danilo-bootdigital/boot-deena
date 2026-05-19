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
    return data?.map((m) => ({ ...m.profiles, role: m.role, user_id: m.user_id })) || [];
  }
}
