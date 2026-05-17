'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function ConversationsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Conversas</h1>

      <Card>
        <CardHeader>
          <p className="text-sm text-gray-500">Acompanhe as conversas dos seus agentes em tempo real</p>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg">Nenhuma conversa ativa</p>
            <p className="text-sm mt-2">As conversas aparecerão aqui quando seus agentes começarem a atender</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
