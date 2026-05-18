'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { useAuth, useApi } from '@/hooks/use-auth';
import { useOrganization } from '@/hooks/use-organization';
import { api } from '@/lib/api';

interface KnowledgeBase {
  id: string;
  name: string;
  description?: string;
  status: string;
  documents: { count: number }[];
  created_at: string;
}

export default function KnowledgeBasePage() {
  const { session } = useAuth();
  const { currentOrg } = useOrganization();
  const { data: knowledgeBases, mutate } = useApi<KnowledgeBase[]>('/knowledge-bases', currentOrg?.id);
  const [showForm, setShowForm] = useState(false);
  const [selectedKb, setSelectedKb] = useState<string | null>(null);
  const [kbDetails, setKbDetails] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({ name: '', description: '' });
  const [docForm, setDocForm] = useState({ name: '', content: '' });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api('/knowledge-bases', {
        method: 'POST',
        token: session!.access_token,
        orgId: currentOrg!.id,
        body: JSON.stringify(form),
      });
      setShowForm(false);
      setForm({ name: '', description: '' });
      mutate();
      setSuccess('Base criada com sucesso!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Erro ao criar base');
    } finally {
      setLoading(false);
    }
  }

  async function loadKbDetails(id: string) {
    try {
      const data = await api<any>(`/knowledge-bases/${id}`, {
        token: session!.access_token,
        orgId: currentOrg!.id,
      });
      setKbDetails(data);
      setSelectedKb(id);
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleAddDocument(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedKb || !docForm.name || !docForm.content) return;
    setLoading(true);
    setError('');
    try {
      // Create a text blob and upload as data URL for simplicity
      const blob = new Blob([docForm.content], { type: 'text/plain' });
      const dataUrl = await blobToDataUrl(blob);

      await api(`/knowledge-bases/${selectedKb}/documents`, {
        method: 'POST',
        token: session!.access_token,
        orgId: currentOrg!.id,
        body: JSON.stringify({
          name: docForm.name,
          source_url: dataUrl,
          mime_type: 'text/plain',
          size_bytes: blob.size,
        }),
      });
      setDocForm({ name: '', content: '' });
      loadKbDetails(selectedKb);
      setSuccess('Documento adicionado! Processando...');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Erro ao adicionar documento');
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteDoc(docId: string) {
    if (!selectedKb || !confirm('Excluir este documento?')) return;
    try {
      await api(`/knowledge-bases/${selectedKb}/documents/${docId}`, {
        method: 'DELETE',
        token: session!.access_token,
        orgId: currentOrg!.id,
      });
      loadKbDetails(selectedKb);
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleDeleteKb(id: string) {
    if (!confirm('Excluir esta base de conhecimento e todos os documentos?')) return;
    try {
      await api(`/knowledge-bases/${id}`, {
        method: 'DELETE',
        token: session!.access_token,
        orgId: currentOrg!.id,
      });
      if (selectedKb === id) {
        setSelectedKb(null);
        setKbDetails(null);
      }
      mutate();
    } catch (err: any) {
      setError(err.message);
    }
  }

  function blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  }

  // Detail view
  if (selectedKb && kbDetails) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => { setSelectedKb(null); setKbDetails(null); }} className="text-gray-500 hover:text-gray-700">
              ← Voltar
            </button>
            <h1 className="text-2xl font-bold text-gray-900">{kbDetails.name}</h1>
          </div>
          <Button variant="danger" size="sm" onClick={() => handleDeleteKb(kbDetails.id)}>
            Excluir Base
          </Button>
        </div>

        {kbDetails.description && (
          <p className="text-sm text-gray-500">{kbDetails.description}</p>
        )}

        {error && <p className="text-sm text-red-500 bg-red-50 p-3 rounded-lg">{error}</p>}
        {success && <p className="text-sm text-green-600 bg-green-50 p-3 rounded-lg">{success}</p>}

        {/* Add document form */}
        <Card>
          <CardHeader>
            <p className="text-sm font-medium text-gray-700">Adicionar Documento</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddDocument} className="space-y-3">
              <Input
                label="Nome do documento"
                value={docForm.name}
                onChange={(e) => setDocForm({ ...docForm, name: e.target.value })}
                placeholder="Ex: Guia do sistema, FAQ, Tabela de preços"
                required
              />
              <Textarea
                label="Conteúdo"
                value={docForm.content}
                onChange={(e) => setDocForm({ ...docForm, content: e.target.value })}
                rows={8}
                placeholder="Cole aqui o conteúdo do documento..."
                required
              />
              <Button type="submit" disabled={loading}>
                {loading ? 'Adicionando...' : 'Adicionar Documento'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Documents list */}
        <div className="space-y-3">
          <h2 className="text-lg font-medium text-gray-900">Documentos ({kbDetails.documents?.length || 0})</h2>
          {kbDetails.documents && kbDetails.documents.length > 0 ? (
            kbDetails.documents.map((doc: any) => (
              <Card key={doc.id}>
                <CardContent className="py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-800 text-sm">{doc.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {doc.status === 'processed' ? '✅ Processado' : doc.status === 'pending' ? '⏳ Processando...' : `⚠️ ${doc.status}`}
                        {doc.size_bytes && ` • ${Math.round(doc.size_bytes / 1024)} KB`}
                      </p>
                    </div>
                    <Button size="sm" variant="danger" onClick={() => handleDeleteDoc(doc.id)}>
                      Excluir
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <p className="text-sm text-gray-400">Nenhum documento adicionado ainda.</p>
          )}
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Base de Conhecimento</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancelar' : 'Nova Base'}
        </Button>
      </div>

      {error && <p className="text-sm text-red-500 bg-red-50 p-3 rounded-lg">{error}</p>}
      {success && <p className="text-sm text-green-600 bg-green-50 p-3 rounded-lg">{success}</p>}

      {showForm && (
        <Card>
          <CardHeader>
            <p className="text-sm text-gray-500">Criar nova base de conhecimento</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <Input
                label="Nome"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex: FAQ da Clínica, Tabela de Preços"
                required
              />
              <Input
                label="Descrição (opcional)"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Para que serve esta base"
              />
              <Button type="submit" disabled={loading}>
                {loading ? 'Criando...' : 'Criar Base'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {knowledgeBases && knowledgeBases.length > 0 ? (
        <div className="grid gap-4">
          {knowledgeBases.map((kb) => (
            <div key={kb.id} onClick={() => loadKbDetails(kb.id)} className="cursor-pointer">
            <Card className="hover:border-blue-300 transition-colors">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">{kb.name}</h3>
                    {kb.description && <p className="text-sm text-gray-500 mt-0.5">{kb.description}</p>}
                    <p className="text-xs text-gray-400 mt-1">
                      {kb.documents?.[0]?.count || 0} documento(s) • Criada em {new Date(kb.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                      kb.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {kb.status === 'active' ? 'Ativa' : 'Processando'}
                    </span>
                    <Button size="sm" variant="danger" onClick={(e) => { e.stopPropagation(); handleDeleteKb(kb.id); }}>
                      Excluir
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            </div>
          ))}
        </div>
      ) : !showForm && (
        <Card>
          <CardContent>
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg">Nenhuma base de conhecimento criada</p>
              <p className="text-sm mt-2">Crie uma base e adicione documentos para seus agentes consultarem durante o atendimento</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
