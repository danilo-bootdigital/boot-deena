import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';

/**
 * TenantFilterGuard
 *
 * Injeta no request os IDs de agentes, WhatsApp e permissões de pipeline
 * que o usuário tem acesso. Controllers podem usar esses dados para filtrar queries.
 *
 * Admins e owners têm acesso total (all_agents = true).
 * Outros roles recebem apenas os recursos vinculados.
 */
@Injectable()
export class TenantFilterGuard implements CanActivate {
  private supabase;

  constructor(private configService: ConfigService) {
    this.supabase = createClient(
      this.configService.getOrThrow('app.supabaseUrl'),
      this.configService.getOrThrow('app.supabaseServiceRoleKey'),
    );
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const orgId = request.headers['x-organization-id'];
    const role = request.orgRole;

    if (!user || !orgId) return true;

    // Admins e owners têm acesso total
    const fullAccessRoles = ['owner', 'admin', 'company_admin', 'master_admin'];
    if (fullAccessRoles.includes(role)) {
      request.tenantFilter = {
        allAccess: true,
        agentIds: null,
        whatsappInstanceIds: null,
        pipeline: { can_view: true, can_move: true, can_create: true, can_delete: true },
      };
      return true;
    }

    // Verificar se tem all_agents
    const { data: membership } = await this.supabase
      .from('org_members')
      .select('all_agents')
      .eq('user_id', user.id)
      .eq('organization_id', orgId)
      .single();

    if (membership?.all_agents) {
      request.tenantFilter = {
        allAccess: true,
        agentIds: null,
        whatsappInstanceIds: null,
        pipeline: { can_view: true, can_move: true, can_create: true, can_delete: true },
      };
      return true;
    }

    // Buscar agentes vinculados
    const { data: agentLinks } = await this.supabase
      .from('agent_members')
      .select('agent_id')
      .eq('user_id', user.id);

    const agentIds = agentLinks?.map((a: any) => a.agent_id) || [];

    // Buscar WhatsApp vinculados
    const { data: waLinks } = await this.supabase
      .from('member_whatsapp_access')
      .select('whatsapp_instance_id')
      .eq('user_id', user.id)
      .eq('organization_id', orgId);

    const whatsappInstanceIds = waLinks?.map((w: any) => w.whatsapp_instance_id) || [];

    // Buscar permissões de pipeline
    const { data: pipelineAccess } = await this.supabase
      .from('member_pipeline_access')
      .select('can_view, can_move, can_create, can_delete')
      .eq('user_id', user.id)
      .eq('organization_id', orgId)
      .single();

    request.tenantFilter = {
      allAccess: false,
      agentIds,
      whatsappInstanceIds,
      pipeline: pipelineAccess || { can_view: true, can_move: false, can_create: false, can_delete: false },
    };

    return true;
  }
}
