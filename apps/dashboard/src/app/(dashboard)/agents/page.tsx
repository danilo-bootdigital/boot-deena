'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { api } from '@/lib/api';
import { createClient } from '@/lib/supabase';

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
  const [agents, setAgents] = useState<Agent[]>([]);
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

  const supabase = createClient();

  async function getAuthHeaders() {
    const { data: { session } } = await supabase.auth.getSession();
    return { token: session?.access_token, orgId: session?.user?.user_metadata?.org_id };
  }

  async function loadAgents() {
    try {
      const { token, orgId } = await getAuthHeaders();
      if (!token) return;
      const data = await api<Agent[]>('/agents', { token, orgId });
      setAgents(data);
    } catch (err: any) {
      console.error('Failed to load agents:', err);
    }
  }

  useEffect(() => { loadAgents(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { token, orgId } = await getAuthHeaders();
      if (!token) throw new Error('Não autenticado');
      await api('/agents', {
        method: 'POST',
        token,
        orgId,
        body: JSON.stringify(form),
      });
      setShowForm(false);
      setForm({ name: '', description: '', system_prompt: 'Você é um assistente útil e amigável.', provider: 'openai', model: 'gpt-4o-mini', temperature: 0.7, max_tokens: 1024 });
      await loadAgents();
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
              <Button type="submit" disabled={loading}>
                {loading ? 'Criando...' : 'Criar Agente'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {agents.length > 0 ? (
        <div className="grid gap-4">
          {agents.map((agent) => (
            <Card key={agent.id}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">{agent.name}</h3>
                    {agent.description && <p className="text-sm text-gray-500">{agent.description}</p>}
                    <p className="text-xs text-gray-400 mt-1">{agent.provider} / {agent.model}</p>
                  </div>
                  <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">Ativo</span>
                </div>
              </CardContent>
            </Card>
          ))}
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
