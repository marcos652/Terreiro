import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { signOut } from 'firebase/auth';
import { useAuth } from '@contexts/AuthContext';
import { auth } from '@services/firebase';

type AppShellProps = {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
};

const navItems = [
  {
    label: 'Dashboard',
    href: '/',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M3 12l9-9 9 9" />
        <path d="M5 10v10h5v-6h4v6h5V10" />
      </svg>
    ),
  },
  {
    label: 'Caixa',
    href: '/financeiro/caixa',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 7h16v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7z" />
        <path d="M4 7l2-3h12l2 3" />
        <path d="M9 12h6" />
      </svg>
    ),
  },
  {
    label: 'Mensalidades',
    href: '/financeiro/mensalidades',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 6h16v12H4z" />
        <path d="M8 10h8M8 14h5" />
      </svg>
    ),
  },
  {
    label: 'Eventos',
    href: '/eventos',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M7 3v3M17 3v3M4 8h16v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8z" />
        <path d="M8 12h4M8 16h8" />
      </svg>
    ),
  },
  {
    label: 'Estoque',
    href: '/estoque',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 8l8-4 8 4-8 4-8-4z" />
        <path d="M4 12l8 4 8-4" />
        <path d="M4 16l8 4 8-4" />
      </svg>
    ),
  },
  {
    label: 'Usuários',
    href: '/usuarios',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0z" />
        <path d="M4 20a8 8 0 0 1 16 0" />
      </svg>
    ),
  },
];

export default function AppShell({ title, subtitle, actions, children }: AppShellProps) {
  const router = useRouter();
  const { user } = useAuth();
  const canSignOut = Boolean(auth);

  return (
    <div className="min-h-screen bg-sand-50 text-ink-900">
      <div className="relative">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.20),_rgba(255,255,255,0))]" />
        <div className="flex min-h-screen">
          <aside className="hidden w-72 flex-shrink-0 border-r border-gray-800 bg-black backdrop-blur md:flex md:flex-col lg:w-80">
            <div className="px-7 py-7">
              <div className="text-sm uppercase tracking-[0.2em] text-gray-400">Terreiro</div>
              <div className="font-display text-2xl font-semibold text-white">Admin</div>
            </div>
            <nav className="flex-1 px-5 pb-6">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 mb-4">Navegação</div>
              <div className="flex flex-col gap-1">
                {navItems.map((item) => {
                  const active = router.pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-lg font-medium transition ${
                        active ? 'bg-white text-black shadow-sm' : 'text-gray-300 hover:bg-gray-800'
                      }`}
                    >
                      <span className="text-ink-400">{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </nav>
            <div className="border-t border-ink-100 px-7 py-5 text-xs text-ink-400">Painel interno</div>
          </aside>
          <div className="flex-1">
            <header className="flex flex-col gap-4 border-b border-ink-100 bg-white/75 px-4 py-4 backdrop-blur md:flex-row md:items-center md:justify-between md:px-6 2xl:px-12">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-ink-900 text-white md:hidden">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-ink-400 md:hidden">Terreiro Admin</div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="font-display text-2xl font-semibold text-ink-900">{title}</h1>
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-700">
                      Painel
                    </span>
                  </div>
                  <div className="mt-1 h-1 w-16 rounded-full bg-gradient-to-r from-amber-400 via-amber-200 to-transparent" />
                  {subtitle && <p className="mt-2 text-sm text-ink-500">{subtitle}</p>}
                </div>
              </div>
              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <div className="relative w-full md:w-auto">
                  <input
                    className="w-full rounded-2xl border border-ink-100 bg-white px-4 py-2 text-sm text-ink-700 shadow-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100 md:w-64"
                    placeholder="Buscar rapidamente..."
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-semibold text-ink-500">
                    Ctrl K
                  </span>
                </div>
                <div className="flex items-center gap-2 text-ink-400">
                  <button className="hidden h-10 w-10 items-center justify-center rounded-2xl border border-ink-100 bg-white hover:border-ink-200 md:flex">
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </button>
                  <button className="hidden h-10 w-10 items-center justify-center rounded-2xl border border-ink-100 bg-white hover:border-ink-200 md:flex">
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M15 17h5l-1.4-1.4a2 2 0 0 1-.6-1.4V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
                      <path d="M9 17a3 3 0 0 0 6 0" />
                    </svg>
                  </button>
                </div>
                {actions}
                <div className="flex items-center gap-2">
                  {user?.email && (
                    <span className="hidden rounded-full border border-ink-100 bg-white px-3 py-2 text-xs font-semibold text-ink-500 md:inline-flex">
                      {user.email}
                    </span>
                  )}
                  <button
                    onClick={() => {
                      if (!auth) {
                        return;
                      }
                      signOut(auth);
                    }}
                    disabled={!canSignOut}
                    className={`w-full rounded-xl border border-ink-200 bg-white px-4 py-2 text-sm font-semibold text-ink-700 hover:border-ink-300 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto`}
                  >
                    Sair
                  </button>
                </div>
              </div>
            </header>
            <div className="border-b border-ink-100 bg-white/70 px-4 py-3 backdrop-blur md:hidden">
              <nav className="flex items-center gap-2 overflow-x-auto pb-2 text-xs font-semibold uppercase tracking-[0.2em] text-ink-400">
                {navItems.map((item) => {
                  const active = router.pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-2 whitespace-nowrap rounded-full px-3 py-1 transition ${
                        active ? 'bg-ink-900 text-white' : 'bg-ink-100 text-ink-600'
                      }`}
                    >
                      {item.icon}
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
            <main className="px-4 py-6 md:px-6 md:py-8 2xl:px-12">
              <div className="mx-auto flex w-full max-w-none flex-col gap-6">{children}</div>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
