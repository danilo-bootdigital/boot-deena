'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useApiClient } from '@/hooks/use-api-client';
import { usePermissions } from '@/hooks/use-permissions';

interface Organization {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  members_count?: number;
  agents_count?: number;
}

export default function AdminPage() {
  const api = useApiClient();
  const { hasRole } = usePermissions();
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadOrgs();
  }, []);

  async function loadOrgs() {
    try {
      const data = await api.get<Organization[]>('/admin/organizations');
      setOrgs(data);
    } catch {
      setOrgs([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!formName || !formSlug) return;
    setSaving(true);
    setMessage('');
    try {
      await api.post('/admin/organizations', { name: formName, slug: formSlug });
      setMessage('Empresa criada!');
      setShowCreate(false);
      setFormName('');
      setFormSlug('');
      loadOrgs();
    } catch (err: any) {
      setMessage(err?.message || 'Erro ao criar empresa.');
    } finally {
      setSaving(false);
    }
  }

  function generateSlug(name: string) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  if (!hasRole('master_admin')) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-xl font-semibold text-dark-100">Acesso Restrito</h1>
        <p className="text-sm text-dark-400 mt-2">Esta área é exclusiva para administradores master do SaaS.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-dark-50 tracking-tight">Painel Master</h1>
        <p className="text-sm text-dark-400">Carregando empresas...</p>
      </div>
    );
  }

  const filteredOrgs = orgs.filter((o) =>
    !search || o.name.toLowerCase().includes(search.toLowerCase()) || o.slug.includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-dark-50 tracking-tight">Painel Master</h1>
          <p className="text-xs text-dark-400 mt-0.5">{orgs.length} empresas cadastradas</p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)} variant={showCreate ? 'ghost' : 'primary'}>
          {showCreate ? 'Cancelar' : 'Nova Empresa'}
        </Button>
      </div>

      {message && (
        <p className={`text-xs px-4 py-2 rounded-lg ${message.includes('criada') ? 'bg-accent-500/10 text-accent-500' : 'bg-red-500/10 text-red-400'}`}>
          {message}
        </p>
      )}

      {showCreate && (
        <Card>
          <CardContent>
            <h2 className="text-sm font-medium text-dark-100 mb-3">Cadastrar Nova Empresa</h2>
            <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                label="Nome da Empresa"
                value={formName}
                onChange={(e) => { setFormName(e.target.value); setFormSlug(generateSlug(e.target.value)); }}
                placeholder="Boot Digital"
                required
              />
              <Input
                label="Slug (URL)"
                value={formSlug}
                onChange={(e) => setFormSlug(e.target.value)}
                placeholder="boot-digital"
                required
              />
              <div className="col-span-full">
                <Button type="submit" disabled={saving}>{saving ? 'Criando...' : 'Criar Empresa'}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="max-w-xs">
        <Input placeholder="Buscar empresa..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {filteredOrgs.length === 0 ? (
        <Card>
          <CardContent>
            <div className="text-center py-12">
              <p className="text-sm text-dark-300">Nenhuma empresa encontrada</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrgs.map((org) => (
            <Card key={org.id} className="hover:border-dark-600 transition-colors">
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <h3 className="text-sm font-semibold text-dark-50">{org.name}</h3>
                    <p className="text-[10px] text-dark-500 font-mono">{org.slug}</p>
                  </div>
                  <div className="flex gap-4 text-[10px] text-dark-400">
                    <span>ID: {org.id.slice(0, 8)}...</span>
                    <span>Criada: {new Date(org.created_at).toLocaleDateString('pt-BR')}</span>
                  </div>
                  {(org.members_count !== undefined || org.agents_count !== undefined) && (
                    <div className="flex gap-3">
                      {org.members_count !== undefined && (
                        <span className="px-2 py-0.5 text-[10px] rounded bg-dark-800 text-dark-300">{org.members_count} membros</span>
                      )}
                      {org.agents_count !== undefined && (
                        <span className="px-2 py-0.5 text-[10px] rounded bg-dark-800 text-dark-300">{org.agents_count} agentes</span>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
