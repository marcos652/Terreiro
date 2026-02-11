import React, { useEffect, useMemo, useState } from 'react';
import AppShell from '@components/AppShell';
import { useAuth } from '@contexts/AuthContext';
import { getUsers, updateUser, User } from '@services/userService';

export default function UsuariosPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('Todos');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const { profile } = useAuth();
  const isMaster = profile?.role === 'MASTER';

  useEffect(() => {
    let active = true;
    getUsers()
      .then((data) => {
        if (!active) return;
        setUsers(data);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch = `${user.name} ${user.email} ${user.role}`.toLowerCase().includes(search.toLowerCase());
      const matchesRole = role === 'Todos' || role === roleLabel(user.role);
      return matchesSearch && matchesRole;
    });
  }, [users, search, role]);

  const roles = useMemo(() => {
    const unique = new Set(users.map((user) => user.role).filter(Boolean));
    return Array.from(unique);
  }, [users]);

  const roleLabel = (value?: User['role']) => {
    if (value === 'MASTER') return 'Master';
    if (value === 'MEMBER') return 'VisualizaÃ§Ã£o';
    return value || 'â€”';
  };

  const handleRoleChange = async (user: User, nextRole: User['role']) => {
    if (!user.id) return;
    setUpdatingId(user.id);
    try {
      await updateUser(user.id, { role: nextRole });
      setUsers((prev) => prev.map((item) => (item.id === user.id ? { ...item, role: nextRole } : item)));
    } finally {
      setUpdatingId(null);
    }
  };

  const handleApprove = async (user: User) => {
    if (!user.id) return;
    setUpdatingId(user.id);
    try {
      await updateUser(user.id, { status: 'APROVADO' });
      setUsers((prev) => prev.map((item) => (item.id === user.id ? { ...item, status: 'APROVADO' } : item)));
    } finally {
      setUpdatingId(null);
    }
  };

  const formatYear = (value?: string) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return String(date.getFullYear());
  };

  return (
    <AppShell
      title="Usuários"
      subtitle="Gestão de acesso, equipes e permissões."
    >
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_2fr]">
        <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-floating">
          <div className="text-xs uppercase tracking-[0.2em] text-ink-300">Filtros rápidos</div>
          <div className="mt-4 flex flex-col gap-3">
            <input
              className="rounded-xl border border-ink-100 bg-white px-3 py-2 text-sm text-ink-700 focus:border-ink-400 focus:outline-none focus:ring-2 focus:ring-ink-100"
              placeholder="Buscar por nome ou equipe"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <select
              className="rounded-xl border border-ink-100 bg-white px-3 py-2 text-sm text-ink-700 focus:border-ink-400 focus:outline-none focus:ring-2 focus:ring-ink-100"
              value={role}
              onChange={(event) => setRole(event.target.value)}
            >
              <option>Todos</option>
              <option>Master</option>
              <option>Visualização</option>
            </select>
            <div className="rounded-xl border border-ink-100 bg-ink-50 p-3 text-xs text-ink-500">
              Mantenha o cadastro atualizado para garantir mensagens e avisos.
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-floating">
          <div className="text-xs uppercase tracking-[0.2em] text-ink-300">Equipe</div>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            {filtered.map((user) => (
              <div key={user.id} className="rounded-2xl border border-ink-100 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-ink-900">{user.name}</div>
                    <div className="text-xs text-ink-400">{user.email}</div>
                  </div>
                </div>
                <div className="mt-3 text-xs text-ink-400">No terreiro desde {formatYear(user.created_at)}</div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <div className="text-xs font-semibold text-ink-400">NÃ­vel</div>
                  <select
                    className="rounded-lg border border-ink-200 px-3 py-1 text-xs font-semibold text-ink-700 hover:border-ink-300"
                    value={user.role}
                    disabled={!isMaster || updatingId === user.id}
                    onChange={(event) => handleRoleChange(user, event.target.value as User['role'])}
                  >
                    <option value="MEMBER">VisualizaÃ§Ã£o</option>
                    <option value="MASTER">Master</option>
                  </select>
                  <span className="rounded-full bg-ink-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-500">
                    {roleLabel(user.role)}
                  </span>
                  {user.status !== 'APROVADO' && (
                    <button
                      onClick={() => handleApprove(user)}
                      disabled={!isMaster || updatingId === user.id}
                      className="rounded-lg border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-700 hover:border-emerald-300 disabled:opacity-60"
                    >
                      Aprovar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          {filtered.length === 0 && (
            <div className="py-8 text-center text-sm text-ink-400">Nenhum usuário encontrado.</div>
          )}
          {loading && (
            <div className="py-8 text-center text-sm text-ink-400">Carregando usuários...</div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
