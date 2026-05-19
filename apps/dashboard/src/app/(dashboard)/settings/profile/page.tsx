'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { useApiClient } from '@/hooks/use-api-client';

interface Profile {
  id: string;
  full_name: string;
  display_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  job_title: string | null;
  bio: string | null;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const api = useApiClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const data = await api.get<Profile>('/profiles/me');
      setProfile(data);
    } catch {
      setProfile({
        id: user?.id || '',
        full_name: '',
        display_name: null,
        avatar_url: null,
        phone: null,
        job_title: null,
        bio: null,
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;

    setSaving(true);
    setMessage('');
    try {
      const updated = await api.put<Profile>('/profiles/me', {
        full_name: profile.full_name,
        display_name: profile.display_name,
        phone: profile.phone,
        job_title: profile.job_title,
        bio: profile.bio,
      });
      setProfile(updated);
      setMessage('Perfil atualizado com sucesso!');
    } catch {
      setMessage('Erro ao salvar perfil.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="p-6 text-dark-400">Carregando perfil...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-dark-50">Meu Perfil</h1>

      <form onSubmit={handleSave}>
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Informações Pessoais</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-dark-200 mb-1">
                  Nome Completo
                </label>
                <Input
                  value={profile?.full_name || ''}
                  onChange={(e) => setProfile({ ...profile!, full_name: e.target.value })}
                  placeholder="Seu nome completo"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-200 mb-1">
                  Nome de Exibição
                </label>
                <Input
                  value={profile?.display_name || ''}
                  onChange={(e) => setProfile({ ...profile!, display_name: e.target.value || null })}
                  placeholder="Como deseja ser chamado"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-200 mb-1">
                  Telefone
                </label>
                <Input
                  value={profile?.phone || ''}
                  onChange={(e) => setProfile({ ...profile!, phone: e.target.value || null })}
                  placeholder="(11) 99999-9999"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-200 mb-1">
                  Cargo
                </label>
                <Input
                  value={profile?.job_title || ''}
                  onChange={(e) => setProfile({ ...profile!, job_title: e.target.value || null })}
                  placeholder="Ex: Gerente, Atendente"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-200 mb-1">
                Bio
              </label>
              <textarea
                className="w-full rounded-md border border-dark-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                rows={3}
                value={profile?.bio || ''}
                onChange={(e) => setProfile({ ...profile!, bio: e.target.value || null })}
                placeholder="Uma breve descrição sobre você"
              />
            </div>
            <div className="text-sm text-dark-400">
              E-mail: {user?.email}
            </div>

            {message && (
              <p className={`text-sm ${message.includes('sucesso') ? 'text-accent-500' : 'text-red-400'}`}>
                {message}
              </p>
            )}

            <div className="flex justify-end">
              <Button type="submit" disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar Perfil'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
