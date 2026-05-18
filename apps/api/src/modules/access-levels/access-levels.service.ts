import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createSupabaseAdmin } from '@agente-ia/database';
import { DEFAULT_PERMISSIONS } from '@agente-ia/shared';
import type { OrgRole } from '@agente-ia/shared';
import type { UpdateAccessLevelDto } from './dto/access-level.dto';

@Injectable()
export class AccessLevelsService {
  private supabase;

  constructor(private configService: ConfigService) {
    this.supabase = createSupabaseAdmin(
      this.configService.getOrThrow('app.supabaseUrl'),
      this.configService.getOrThrow('app.supabaseServiceRoleKey'),
    );
  }

  async findAllForOrg(organizationId: string) {
    const { data, error } = await this.supabase
      .from('access_levels')
      .select('*')
      .eq('organization_id', organizationId)
      .order('role');

    if (error) throw error;
    return data;
  }

  async findByRole(organizationId: string, role: string) {
    const { data, error } = await this.supabase
      .from('access_levels')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('role', role)
      .single();

    if (error || !data) {
      return { role, permissions: DEFAULT_PERMISSIONS[role as OrgRole] || {} };
    }
    return data;
  }

  async upsert(organizationId: string, role: string, dto: UpdateAccessLevelDto) {
    const { data, error } = await this.supabase
      .from('access_levels')
      .upsert(
        {
          organization_id: organizationId,
          role,
          permissions: dto.permissions,
          description: dto.description,
        },
        { onConflict: 'organization_id,role' },
      )
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async seedDefaults(organizationId: string) {
    const roles = Object.keys(DEFAULT_PERMISSIONS) as OrgRole[];
    const records = roles.map((role) => ({
      organization_id: organizationId,
      role,
      permissions: DEFAULT_PERMISSIONS[role],
      description: `Permissões padrão para ${role}`,
    }));

    const { error } = await this.supabase
      .from('access_levels')
      .upsert(records, { onConflict: 'organization_id,role' });

    if (error) throw error;
    return { seeded: true };
  }
}
