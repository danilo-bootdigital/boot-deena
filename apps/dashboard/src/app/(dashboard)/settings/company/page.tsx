'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useOrganization } from '@/hooks/use-organization';
import { useApiClient } from '@/hooks/use-api-client';

interface OrgData {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export default function CompanySettingsPage() {
  const api = useApiClient();
  const { currentOrg } = useOrganization();
  const [orgData, setOrgData] = useState<OrgData | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (currentOrg?.id) loadOrg();
  }, [currentOrg?.id]);

  async function loadOrg() {
    try {
      const data = await api.get<OrgData>(`/organizations/${currentOrg!.id}`);
      setOrgData(data);
      setName(data.name);
      setSlug(data.slug);
    } catch {
      setMessage('Erro ao carregar dados da empresa.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!currentOrg?.id) return;
    setSaving(true);
    setMessage('');
    try {
      await api.put(`/organizations/${currentOrg.id}`, { name, slug });
      setMessage('Empresa atualizada com sucesso!');
    } catch (err: any) {
      setMessage(err?.message || 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-dark-50">Empresa</h1>
        <p className="text-sm text-dark-400">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-dark-50">Empresa</h1>
        <p className="text-xs text-dark-400 mt-0.5">Configurações gerais da empresa</p>
      </div>

      {message && (
        <p className={`text-xs px-4 py-2 rounded-lg ${message.includes('sucesso') ? 'bg-accent-500/10 text-accent-500' : 'bg-red-500/10 text-red-400'}`}>
          {message}
        </p>
      )}

      <Card>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <Input
              label="Nome da Empresa"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Minha Empresa"
              required
            />
            <Input
              label="Slug (identificador na URL)"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              placeholder="minha-empresa"
              required
            />
            {orgData && (
              <div className="text-xs text-dark-500 space-y-1">
                <p>ID: {orgData.id}</p>
                <p>Criada em: {new Date(orgData.created_at).toLocaleDateString('pt-BR')}</p>
              </div>
            )}
            <Button type="submit" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
