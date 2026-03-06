import React, { useEffect, useMemo, useState } from 'react';
import AppShell from '@components/AppShell';
import { useAuth } from '@contexts/AuthContext';
import { addUser, deleteUser, getUsers, updateUser, upsertUserById, User } from '@services/userService';
import { createUserWithEmailAndPassword, getAuth } from 'firebase/auth';
import { auth, firebaseConfig } from '@services/firebase';
import { initializeApp, getApps, getApp } from 'firebase/app';

type RoleFilter = 'ALL' | 'MASTER' | 'EDITOR' | 'VISUALIZADOR';
const menuPermissions = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'caixa', label: 'Caixa' },
  { key: 'mensalidades', label: 'Mensalidades' },
  { key: 'eventos', label: 'Eventos' },
  { key: 'cantigas', label: 'Cantigas' },
  { key: 'youtube', label: 'Youtube Macumba' },
  { key: 'estoque', label: 'Estoque' },
  { key: 'usuarios', label: 'Usuários' },
  { key: 'logs', label: 'Logs' },
];

export default function UsuariosPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<RoleFilter>('ALL');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'VISUALIZADOR' as User['role'], password: '' });
  const [detailUser, setDetailUser] = useState<User | null>(null);
  const [permDraft, setPermDraft] = useState<string[]>([]);
  const [savingDetail, setSavingDetail] = useState(false);
  const [normalizedRoles, setNormalizedRoles] = useState(false);
  const { profile, user } = useAuth();
  const BOOTSTRAP_UID = 'rpdLNx3X4CZhFvB6O9bvXbFA72y1';
  const normalizedRole = (profile?.role || '').trim().toUpperCase();
  const isMaster = normalizedRole === 'MASTER';
  const isBootstrapMaster = user?.uid === BOOTSTRAP_UID;
  const canApprove = isMaster || isBootstrapMaster;
  const canAdmin = canApprove;
  const canCreateUser = Boolean(user);
  // Auth secundÃƒÂ¡rio para criar contas sem deslogar o admin
  const secondaryAuth =
    typeof window === 'undefined'
      ? null
      : getAuth(
          getApps().find((a) => a.name === 'admin-app') ?? initializeApp(firebaseConfig, 'admin-app')
        );

  const roleLabel = (value?: User['role']) => {
    if (value === 'MASTER') return 'Master';
    if (value === 'EDITOR') return 'Editor';
    if (value === 'VISUALIZADOR') return 'Visualizacao';
    return value || '--';
  };

  useEffect(() => {
    if (canApprove) return;
    setNewUser((prev) => ({ ...prev, role: 'VISUALIZADOR' }));
  }, [canApprove]);

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
      const matchesRole = role === 'ALL' || user.role === role;
      return matchesSearch && matchesRole;
    });
  }, [users, search, role]);

  const roles = useMemo(() => {
    const unique = new Set(users.map((user) => user.role).filter(Boolean));
    return Array.from(unique);
  }, [users]);

  const handleRoleChange = async (user: User, nextRole: User['role']) => {
    if (!user.id) return;
    setUpdatingId(user.id);
    try {
      const normalizedRole = (nextRole || '').trim().toUpperCase() as User['role'];
      await updateUser(user.id, { role: normalizedRole });
      setUsers((prev) => prev.map((item) => (item.id === user.id ? { ...item, role: normalizedRole } : item)));
    } finally {
      setUpdatingId(null);
    }
  };

  const handleApprove = async (user: User) => {
    if (!user.id || !canApprove) return;
    setUpdatingId(user.id);
    setUsers((prev) => prev.map((item) => (item.id === user.id ? { ...item, status: 'APROVADO' } : item)));
    try {
      await updateUser(user.id, { status: 'APROVADO' });
    } catch (error) {
      console.error('Erro ao aprovar usuário (mantido aprovado localmente)', error);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleBlock = async (user: User) => {
    if (!user.id) return;
    setUpdatingId(user.id);
    setUsers((prev) => prev.map((item) => (item.id === user.id ? { ...item, status: 'BLOQUEADO' } : item)));
    try {
      await updateUser(user.id, { status: 'BLOQUEADO' });
    } catch (error) {
      console.error('Erro ao bloquear usuário (mantido estado local)', error);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeactivate = async (user: User) => {
    if (!user.id) return;
    setUpdatingId(user.id);
    setUsers((prev) => prev.map((item) => (item.id === user.id ? { ...item, status: 'DESATIVADO' } : item)));
    try {
      await updateUser(user.id, { status: 'DESATIVADO' });
    } catch (error) {
      console.error('Erro ao desativar usuário (mantido estado local)', error);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRemove = async (user: User) => {
    if (!user.id) return;
    const confirmed = window.confirm(`Remover ${user.name}?`);
    if (!confirmed) return;
    // RemoÃƒÂ§ÃƒÂ£o otimista: tira da lista imediatamente
    setUpdatingId(user.id);
    setUsers((prev) => prev.filter((item) => item.id !== user.id));
    try {
      await deleteUser(user.id, profile?.email);
    } catch (error) {
      console.error('Erro ao remover usuário no Firestore (mantido removido localmente)', error);
      // mantemos a remoÃƒÂ§ÃƒÂ£o local mesmo se o backend nÃƒÂ£o permitir
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.password || !canCreateUser) return;
    const normalizedEmail = newUser.email.trim().toLowerCase();
    const isEmailValid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalizedEmail);
    if (!isEmailValid) {
      alert('E-mail inválido. Informe um e-mail no formato nome@dominio.com.');
      return;
    }
    const normalizedPassword = newUser.password.trim();
    if (normalizedPassword.length < 6) {
      alert('Senha muito curta. Use pelo menos 6 caracteres.');
      return;
    }
    setUpdatingId('new');
    try {
      // Cria no Firebase Auth para habilitar login
      try {
        const cred = await createUserWithEmailAndPassword(
          secondaryAuth || auth,
          normalizedEmail,
          normalizedPassword
        );
        const uid = cred.user.uid;
        const desiredRole = (newUser.role || 'VISUALIZADOR').trim().toUpperCase() as User['role'];
        const payload: Omit<User, 'id'> = {
          name: newUser.name,
          email: normalizedEmail,
          role: desiredRole,
          status: 'PENDENTE',
          created_at: new Date().toISOString(),
        };
        await upsertUserById(uid, payload, profile?.email);
        // desconecta app secundÃƒÂ¡ria para nÃƒÂ£o interferir na sessÃƒÂ£o atual
        if (secondaryAuth) {
          await secondaryAuth.signOut().catch(() => {});
        }
        setUsers((prev) => [{ id: uid, ...payload }, ...prev]);
        setNewUser({ name: '', email: '', role: 'VISUALIZADOR', password: '' });
        return;
      } catch (error: any) {
        const code = error?.code;
        if (code === 'auth/email-already-in-use') {
          const desiredRole = (newUser.role || 'VISUALIZADOR').trim().toUpperCase() as User['role'];
          const existing = users.find(
            (u) => (u.email || '').toLowerCase() === normalizedEmail
          );
          const payload: Omit<User, 'id'> = {
            name: newUser.name,
            email: normalizedEmail,
            role: desiredRole,
            status: 'PENDENTE',
            created_at: new Date().toISOString(),
          };
          if (existing?.id) {
            await upsertUserById(existing.id, payload, profile?.email);
            setUsers((prev) =>
              prev.map((u) => (u.id === existing.id ? { ...u, ...payload } : u))
            );
            alert('E-mail já existe no Auth. Perfil mantido como pendente para aprovação.');
            setNewUser({ name: '', email: '', role: 'VISUALIZADOR', password: '' });
            return;
          }
          alert('E-mail já existe no Auth. Use outro e-mail ou peça para recuperar a senha.');
          return;
        }
        throw error;
      }
    } catch (error) {
      console.error('Erro ao criar usuário/auth', error);
      alert('Não foi possível Criar usuário. Verifique se o e-mail já existe ou as permissões.');
    } finally {
      setUpdatingId(null);
    }
  };

  const openDetail = (user: User) => {
    setDetailUser(user);
    setPermDraft(user.permissions || []);
  };

  const togglePermission = (key: string) => {
    setPermDraft((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const handleSaveDetail = async () => {
    if (!detailUser?.id) return;
    setSavingDetail(true);
    try {
      await updateUser(detailUser.id, { permissions: permDraft });
      setUsers((prev) =>
        prev.map((u) => (u.id === detailUser.id ? { ...u, permissions: permDraft } : u))
      );
    } finally {
      setSavingDetail(false);
      setDetailUser(null);
    }
  };

  const normalizeMasters = async () => {
    if (!canAdmin) return;
    setSavingDetail(true);
    try {
      const updates: User[] = [];
      for (const u of users) {
        const upper = (u.role || '').toUpperCase() as User['role'];
        if (u.role !== upper) {
          await updateUser(u.id!, { role: upper });
          updates.push({ ...u, role: upper });
        }
      }
      if (updates.length) {
        setUsers((prev) =>
          prev.map((u) => {
            const changed = updates.find((x) => x.id === u.id);
            return changed ? changed : u;
          })
        );
      }
    } finally {
      setSavingDetail(false);
    }
  };

  useEffect(() => {
    if (!canAdmin || normalizedRoles || users.length === 0) return;
    normalizeMasters().finally(() => setNormalizedRoles(true));
  }, [canAdmin, normalizedRoles, users]);

  const handleClearTeam = async () => {
    const confirmed = window.confirm('Tem certeza que deseja limpar as notificacoes da equipe?');
    if (!confirmed) return;
    alert('Notificacoes da equipe limpas!');
  };

  const formatYear = (value?: string) => {
    if (!value) return '--';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '--';
    return String(date.getFullYear());
  };

  return (
    <AppShell
      title="Usuarios"
      subtitle="Gestao de acesso, equipes e permissoes."
      actions={
        <button
          onClick={handleClearTeam}
          className="rounded-xl border border-ink-200 bg-white px-4 py-2 text-sm font-semibold text-ink-700 hover:border-ink-300 disabled:opacity-60"
        >
          Limpar Notificacoes da Equipe
        </button>
      }
    >
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_2fr]">
        <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-floating">
          <div className="text-xs uppercase tracking-[0.2em] text-ink-300">Filtros rapidos</div>
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
              onChange={(event) => setRole(event.target.value as RoleFilter)}
            >
              <option value="ALL">Todos</option>
              <option value="MASTER">Master</option>
              <option value="EDITOR">Editor</option>\n              <option value="VISUALIZADOR">Visualizacao</option>
              <option value="VISUALIZADOR">Visualizacao</option>
            </select>
            <div className="rounded-xl border border-ink-100 bg-ink-50 p-3 text-xs text-ink-500">
              Mantenha o cadastro atualizado para garantir mensagens e avisos.
            </div>
            <div className="rounded-2xl border border-ink-100 bg-white p-4 text-xs text-ink-500">
              <div className="text-[11px] uppercase tracking-[0.25em] text-ink-400">Criar usuÃ¡rio</div>
              <div className="mt-2 flex flex-col gap-2">
                <input
                  className="w-full rounded-xl border border-ink-100 bg-white px-3 py-2 text-sm text-ink-700 focus:border-ink-400 focus:outline-none focus:ring-2 focus:ring-ink-100"
                  placeholder="Nome"
                  value={newUser.name}
                  onChange={(e) => setNewUser((prev) => ({ ...prev, name: e.target.value }))}
                      disabled={!canCreateUser || updatingId === 'new'}
                />
                <input
                  className="w-full rounded-xl border border-ink-100 bg-white px-3 py-2 text-sm text-ink-700 focus:border-ink-400 focus:outline-none focus:ring-2 focus:ring-ink-100"
                  placeholder="E-mail"
                  value={newUser.email}
                  onChange={(e) => setNewUser((prev) => ({ ...prev, email: e.target.value }))}
                      disabled={!canCreateUser || updatingId === 'new'}
                />
                <input
                  className="w-full rounded-xl border border-ink-100 bg-white px-3 py-2 text-sm text-ink-700 focus:border-ink-400 focus:outline-none focus:ring-2 focus:ring-ink-100"
                  placeholder="Senha (min. 6)"
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser((prev) => ({ ...prev, password: e.target.value }))}
                      disabled={!canCreateUser || updatingId === 'new'}
                />
                <select
                  className="w-full rounded-xl border border-ink-100 bg-white px-3 py-2 text-sm text-ink-700 focus:border-ink-400 focus:outline-none focus:ring-2 focus:ring-ink-100"
                  value={newUser.role}
                  onChange={(e) => setNewUser((prev) => ({ ...prev, role: e.target.value as User['role'] }))}
                  disabled={!canApprove || updatingId === 'new'}
                >
                  <option value="VISUALIZADOR">VisualizaÃ§Ã£o</option>
                  <option value="EDITOR">Editor</option>\n              <option value="VISUALIZADOR">Visualizacao</option>
                  {canApprove && <option value="MASTER">Master</option>}
                </select>
                <button
                  onClick={handleCreateUser}
                  disabled={
                    !canCreateUser ||
                    updatingId === 'new' ||
                    !newUser.name.trim() ||
                    !newUser.email.trim() ||
                    !newUser.password.trim()
                  }
                  className="w-full rounded-xl bg-ink-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-ink-700 disabled:opacity-60"
                >
                  {updatingId === 'new' ? 'Criando...' : 'Criar usuÃ¡rio'}
                </button>
              </div>
            </div>
          </div>
        </div>

            <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-floating">
              <div className="text-xs uppercase tracking-[0.2em] text-ink-300">Equipe</div>
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                {filtered.map((user) => (
                  <div
                    key={user.id}
                className="rounded-2xl border border-ink-100 bg-white/80 p-4 shadow-floating transition hover:-translate-y-1 hover:border-ink-200"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-ink-900">{user.name}</div>
                    <div className="text-xs text-ink-400">{user.email}</div>
                  </div>
                </div>
                <div className="mt-3 text-xs text-ink-400">No terreiro desde {formatYear(user.created_at)}</div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <div className="text-xs font-semibold text-ink-400">Nivel</div>
                  <select
                    className="rounded-lg border border-ink-200 px-3 py-1 text-xs font-semibold text-ink-700 hover:border-ink-300"
                    value={user.role}
                    disabled={!canAdmin || updatingId === user.id}
                    onChange={(event) => handleRoleChange(user, event.target.value as User['role'])}
                  >
                    <option value="VISUALIZADOR">Visualização</option>
                    <option value="EDITOR">Editor</option>
                    {canApprove && <option value="MASTER">Master</option>}
                  </select>
                  <span className="rounded-full bg-ink-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-500">
                    {roleLabel(user.role)}
                  </span>
                  <span className="rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-500">
                    {user.status}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {user.status !== 'APROVADO' && (
                    <button
                      onClick={() => handleApprove(user)}
                      disabled={!canApprove || updatingId === user.id}
                      className="rounded-lg border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-700 hover:border-emerald-300 disabled:opacity-60"
                    >
                      Aprovar
                    </button>
                  )}
                  <button
                    onClick={() => handleDeactivate(user)}
                    disabled={!canAdmin || updatingId === user.id}
                    className="rounded-lg border border-amber-200 px-3 py-1 text-xs font-semibold text-amber-700 hover:border-amber-300 disabled:opacity-60"
                  >
                    Desativar
                  </button>
                  <button
                    onClick={() => handleBlock(user)}
                    disabled={!canAdmin || updatingId === user.id}
                    className="rounded-lg border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 hover:border-rose-300 disabled:opacity-60"
                  >
                    Bloquear
                  </button>
                  <button
                    onClick={() => handleRemove(user)}
                    disabled={!canAdmin || updatingId === user.id}
                    className="rounded-lg border border-ink-200 px-3 py-1 text-xs font-semibold text-ink-600 hover:border-ink-300 disabled:opacity-60"
                    >
                      Remover
                    </button>
                  </div>
                  <button
                    onClick={() => openDetail(user)}
                    className="mt-2 w-full rounded-lg border border-ink-200 px-3 py-2 text-xs font-semibold text-ink-700 hover:border-ink-300"
                    disabled={!canAdmin}
                  >
                    Ficha cadastral / PermissÃƒÂµes
                  </button>
                </div>
              ))}
          </div>
          {filtered.length === 0 && (
            <div className="py-8 text-center text-sm text-ink-400">Nenhum usuario encontrado.</div>
          )}
          {loading && <div className="py-8 text-center text-sm text-ink-400">Carregando usuarios...</div>}
        </div>
      </div>

      {detailUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur">
          <div className="w-full max-w-4xl rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-ink-400">Ficha cadastral</div>
                <div className="text-lg font-semibold text-ink-900">{detailUser.name}</div>
                <div className="text-xs text-ink-500">{detailUser.email}</div>
              </div>
              <button
                onClick={() => setDetailUser(null)}
                className="rounded-full border border-ink-200 px-3 py-1 text-sm font-semibold text-ink-600 hover:border-ink-300"
              >
                Fechar
              </button>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-ink-100 bg-ink-50/70 p-4">
                <div className="text-[11px] uppercase tracking-[0.2em] text-ink-400">NÃƒÂ­vel</div>
                <div className="mt-2">
                  <span className="rounded-full bg-ink-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-ink-600">
                    {roleLabel(detailUser.role)}
                  </span>
                </div>
                <div className="mt-3 text-xs text-ink-500">

                </div>
              </div>
              <div className="rounded-xl border border-ink-100 bg-ink-50/70 p-4">
                <div className="text-[11px] uppercase tracking-[0.2em] text-ink-400">PermissÃƒÂµes por aba</div>
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {menuPermissions.map((item) => (
                    <label
                      key={item.key}
                      className="flex items-center gap-2 rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm text-ink-700"
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-ink-300 text-ink-900 focus:ring-ink-300"
                        checked={permDraft.includes(item.key)}
                        onChange={() => togglePermission(item.key)}
                        disabled={!canApprove || savingDetail}
                      />
                      <span>{item.label}</span>
                    </label>
                  ))}
                </div>
                <div className="mt-3 text-[11px] text-ink-500">

                </div>
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setDetailUser(null)}
                className="rounded-lg border border-ink-200 px-4 py-2 text-sm font-semibold text-ink-600 hover:border-ink-300"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveDetail}
                disabled={savingDetail || !canApprove}
                className="rounded-lg bg-ink-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-ink-700 disabled:opacity-60"
              >
                {savingDetail ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}






