import { Controller, Get, Headers } from '@nestjs/common';
import { createSupabaseClient } from '@agente-ia/database';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  @Get('debug-env')
  debugEnv() {
    return {
      supabaseUrl: process.env.SUPABASE_URL || 'NOT SET',
      hasAnonKey: !!process.env.SUPABASE_ANON_KEY,
      anonKeyPrefix: (process.env.SUPABASE_ANON_KEY || '').substring(0, 20) + '...',
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      nodeEnv: process.env.NODE_ENV,
    };
  }

  @Get('debug-auth')
  async debugAuth(@Headers('authorization') authHeader: string) {
    if (!authHeader?.startsWith('Bearer ')) {
      return { error: 'No bearer token provided' };
    }
    const token = authHeader.substring(7);
    try {
      const supabase = createSupabaseClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_ANON_KEY!,
      );
      const { data, error } = await supabase.auth.getUser(token);
      if (error) {
        return { error: error.message, code: error.status, tokenPrefix: token.substring(0, 30) };
      }
      return { success: true, userId: data.user?.id, email: data.user?.email };
    } catch (err: any) {
      return { error: err.message, stack: err.stack?.split('\n').slice(0, 3) };
    }
  }
}
