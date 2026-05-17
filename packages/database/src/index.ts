import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

export function createSupabaseClient(supabaseUrl: string, supabaseKey: string) {
  return createClient(supabaseUrl, supabaseKey, {
    realtime: { transport: ws as any },
  });
}

export function createSupabaseAdmin(supabaseUrl: string, serviceRoleKey: string) {
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    realtime: { transport: ws as any },
  });
}

export type SupabaseClient = ReturnType<typeof createSupabaseClient>;
export type SupabaseAdmin = ReturnType<typeof createSupabaseAdmin>;
