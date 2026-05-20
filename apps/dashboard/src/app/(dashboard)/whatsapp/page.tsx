'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useApiClient } from '@/hooks/use-api-client';
import { useOrganization } from '@/hooks/use-organization';

interface WhatsappInstance {
  id: string;
  instance_name: string;
  phone_number: string | null;
  status: 'connected' | 'disconnected' | 'connecting' | 'qr_pending';
  created_at: string;
  agents?: { id: string; name: string } | null;
}

interface Agent {
  id: string;
  name: string;
  status: string;
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  connected: { label: 'Conectado', color: 'bg-accent-500/10 text-accent-500' },
  disconnected: { label: 'Desconectado', color: 'bg-red-500/10 text-red-400' },
  connecting: { label: 'Conectando...', color: 'bg-yellow-500/10 text-yellow-400' },
  qr_pending: { label: 'Aguardando QR', color: 'bg-brand-500/10 text-brand-400' },
};

export default function WhatsappPage() {
  const api = useApiClient();
  const { currentOrg } = useOrganization();
  const [instances, setInstances] = useState<WhatsappInstance[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAgentId, setNewAgentId] = useState('');
  const [creating, setCreating] = useState(false);
  const [qrData, setQrData] = useState<{ name: string; base64?: string; code?: string } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (currentOrg?.id) loadData();
  }, [currentOrg?.id]);

  async function loadData() {
    try {
      const [inst, ag] = await Promise.all([
        api.get<WhatsappInstance[]>('/whatsapp/instances').catch(() => []),
        api.get<Agent[]>('/agents').catch(() => []),
      ]);
      setInstances(inst);
      setAgents(ag);
    } catch (err) {
      console.error('Erro ao carregar dados WhatsApp:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName) return;
    setCreating(true);
    setError('');
    try {
      await api.post('/whatsapp/instances', {
        name: newName,
        agentId: newAgentId || undefined,
      });
      setShowCreate(false);
      setNewName('');
      setNewAgentId('');
      loadData();
    } catch (err: any) {
      setError(err?.message || 'Erro ao criar instância');
    } finally {
      setCreating(false);
    }
  }

  async function handleGetQr(instanceName: string) {
    try {
      const data = await api.get<any>(`/whatsapp/instances/${instanceName}/qr`);
      setQrData({ name: instanceName, base64: data?.base64, code: data?.code || data?.pairingCode });
    } catch {
      setError('Erro ao gerar QR Code');
    }
  }

  async function handleRefreshStatus(instanceName: string) {
    try {
      await api.get(`/whatsapp/instances/${instanceName}/status`);
      loadData();
    } catch {}
  }

  async function handleLinkAgent(instanceId: string, agentId: string | null) {
    try {
      await api.put(`/whatsapp/instances/${instanceId}/agent`, { agentId });
      loadData();
    } catch {}
  }

  async function handleDelete(instanceName: string) {
    if (!confirm(`Excluir instância "${instanceName}"? Isso desconectará o WhatsApp.`)) return;
    try {
      await api.delete(`/whatsapp/instances/${instanceName}`);
      loadData();
    } catch {}
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-dark-50 tracking-tight">WhatsApp</h1>
        <p className="text-sm text-dark-400">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-dark-50 tracking-tight">WhatsApp</h1>
          <p className="text-xs text-dark-400 mt-1">Gerencie as conexões de WhatsApp dos seus agentes</p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)} variant={showCreate ? 'ghost' : 'primary'}>
          {showCreate ? 'Cancelar' : 'Nova Conexão'}
        </Button>
      </div>

      {error && <p className="text-xs text-red-400 bg-red-500/5 border border-red-500/20 rounded-lg px-4 py-2">{error}</p>}

      {/* Create form */}
      {showCreate && (
        <Card>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <Input
                label="Nome da Instância"
                placeholder="clinica-foreze-principal"
                value={newName}
                onChange={(e) => setNewName(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
                required
              />
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-dark-200 uppercase tracking-wide">Vincular ao Agente</label>
                <select
                  className="w-full px-3.5 py-2.5 bg-dark-900 border border-dark-600 rounded-lg text-sm text-dark-50 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                  value={newAgentId}
                  onChange={(e) => setNewAgentId(e.target.value)}
                >
                  <option value="">Selecionar depois...</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
              <p className="text-[11px] text-dark-500">
                Após criar, escaneie o QR Code com o WhatsApp do número que deseja conectar.
              </p>
              <Button type="submit" disabled={creating}>
                {creating ? 'Criando...' : 'Criar Instância'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* QR Code Modal */}
      {qrData && (
        <Card className="border-brand-500/30">
          <CardContent>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-sm font-medium text-dark-50">QR Code — {qrData.name}</h3>
                <p className="text-xs text-dark-400 mt-1">Escaneie com o WhatsApp para conectar</p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setQrData(null)}>Fechar</Button>
            </div>
            <div className="flex flex-col items-center gap-4">
              {qrData.base64 ? (
                <img
                  src={qrData.base64.startsWith('data:') ? qrData.base64 : `data:image/png;base64,${qrData.base64}`}
                  alt="QR Code"
                  className="w-64 h-64 rounded-lg border border-dark-700/50"
                />
              ) : qrData.code ? (
                <div className="p-6 bg-dark-900 rounded-lg border border-dark-700/50 text-center">
                  <p className="text-xs text-dark-400 mb-2">Código de pareamento:</p>
                  <p className="text-2xl font-mono font-bold text-dark-50 tracking-widest">{qrData.code}</p>
                </div>
              ) : (
                <p className="text-sm text-dark-400">QR Code não disponível. Tente novamente.</p>
              )}
              <Button size="sm" variant="secondary" onClick={() => handleGetQr(qrData.name)}>
                Atualizar QR
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instances list */}
      {instances.length === 0 && !showCreate ? (
        <Card>
          <CardContent>
            <div className="text-center py-16">
              <p className="text-sm text-dark-300">Nenhuma conexão WhatsApp</p>
              <p className="text-xs text-dark-500 mt-2">Crie uma instância para conectar um número ao seu agente</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {instances.map((inst) => {
            const statusInfo = (STATUS_MAP[inst.status] || STATUS_MAP.disconnected)!;
            return (
              <Card key={inst.id}>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${inst.status === 'connected' ? 'bg-accent-500' : 'bg-dark-500'}`} />
                        <h3 className="text-sm font-medium text-dark-50">{inst.instance_name}</h3>
                        <span className={`px-2 py-0.5 text-[10px] rounded-md font-medium ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-1.5 ml-5">
                        {inst.phone_number && (
                          <span className="text-xs text-dark-300 font-mono">+{inst.phone_number}</span>
                        )}
                        <span className="text-xs text-dark-500">
                          Agente: {inst.agents?.name || <span className="text-yellow-400">não vinculado</span>}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {inst.status !== 'connected' && (
                        <Button size="sm" variant="primary" onClick={() => handleGetQr(inst.instance_name)}>
                          QR Code
                        </Button>
                      )}
                      <Button size="sm" variant="secondary" onClick={() => handleRefreshStatus(inst.instance_name)}>
                        Atualizar
                      </Button>
                      <select
                        className="px-2 py-1.5 bg-dark-900 border border-dark-600 rounded-md text-xs text-dark-100 focus:outline-none"
                        value={inst.agents?.id || ''}
                        onChange={(e) => handleLinkAgent(inst.id, e.target.value || null)}
                      >
                        <option value="">Sem agente</option>
                        {agents.map((a) => (
                          <option key={a.id} value={a.id}>{a.name}</option>
                        ))}
                      </select>
                      <Button size="sm" variant="danger" onClick={() => handleDelete(inst.instance_name)}>
                        Excluir
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
