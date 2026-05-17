'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function AgentsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Agentes</h1>
        <Button>Novo Agente</Button>
      </div>

      <Card>
        <CardHeader>
          <p className="text-sm text-gray-500">Gerencie seus agentes de IA</p>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg">Nenhum agente criado ainda</p>
            <p className="text-sm mt-2">Crie seu primeiro agente para começar a atender no WhatsApp</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
