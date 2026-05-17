import { Controller, Get } from '@nestjs/common';

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
}
