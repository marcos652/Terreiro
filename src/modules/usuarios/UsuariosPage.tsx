import React, { useEffect, useMemo, useState } from 'react';
import AppShell from '@components/AppShell';
import { useAuth } from '@contexts/AuthContext';
import { useToast } from '@contexts/ToastContext';
import { addUser, deleteUser, getUsers, updateUser, upsertUserById, User } from '@services/userService';
import { createUserWithEmailAndPassword, getAuth } from 'firebase/auth';
import { auth, db, firebaseConfig } from '@services/firebase';
import { initializeApp, getApps } from 'firebase/app';
import { collection, onSnapshot } from 'firebase/firestore';
import { COLLECTIONS } from '@services/firestoreCollections';

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
  { key: 'doacoes', label: 'Doações' },
  { key: 'chat', label: 'Chat' },
  { key: 'galeria', label: 'Galeria' },
  { key: 'fundamentos', label: 'Fundamentos' },
];

const roleBadge: Record<string, { label: string; color: string }> = {
  MASTER: { label: 'Master', color: 'bg-purple-100 text-purple-700' },
  EDITOR: { label: 'Editor', color: 'bg-blue-100 text-blue-700' },
  VISUALIZADOR: { label: 'Visualizador', color: 'bg-gray-100 text-gray-600' },
};

const statusBadge: Record<string, { label: string; color: string }> = {
  APROVADO: { label: 'Aprovado', color: 'bg-emerald-100 text-emerald-700' },
  PENDENTE: { label: 'Pendente', color: 'bg-amber-100 text-amber-700' },
  BLOQUEADO: { label: 'Bloqueado', color: 'bg-rose-100 text-rose-700' },
  DESATIVADO: { label: 'Desativado', color: 'bg-gray-100 text-gray-500' },
};

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
  const [showCreateForm, setShowCreateForm] = useState(false);
  const { profile, user } = useAuth();
  const { showToast } = useToast();
  const BOOTSTRAP_UID = 'rpdLNx3X4CZhFvB6O9bvXbFA72y1';
  const normalizedRole = (profile?.role || '').trim().toUpperCase();
  const isMaster = normalizedRole === 'MASTER';
  const isBootstrapMaster = user?.uid === BOOTSTRAP_UID;
  const canApprove = isMaster || isBootstrapMaster;
  const canAdmin = canApprove;
  const canCreateUser = Boolean(user);
  const secondaryAuth =
    typeof window === 'undefined'
      ? null
      : getAuth(
          getApps().find((a) => a.name === 'admin-app') ?? initializeApp(firebaseConfig, 'admin-app')
        );

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

  // Presence tracking
  type PresenceData = { online: boolean; last_seen: any };
  const [presenceMap, setPresenceMap] = useState<Record<string, PresenceData>>({});

  useEffect(() => {
    if (!db) return;
    const unsub = onSnapshot(collection(db, COLLECTIONS.USER_PRESENCE), (snap) => {
      const map: Record<string, PresenceData> = {};
      snap.forEach((d) => {
        map[d.id] = d.data() as PresenceData;
      });
      setPresenceMap(map);
    });
    return () => unsub();
  }, []);

  const getPresenceInfo = (uid?: string) => {
    if (!uid) return { isOnline: false, lastSeen: null as string | null };
    const p = presenceMap[uid];
    if (!p) return { isOnline: false, lastSeen: null };
    const ts = p.last_seen?.toDate ? p.last_seen.toDate() : p.last_seen ? new Date(p.last_seen) : null;
    // Consider online if last_seen within 2 minutes
    const isOnline = p.online && ts ? (Date.now() - ts.getTime() < 2 * 60 * 1000) : false;
    const lastSeen = ts ? ts.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : null;
    return { isOnline, lastSeen };
  };

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch = `${u.name} ${u.email} ${u.role}`.toLowerCase().includes(search.toLowerCase());
      const matchesRole = role === 'ALL' || u.role === role;
      return matchesSearch && matchesRole;
    });
  }, [users, search, role]);

  const stats = useMemo(() => ({
    total: users.length,
    masters: users.filter((u) => u.role === 'MASTER').length,
    editors: users.filter((u) => u.role === 'EDITOR').length,
    viewers: users.filter((u) => u.role === 'VISUALIZADOR').length,
    approved: users.filter((u) => u.status === 'APROVADO').length,
    pending: users.filter((u) => u.status === 'PENDENTE').length,
    blocked: users.filter((u) => u.status === 'BLOQUEADO').length,
  }), [users]);

  const handleRoleChange = async (u: User, nextRole: User['role']) => {
    if (!u.id) return;
    setUpdatingId(u.id);
    try {
      const nr = (nextRole || '').trim().toUpperCase() as User['role'];
      await updateUser(u.id, { role: nr });
      setUsers((prev) => prev.map((item) => (item.id === u.id ? { ...item, role: nr } : item)));
      showToast(`${u.name} agora é ${roleBadge[nr]?.label || nr}.`, 'success');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleStatusChange = async (u: User, status: User['status']) => {
    if (!u.id) return;
    setUpdatingId(u.id);
    setUsers((prev) => prev.map((item) => (item.id === u.id ? { ...item, status } : item)));
    try {
      await updateUser(u.id, { status });
      showToast(`${u.name} — ${statusBadge[status]?.label || status}`, 'success');
    } catch {
      showToast('Erro ao atualizar status.', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRemove = async (u: User) => {
    if (!u.id) return;
    if (!window.confirm(`Remover ${u.name}?`)) return;
    setUpdatingId(u.id);
    setUsers((prev) => prev.filter((item) => item.id !== u.id));
    try {
      await deleteUser(u.id, profile?.email);
      showToast(`${u.name} removido.`, 'success');
    } catch {
      showToast('Erro ao remover usuário.', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.password || !canCreateUser) return;
    const normalizedEmail = newUser.email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalizedEmail)) {
      showToast('E-mail inválido.', 'warning');
      return;
    }
    if (newUser.password.trim().length < 6) {
      showToast('Senha muito curta (mín. 6 caracteres).', 'warning');
      return;
    }
    setUpdatingId('new');
    try {
      try {
        const cred = await createUserWithEmailAndPassword(
          secondaryAuth || auth,
          normalizedEmail,
          newUser.password.trim()
        );
        const uid = cred.user.uid;
        const desiredRole = canApprove
          ? (newUser.role || 'VISUALIZADOR').trim().toUpperCase() as User['role']
          : 'VISUALIZADOR' as User['role'];
        const payload: Omit<User, 'id'> = {
          name: newUser.name,
          email: normalizedEmail,
          role: desiredRole,
          status: 'APROVADO',
          created_at: new Date().toISOString(),
        };
        await upsertUserById(uid, payload, profile?.email);
        if (secondaryAuth) await secondaryAuth.signOut().catch(() => {});
        setUsers((prev) => [{ id: uid, ...payload }, ...prev]);
        setNewUser({ name: '', email: '', role: 'VISUALIZADOR', password: '' });
        setShowCreateForm(false);
        showToast(`${payload.name} criado com sucesso!`, 'success');
        return;
      } catch (error: any) {
        if (error?.code === 'auth/email-already-in-use') {
          showToast('E-mail já existe. Use outro ou recupere a senha.', 'warning');
          return;
        }
        throw error;
      }
    } catch {
      showToast('Erro ao criar usuário.', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const openDetail = (u: User) => {
    setDetailUser(u);
    setPermDraft(u.permissions || []);
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
      showToast('Permissões salvas!', 'success');
    } finally {
      setSavingDetail(false);
      setDetailUser(null);
    }
  };

  const normalizeMasters = async () => {
    if (!canAdmin) return;
    for (const u of users) {
      const upper = (u.role || '').toUpperCase() as User['role'];
      if (u.role !== upper) {
        await updateUser(u.id!, { role: upper });
      }
    }
  };

  useEffect(() => {
    if (!canAdmin || normalizedRoles || users.length === 0) return;
    normalizeMasters().finally(() => setNormalizedRoles(true));
  }, [canAdmin, normalizedRoles, users]);

  const formatDate = (value?: string) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const Avatar = ({ name, photo }: { name: string; photo?: string }) => (
    photo ? (
      <img src={photo} alt={name} className="h-11 w-11 rounded-full object-cover border-2 border-white shadow-sm" />
    ) : (
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-sm font-bold text-white shadow-sm">
        {(name || '?').charAt(0).toUpperCase()}
      </div>
    )
  );

  return (
    <AppShell
      title="Usuários"
      subtitle="Gestão de acesso, equipes e permissões."
      actions={
        canAdmin ? (
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="flex items-center gap-2 rounded-xl bg-ink-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-ink-700"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Criar usuário
          </button>
        ) : undefined
      }
    >
      {/* Stats row */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {[
          { label: 'Total', value: stats.total, color: 'text-ink-900' },
          { label: 'Masters', value: stats.masters, color: 'text-purple-600' },
          { label: 'Editores', value: stats.editors, color: 'text-blue-600' },
          { label: 'Visualizador', value: stats.viewers, color: 'text-ink-500' },
          { label: 'Aprovados', value: stats.approved, color: 'text-emerald-600' },
          { label: 'Pendentes', value: stats.pending, color: 'text-amber-600' },
          { label: 'Bloqueados', value: stats.blocked, color: 'text-rose-600' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-ink-100 bg-white p-3 text-center shadow-floating">
            <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-[10px] uppercase tracking-[0.15em] text-ink-400">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Create user form (collapsible) */}
      {showCreateForm && (
        <div className="mb-6 rounded-2xl border border-ink-100 bg-white p-6 shadow-floating">
          <div className="text-xs uppercase tracking-[0.2em] text-ink-300">Novo usuário</div>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <input
              className="rounded-xl border border-ink-100 bg-white px-3 py-2.5 text-sm text-ink-700 focus:border-ink-400 focus:outline-none focus:ring-2 focus:ring-ink-100"
              placeholder="Nome completo"
              value={newUser.name}
              onChange={(e) => setNewUser((prev) => ({ ...prev, name: e.target.value }))}
              disabled={updatingId === 'new'}
            />
            <input
              className="rounded-xl border border-ink-100 bg-white px-3 py-2.5 text-sm text-ink-700 focus:border-ink-400 focus:outline-none focus:ring-2 focus:ring-ink-100"
              placeholder="E-mail"
              value={newUser.email}
              onChange={(e) => setNewUser((prev) => ({ ...prev, email: e.target.value }))}
              disabled={updatingId === 'new'}
            />
            <input
              className="rounded-xl border border-ink-100 bg-white px-3 py-2.5 text-sm text-ink-700 focus:border-ink-400 focus:outline-none focus:ring-2 focus:ring-ink-100"
              placeholder="Senha (mín. 6)"
              type="password"
              value={newUser.password}
              onChange={(e) => setNewUser((prev) => ({ ...prev, password: e.target.value }))}
              disabled={updatingId === 'new'}
            />
            <select
              className="rounded-xl border border-ink-100 bg-white px-3 py-2.5 text-sm text-ink-700 focus:border-ink-400 focus:outline-none focus:ring-2 focus:ring-ink-100"
              value={newUser.role}
              onChange={(e) => setNewUser((prev) => ({ ...prev, role: e.target.value as User['role'] }))}
              disabled={!canApprove || updatingId === 'new'}
            >
              <option value="VISUALIZADOR">Visualizador</option>
              <option value="EDITOR">Editor</option>
              {canApprove && <option value="MASTER">Master</option>}
            </select>
            <button
              onClick={handleCreateUser}
              disabled={!canCreateUser || updatingId === 'new' || !newUser.name.trim() || !newUser.email.trim() || !newUser.password.trim()}
              className="rounded-xl bg-ink-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-ink-700 disabled:opacity-60"
            >
              {updatingId === 'new' ? 'Criando...' : 'Criar'}
            </button>
          </div>
        </div>
      )}

      {/* Filters + List */}
      <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-floating">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="text-xs uppercase tracking-[0.2em] text-ink-300">
            Equipe — {filtered.length} membro{filtered.length !== 1 ? 's' : ''}
          </div>
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <div className="flex flex-wrap gap-1.5 text-xs font-semibold">
              {(['ALL', 'MASTER', 'EDITOR', 'VISUALIZADOR'] as RoleFilter[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  className={`rounded-full px-3 py-1 transition ${
                    role === r ? 'bg-ink-900 text-white' : 'bg-ink-100 text-ink-500 hover:bg-ink-200'
                  }`}
                >
                  {r === 'ALL' ? 'Todos' : roleBadge[r]?.label || r}
                </button>
              ))}
            </div>
            <input
              className="rounded-xl border border-ink-100 bg-white px-3 py-2 text-sm text-ink-700 focus:border-ink-400 focus:outline-none focus:ring-2 focus:ring-ink-100 md:w-64"
              placeholder="Buscar por nome ou e-mail..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((u) => {
            const rBadge = roleBadge[(u.role || '').toUpperCase()] || roleBadge.VISUALIZADOR;
            const sBadge = statusBadge[(u.status || '').toUpperCase()] || statusBadge.PENDENTE;
            const isUpdating = updatingId === u.id;
            const presence = getPresenceInfo(u.id);
            return (
              <div
                key={u.id}
                className="rounded-2xl border border-ink-100 p-4 transition hover:border-ink-200"
              >
                {/* User header */}
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar name={u.name} photo={u.photoURL} />
                    {/* Online dot */}
                    <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${presence.isOnline ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className="truncate text-sm font-semibold text-ink-900">{u.name}</div>
                    <div className="truncate text-xs text-ink-400">{u.email}</div>
                  </div>
                </div>

                {/* Presence info */}
                <div className="mt-2 flex items-center gap-1.5 text-[11px]">
                  {presence.isOnline ? (
                    <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                      </span>
                      Online agora
                    </span>
                  ) : presence.lastSeen ? (
                    <span className="text-ink-400">Último acesso: {presence.lastSeen}</span>
                  ) : (
                    <span className="text-ink-300">Nunca acessou</span>
                  )}
                </div>

                {/* Badges */}
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${rBadge.color}`}>
                    {rBadge.label}
                  </span>
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${sBadge.color}`}>
                    {sBadge.label}
                  </span>
                  <span className="text-[10px] text-ink-400">
                    desde {formatDate(u.created_at)}
                  </span>
                </div>

                {/* Admin actions */}
                {canAdmin && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {/* Role select */}
                    <select
                      className="rounded-lg border border-ink-200 px-2 py-1 text-[11px] font-semibold text-ink-700"
                      value={u.role}
                      disabled={isUpdating}
                      onChange={(e) => handleRoleChange(u, e.target.value as User['role'])}
                    >
                      <option value="VISUALIZADOR">Visualizador</option>
                      <option value="EDITOR">Editor</option>
                      {canApprove && <option value="MASTER">Master</option>}
                    </select>

                    {/* Status actions */}
                    {u.status !== 'APROVADO' && (
                      <button onClick={() => handleStatusChange(u, 'APROVADO')} disabled={isUpdating}
                        className="rounded-lg border border-emerald-200 px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:border-emerald-300 disabled:opacity-60">
                        Aprovar
                      </button>
                    )}
                    {u.status === 'APROVADO' && (
                      <button onClick={() => handleStatusChange(u, 'BLOQUEADO')} disabled={isUpdating}
                        className="rounded-lg border border-rose-200 px-2 py-1 text-[11px] font-semibold text-rose-600 hover:border-rose-300 disabled:opacity-60">
                        Bloquear
                      </button>
                    )}
                    <button onClick={() => handleStatusChange(u, 'DESATIVADO')} disabled={isUpdating}
                      className="rounded-lg border border-amber-200 px-2 py-1 text-[11px] font-semibold text-amber-700 hover:border-amber-300 disabled:opacity-60">
                      Desativar
                    </button>
                    <button onClick={() => handleRemove(u)} disabled={isUpdating}
                      className="rounded-lg border border-ink-200 px-2 py-1 text-[11px] font-semibold text-ink-600 hover:border-ink-300 disabled:opacity-60">
                      Remover
                    </button>
                  </div>
                )}

                {/* Permissions button */}
                {canAdmin && (
                  <button
                    onClick={() => openDetail(u)}
                    className="mt-2 w-full rounded-xl border border-ink-100 px-3 py-2 text-xs font-semibold text-ink-600 hover:border-ink-200 hover:bg-ink-50 transition"
                  >
                    Permissões
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {loading && <div className="py-8 text-center text-sm text-ink-400">Carregando usuários...</div>}
        {!loading && filtered.length === 0 && (
          <div className="py-8 text-center text-sm text-ink-400">Nenhum usuário encontrado.</div>
        )}
      </div>

      {/* Permissions detail modal */}
      {detailUser && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4" onClick={() => setDetailUser(null)}>
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar name={detailUser.name} photo={detailUser.photoURL} />
                <div>
                  <div className="text-lg font-semibold text-ink-900">{detailUser.name}</div>
                  <div className="text-xs text-ink-400">{detailUser.email}</div>
                </div>
              </div>
              <button
                onClick={() => setDetailUser(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-ink-200 text-ink-500 hover:bg-ink-50 transition"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M6 6l12 12M18 6l-12 12" />
                </svg>
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${roleBadge[(detailUser.role || '').toUpperCase()]?.color || 'bg-gray-100 text-gray-600'}`}>
                {roleBadge[(detailUser.role || '').toUpperCase()]?.label || detailUser.role}
              </span>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadge[(detailUser.status || '').toUpperCase()]?.color || 'bg-gray-100 text-gray-500'}`}>
                {statusBadge[(detailUser.status || '').toUpperCase()]?.label || detailUser.status}
              </span>
            </div>

            <div className="mt-5">
              <div className="text-xs font-semibold uppercase tracking-[0.15em] text-ink-400">Permissões por aba</div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {menuPermissions.map((item) => {
                  const checked = permDraft.includes(item.key);
                  return (
                    <button
                      key={item.key}
                      onClick={() => togglePermission(item.key)}
                      disabled={!canApprove || savingDetail}
                      className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm transition ${
                        checked
                          ? 'border-indigo-500 bg-indigo-50 text-ink-900'
                          : 'border-ink-100 text-ink-600 hover:border-ink-200'
                      }`}
                    >
                      <div className={`flex h-5 w-5 items-center justify-center rounded-md border-2 transition ${
                        checked ? 'border-indigo-500 bg-indigo-500' : 'border-ink-200'
                      }`}>
                        {checked && (
                          <svg viewBox="0 0 24 24" className="h-3 w-3 text-white" fill="none" stroke="currentColor" strokeWidth="3">
                            <path d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setDetailUser(null)}
                className="rounded-xl border border-ink-200 px-4 py-2 text-sm font-semibold text-ink-600 hover:border-ink-300"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveDetail}
                disabled={savingDetail || !canApprove}
                className="rounded-xl bg-ink-900 px-6 py-2 text-sm font-semibold text-white shadow-sm hover:bg-ink-700 disabled:opacity-60"
              >
                {savingDetail ? 'Salvando...' : 'Salvar permissões'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
