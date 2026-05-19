'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useOrganization } from '@/hooks/use-organization';

export function Header() {
  const { user, signOut } = useAuth();
  const { currentOrg } = useOrganization();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <header className="h-14 bg-dark-900/40 backdrop-blur-sm border-b border-dark-700/30 flex items-center justify-between px-6">
      <div className="flex items-center gap-3">
        {currentOrg && (
          <span className="text-xs font-medium text-dark-300 bg-dark-800 px-2.5 py-1 rounded-md border border-dark-700/50">
            {currentOrg.name}
          </span>
        )}
      </div>
      <div className="flex items-center gap-4">
        <span className="text-xs text-dark-400">{user?.email}</span>
        <button
          onClick={handleSignOut}
          className="text-xs text-dark-400 hover:text-dark-200 transition-colors cursor-pointer"
        >
          Sair
        </button>
      </div>
    </header>
  );
}
