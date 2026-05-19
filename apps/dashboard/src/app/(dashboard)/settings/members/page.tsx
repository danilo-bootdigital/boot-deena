'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useOrganization } from '@/hooks/use-organization';
import { useApiClient } from '@/hooks/use-api-client';

interface Member {
  id: string;
  user_id?: string;
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
  company_admin: 'Administrador',
  admin: 'Administrador',
  manager: 'Gestor',
  attendant: 'Atendente',
  operator: 'Atendente',
  viewer: 'Visualizador',
};

const ROLE_COLORS: Record<string, string> = {
  owner: 'bg-yellow-500/10 text-yellow-400',
  company_admin: 'bg-purple-500/10 text-purple-400',
  admin: 'bg-purple-500/10 text-purple-400',
  manager: 'bg-brand-500/10 text-brand-400',
  attendant: 'bg-accent-500/10 text-accent-500',
  operator: 'bg-accent-500/10 text-accent-500',
  viewer: 'bg-dark-600 text-dark-300',
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
  const [formRole, setFormRole] = useState('attendant');
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
        all_agents: formRole === 'company_admin' ? true : allAgents,
        agent_ids: (!allAgents && formRole !== 'company_admin') ? selectedAgentIds : undefined,
      });
      setMessage('Membro cadastrado com sucesso!');
      setFormName('');
      setFormEmail('');
      setFormPassword('');
      setFormRole('attendant');
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
      await api.put(`/organizations/${currentOrg.id}/members/${editingMember.user_id || editingMember.id}`, {
        role: editRole,
        all_agents: editRole === 'company_admin' ? true : editAllAgents,
        agent_ids: (!editAllAgents && editRole !== 'company_admin') ? editAgentIds : undefined,
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
    return <div className="p-6 text-dark-400">Carregando membros...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-dark-50">Membros da Empresa</h1>

      {/* Formulário de cadastro */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Cadastrar Novo Membro</h2>
          <p className="text-sm text-dark-400">Crie uma conta de acesso para um novo membro da equipe</p>
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
                <label className="block text-sm font-medium text-dark-200">Função</label>
                <select
                  className="w-full rounded-md border border-dark-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                  value={formRole}
                  onChange={(e) => {
                    setFormRole(e.target.value);
                    if (e.target.value === 'company_admin') setAllAgents(true);
                  }}
                >
                  <option value="company_admin">Administrador</option>
                  <option value="manager">Gestor</option>
                  <option value="attendant">Atendente</option>
                  <option value="viewer">Visualizador</option>
                </select>
              </div>
            </div>

            {formRole !== 'admin' && (
              <div className="bg-dark-900/40 p-4 rounded-lg space-y-3">
                <label className="block text-sm font-semibold text-dark-200">Acesso a Agentes</label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="radio" checked={allAgents} onChange={() => setAllAgents(true)} className="text-brand-400" />
                    Todos os agentes
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="radio" checked={!allAgents} onChange={() => setAllAgents(false)} className="text-brand-400" />
                    Agentes específicos
                  </label>
                </div>
                {!allAgents && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                    {agents.map((agent) => (
                      <label
                        key={agent.id}
                        className={`flex items-center gap-2 p-2 rounded border text-sm cursor-pointer transition-colors ${
                          selectedAgentIds.includes(agent.id) ? 'border-brand-500 bg-brand-500/5' : 'border-dark-700/50 hover:border-dark-600'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedAgentIds.includes(agent.id)}
                          onChange={() => toggleAgent(agent.id, selectedAgentIds, setSelectedAgentIds)}
                          className="rounded border-dark-600 text-brand-400"
                        />
                        <span className="truncate">{agent.name}</span>
                      </label>
                    ))}
                    {agents.length === 0 && <p className="text-xs text-dark-500 col-span-full">Nenhum agente criado.</p>}
                  </div>
                )}
              </div>
            )}

            {message && (
              <p className={`text-sm ${message.includes('sucesso') ? 'text-accent-500' : 'text-red-400'}`}>{message}</p>
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
                    <div className="w-10 h-10 rounded-full bg-dark-700 flex items-center justify-center text-sm font-medium text-dark-300">
                      {(member.display_name || member.full_name || '?').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-dark-50">
                        {member.display_name || member.full_name || 'Sem nome'}
                      </p>
                      {member.job_title && <p className="text-xs text-dark-400">{member.job_title}</p>}
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
                          className="text-xs text-brand-400 hover:text-brand-400 font-medium"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleRemove(member.user_id || member.id)}
                          className="text-xs text-red-400 hover:text-red-400"
                        >
                          Remover
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Painel de edição inline */}
                {editingMember?.id === member.id && (
                  <div className="mt-3 ml-13 p-4 bg-dark-900/40 rounded-lg space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-dark-300">Função</label>
                        <select
                          className="rounded-md border border-dark-600 px-3 py-1.5 text-sm"
                          value={editRole}
                          onChange={(e) => setEditRole(e.target.value)}
                        >
                          <option value="company_admin">Administrador</option>
                          <option value="manager">Gestor</option>
                          <option value="attendant">Atendente</option>
                          <option value="viewer">Visualizador</option>
                        </select>
                      </div>
                    </div>

                    {editRole !== 'admin' && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-2 text-xs cursor-pointer">
                            <input type="radio" checked={editAllAgents} onChange={() => setEditAllAgents(true)} className="text-brand-400" />
                            Todos os agentes
                          </label>
                          <label className="flex items-center gap-2 text-xs cursor-pointer">
                            <input type="radio" checked={!editAllAgents} onChange={() => setEditAllAgents(false)} className="text-brand-400" />
                            Específicos
                          </label>
                        </div>
                        {!editAllAgents && (
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-1">
                            {agents.map((agent) => (
                              <label
                                key={agent.id}
                                className={`flex items-center gap-1.5 p-1.5 rounded border text-xs cursor-pointer ${
                                  editAgentIds.includes(agent.id) ? 'border-brand-500 bg-brand-500/5' : 'border-dark-700/50'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={editAgentIds.includes(agent.id)}
                                  onChange={() => toggleAgent(agent.id, editAgentIds, setEditAgentIds)}
                                  className="rounded border-dark-600 text-brand-400 w-3 h-3"
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
                        className="px-3 py-1.5 text-sm text-dark-300 hover:text-dark-100"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {members.length === 0 && (
              <p className="text-sm text-dark-400 py-4 text-center">Nenhum membro encontrado.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="bg-dark-900/40 p-4 rounded-lg text-sm text-dark-300 space-y-2">
        <p><strong>Administrador:</strong> Acesso total à empresa. Gerencia membros, agentes, WhatsApp e configurações.</p>
        <p><strong>Gestor:</strong> Supervisiona equipe. Visualiza métricas, pipeline e conversas dos agentes vinculados.</p>
        <p><strong>Atendente:</strong> Responde conversas e movimenta pipeline dos agentes autorizados.</p>
        <p><strong>Visualizador:</strong> Apenas leitura. Não edita, não exclui, não gerencia.</p>
      </div>
    </div>
  );
}
