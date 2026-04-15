import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { signOut } from 'firebase/auth';
import { useAuth } from '@contexts/AuthContext';
import { upsertUser } from '@services/userService';
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
    key: 'dashboard',
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
    key: 'caixa',
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
    key: 'doacoes',
    label: 'Doações',
    href: '/doacoes',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 21C12 21 4 13.5 4 8.5C4 5.42 6.42 3 9.5 3c1.74 0 3.41.81 4.5 2.09A6.04 6.04 0 0 1 18.5 3C21.58 3 24 5.42 24 8.5c0 5-8 12.5-8 12.5" />
      </svg>
    ),
  },
  {
    key: 'chat',
    label: 'Chat',
    href: '/chat',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    key: 'mensalidades',
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
    key: 'eventos',
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
    key: 'cantigas',
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
    key: 'galeria',
    label: 'Galeria',
    href: '/galeria',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <path d="M21 15l-5-5L5 21" />
      </svg>
    ),
  },
  {
    key: 'fundamentos',
    label: 'Fundamentos',
    href: '/fundamentos',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        <path d="M8 7h8M8 11h6" />
      </svg>
    ),
  },
  {
    key: 'youtube',
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
    key: 'estoque',
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
    key: 'usuarios',
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
    key: 'perfil',
    label: 'Meu Perfil',
    href: '/perfil',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="8" r="4" />
        <path d="M5 20a7 7 0 0 1 14 0" />
      </svg>
    ),
  },
  {
    key: 'meu-app',
    label: 'Meu App',
    href: '/meu-app',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="5" y="2" width="14" height="20" rx="2" />
        <line x1="12" y1="18" x2="12" y2="18.01" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    key: 'logs',
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
  const { user, loading: authLoading, profile } = useAuth();
  const normalizedRole = (profile?.role || '').trim().toUpperCase();
  const isMaster = normalizedRole === 'MASTER';
  const canSignOut = Boolean(auth);
  const [darkMode, setDarkMode] = useState(false);
  const { unreadCount, notifications, markAsRead } = useNotifications();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);

  // Todas as abas liberadas para todos
  const allowedNavItems = navItems;

  const handleSignOut = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
      router.replace('/login');
    } catch (error) {
      console.error('Erro ao sair:', error);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [authLoading, user, router]);

  // Garante que o usuário MASTER tenha documento com o mesmo uid (necessário para regras do Firestore)
  useEffect(() => {
    if (!user || profile?.role !== 'MASTER') return;
    const ensureMasterDoc = async () => {
      try {
        await upsertUser(user.uid, {
          name: profile?.name || user.displayName || user.email?.split('@')[0] || 'Usuário',
          email: user.email || '',
          role: 'MASTER',
          status: 'APROVADO',
          created_at: profile?.created_at || new Date().toISOString(),
        });
      } catch (err) {
        console.error('Não foi possível garantir doc de usuário MASTER', err);
      }
    };
    ensureMasterDoc();
  }, [user, profile]);


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


  const searchItems = [
    ...allowedNavItems.map((item) => ({ label: item.label, href: item.href, type: 'Menu' as const })),
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

  if (authLoading || (!user && typeof window !== 'undefined')) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-sand-50 text-ink-500">
        Carregando...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sand-50 text-ink-900 overflow-x-hidden">
      <div className="relative">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.20),_rgba(255,255,255,0))]" />
        <div className="flex min-h-screen">
          <aside className="relative hidden w-72 flex-shrink-0 bg-black md:flex md:flex-col lg:w-80 shadow-[4px_0_24px_rgba(0,0,0,0.3)]">

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
                {allowedNavItems.map((item) => {
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
            <div className="px-7 py-5 text-xs text-ink-400">
              <div>Painel interno</div>
              <div className="mt-2 text-sm font-semibold text-ink-200">Desenvolvido Por Marcos Vinicius</div>
            </div>
          </aside>
          <div className="flex-1 min-w-0">
            <header className="bg-white/75 backdrop-blur shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              {/* Top bar */}
              <div className="flex items-center justify-between gap-4 px-4 py-3 md:px-6 2xl:px-12">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setMobileOpen(true)}
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink-900 text-white md:hidden"
                    aria-label="Abrir menu"
                    aria-expanded={mobileOpen}
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </button>
                  {/* Breadcrumb + Title */}
                  <div>
                    <div className="flex items-center gap-1.5 text-[11px] text-ink-400">
                      <span>Painel</span>
                      <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M9 5l7 7-7 7" />
                      </svg>
                      <span className="font-semibold text-ink-600">{title}</span>
                    </div>
                    <h1 className="font-display text-xl font-semibold text-ink-900 md:text-2xl">{title}</h1>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Search */}
                  <div className="relative hidden md:block">
                    <form onSubmit={handleSearchSubmit}>
                      <input
                        className="w-56 rounded-xl border border-ink-100 bg-white px-4 py-2 text-sm text-ink-700 shadow-sm focus:border-ink-400 focus:outline-none focus:ring-2 focus:ring-ink-100 lg:w-64"
                        placeholder="Buscar..."
                        value={searchQuery}
                        onFocus={() => setSearchOpen(true)}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setSearchOpen(true);
                        }}
                      />
                    </form>
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded bg-ink-100 px-1.5 py-0.5 text-[9px] font-semibold text-ink-400">
                      ⌘K
                    </span>
                    {searchOpen && searchQuery.trim().length > 0 && (
                      <div className="absolute z-20 mt-1 w-full rounded-xl border border-ink-100 bg-white p-1.5 shadow-lg">
                        {filteredSearch.length === 0 && (
                          <div className="px-3 py-2 text-xs text-ink-400">Nada encontrado.</div>
                        )}
                        {filteredSearch.slice(0, 8).map((item) => (
                          <button
                            key={`${item.type}-${item.href}-${item.label}`}
                            onClick={() => handleSearchSelect(item.href)}
                            className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-ink-700 hover:bg-ink-50"
                            type="button"
                          >
                            <span>{item.label}</span>
                            <span className="text-[10px] uppercase tracking-[0.2em] text-ink-400">{item.type}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Theme toggle */}
                  <button
                    type="button"
                    onClick={handleThemeToggle}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-ink-100 bg-white text-ink-500 hover:border-ink-200 hover:text-ink-700 transition"
                    title={darkMode ? 'Modo claro' : 'Modo escuro'}
                  >
                    {darkMode ? (
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="5" />
                        <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                      </svg>
                    )}
                  </button>

                  {/* User pill */}
                  <div className="hidden items-center gap-1.5 rounded-xl border border-ink-100 bg-white px-1.5 py-1 md:flex">
                    {(profile?.photoURL || user?.photoURL) ? (
                      <img
                        src={profile?.photoURL || user?.photoURL || ''}
                        alt={profile?.name || ''}
                        className="h-7 w-7 rounded-lg object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 text-[10px] font-bold text-white">
                        {(profile?.name || user?.email || '?').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="max-w-[120px] truncate px-1 text-xs font-medium text-ink-600">
                      {profile?.name || user?.email?.split('@')[0] || ''}
                    </span>
                    <button
                      onClick={handleSignOut}
                      disabled={!canSignOut}
                      className="flex h-7 items-center rounded-lg border border-ink-100 px-2 text-[11px] font-semibold text-ink-500 hover:border-ink-200 hover:text-ink-700 transition disabled:opacity-60"
                    >
                      Sair
                    </button>
                  </div>

                  {/* Mobile sign out */}
                  <button
                    onClick={handleSignOut}
                    disabled={!canSignOut}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-ink-100 bg-white text-ink-500 hover:text-rose-500 transition md:hidden"
                    title="Sair"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Subtitle bar */}
              {(subtitle || actions) && (
                <div className="flex flex-col gap-2 border-t border-ink-100/50 px-4 py-2.5 md:flex-row md:items-center md:justify-between md:px-6 2xl:px-12">
                  <div className="flex items-center gap-3">
                    {subtitle && <p className="text-sm text-ink-500">{subtitle}</p>}
                    <span className="hidden text-[10px] text-ink-300 md:inline">•</span>
                    <span className="hidden text-[11px] text-ink-400 md:inline">{todayLabel} • Marília / SP</span>
                  </div>
                  {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
                </div>
              )}
            </header>
            {mobileOpen && (
              <>
                <button
                  className="fixed inset-0 z-40 bg-black/40 md:hidden"
                  aria-label="Fechar menu"
                  onClick={() => setMobileOpen(false)}
                />
                <div className="fixed inset-y-0 left-0 z-50 w-72 bg-black text-white shadow-2xl md:hidden flex flex-col">
                  <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 flex-shrink-0">
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
                  <nav className="flex-1 overflow-y-auto flex flex-col gap-1.5 px-4 py-4 text-base">
                    {allowedNavItems.map((item) => {
                      const active = router.pathname === item.href;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMobileOpen(false)}
                          className={`flex items-center gap-4 rounded-2xl px-5 py-3.5 transition flex-shrink-0 ${
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
