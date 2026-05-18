'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { FlowEditor } from '@/components/flow-editor';
import { ChatTest } from '@/components/chat-test/chat-test';
import { AgentTeamTab } from '@/components/agent-team/agent-team-tab';
import { useAuth } from '@/hooks/use-auth';
import { useOrganization } from '@/hooks/use-organization';
import { api } from '@/lib/api';

interface Agent {
  id: string;
  name: string;
  description?: string;
  system_prompt: string;
  provider: string;
  model: string;
  temperature: number;
  max_tokens: number;
  status: string;
  created_at: string;
  updated_at: string;
}

type Tab = 'flow' | 'test' | 'config' | 'prompt' | 'status' | 'team';

export default function AgentEditPage() {
  const params = useParams();
  const router = useRouter();
  const { session } = useAuth();
  const { currentOrg } = useOrganization();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('flow');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [flowNodes, setFlowNodes] = useState<any[]>([]);
  const [flowEdges, setFlowEdges] = useState<any[]>([]);

  const [form, setForm] = useState({
    name: '',
    description: '',
    system_prompt: '',
    provider: 'openai',
    model: 'gpt-4o-mini',
    temperature: 0.7,
    max_tokens: 1024,
    status: 'draft',
  });

  useEffect(() => {
    if (!session?.access_token || !currentOrg?.id || !params.id) return;
    loadAgent();
  }, [session, currentOrg, params.id]);

  async function loadAgent() {
    try {
      const data = await api<Agent & { settings?: any }>(`/agents/${params.id}`, {
        token: session!.access_token,
        orgId: currentOrg!.id,
      });
      setAgent(data);
      setForm({
        name: data.name,
        description: data.description || '',
        system_prompt: data.system_prompt,
        provider: data.provider,
        model: data.model,
        temperature: Number(data.temperature),
        max_tokens: data.max_tokens,
        status: data.status || 'draft',
      });
      // Load flow from settings
      if (data.settings?.flow) {
        setFlowNodes(data.settings.flow.nodes || []);
        setFlowEdges(data.settings.flow.edges || []);
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar agente');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await api(`/agents/${params.id}`, {
        method: 'PUT',
        token: session!.access_token,
        orgId: currentOrg!.id,
        body: JSON.stringify(form),
      });
      setSuccess('Agente salvo com sucesso!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    try {
      await api(`/agents/${params.id}`, {
        method: 'DELETE',
        token: session!.access_token,
        orgId: currentOrg!.id,
      });
      router.push('/agents');
    } catch (err: any) {
      setError(err.message || 'Erro ao excluir');
      setShowDeleteConfirm(false);
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Carregando agente...</div>;
  }

  if (!agent) {
    return <div className="text-center py-12 text-red-500">{error || 'Agente não encontrado'}</div>;
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'flow', label: 'Fluxo' },
    { key: 'test', label: 'Testar' },
    { key: 'config', label: 'Configurações' },
    { key: 'prompt', label: 'Prompt do Sistema' },
    { key: 'team', label: 'Equipe' },
    { key: 'status', label: 'Status' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/agents')} className="text-gray-500 hover:text-gray-700">
            ← Voltar
          </button>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="text-2xl font-bold text-gray-900 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none px-1 py-0.5 transition-colors"
            placeholder="Nome do Agente"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="danger" size="sm" onClick={() => setShowDeleteConfirm(true)}>
            Excluir
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-red-500 bg-red-50 p-3 rounded-lg">{error}</p>}
      {success && <p className="text-sm text-green-600 bg-green-50 p-3 rounded-lg">{success}</p>}

      {showDeleteConfirm && (
        <Card className="border-red-200 bg-red-50">
          <CardContent>
            <p className="text-sm text-red-700 mb-3">Tem certeza que deseja excluir este agente? Esta ação não pode ser desfeita.</p>
            <div className="flex gap-2">
              <Button variant="danger" size="sm" onClick={handleDelete}>Sim, excluir</Button>
              <Button variant="secondary" size="sm" onClick={() => setShowDeleteConfirm(false)}>Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-1 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'flow' && (
        <div>
          <p className="text-sm text-gray-500 mb-3">
            Monte o fluxo de atendimento do agente. Arraste os blocos da barra superior e conecte-os para definir o comportamento.
          </p>
          <FlowEditor
            initialNodes={flowNodes}
            initialEdges={flowEdges}
            onSave={async (nodes, edges) => {
              setSaving(true);
              setError('');
              try {
                // Save flow as agent settings
                await api(`/agents/${params.id}`, {
                  method: 'PUT',
                  token: session!.access_token,
                  orgId: currentOrg!.id,
                  body: JSON.stringify({
                    settings: { flow: { nodes, edges } },
                  }),
                });
                setSuccess('Fluxo salvo com sucesso!');
                setTimeout(() => setSuccess(''), 3000);
              } catch (err: any) {
                setError(err.message || 'Erro ao salvar fluxo');
              } finally {
                setSaving(false);
              }
            }}
            saving={saving}
          />
        </div>
      )}

      {activeTab === 'test' && (
        <div>
          <p className="text-sm text-gray-500 mb-3">
            Simule uma conversa com o agente para testar o comportamento. O histórico não é salvo.
          </p>
          <ChatTest
            agentId={params.id as string}
            token={session!.access_token}
            orgId={currentOrg!.id}
          />
        </div>
      )}

      {activeTab === 'config' && (
        <Card>
          <CardContent>
            <div className="space-y-4 py-2">
              <Input
                label="Nome do Agente"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
              <Input
                label="Descrição"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Breve descrição do agente"
              />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Provedor</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.provider}
                    onChange={(e) => setForm({ ...form, provider: e.target.value })}
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Temperatura ({form.temperature})
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={form.temperature}
                    onChange={(e) => setForm({ ...form, temperature: parseFloat(e.target.value) })}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-400">0 = preciso, 2 = criativo</p>
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Max Tokens</label>
                  <input
                    type="number"
                    min="100"
                    max="8192"
                    value={form.max_tokens}
                    onChange={(e) => setForm({ ...form, max_tokens: parseInt(e.target.value) || 1024 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-400">Tamanho máximo da resposta</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'prompt' && (
        <Card>
          <CardContent>
            <div className="space-y-3 py-2">
              <p className="text-sm text-gray-500">
                O prompt do sistema define o comportamento e o fluxo de atendimento do agente. 
                Aqui você configura todas as etapas, regras e instruções.
              </p>
              <Textarea
                label="Prompt do Sistema"
                value={form.system_prompt}
                onChange={(e) => setForm({ ...form, system_prompt: e.target.value })}
                rows={20}
                placeholder="Instruções completas para o agente..."
                required
              />
              <p className="text-xs text-gray-400">
                {form.system_prompt.length} caracteres
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'team' && (
        <AgentTeamTab agentId={params.id as string} />
      )}

      {activeTab === 'status' && (
        <Card>
          <CardContent>
            <div className="space-y-4 py-2">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Status do Agente</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  <option value="active">Ativo</option>
                  <option value="inactive">Inativo</option>
                  <option value="draft">Rascunho</option>
                </select>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-600 space-y-2">
                <p><strong>Ativo:</strong> O agente responde mensagens automaticamente.</p>
                <p><strong>Inativo:</strong> O agente está pausado e não responde.</p>
                <p><strong>Rascunho:</strong> O agente está em configuração e não está disponível.</p>
              </div>
              <div className="text-xs text-gray-400 space-y-1">
                <p>Criado em: {agent.created_at ? new Date(agent.created_at).toLocaleString('pt-BR') : '-'}</p>
                <p>Atualizado em: {agent.updated_at ? new Date(agent.updated_at).toLocaleString('pt-BR') : '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
