'use client';

import { useAuth } from '@/hooks/use-auth';

export function Header() {
  const { user, signOut } = useAuth();

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <div />
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600">{user?.email}</span>
        <button
          onClick={signOut}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Sair
        </button>
      </div>
    </header>
  );
}
