'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (!session?.access_token) throw new Error('Não autenticado. Faça login novamente.');
      if (!currentOrg?.id) throw new Error('Carregando organização... tente novamente em instantes.');
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Agentes</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancelar' : 'Novo Agente'}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <p className="text-sm text-gray-500">Criar novo agente de IA</p>
          </CardHeader>
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
                label="Descrição (opcional)"
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
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Provedor</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.provider}
                    onChange={(e) => setForm({ ...form, provider: e.target.value as any })}
                  >
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Modelo</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              {error && <p className="text-sm text-red-500">{error}</p>}
              {orgError && (
                <div className="flex items-center gap-2">
                  <p className="text-sm text-red-500">{orgError}</p>
                  <button type="button" onClick={retryOrg} className="text-sm text-blue-600 underline">Tentar novamente</button>
                </div>
              )}
              {orgLoading && <p className="text-sm text-yellow-600">Carregando organização...</p>}
              <Button type="submit" disabled={loading || orgLoading || !currentOrg}>
                {loading ? 'Criando...' : 'Criar Agente'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {agents && agents.length > 0 ? (
        <div className="grid gap-4">
          {agents.map((agent) => {
            const statusColors: Record<string, string> = {
              active: 'bg-green-100 text-green-700',
              inactive: 'bg-gray-100 text-gray-600',
              draft: 'bg-yellow-100 text-yellow-700',
            };
            const statusLabels: Record<string, string> = {
              active: 'Ativo',
              inactive: 'Inativo',
              draft: 'Rascunho',
            };
            const status = agent.status || 'draft';

            return (
              <Card key={agent.id}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-medium text-gray-900">{agent.name}</h3>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${statusColors[status]}`}>
                          {statusLabels[status] || status}
                        </span>
                      </div>
                      {agent.description && <p className="text-sm text-gray-500 mt-1">{agent.description}</p>}
                      <p className="text-xs text-gray-400 mt-1">{agent.provider} / {agent.model}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="secondary" onClick={() => router.push(`/agents/${agent.id}`)}>
                        Editar
                      </Button>
                      <Button size="sm" variant="danger" onClick={async () => {
                        if (!confirm('Tem certeza que deseja excluir este agente?')) return;
                        try {
                          await api(`/agents/${agent.id}`, {
                            method: 'DELETE',
                            token: session!.access_token,
                            orgId: currentOrg!.id,
                          });
                          mutate();
                        } catch {}
                      }}>
                        Excluir
                      </Button>
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
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg">Nenhum agente criado ainda</p>
              <p className="text-sm mt-2">Crie seu primeiro agente para começar a atender no WhatsApp</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
