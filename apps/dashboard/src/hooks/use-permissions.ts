'use client';

import { useOrganization } from './use-organization';

const ROLE_HIERARCHY: Record<string, number> = {
  viewer: 1,
  attendant: 2,
  operator: 2,
  manager: 3,
  company_admin: 4,
  admin: 4,
  owner: 5,
  master_admin: 6,
};

export function usePermissions() {
  const { currentOrg } = useOrganization();
  const role = currentOrg?.role || 'viewer';
  const level = ROLE_HIERARCHY[role] || 0;

  /** Verifica se o usuário tem pelo menos o nível do role informado */
  function hasRole(minRole: string): boolean {
    const minLevel = ROLE_HIERARCHY[minRole] || 0;
    return level >= minLevel;
  }

  /** Verifica se pode gerenciar membros */
  const canManageMembers = hasRole('company_admin');

  /** Verifica se pode gerenciar agentes */
  const canManageAgents = hasRole('company_admin');

  /** Verifica se pode gerenciar WhatsApp */
  const canManageWhatsapp = hasRole('company_admin');

  /** Verifica se pode editar configurações */
  const canEditSettings = hasRole('company_admin');

  /** Verifica se pode ver pipeline */
  const canViewPipeline = hasRole('attendant');

  /** Verifica se pode mover leads no pipeline */
  const canMovePipeline = hasRole('attendant');

  /** Verifica se pode ver conversas */
  const canViewConversations = hasRole('attendant');

  /** Verifica se pode ver métricas */
  const canViewMetrics = hasRole('manager');

  /** É admin ou superior */
  const isAdmin = hasRole('company_admin');

  /** É owner */
  const isOwner = hasRole('owner');

  return {
    role,
    level,
    hasRole,
    canManageMembers,
    canManageAgents,
    canManageWhatsapp,
    canEditSettings,
    canViewPipeline,
    canMovePipeline,
    canViewConversations,
    canViewMetrics,
    isAdmin,
    isOwner,
  };
}
