'use client';

import { createClient } from '@/lib/supabase';
import useSWR from 'swr';
import { useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return { session, user, loading, signIn, signUp, signOut };
}

export function useApi<T>(path: string | null, orgId?: string) {
  const { session } = useAuth();

  return useSWR<T>(
    session && path ? [path, orgId] : null,
    async ([url]) => {
      const { api } = await import('@/lib/api');
      return api<T>(url as string, {
        token: session!.access_token,
        orgId,
      });
    },
  );
}
