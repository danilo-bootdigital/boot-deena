'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/', label: 'Dashboard', icon: DashboardIcon },
  { href: '/agents', label: 'Agentes', icon: AgentsIcon },
  { href: '/whatsapp', label: 'WhatsApp', icon: WhatsappIcon },
  { href: '/conversations', label: 'Conversas', icon: ConversationsIcon },
  { href: '/knowledge-base', label: 'Conhecimento', icon: KnowledgeIcon },
  { href: '/settings', label: 'Configurações', icon: SettingsIcon },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-[240px] bg-dark-900/80 backdrop-blur-xl border-r border-dark-700/40 min-h-screen flex flex-col">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-dark-700/40">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center">
            <span className="text-white text-xs font-bold">LP</span>
          </div>
          <span className="text-sm font-semibold text-dark-50 tracking-tight">LeadPilot</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4">
        <ul className="space-y-0.5">
          {navItems.map((item) => {
            const isActive = item.href === '/'
              ? pathname === '/'
              : pathname?.startsWith(item.href);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-dark-700/60 text-dark-50'
                      : 'text-dark-300 hover:text-dark-100 hover:bg-dark-800/60'
                  }`}
                >
                  <Icon active={isActive || false} />
                  <span>{item.label}</span>
                  {isActive && (
                    <div className="ml-auto w-1 h-1 rounded-full bg-brand-500" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-dark-700/40">
        <div className="flex items-center gap-2 px-2">
          <div className="w-1.5 h-1.5 rounded-full bg-accent-500 animate-pulse" />
          <span className="text-[11px] text-dark-400">Sistema operacional</span>
        </div>
      </div>
    </aside>
  );
}

// Minimal outline icons
function DashboardIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={active ? 'text-brand-500' : 'text-current'}>
      <rect x="1.5" y="1.5" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="9.5" y="1.5" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="1.5" y="9.5" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="9.5" y="9.5" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function AgentsIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={active ? 'text-brand-500' : 'text-current'}>
      <circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2.5 14c0-3 2.5-4.5 5.5-4.5s5.5 1.5 5.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function ConversationsIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={active ? 'text-brand-500' : 'text-current'}>
      <path d="M2 3.5A1.5 1.5 0 013.5 2h9A1.5 1.5 0 0114 3.5v7a1.5 1.5 0 01-1.5 1.5H5l-3 2v-2A1.5 1.5 0 012 10.5v-7z" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function KnowledgeIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={active ? 'text-brand-500' : 'text-current'}>
      <path d="M2.5 2.5h4l1.5 1.5h5.5v9h-11v-10.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function SettingsIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={active ? 'text-brand-500' : 'text-current'}>
      <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.1 3.1l1.4 1.4M11.5 11.5l1.4 1.4M3.1 12.9l1.4-1.4M11.5 4.5l1.4-1.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function WhatsappIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={active ? 'text-brand-500' : 'text-current'}>
      <path d="M8 1.5A6.5 6.5 0 001.5 8c0 1.14.29 2.21.81 3.15L1.5 14.5l3.35-.81A6.5 6.5 0 108 1.5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5.5 6.5c.2-.5.5-.8.8-.8.2 0 .3.1.4.1l.5 1.2c.1.1 0 .3-.1.4l-.3.3c-.1.1-.1.2 0 .4.3.5.7.9 1.2 1.2.1.1.3.1.4 0l.3-.3c.1-.1.3-.1.4-.1l1.2.5c.1.1.2.2.1.4 0 .3-.3.6-.8.8-.7.2-1.5 0-2.3-.5-.8-.6-1.5-1.3-1.8-2.2-.3-.8-.3-1.5-.1-2.2z" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}
