import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  private supabase;
  private supabaseAdmin;

  constructor(private configService: ConfigService) {
    this.supabase = createClient(
      this.configService.getOrThrow('app.supabaseUrl'),
      this.configService.getOrThrow('app.supabaseAnonKey'),
    );
    this.supabaseAdmin = createClient(
      this.configService.getOrThrow('app.supabaseUrl'),
      this.configService.getOrThrow('app.supabaseServiceRoleKey'),
    );
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid authorization header');
    }

    const token = authHeader.substring(7);

    const {
      data: { user },
      error,
    } = await (this.supabase.auth as any).getUser(token);

    if (error || !user) {
      throw new UnauthorizedException('Invalid token');
    }

    const orgId = request.headers['x-organization-id'];
    if (orgId) {
      const { data: membership } = await this.supabaseAdmin
        .from('org_members')
        .select('role')
        .eq('user_id', user.id)
        .eq('organization_id', orgId)
        .single();

      if (!membership) {
        throw new ForbiddenException('User does not belong to this organization');
      }

      // Verificar se é master_admin
      const { data: profile } = await this.supabaseAdmin
        .from('profiles')
        .select('is_master_admin')
        .eq('id', user.id)
        .single();

      request.orgRole = profile?.is_master_admin ? 'master_admin' : membership.role;
    }

    request.user = user;
    return true;
  }
}
