'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { useAuth, useApi } from '@/hooks/use-auth';
import { useOrganization } from '@/hooks/use-organization';
import { api } from '@/lib/api';

interface Agent {
  id: string;
  name: string;
  description?: string;
  provider: string;
  model: string;
  status?: string;
  created_at: string;
}

export default function AgentsPage() {
  const router = useRouter();
  const { session } = useAuth();
  const { currentOrg, loading: orgLoading, error: orgError, retry: retryOrg } = useOrganization();
  const { data: agents, mutate } = useApi<Agent[]>('/agents', currentOrg?.id);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    description: '',
    system_prompt: 'Você é um assistente útil e amigável.',
    provider: 'openai' as const,
    model: 'gpt-4o-mini',
    temperature: 0.7,
    max_tokens: 1024,
  });

  const userRole = currentOrg?.role || 'viewer';
  const isAdmin = userRole === 'owner' || userRole === 'admin' || userRole === 'company_admin' || userRole === 'master_admin';
  const isManager = userRole === 'manager';
  const canCreate = isAdmin;
  const canEdit = isAdmin || isManager;
  const canDelete = isAdmin;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (!session?.access_token) throw new Error('Não autenticado.');
      if (!currentOrg?.id) throw new Error('Carregando organização...');
      await api('/agents', {
        method: 'POST',
        token: session.access_token,
        orgId: currentOrg.id,
        body: JSON.stringify(form),
      });
      setShowForm(false);
      setForm({ name: '', description: '', system_prompt: 'Você é um assistente útil e amigável.', provider: 'openai', model: 'gpt-4o-mini', temperature: 0.7, max_tokens: 1024 });
      mutate();
    } catch (err: any) {
      setError(err.message || 'Erro ao criar agente');
    } finally {
      setLoading(false);
    }
  }

  const statusColors: Record<string, string> = {
    active: 'bg-accent-500/10 text-accent-500',
    inactive: 'bg-dark-600 text-dark-300',
    draft: 'bg-yellow-500/10 text-yellow-400',
  };
  const statusLabels: Record<string, string> = {
    active: 'Ativo',
    inactive: 'Inativo',
    draft: 'Rascunho',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-dark-50 tracking-tight">Agentes</h1>
        {canCreate && (
          <Button onClick={() => setShowForm(!showForm)} variant={showForm ? 'ghost' : 'primary'}>
            {showForm ? 'Cancelar' : 'Novo Agente'}
          </Button>
        )}
      </div>

      {showForm && canCreate && (
        <Card>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <Input
                label="Nome do Agente"
                placeholder="Ex: Atendente WhatsApp"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
              <Input
                label="Descrição"
                placeholder="Breve descrição do agente"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
              <Textarea
                label="Prompt do Sistema"
                placeholder="Instruções para o agente..."
                rows={4}
                value={form.system_prompt}
                onChange={(e) => setForm({ ...form, system_prompt: e.target.value })}
                required
              />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-dark-200 uppercase tracking-wide">Provedor</label>
                  <select
                    className="w-full px-3.5 py-2.5 bg-dark-900 border border-dark-600 rounded-lg text-sm text-dark-50 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                    value={form.provider}
                    onChange={(e) => setForm({ ...form, provider: e.target.value as any })}
                  >
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-dark-200 uppercase tracking-wide">Modelo</label>
                  <select
                    className="w-full px-3.5 py-2.5 bg-dark-900 border border-dark-600 rounded-lg text-sm text-dark-50 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                    value={form.model}
                    onChange={(e) => setForm({ ...form, model: e.target.value })}
                  >
                    {form.provider === 'openai' ? (
                      <>
                        <option value="gpt-4o-mini">GPT-4o Mini</option>
                        <option value="gpt-4o">GPT-4o</option>
                      </>
                    ) : (
                      <>
                        <option value="claude-haiku-4-20250514">Claude Haiku</option>
                        <option value="claude-sonnet-4-20250514">Claude Sonnet</option>
                      </>
                    )}
                  </select>
                </div>
              </div>
              {error && <p className="text-xs text-red-400">{error}</p>}
              {orgError && (
                <div className="flex items-center gap-2">
                  <p className="text-xs text-red-400">{orgError}</p>
                  <button type="button" onClick={retryOrg} className="text-xs text-brand-400 underline">Tentar novamente</button>
                </div>
              )}
              <Button type="submit" disabled={loading || orgLoading || !currentOrg}>
                {loading ? 'Criando...' : 'Criar Agente'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {agents && agents.length > 0 ? (
        <div className="grid gap-3">
          {agents.map((agent) => {
            const status = agent.status || 'draft';
            return (
              <Card key={agent.id} className="hover:border-dark-600/80 transition-colors">
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <h3 className="text-sm font-medium text-dark-50">{agent.name}</h3>
                        <span className={`px-2 py-0.5 text-[10px] rounded-md font-medium ${statusColors[status] || statusColors.draft}`}>
                          {statusLabels[status] || status}
                        </span>
                      </div>
                      {agent.description && <p className="text-sm text-dark-200 mt-1 truncate">{agent.description}</p>}
                      <p className="text-xs text-dark-400 mt-1 font-mono">{agent.provider}/{agent.model}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {canEdit && (
                        <Button size="sm" variant="secondary" onClick={() => router.push(`/agents/${agent.id}`)}>
                          Editar
                        </Button>
                      )}
                      {canCreate && (
                        <Button size="sm" variant="ghost" onClick={async () => {
                          try {
                            const duplicated = await api<Agent>(`/agents/${agent.id}/duplicate`, {
                              method: 'POST',
                              token: session!.access_token,
                              orgId: currentOrg!.id,
                              body: JSON.stringify({}),
                            });
                            mutate();
                            router.push(`/agents/${duplicated.id}`);
                          } catch (err: any) {
                            alert(err?.message || 'Erro ao duplicar');
                          }
                        }}>
                          Duplicar
                        </Button>
                      )}
                      {!canEdit && (
                        <Button size="sm" variant="ghost" onClick={() => router.push(`/agents/${agent.id}`)}>
                          Ver
                        </Button>
                      )}
                      {canDelete && (
                        <Button size="sm" variant="danger" onClick={async () => {
                          if (!confirm('Excluir este agente?')) return;
                          try {
                            await api(`/agents/${agent.id}`, { method: 'DELETE', token: session!.access_token, orgId: currentOrg!.id });
                            mutate();
                          } catch {}
                        }}>
                          Excluir
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : !showForm && (
        <Card>
          <CardContent>
            <div className="text-center py-16">
              <p className="text-sm text-dark-300">Nenhum agente criado</p>
              <p className="text-xs text-dark-500 mt-2">
                {canCreate ? 'Crie seu primeiro agente para começar' : 'Solicite acesso ao administrador.'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
