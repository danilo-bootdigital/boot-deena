import { createClient } from '@supabase/supabase-js';

export function createSupabaseClient(supabaseUrl: string, supabaseKey: string) {
  return createClient(supabaseUrl, supabaseKey);
}

export function createSupabaseAdmin(supabaseUrl: string, serviceRoleKey: string) {
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export type SupabaseClient = ReturnType<typeof createSupabaseClient>;
export type SupabaseAdmin = ReturnType<typeof createSupabaseAdmin>;
