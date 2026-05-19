'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useApiClient } from '@/hooks/use-api-client';

interface Lead {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  segment: string | null;
  stage: string;
  temperature: string;
  interest: string | null;
  pain_points: string | null;
  notes: string | null;
  source: string;
  created_at: string;
  updated_at: string;
  agents?: { id: string; name: string } | null;
}

const STAGES = [
  { key: 'new', label: 'Novo', color: 'border-t-brand-500' },
  { key: 'qualified', label: 'Qualificado', color: 'border-t-accent-500' },
  { key: 'meeting_scheduled', label: 'Reunião', color: 'border-t-purple-500' },
  { key: 'proposal_sent', label: 'Proposta', color: 'border-t-yellow-500' },
  { key: 'negotiation', label: 'Negociação', color: 'border-t-orange-500' },
  { key: 'won', label: 'Ganho', color: 'border-t-green-500' },
  { key: 'lost', label: 'Perdido', color: 'border-t-red-500' },
];

const TEMP_COLORS: Record<string, string> = {
  cold: 'bg-blue-500/10 text-blue-400',
  warm: 'bg-yellow-500/10 text-yellow-400',
  hot: 'bg-red-500/10 text-red-400',
};

const TEMP_LABELS: Record<string, string> = {
  cold: 'Frio',
  warm: 'Morno',
  hot: 'Quente',
};

export default function PipelinePage() {
  const api = useApiClient();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [form, setForm] = useState({ name: '', phone: '', company: '', email: '', segment: '', interest: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadLeads();
  }, []);

  async function loadLeads() {
    try {
      const data = await api.get<Lead[]>('/leads');
      setLeads(data);
    } catch {
      setLeads([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/leads', { ...form, stage: 'new', temperature: 'cold' });
      setShowCreate(false);
      setForm({ name: '', phone: '', company: '', email: '', segment: '', interest: '' });
      loadLeads();
    } catch {} finally {
      setSaving(false);
    }
  }

  async function moveLead(leadId: string, newStage: string) {
    try {
      await api.patch(`/leads/${leadId}/move`, { stage: newStage });
      setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, stage: newStage } : l));
    } catch {}
  }

  async function deleteLead(leadId: string) {
    if (!confirm('Excluir este lead?')) return;
    try {
      await api.delete(`/leads/${leadId}`);
      setLeads((prev) => prev.filter((l) => l.id !== leadId));
      setSelectedLead(null);
    } catch {}
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-dark-50 tracking-tight">Pipeline</h1>
        <p className="text-sm text-dark-400">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold text-dark-50 tracking-tight">Pipeline</h1>
          <p className="text-xs text-dark-400 mt-0.5">{leads.length} leads no funil</p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)} variant={showCreate ? 'ghost' : 'primary'}>
          {showCreate ? 'Cancelar' : 'Novo Lead'}
        </Button>
      </div>

      {/* Create form */}
      {showCreate && (
        <Card className="mb-4">
          <CardContent>
            <form onSubmit={handleCreate} className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Input label="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="João Silva" />
              <Input label="Telefone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+55 11 99999-0000" />
              <Input label="Empresa" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Empresa XYZ" />
              <Input label="E-mail" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@empresa.com" />
              <Input label="Segmento" value={form.segment} onChange={(e) => setForm({ ...form, segment: e.target.value })} placeholder="Saúde, Tech..." />
              <Input label="Interesse" value={form.interest} onChange={(e) => setForm({ ...form, interest: e.target.value })} placeholder="Website, Tráfego..." />
              <div className="col-span-full">
                <Button type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Criar Lead'}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Kanban */}
      <div className="flex-1 overflow-x-auto">
        <div className="flex gap-3 min-w-max h-full">
          {STAGES.map((stage) => {
            const stageLeads = leads.filter((l) => l.stage === stage.key);
            return (
              <div key={stage.key} className="w-64 flex flex-col">
                {/* Column header */}
                <div className={`px-3 py-2 rounded-t-lg bg-dark-800/60 border-t-2 ${stage.color} border-x border-dark-700/40`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-dark-200">{stage.label}</span>
                    <span className="text-[10px] text-dark-500 bg-dark-700 px-1.5 py-0.5 rounded">{stageLeads.length}</span>
                  </div>
                </div>

                {/* Cards */}
                <div className="flex-1 overflow-y-auto space-y-2 p-2 bg-dark-900/30 border-x border-b border-dark-700/40 rounded-b-lg">
                  {stageLeads.map((lead) => (
                    <div
                      key={lead.id}
                      onClick={() => setSelectedLead(lead)}
                      className="p-3 bg-dark-800/70 border border-dark-700/40 rounded-lg cursor-pointer hover:border-dark-600 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-dark-100 truncate">{lead.name || lead.phone || 'Sem nome'}</span>
                        <span className={`px-1.5 py-0.5 text-[9px] rounded font-medium ${TEMP_COLORS[lead.temperature] || TEMP_COLORS.cold}`}>
                          {TEMP_LABELS[lead.temperature] || 'Frio'}
                        </span>
                      </div>
                      {lead.company && <p className="text-[11px] text-dark-400 truncate">{lead.company}</p>}
                      {lead.interest && <p className="text-[10px] text-dark-500 truncate mt-1">{lead.interest}</p>}
                      <p className="text-[9px] text-dark-600 mt-1.5">{formatDate(lead.created_at)}</p>
                    </div>
                  ))}
                  {stageLeads.length === 0 && (
                    <p className="text-[10px] text-dark-600 text-center py-4">Vazio</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Lead detail panel */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-dark-950/80 backdrop-blur-sm" onClick={() => setSelectedLead(null)}>
          <div className="bg-dark-800 border border-dark-700/50 rounded-xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-dark-50">{selectedLead.name || 'Lead sem nome'}</h3>
              <button onClick={() => setSelectedLead(null)} className="text-dark-400 hover:text-dark-200 cursor-pointer">✕</button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              {selectedLead.phone && <div><p className="text-[10px] text-dark-500 uppercase">Telefone</p><p className="text-dark-100">{selectedLead.phone}</p></div>}
              {selectedLead.email && <div><p className="text-[10px] text-dark-500 uppercase">E-mail</p><p className="text-dark-100">{selectedLead.email}</p></div>}
              {selectedLead.company && <div><p className="text-[10px] text-dark-500 uppercase">Empresa</p><p className="text-dark-100">{selectedLead.company}</p></div>}
              {selectedLead.segment && <div><p className="text-[10px] text-dark-500 uppercase">Segmento</p><p className="text-dark-100">{selectedLead.segment}</p></div>}
              {selectedLead.interest && <div className="col-span-2"><p className="text-[10px] text-dark-500 uppercase">Interesse</p><p className="text-dark-100">{selectedLead.interest}</p></div>}
              {selectedLead.pain_points && <div className="col-span-2"><p className="text-[10px] text-dark-500 uppercase">Dores</p><p className="text-dark-100">{selectedLead.pain_points}</p></div>}
              {selectedLead.notes && <div className="col-span-2"><p className="text-[10px] text-dark-500 uppercase">Notas</p><p className="text-dark-100">{selectedLead.notes}</p></div>}
            </div>

            <div>
              <p className="text-[10px] text-dark-500 uppercase mb-2">Mover para</p>
              <div className="flex flex-wrap gap-1.5">
                {STAGES.filter((s) => s.key !== selectedLead.stage).map((s) => (
                  <button
                    key={s.key}
                    onClick={() => { moveLead(selectedLead.id, s.key); setSelectedLead({ ...selectedLead, stage: s.key }); }}
                    className="px-2 py-1 text-[10px] bg-dark-700 text-dark-200 rounded hover:bg-dark-600 transition-colors cursor-pointer"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-between pt-2 border-t border-dark-700/50">
              <span className="text-[10px] text-dark-500">Criado em {formatDate(selectedLead.created_at)}</span>
              <Button size="sm" variant="danger" onClick={() => deleteLead(selectedLead.id)}>Excluir</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
