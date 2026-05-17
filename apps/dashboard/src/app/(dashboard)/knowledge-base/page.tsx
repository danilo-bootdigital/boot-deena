'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function KnowledgeBasePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Base de Conhecimento</h1>
        <Button>Nova Base</Button>
      </div>

      <Card>
        <CardHeader>
          <p className="text-sm text-gray-500">Gerencie as bases de conhecimento dos seus agentes</p>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg">Nenhuma base de conhecimento criada</p>
            <p className="text-sm mt-2">Crie uma base e faça upload de documentos para seus agentes consultarem</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
