'use client';

import { useAuth } from './use-auth';
import { useOrganization } from './use-organization';
import { api } from '@/lib/api';

export function useApiClient() {
  const { session } = useAuth();
  const { currentOrg } = useOrganization();

  const token = session?.access_token;
  const orgId = currentOrg?.id;

  return {
    get: <T = any>(path: string) =>
      api<T>(path, { token, orgId }),

    post: <T = any>(path: string, body?: unknown) =>
      api<T>(path, { method: 'POST', token, orgId, body: body ? JSON.stringify(body) : undefined }),

    put: <T = any>(path: string, body?: unknown) =>
      api<T>(path, { method: 'PUT', token, orgId, body: body ? JSON.stringify(body) : undefined }),

    delete: <T = any>(path: string) =>
      api<T>(path, { method: 'DELETE', token, orgId }),
  };
}
