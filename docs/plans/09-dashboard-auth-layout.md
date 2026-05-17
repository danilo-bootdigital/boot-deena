# Plano 09 — Dashboard: Auth & Layout

## Objetivo
Configurar o dashboard Next.js com autenticação Supabase (login, registro, recuperação de senha), layout base responsivo com sidebar, middleware de proteção de rotas, providers globais, e estrutura de páginas.

## Pré-requisitos
- Plano 01 concluído (monorepo com apps/dashboard)
- Plano 02 concluído (Supabase Auth rodando)
- Plano 03 concluído (tabelas organizations, org_members)

## Estrutura de Arquivos Criados

```
apps/dashboard/
├── next.config.ts
├── tailwind.config.ts
├── postcss.config.js
├── src/
│   ├── app/
│   │   ├── layout.tsx                    (root layout)
│   │   ├── page.tsx                      (redirect → /dashboard)
│   │   ├── (auth)/
│   │   │   ├── layout.tsx                (auth layout - centralizado)
│   │   │   ├── login/page.tsx
│   │   │   ├── register/page.tsx
│   │   │   └── forgot-password/page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx                (dashboard layout - sidebar)
│   │   │   ├── page.tsx                  (overview/home)
│   │   │   ├── inbox/page.tsx
│   │   │   ├── agents/page.tsx
│   │   │   ├── knowledge-bases/page.tsx
│   │   │   ├── flows/page.tsx
│   │   │   ├── whatsapp/page.tsx
│   │   │   └── settings/page.tsx
│   │   └── auth/
│   │       └── callback/route.ts         (OAuth callback)
│   ├── components/
│   │   ├── ui/                           (componentes base)
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── card.tsx
│   │   │   ├── avatar.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   └── sheet.tsx
│   │   ├── layout/
│   │   │   ├── sidebar.tsx
│   │   │   ├── header.tsx
│   │   │   ├── nav-item.tsx
│   │   │   └── org-switcher.tsx
│   │   └── auth/
│   │       ├── login-form.tsx
│   │       ├── register-form.tsx
│   │       └── forgot-password-form.tsx
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts                 (browser client)
│   │   │   ├── server.ts                 (server client)
│   │   │   └── middleware.ts             (session refresh)
│   │   ├── api.ts                        (fetch wrapper para API)
│   │   └── utils.ts
│   ├── hooks/
│   │   ├── use-user.ts
│   │   └── use-organization.ts
│   ├── providers/
│   │   ├── auth-provider.tsx
│   │   └── organization-provider.tsx
│   ├── middleware.ts                     (Next.js middleware)
│   └── styles/
│       └── globals.css
```

## Steps

### 1. Instalar dependências

```bash
cd apps/dashboard
pnpm add @supabase/supabase-js @supabase/ssr tailwindcss postcss autoprefixer
pnpm add lucide-react clsx tailwind-merge class-variance-authority
pnpm add @radix-ui/react-slot @radix-ui/react-dropdown-menu @radix-ui/react-dialog @radix-ui/react-avatar
pnpm add -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### 2. Criar tailwind.config.ts

```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar))',
          foreground: 'hsl(var(--sidebar-foreground))',
          border: 'hsl(var(--sidebar-border))',
          accent: 'hsl(var(--sidebar-accent))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [],
};

export default config;
```

### 3. Criar globals.css

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 240 10% 3.9%;
    --card: 0 0% 100%;
    --card-foreground: 240 10% 3.9%;
    --primary: 240 5.9% 10%;
    --primary-foreground: 0 0% 98%;
    --secondary: 240 4.8% 95.9%;
    --secondary-foreground: 240 5.9% 10%;
    --muted: 240 4.8% 95.9%;
    --muted-foreground: 240 3.8% 46.1%;
    --accent: 240 4.8% 95.9%;
    --accent-foreground: 240 5.9% 10%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 0 0% 98%;
    --border: 240 5.9% 90%;
    --input: 240 5.9% 90%;
    --ring: 240 5.9% 10%;
    --radius: 0.5rem;
    --sidebar: 240 4.8% 97%;
    --sidebar-foreground: 240 5.9% 10%;
    --sidebar-border: 240 5.9% 90%;
    --sidebar-accent: 240 4.8% 92%;
  }

  .dark {
    --background: 240 10% 3.9%;
    --foreground: 0 0% 98%;
    --card: 240 10% 3.9%;
    --card-foreground: 0 0% 98%;
    --primary: 0 0% 98%;
    --primary-foreground: 240 5.9% 10%;
    --secondary: 240 3.7% 15.9%;
    --secondary-foreground: 0 0% 98%;
    --muted: 240 3.7% 15.9%;
    --muted-foreground: 240 5% 64.9%;
    --accent: 240 3.7% 15.9%;
    --accent-foreground: 0 0% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 0 0% 98%;
    --border: 240 3.7% 15.9%;
    --input: 240 3.7% 15.9%;
    --ring: 240 4.9% 83.9%;
    --sidebar: 240 5.9% 6%;
    --sidebar-foreground: 0 0% 98%;
    --sidebar-border: 240 3.7% 15.9%;
    --sidebar-accent: 240 3.7% 12%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

### 4. Criar lib/supabase/client.ts (browser)

```typescript
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

### 5. Criar lib/supabase/server.ts (server components)

```typescript
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Component — ignore
          }
        },
      },
    },
  );
}
```

### 6. Criar lib/supabase/middleware.ts

```typescript
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthPage = request.nextUrl.pathname.startsWith('/login') ||
    request.nextUrl.pathname.startsWith('/register') ||
    request.nextUrl.pathname.startsWith('/forgot-password');

  if (!user && !isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
```

### 7. Criar middleware.ts (root)

```typescript
import { updateSession } from '@/lib/supabase/middleware';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|auth/callback|api).*)',
  ],
};
```

### 8. Criar auth callback route

**src/app/auth/callback/route.ts:**
```typescript
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
```

### 9. Criar providers/auth-provider.tsx

```typescript
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
```

### 10. Criar providers/organization-provider.tsx

```typescript
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from './auth-provider';

interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: string;
  role: string;
}

interface OrgContextType {
  organizations: Organization[];
  currentOrg: Organization | null;
  setCurrentOrg: (org: Organization) => void;
  loading: boolean;
}

const OrgContext = createContext<OrgContextType>({
  organizations: [],
  currentOrg: null,
  setCurrentOrg: () => {},
  loading: true,
});

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (!user) return;

    async function fetchOrgs() {
      const { data } = await supabase
        .from('org_members')
        .select('role, organizations(id, name, slug, plan)')
        .eq('user_id', user!.id);

      if (data) {
        const orgs = data.map((m: any) => ({
          ...m.organizations,
          role: m.role,
        }));
        setOrganizations(orgs);

        const savedOrgId = localStorage.getItem('currentOrgId');
        const saved = orgs.find((o) => o.id === savedOrgId);
        setCurrentOrg(saved || orgs[0] || null);
      }
      setLoading(false);
    }

    fetchOrgs();
  }, [user, supabase]);

  const handleSetCurrentOrg = (org: Organization) => {
    setCurrentOrg(org);
    localStorage.setItem('currentOrgId', org.id);
  };

  return (
    <OrgContext.Provider value={{ organizations, currentOrg, setCurrentOrg: handleSetCurrentOrg, loading }}>
      {children}
    </OrgContext.Provider>
  );
}

export const useOrganization = () => useContext(OrgContext);
```

### 11. Criar layout do dashboard com sidebar

**src/components/layout/sidebar.tsx:**
```typescript
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  MessageSquare,
  Bot,
  BookOpen,
  GitBranch,
  Smartphone,
  Settings,
  LayoutDashboard,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { OrgSwitcher } from './org-switcher';

const navItems = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/inbox', label: 'Inbox', icon: MessageSquare },
  { href: '/agents', label: 'Agentes', icon: Bot },
  { href: '/knowledge-bases', label: 'Knowledge Base', icon: BookOpen },
  { href: '/flows', label: 'Fluxos', icon: GitBranch },
  { href: '/whatsapp', label: 'WhatsApp', icon: Smartphone },
  { href: '/settings', label: 'Configurações', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="flex h-14 items-center border-b border-sidebar-border px-4">
        <h1 className="text-lg font-semibold text-sidebar-foreground">Agente IA</h1>
      </div>

      <div className="px-3 py-3">
        <OrgSwitcher />
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-foreground'
                  : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground',
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
```

### 12. Criar dashboard layout

**src/app/(dashboard)/layout.tsx:**
```typescript
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
```

### 13. Criar login page

**src/app/(auth)/login/page.tsx:**
```typescript
import { LoginForm } from '@/components/auth/login-form';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Entrar</h1>
          <p className="text-sm text-muted-foreground">
            Acesse sua conta para gerenciar seus agentes
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
```

### 14. Criar lib/api.ts (fetch wrapper)

```typescript
import { createClient } from '@/lib/supabase/client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function api<T = any>(
  path: string,
  options: RequestInit & { orgId?: string } = {},
): Promise<T> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  const { orgId, ...fetchOptions } = options;

  const response = await fetch(`${API_URL}/api/v1${path}`, {
    ...fetchOptions,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.access_token}`,
      ...(orgId && { 'x-organization-id': orgId }),
      ...fetchOptions.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `API error: ${response.status}`);
  }

  return response.json();
}
```

### 15. Criar lib/utils.ts

```typescript
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### 16. Criar .env.local para dashboard

```env
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Dependências
- Plano 01 (monorepo)
- Plano 02 (Supabase Auth)
- Plano 03 (tabelas org)

## Critérios de Conclusão
- [ ] `pnpm --filter @agente-ia/dashboard dev` inicia sem erros
- [ ] Página de login renderiza corretamente
- [ ] Registro de novo usuário funciona
- [ ] Login com email/senha funciona
- [ ] Middleware redireciona não-autenticados para /login
- [ ] Middleware redireciona autenticados de /login para /
- [ ] Sidebar renderiza com todos os nav items
- [ ] Org switcher lista organizações do usuário
- [ ] Layout responsivo (sidebar colapsa em mobile)
- [ ] Dark mode funciona via classe CSS
- [ ] API wrapper envia token e org_id corretamente
