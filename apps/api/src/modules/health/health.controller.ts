import { Controller, Get, Headers } from '@nestjs/common';

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
      anonKeyLen: (process.env.SUPABASE_ANON_KEY || '').length,
      anonKeyPrefix: (process.env.SUPABASE_ANON_KEY || '').substring(0, 20) + '...',
      anonKeySuffix: '...' + (process.env.SUPABASE_ANON_KEY || '').slice(-20),
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      serviceKeyLen: (process.env.SUPABASE_SERVICE_ROLE_KEY || '').length,
      nodeEnv: process.env.NODE_ENV,
    };
  }

  @Get('debug-auth')
  async debugAuth(@Headers('authorization') authHeader: string) {
    if (!authHeader?.startsWith('Bearer ')) {
      return { error: 'No bearer token provided' };
    }
    const token = authHeader.substring(7);
    const url = process.env.SUPABASE_URL!;
    const anonKey = process.env.SUPABASE_ANON_KEY!;

    try {
      const res = await fetch(`${url}/auth/v1/user`, {
        headers: {
          'apikey': anonKey,
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await res.json() as any;
      if (res.ok) {
        return { success: true, userId: data.id, email: data.email };
      }
      return { error: 'auth-failed', status: res.status, body: data, anonKeyLen: anonKey.length };
    } catch (err: any) {
      return { error: err.message };
    }
  }
}
