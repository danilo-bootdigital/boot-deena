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
  email?: string;
  role: string;
}

interface Agent {
  id: string;
  name: string;
  status: string;
}

const ROLE_LABELS: Record<string, string> = {
  owner: 'Proprietário',
  admin: 'Administrador',
  manager: 'Gerente de Conta',
  operator: 'Operador/Atendente',
};

const ROLE_COLORS: Record<string, string> = {
  owner: 'bg-purple-100 text-purple-800',
  admin: 'bg-purple-100 text-purple-800',
  manager: 'bg-blue-100 text-blue-800',
  operator: 'bg-green-100 text-green-800',
};

export default function MembersPage() {
  const { currentOrg } = useOrganization();
  const api = useApiClient();
  const [members, setMembers] = useState<Member[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  // Form de cadastro
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState('operator');
  const [allAgents, setAllAgents] = useState(false);
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Edição
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [editRole, setEditRole] = useState('');
  const [editAllAgents, setEditAllAgents] = useState(false);
  const [editAgentIds, setEditAgentIds] = useState<string[]>([]);

  useEffect(() => {
    if (currentOrg?.id) loadData();
  }, [currentOrg?.id]);

  async function loadData() {
    try {
      const [membersData, agentsData] = await Promise.all([
        api.get<Member[]>('/profiles/organization'),
        api.get<Agent[]>('/agents'),
      ]);
      setMembers(membersData);
      setAgents(agentsData);
    } catch {
      setMembers([]);
      setAgents([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!currentOrg?.id || !formEmail) return;

    setSaving(true);
    setMessage('');
    try {
      await api.post(`/organizations/${currentOrg.id}/members`, {
        email: formEmail,
        full_name: formName || undefined,
        password: formPassword || undefined,
        role: formRole,
        all_agents: formRole === 'admin' ? true : allAgents,
        agent_ids: (!allAgents && formRole !== 'admin') ? selectedAgentIds : undefined,
      });
      setMessage('Membro cadastrado com sucesso!');
      setFormName('');
      setFormEmail('');
      setFormPassword('');
      setFormRole('operator');
      setSelectedAgentIds([]);
      setAllAgents(false);
      loadData();
    } catch (err: any) {
      setMessage(err?.message || 'Erro ao cadastrar membro.');
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateRole() {
    if (!currentOrg?.id || !editingMember) return;

    setSaving(true);
    try {
      await api.put(`/organizations/${currentOrg.id}/members/${editingMember.id}`, {
        role: editRole,
        all_agents: editRole === 'admin' ? true : editAllAgents,
        agent_ids: (!editAllAgents && editRole !== 'admin') ? editAgentIds : undefined,
      });
      setEditingMember(null);
      loadData();
    } catch (err: any) {
      setMessage(err?.message || 'Erro ao atualizar membro.');
    } finally {
      setSaving(false);
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

  function startEdit(member: Member) {
    setEditingMember(member);
    setEditRole(member.role);
    setEditAllAgents(false);
    setEditAgentIds([]);
  }

  function toggleAgent(agentId: string, list: string[], setter: (v: string[]) => void) {
    setter(
      list.includes(agentId)
        ? list.filter((id) => id !== agentId)
        : [...list, agentId],
    );
  }

  if (loading) {
    return <div className="p-6 text-gray-500">Carregando membros...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Membros da Organização</h1>

      {/* Formulário de cadastro */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Cadastrar Novo Membro</h2>
          <p className="text-sm text-gray-500">Crie uma conta de acesso para um novo membro da equipe</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                label="Nome completo"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="João Silva"
              />
              <Input
                label="E-mail"
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="joao@clinica.com"
                required
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                label="Senha (para novo usuário)"
                type="password"
                value={formPassword}
                onChange={(e) => setFormPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
              />
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Nível de Acesso</label>
                <select
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formRole}
                  onChange={(e) => {
                    setFormRole(e.target.value);
                    if (e.target.value === 'admin') setAllAgents(true);
                  }}
                >
                  <option value="admin">Administrador</option>
                  <option value="manager">Gerente de Conta</option>
                  <option value="operator">Operador/Atendente</option>
                </select>
              </div>
            </div>

            {formRole !== 'admin' && (
              <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                <label className="block text-sm font-semibold text-gray-700">Acesso a Agentes</label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="radio" checked={allAgents} onChange={() => setAllAgents(true)} className="text-blue-600" />
                    Todos os agentes
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="radio" checked={!allAgents} onChange={() => setAllAgents(false)} className="text-blue-600" />
                    Agentes específicos
                  </label>
                </div>
                {!allAgents && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                    {agents.map((agent) => (
                      <label
                        key={agent.id}
                        className={`flex items-center gap-2 p-2 rounded border text-sm cursor-pointer transition-colors ${
                          selectedAgentIds.includes(agent.id) ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedAgentIds.includes(agent.id)}
                          onChange={() => toggleAgent(agent.id, selectedAgentIds, setSelectedAgentIds)}
                          className="rounded border-gray-300 text-blue-600"
                        />
                        <span className="truncate">{agent.name}</span>
                      </label>
                    ))}
                    {agents.length === 0 && <p className="text-xs text-gray-400 col-span-full">Nenhum agente criado.</p>}
                  </div>
                )}
              </div>
            )}

            {message && (
              <p className={`text-sm ${message.includes('sucesso') ? 'text-green-600' : 'text-red-600'}`}>{message}</p>
            )}

            <Button type="submit" disabled={saving}>
              {saving ? 'Cadastrando...' : 'Cadastrar Membro'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Lista de membros */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Membros ({members.length})</h2>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {members.map((member) => (
              <div key={member.id} className="py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
                      {(member.display_name || member.full_name || '?').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {member.display_name || member.full_name || 'Sem nome'}
                      </p>
                      {member.job_title && <p className="text-xs text-gray-500">{member.job_title}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${ROLE_COLORS[member.role] || ROLE_COLORS.operator}`}>
                      {ROLE_LABELS[member.role] || member.role}
                    </span>
                    {member.role !== 'owner' && (
                      <>
                        <button
                          onClick={() => startEdit(member)}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleRemove(member.id)}
                          className="text-xs text-red-500 hover:text-red-700"
                        >
                          Remover
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Painel de edição inline */}
                {editingMember?.id === member.id && (
                  <div className="mt-3 ml-13 p-4 bg-gray-50 rounded-lg space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-gray-600">Nível de Acesso</label>
                        <select
                          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
                          value={editRole}
                          onChange={(e) => setEditRole(e.target.value)}
                        >
                          <option value="admin">Administrador</option>
                          <option value="manager">Gerente de Conta</option>
                          <option value="operator">Operador/Atendente</option>
                        </select>
                      </div>
                    </div>

                    {editRole !== 'admin' && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-2 text-xs cursor-pointer">
                            <input type="radio" checked={editAllAgents} onChange={() => setEditAllAgents(true)} className="text-blue-600" />
                            Todos os agentes
                          </label>
                          <label className="flex items-center gap-2 text-xs cursor-pointer">
                            <input type="radio" checked={!editAllAgents} onChange={() => setEditAllAgents(false)} className="text-blue-600" />
                            Específicos
                          </label>
                        </div>
                        {!editAllAgents && (
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-1">
                            {agents.map((agent) => (
                              <label
                                key={agent.id}
                                className={`flex items-center gap-1.5 p-1.5 rounded border text-xs cursor-pointer ${
                                  editAgentIds.includes(agent.id) ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={editAgentIds.includes(agent.id)}
                                  onChange={() => toggleAgent(agent.id, editAgentIds, setEditAgentIds)}
                                  className="rounded border-gray-300 text-blue-600 w-3 h-3"
                                />
                                <span className="truncate">{agent.name}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button onClick={handleUpdateRole} disabled={saving}>
                        {saving ? 'Salvando...' : 'Salvar'}
                      </Button>
                      <button
                        onClick={() => setEditingMember(null)}
                        className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {members.length === 0 && (
              <p className="text-sm text-gray-500 py-4 text-center">Nenhum membro encontrado.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-600 space-y-2">
        <p><strong>Administrador:</strong> Acesso total. Visualiza todos os agentes, membros e configurações.</p>
        <p><strong>Gerente de Conta:</strong> Visualiza e edita apenas os agentes vinculados. Gerencia atendentes dos seus agentes.</p>
        <p><strong>Operador/Atendente:</strong> Acesso limitado. Responde atendimentos e visualiza conversas dos agentes autorizados.</p>
      </div>
    </div>
  );
}
