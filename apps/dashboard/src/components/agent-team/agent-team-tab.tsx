'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useApiClient } from '@/hooks/use-api-client';

interface AgentMember {
  id: string;
  agent_id: string;
  user_id: string;
  permission: string;
  role_type: string;
  created_at: string;
  profiles: {
    id: string;
    full_name: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface OrgMember {
  id: string;
  user_id?: string;
  full_name: string;
  display_name: string | null;
  role: string;
}

const ROLE_TYPE_LABELS: Record<string, string> = {
  owner: 'Responsável Principal',
  manager: 'Gerente Vinculado',
  team: 'Equipe Autorizada',
};

const ROLE_TYPE_COLORS: Record<string, string> = {
  owner: 'bg-purple-100 text-purple-800',
  manager: 'bg-brand-500/10 text-blue-800',
  team: 'bg-dark-800 text-dark-100',
};

interface Props {
  agentId: string;
}

export function AgentTeamTab({ agentId }: Props) {
  const api = useApiClient();
  const [members, setMembers] = useState<AgentMember[]>([]);
  const [orgMembers, setOrgMembers] = useState<OrgMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedPermission, setSelectedPermission] = useState('view');
  const [selectedRoleType, setSelectedRoleType] = useState('team');
  const [assigning, setAssigning] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadData();
  }, [agentId]);

  async function loadData() {
    try {
      const [agentMembers, orgProfiles] = await Promise.all([
        api.get<AgentMember[]>(`/agents/${agentId}/members`).catch(() => []),
        api.get<OrgMember[]>('/profiles/organization').catch(() => []),
      ]);
      setMembers(agentMembers);
      setOrgMembers(orgProfiles);
    } catch (err) {
      console.error('Erro ao carregar equipe:', err);
    } finally {
      setLoading(false);
    }
  }

  const availableUsers = orgMembers.filter(
    (om) => !members.some((m) => m.user_id === (om.user_id || om.id)),
  );

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUser) return;

    setAssigning(true);
    setMessage('');
    try {
      await api.post(`/agents/${agentId}/members`, {
        user_id: selectedUser,
        permission: selectedPermission,
        role_type: selectedRoleType,
      });
      setSelectedUser('');
      setMessage('Membro vinculado ao agente!');
      await loadData();
    } catch (err: any) {
      setMessage(err?.message || 'Erro ao vincular membro.');
    } finally {
      setAssigning(false);
    }
  }

  async function handleUpdate(userId: string, field: string, value: string) {
    try {
      await api.put(`/agents/${agentId}/members/${userId}`, { [field]: value });
      setMembers((prev) =>
        prev.map((m) => (m.user_id === userId ? { ...m, [field]: value } : m)),
      );
    } catch {
      setMessage('Erro ao atualizar.');
    }
  }

  async function handleRemove(userId: string) {
    if (!confirm('Remover este membro do agente?')) return;
    try {
      await api.delete(`/agents/${agentId}/members/${userId}`);
      setMembers((prev) => prev.filter((m) => m.user_id !== userId));
    } catch {
      setMessage('Erro ao remover membro.');
    }
  }

  if (loading) {
    return <div className="text-dark-400 py-4">Carregando equipe...</div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Vincular Membro ao Agente</h2>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-dark-400 mb-4">
            Defina quem pode gerenciar, operar ou visualizar este agente e qual o papel na equipe.
          </p>
          <form onSubmit={handleAssign} className="space-y-3">
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-dark-200 mb-1">Membro</label>
                <select
                  className="w-full rounded-md border border-dark-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  required
                >
                  <option value="">Selecione um membro...</option>
                  {availableUsers.map((u) => (
                    <option key={u.user_id || u.id} value={u.user_id || u.id}>
                      {u.display_name || u.full_name} ({u.role})
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-44">
                <label className="block text-sm font-medium text-dark-200 mb-1">Papel na Equipe</label>
                <select
                  className="w-full rounded-md border border-dark-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                  value={selectedRoleType}
                  onChange={(e) => setSelectedRoleType(e.target.value)}
                >
                  <option value="owner">Responsável Principal</option>
                  <option value="manager">Gerente Vinculado</option>
                  <option value="team">Equipe Autorizada</option>
                </select>
              </div>
              <div className="w-36">
                <label className="block text-sm font-medium text-dark-200 mb-1">Permissão</label>
                <select
                  className="w-full rounded-md border border-dark-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                  value={selectedPermission}
                  onChange={(e) => setSelectedPermission(e.target.value)}
                >
                  <option value="manage">Gerenciar</option>
                  <option value="operate">Operar</option>
                  <option value="view">Visualizar</option>
                </select>
              </div>
            </div>
            <Button type="submit" disabled={assigning}>
              {assigning ? 'Vinculando...' : 'Vincular'}
            </Button>
          </form>
          {message && (
            <p className={`mt-3 text-sm ${message.includes('vinculado') ? 'text-accent-500' : 'text-red-400'}`}>
              {message}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Equipe do Agente ({members.length})</h2>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {members.map((member) => (
              <div key={member.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-dark-700 flex items-center justify-center text-sm font-medium text-dark-300">
                    {(member.profiles?.display_name || member.profiles?.full_name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-dark-50">
                      {member.profiles?.display_name || member.profiles?.full_name || 'Membro'}
                    </p>
                    <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${ROLE_TYPE_COLORS[member.role_type] || ROLE_TYPE_COLORS.team}`}>
                      {ROLE_TYPE_LABELS[member.role_type] || member.role_type}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    className="rounded-md border border-dark-600 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                    value={member.role_type}
                    onChange={(e) => handleUpdate(member.user_id, 'role_type', e.target.value)}
                  >
                    <option value="owner">Responsável</option>
                    <option value="manager">Gerente</option>
                    <option value="team">Equipe</option>
                  </select>
                  <select
                    className="rounded-md border border-dark-600 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                    value={member.permission}
                    onChange={(e) => handleUpdate(member.user_id, 'permission', e.target.value)}
                  >
                    <option value="manage">Gerenciar</option>
                    <option value="operate">Operar</option>
                    <option value="view">Visualizar</option>
                  </select>
                  <button
                    onClick={() => handleRemove(member.user_id)}
                    className="text-xs text-red-400 hover:text-red-700"
                  >
                    Remover
                  </button>
                </div>
              </div>
            ))}
            {members.length === 0 && (
              <p className="text-sm text-dark-400 py-4 text-center">
                Nenhum membro vinculado a este agente.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="bg-dark-900/40 p-4 rounded-lg text-sm text-dark-300 space-y-1">
        <p><strong>Responsável Principal:</strong> Dono do agente. Tem controle total sobre configurações e equipe.</p>
        <p><strong>Gerente Vinculado:</strong> Gerencia o agente e seus atendentes. Pode editar configurações.</p>
        <p><strong>Equipe Autorizada:</strong> Pode operar/visualizar o agente conforme a permissão definida.</p>
      </div>
    </div>
  );
}
