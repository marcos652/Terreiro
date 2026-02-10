import React, { useMemo, useState } from 'react';
import AppShell from '@components/AppShell';

type UserItem = {
  id: string;
  name: string;
  role: string;
  status: 'ativo' | 'pendente';
  since: string;
};

const initialUsers: UserItem[] = [];

export default function UsuariosPage() {
  const [users, setUsers] = useState<UserItem[]>(initialUsers);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('Todos');

  const filtered = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch = `${user.name} ${user.role}`.toLowerCase().includes(search.toLowerCase());
      const matchesRole = role === 'Todos' || user.role === role;
      return matchesSearch && matchesRole;
    });
  }, [users, search, role]);

  const handleInvite = () => {
    const currentYear = String(new Date().getFullYear());
    setUsers((prev) => [
      {
        id: `u-${Date.now()}`,
        name: 'Novo integrante',
        role: 'Equipe',
        status: 'pendente',
        since: currentYear,
      },
      ...prev,
    ]);
  };

  return (
    <AppShell
      title="Usuários"
      subtitle="Gestão de acesso, equipes e permissões."
      actions={
        <button
          onClick={handleInvite}
          className="w-full rounded-xl bg-ink-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-ink-700 sm:w-auto"
        >
          Convidar usuário
        </button>
      }
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
              <option>Financeiro</option>
              <option>Liturgia</option>
              <option>Acolhimento</option>
              <option>Comunicação</option>
              <option>Equipe</option>
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
                    <div className="text-xs text-ink-400">{user.role}</div>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      user.status === 'ativo' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {user.status === 'ativo' ? 'Ativo' : 'Pendente'}
                  </span>
                </div>
                <div className="mt-3 text-xs text-ink-400">No terreiro desde {user.since}</div>
                <div className="mt-3 flex gap-2">
                  <button className="rounded-lg border border-ink-200 px-3 py-1 text-xs font-semibold text-ink-600 hover:border-ink-300">
                    Editar
                  </button>
                  <button className="rounded-lg border border-ink-200 px-3 py-1 text-xs font-semibold text-ink-600 hover:border-ink-300">
                    Mensagem
                  </button>
                </div>
              </div>
            ))}
          </div>
          {filtered.length === 0 && (
            <div className="py-8 text-center text-sm text-ink-400">Nenhum usuário encontrado.</div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
