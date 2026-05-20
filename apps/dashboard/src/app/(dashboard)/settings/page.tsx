'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';

const settingsItems = [
  {
    href: '/settings/profile',
    title: 'Meu Perfil',
    description: 'Edite suas informações pessoais, cargo e preferências.',
    icon: '👤',
  },
  {
    href: '/settings/members',
    title: 'Membros',
    description: 'Gerencie membros da empresa, funções e vinculações a agentes, WhatsApp e pipeline.',
    icon: '👥',
  },
];

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-dark-50">Configurações</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {settingsItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="p-6">
                <div className="text-3xl mb-3">{item.icon}</div>
                <h2 className="text-lg font-semibold text-dark-50 mb-1">{item.title}</h2>
                <p className="text-sm text-dark-400">{item.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
