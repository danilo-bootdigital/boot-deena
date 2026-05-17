import { Controller, Get, Headers } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';

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
    const url = process.env.SUPABASE_URL!;
    const anonKey = process.env.SUPABASE_ANON_KEY!;

    // Test 1: direct fetch to Supabase (bypass JS client)
    try {
      const res = await fetch(`${url}/auth/v1/user`, {
        headers: {
          'apikey': anonKey,
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok) {
        return { success: true, method: 'direct-fetch', userId: data.id, email: data.email };
      }
      return { error: 'direct-fetch-failed', status: res.status, body: data, anonKeyLen: anonKey.length, urlUsed: url };
    } catch (err: any) {
      return { error: err.message };
    }
  }
}
