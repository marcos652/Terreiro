import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { signOut } from 'firebase/auth';
import { useAuth } from '@contexts/AuthContext';
import { auth } from '@services/firebase';
import { useNotifications } from '@contexts/NotificationContext';

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
    label: 'Cantigas',
    href: '/cantigas',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M9 18a3 3 0 1 1-6 0V6l10-2v10" />
        <circle cx="16" cy="17" r="3" />
      </svg>
    ),
  },
  {
    label: 'Youtube Macumba',
    href: '/youtube-macumba',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M10 9l5 3-5 3V9z" />
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
  {
    label: 'Logs',
    href: '/logs',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M7 8h10M7 12h10M7 16h10" />
      </svg>
    ),
  },
];

export default function AppShell({ title, subtitle, actions, children }: AppShellProps) {
  const router = useRouter();
  const { user } = useAuth();
  const canSignOut = Boolean(auth);
  const [darkMode, setDarkMode] = useState(false);
  const { unreadCount, notifications, markAsRead } = useNotifications();
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedTheme = window.localStorage.getItem('theme-mode');
    const shouldUseDark = savedTheme === 'dark';
    setDarkMode(shouldUseDark);
  }, []);

  const handleThemeToggle = () => {
    if (typeof window === 'undefined') return;
    const nextDarkMode = !darkMode;
    setDarkMode(nextDarkMode);
    if (nextDarkMode) {
      document.documentElement.classList.add('theme-dark');
      window.localStorage.setItem('theme-mode', 'dark');
      return;
    }
    document.documentElement.classList.remove('theme-dark');
    window.localStorage.setItem('theme-mode', 'light');
  };

  const handleNotificationClick = () => {
    markAsRead();
    setShowNotifications(false);
  };

  const searchItems = [
    ...navItems.map((item) => ({ label: item.label, href: item.href, type: 'Menu' as const })),
    // Principais cards do dashboard atual
    { label: 'Caixa atual', href: '/#card-caixa', type: 'Card' as const },
    { label: 'Mensalidades', href: '/#card-mensalidades', type: 'Card' as const },
    { label: 'Proxima gira', href: '/#card-proxima-gira', type: 'Card' as const },
    { label: 'Estoque critico', href: '/#card-estoque-critico', type: 'Card' as const },
    { label: 'Tendencia - Balanco do Caixa', href: '/#card-tendencia', type: 'Card' as const },
    { label: 'Atividade recente - Ultimos lancamentos', href: '/#card-atividade', type: 'Card' as const },
    { label: 'Sugestoes proximo toque', href: '/#card-sugestoes', type: 'Card' as const },
    { label: 'Checklist do toque - Tarefas em tempo real', href: '/#card-checklist', type: 'Card' as const },
    { label: 'Agenda viva - Proximos toques', href: '/#card-agenda', type: 'Card' as const },
  ];

  const filteredSearch = searchItems.filter((item) =>
    item.label.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const target = filteredSearch[0];
    if (target) {
      setSearchOpen(false);
      setSearchQuery('');
      router.push(target.href);
    }
  };

  const handleSearchSelect = (href: string) => {
    setSearchOpen(false);
    setSearchQuery('');
    router.push(href);
  };

  const todayLabel = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'short',
  }).format(new Date());

  return (
    <div className="min-h-screen bg-sand-50 text-ink-900 overflow-x-hidden">
      <div className="relative">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.20),_rgba(255,255,255,0))]" />
        <div className="flex min-h-screen">
          <aside className="relative hidden w-72 flex-shrink-0 border-r border-gray-800 bg-black backdrop-blur md:flex md:flex-col lg:w-80">
            <div className="pointer-events-none absolute right-0 top-0 h-full w-px bg-gradient-to-b from-ink-100 via-ink-200 to-transparent opacity-80" />
            <div className="flex items-center gap-3 px-7 py-7">
              <div className="relative h-12 w-12 overflow-hidden rounded-2xl bg-white/10 ring-1 ring-white/20">
                <Image src="/logo-templo.svg" alt="Templo de Umbanda Luz e Fé" fill sizes="48px" className="object-contain" priority />
              </div>
              <div>
                <div className="font-display text-xl font-semibold text-white">Luz e Fé</div>
                <div className="text-[11px] uppercase tracking-[0.24em] text-ink-300">Templo</div>
              </div>
            </div>
            <nav className="flex-1 px-5 pb-6">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 mb-4">Navegação</div>
              <div className="flex flex-col gap-1.5">
                {navItems.map((item) => {
                  const active = router.pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-4 rounded-2xl px-5 py-3.5 text-xl font-semibold transition ${
                        active ? 'bg-white text-black shadow-sm' : 'text-gray-200 hover:bg-gray-800'
                      }`}
                    >
                      <span className="text-ink-400">{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </nav>
            <div className="border-t border-ink-100 px-7 py-5 text-xs text-ink-400">
              <div>Painel interno</div>
              <div className="mt-2 text-sm font-semibold text-ink-200">Desenvolvido Por Marcos Vinicius</div>
            </div>
          </aside>
          <div className="flex-1 min-w-0">
            <header className="flex flex-col gap-4 border-b border-ink-100 bg-white/75 px-4 py-4 backdrop-blur md:flex-row md:items-center md:justify-between md:px-6 2xl:px-12">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setMobileOpen(true)}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl bg-ink-900 text-white md:hidden"
                  aria-label="Abrir menu"
                  aria-expanded={mobileOpen}
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
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
                  <div className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">
                    {todayLabel} • Marília / SP • Templo de Umbanda Luz e Fé
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <div className="relative w-full md:w-auto">
                  <form onSubmit={handleSearchSubmit}>
                    <input
                      className="w-full rounded-2xl border border-ink-100 bg-white px-4 py-2 text-sm text-ink-700 shadow-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100 md:w-64"
                      placeholder="Buscar menus e cards..."
                      value={searchQuery}
                      onFocus={() => setSearchOpen(true)}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setSearchOpen(true);
                      }}
                    />
                  </form>
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-semibold text-ink-500">
                    Ctrl K
                  </span>
                  {searchOpen && searchQuery.trim().length > 0 && (
                    <div className="absolute z-20 mt-1 w-full rounded-2xl border border-ink-100 bg-white p-2 shadow-lg">
                      {filteredSearch.length === 0 && (
                        <div className="px-3 py-2 text-xs text-ink-400">Nada encontrado.</div>
                      )}
                      {filteredSearch.slice(0, 8).map((item) => (
                        <button
                          key={`${item.type}-${item.href}-${item.label}`}
                          onClick={() => handleSearchSelect(item.href)}
                          className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm text-ink-700 hover:bg-ink-50"
                          type="button"
                        >
                          <span>{item.label}</span>
                          <span className="text-[10px] uppercase tracking-[0.2em] text-ink-400">{item.type}</span>
                        </button>
                      ))}
                    </div>
                  )}
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
                <button
                  type="button"
                  onClick={handleThemeToggle}
                  className="group inline-flex w-full items-center justify-between gap-3 rounded-2xl border border-ink-200 bg-white px-3 py-2 text-left shadow-sm transition hover:border-ink-300 sm:w-auto"
                  role="switch"
                  aria-checked={darkMode}
                  aria-label={darkMode ? 'Desativar modo escuro' : 'Ativar modo escuro'}
                  title={darkMode ? 'Desativar modo escuro' : 'Ativar modo escuro'}
                >
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-500">
                    {darkMode ? 'Escuro' : 'Claro'}
                  </span>
                  <span
                    className={`relative h-7 w-12 rounded-full transition ${
                      darkMode ? 'bg-emerald-500' : 'bg-ink-200'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-md transition-transform ${
                        darkMode ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </span>
                </button>
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
            {mobileOpen && (
              <>
                <button
                  className="fixed inset-0 z-40 bg-black/40 md:hidden"
                  aria-label="Fechar menu"
                  onClick={() => setMobileOpen(false)}
                />
                <div className="fixed inset-y-0 left-0 z-50 w-72 bg-black text-white shadow-2xl md:hidden">
                  <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
                    <div className="flex items-center gap-3">
                      <div className="relative h-10 w-10 overflow-hidden rounded-2xl bg-white/10 ring-1 ring-white/20">
                        <Image src="/logo-templo.svg" alt="Templo de Umbanda Luz e Fé" fill sizes="40px" className="object-contain" priority />
                      </div>
                      <div>
                        <div className="font-display text-lg font-semibold text-white">Luz e Fé</div>
                        <div className="text-[10px] uppercase tracking-[0.24em] text-ink-300">Painel</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      aria-label="Fechar menu"
                      onClick={() => setMobileOpen(false)}
                      className="rounded-2xl border border-white/20 p-2 text-white hover:border-white/40"
                    >
                      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M6 6l12 12M18 6l-12 12" />
                      </svg>
                    </button>
                  </div>
                  <nav className="flex flex-col gap-1.5 px-4 py-4 text-base">
                    {navItems.map((item) => {
                      const active = router.pathname === item.href;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMobileOpen(false)}
                          className={`flex items-center gap-4 rounded-2xl px-5 py-3.5 transition ${
                            active ? 'bg-white text-black shadow-sm' : 'text-gray-100 hover:bg-white/10'
                          }`}
                        >
                          <span className="text-ink-300">{item.icon}</span>
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                  </nav>
                </div>
              </>
            )}
            <main className="px-4 py-6 md:px-6 md:py-8 2xl:px-12">
              <div className="mx-auto flex w-full max-w-none flex-col gap-6">{children}</div>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
