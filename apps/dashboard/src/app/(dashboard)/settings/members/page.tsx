'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useOrganization } from '@/hooks/use-organization';
import { useApiClient } from '@/hooks/use-api-client';

interface Member {
  id: string;
  full_name: string;
  display_name: string | null;
  avatar_url: string | null;
  job_title: string | null;
  role: string;
}

const ROLE_LABELS: Record<string, string> = {
  owner: 'Proprietário',
  admin: 'Administrador',
  member: 'Membro',
  viewer: 'Visualizador',
};

const ROLE_COLORS: Record<string, string> = {
  owner: 'bg-purple-100 text-purple-800',
  admin: 'bg-blue-100 text-blue-800',
  member: 'bg-green-100 text-green-800',
  viewer: 'bg-gray-100 text-gray-800',
};

export default function MembersPage() {
  const { currentOrg } = useOrganization();
  const api = useApiClient();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviting, setInviting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (currentOrg?.id) loadMembers();
  }, [currentOrg?.id]);

  async function loadMembers() {
    try {
      const data = await api.get<Member[]>('/profiles/organization');
      setMembers(data);
    } catch {
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!currentOrg?.id || !inviteEmail) return;

    setInviting(true);
    setMessage('');
    try {
      await api.post(`/organizations/${currentOrg.id}/members`, {
        email: inviteEmail,
        role: inviteRole,
      });
      setMessage('Membro convidado com sucesso!');
      setInviteEmail('');
      loadMembers();
    } catch (err: any) {
      setMessage(err?.message || 'Erro ao convidar membro.');
    } finally {
      setInviting(false);
    }
  }

  async function handleRemove(userId: string) {
    if (!currentOrg?.id) return;
    if (!confirm('Tem certeza que deseja remover este membro?')) return;

    try {
      await api.delete(`/organizations/${currentOrg.id}/members/${userId}`);
      setMembers(members.filter((m) => m.id !== userId));
    } catch {
      setMessage('Erro ao remover membro.');
    }
  }

  if (loading) {
    return <div className="p-6 text-gray-500">Carregando membros...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Membros da Organização</h1>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Convidar Novo Membro</h2>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleInvite} className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="email@exemplo.com"
                required
              />
            </div>
            <div className="w-40">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nível</label>
              <select
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
              >
                <option value="admin">Administrador</option>
                <option value="member">Membro</option>
                <option value="viewer">Visualizador</option>
              </select>
            </div>
            <Button type="submit" disabled={inviting}>
              {inviting ? 'Convidando...' : 'Convidar'}
            </Button>
          </form>
          {message && (
            <p className={`mt-3 text-sm ${message.includes('sucesso') ? 'text-green-600' : 'text-red-600'}`}>
              {message}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Membros ({members.length})</h2>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {members.map((member) => (
              <div key={member.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
                    {(member.display_name || member.full_name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {member.display_name || member.full_name || 'Sem nome'}
                    </p>
                    {member.job_title && (
                      <p className="text-xs text-gray-500">{member.job_title}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${ROLE_COLORS[member.role] || ROLE_COLORS.viewer}`}>
                    {ROLE_LABELS[member.role] || member.role}
                  </span>
                  {member.role !== 'owner' && (
                    <button
                      onClick={() => handleRemove(member.id)}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Remover
                    </button>
                  )}
                </div>
              </div>
            ))}
            {members.length === 0 && (
              <p className="text-sm text-gray-500 py-4 text-center">Nenhum membro encontrado.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
