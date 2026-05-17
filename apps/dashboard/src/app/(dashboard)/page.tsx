'use client';

import { Card, CardContent } from '@/components/ui/card';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">Agentes Ativos</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">0</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">Conversas Hoje</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">0</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">Mensagens Processadas</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">0</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
