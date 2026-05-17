'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Organização</h2>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">Configurações da organização serão exibidas aqui.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">WhatsApp</h2>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">Gerencie suas instâncias do WhatsApp.</p>
        </CardContent>
      </Card>
    </div>
  );
}
