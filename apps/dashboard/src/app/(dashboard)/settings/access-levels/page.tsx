'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useApiClient } from '@/hooks/use-api-client';

interface AccessLevel {
  id: string;
  role: string;
  permissions: Record<string, Record<string, boolean>>;
  description: string | null;
}

const ROLE_LABELS: Record<string, string> = {
  owner: 'Administrador (Proprietário)',
  admin: 'Administrador',
  manager: 'Gerente de Conta',
  operator: 'Operador/Atendente',
};

const SECTION_LABELS: Record<string, string> = {
  agents: 'Agentes',
  conversations: 'Conversas',
  knowledge_base: 'Base de Conhecimento',
  members: 'Membros',
  settings: 'Configurações',
  billing: 'Faturamento',
};

const PERMISSION_LABELS: Record<string, string> = {
  create: 'Criar',
  edit: 'Editar',
  delete: 'Excluir',
  view: 'Visualizar',
  intervene: 'Intervir',
  export: 'Exportar',
  invite: 'Convidar',
  remove: 'Remover',
  change_role: 'Alterar Nível',
  manage: 'Gerenciar',
};

export default function AccessLevelsPage() {
  const api = useApiClient();
  const [levels, setLevels] = useState<AccessLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<string>('manager');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadLevels();
  }, []);

  async function loadLevels() {
    try {
      const data = await api.get<AccessLevel[]>('/access-levels');
      setLevels(data);
    } catch {
      setLevels([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSeedDefaults() {
    setSaving(true);
    try {
      await api.post('/access-levels/seed-defaults');
      await loadLevels();
      setMessage('Permissões padrão aplicadas!');
    } catch {
      setMessage('Erro ao aplicar permissões padrão.');
    } finally {
      setSaving(false);
    }
  }

  function togglePermission(role: string, section: string, perm: string) {
    setLevels((prev) =>
      prev.map((level) => {
        if (level.role !== role) return level;
        const updated = { ...level };
        updated.permissions = { ...updated.permissions };
        updated.permissions[section] = { ...updated.permissions[section] };
        updated.permissions[section][perm] = !updated.permissions[section][perm];
        return updated;
      }),
    );
  }

  async function handleSave(role: string) {
    const level = levels.find((l) => l.role === role);
    if (!level) return;

    setSaving(true);
    setMessage('');
    try {
      await api.put(`/access-levels/${role}`, {
        permissions: level.permissions,
        description: level.description,
      });
      setMessage(`Permissões de "${ROLE_LABELS[role]}" salvas!`);
    } catch {
      setMessage('Erro ao salvar permissões.');
    } finally {
      setSaving(false);
    }
  }

  const currentLevel = levels.find((l) => l.role === selectedRole);

  if (loading) {
    return <div className="p-6 text-gray-500">Carregando níveis de acesso...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Níveis de Acesso</h1>
        {levels.length === 0 && (
          <Button onClick={handleSeedDefaults} disabled={saving}>
            Aplicar Permissões Padrão
          </Button>
        )}
      </div>

      {levels.length > 0 && (
        <>
          <div className="flex gap-2 flex-wrap">
            {['admin', 'manager', 'operator'].map((role) => (
              <button
                key={role}
                onClick={() => setSelectedRole(role)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedRole === role
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {ROLE_LABELS[role]}
              </button>
            ))}
          </div>

          {currentLevel && (
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold">
                  Permissões: {ROLE_LABELS[selectedRole]}
                </h2>
                {selectedRole === 'manager' && (
                  <p className="text-sm text-gray-500 mt-1">
                    O Gerente de Conta só visualiza agentes vinculados a ele, independente das permissões abaixo.
                  </p>
                )}
                {selectedRole === 'operator' && (
                  <p className="text-sm text-gray-500 mt-1">
                    O Operador só acessa agentes autorizados. Não pode editar agentes ou acessar configurações.
                  </p>
                )}
              </CardHeader>
              <CardContent className="space-y-6">
                {Object.entries(SECTION_LABELS).map(([section, label]) => {
                  const perms = currentLevel.permissions[section] || {};
                  return (
                    <div key={section}>
                      <h3 className="text-sm font-semibold text-gray-700 mb-2">{label}</h3>
                      <div className="flex flex-wrap gap-3">
                        {Object.entries(perms).map(([perm, enabled]) => (
                          <label
                            key={perm}
                            className="flex items-center gap-2 text-sm cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={!!enabled}
                              onChange={() => togglePermission(selectedRole, section, perm)}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              disabled={selectedRole === 'owner'}
                            />
                            <span className="text-gray-600">
                              {PERMISSION_LABELS[perm] || perm}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {message && (
                  <p className={`text-sm ${message.includes('salvas') || message.includes('aplicadas') ? 'text-green-600' : 'text-red-600'}`}>
                    {message}
                  </p>
                )}

                <div className="flex justify-end">
                  <Button onClick={() => handleSave(selectedRole)} disabled={saving}>
                    {saving ? 'Salvando...' : 'Salvar Permissões'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {levels.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-gray-500">
              Nenhum nível de acesso configurado. Clique em "Aplicar Permissões Padrão" para começar.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
