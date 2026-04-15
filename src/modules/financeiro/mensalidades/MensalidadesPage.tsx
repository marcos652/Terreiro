import React, { useEffect, useMemo, useState } from 'react';
import AppShell from '@components/AppShell';
import { useAuth } from '@contexts/AuthContext';
import { useToast } from '@contexts/ToastContext';
import LineChart from '@components/charts/LineChart';
import {
  addMembership,
  clearMemberships,
  deleteMembership,
  getMemberships,
  MembershipItem,
  updateMembership,
} from '@services/membershipService';
import { addCashTransaction, getCashTransactions, CashTransaction } from '@services/transactionService';
import { logService } from '@services/logService';
import { db } from '@services/firebase';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { COLLECTIONS } from '@services/firestoreCollections';

export default function MensalidadesPage() {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const formatBRL = (value: number) =>
    new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  const getMonthKey = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  const [members, setMembers] = useState<MembershipItem[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'pago' | 'pendente'>('todos');
  const [monthFilter, setMonthFilter] = useState(getMonthKey(new Date()));
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [adding, setAdding] = useState(false);
  const [goalReduction, setGoalReduction] = useState(0);
  const [goalReductionInput, setGoalReductionInput] = useState('');
  const [paidReduction, setPaidReduction] = useState(0);
  const [paidReductionInput, setPaidReductionInput] = useState('');
  const [debtReduction, setDebtReduction] = useState(0);
  const [debtReductionInput, setDebtReductionInput] = useState('');
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberValue, setNewMemberValue] = useState('');
  const normalizedRole = (profile?.role || '').trim().toUpperCase();
  const isMaster = normalizedRole === 'MASTER';
  const isEditor = normalizedRole === 'EDITOR';
  const permissions = profile?.permissions || [];
  const canEdit = isMaster || (isEditor && permissions.includes('mensalidades'));
  const monthlyGoalBase = 690;
  const monthlyGoal = Math.max(0, monthlyGoalBase - goalReduction);
  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const defaultNames = [
    'Adriano (Tio Dri)',
    'Adriene',
    'Alisson',
    'Patricia',
    'Matheus',
    'Nicolas',
    'Pai',
    'Vanessa',
    'Victor',
    'Adriano (Pardal)',
    'Adriano RB',
    'Gabriela',
    'Gustavo Soares',
    'Kethleen',
    'Leleia',
    'Luciane',
    'Moreira',
    'Rosana',
    'Marcos Vinicius',
  ];
  const defaultMemberValue = Number((monthlyGoal / defaultNames.length).toFixed(2));

  useEffect(() => {
    let active = true;
    const load = async () => {
      const data = await getMemberships();
      if (!active) return;
      const currentMonth = getMonthKey(new Date());
      const hasCurrentMonth = data.some((member) => member.month === currentMonth);
      if (!canEdit && !hasCurrentMonth) {
        setMembers(data);
        return;
      }
      if (!hasCurrentMonth) {
        const created = await Promise.all(
          defaultNames.map(async (name) => {
            const payload: Omit<MembershipItem, 'id'> = {
              name,
              value: defaultMemberValue,
              status: 'pendente',
              lastPayment: '—',
              created_at: new Date().toISOString(),
              month: currentMonth,
            };
            const id = await addMembership(payload);
            return { id, ...payload };
          })
        );
        if (!active) return;
        setMembers([...data, ...created]);
      } else {
        setMembers(data);
      }
    };
    load()
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [canEdit]);

  const parseBRDate = (value: string) => {
    const parts = value.split('/');
    if (parts.length !== 3) return null;
    const day = Number(parts[0]);
    const month = Number(parts[1]) - 1;
    const year = Number(parts[2]);
    if (!day || month < 0 || month > 11 || !year) return null;
    return new Date(year, month, day);
  };

  const lastPaymentByName = useMemo(() => {
    const map = new Map<string, Date>();
    members.forEach((member) => {
      const date = parseBRDate(member.lastPayment);
      if (!date) return;
      const current = map.get(member.name);
      if (!current || date > current) {
        map.set(member.name, date);
      }
    });
    const result = new Map<string, string>();
    map.forEach((date, name) => {
      result.set(name, date.toLocaleDateString('pt-BR'));
    });
    return result;
  }, [members]);

  const totals = useMemo(() => {
    const monthMembers = members.filter((m) => m.month === monthFilter);
    const paid = monthMembers.filter((m) => m.status === 'pago').reduce((acc, m) => acc + m.value, 0);
    const total = monthMembers.reduce((acc, m) => acc + m.value, 0);
    const pendingCount = monthMembers.filter((m) => m.status === 'pendente').length;
    const paidCount = monthMembers.filter((m) => m.status === 'pago').length;
    return { paid, total, pendingCount, paidCount, totalMembers: monthMembers.length };
  }, [members, monthFilter]);

  const filtered = useMemo(
    () =>
      members.filter((member) => {
        const matchesName = member.name.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = statusFilter === 'todos' ? true : member.status === statusFilter;
        const matchesMonth = monthFilter
          ? (() => {
              if (member.month) return member.month === monthFilter;
              const date = parseBRDate(member.lastPayment);
              if (!date) return false;
              return getMonthKey(date) === monthFilter;
            })()
          : true;
        return matchesName && matchesStatus && matchesMonth;
      }),
    [members, search, statusFilter, monthFilter]
  );

  const monthlySeries = useMemo(() => {
    const now = new Date();
    const months: { label: string; key: string }[] = [];
    for (let i = 11; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      months.push({ key, label: `${monthNames[d.getMonth()]}/${String(d.getFullYear()).slice(2)}` });
    }

    const totalsByMonth = months.reduce<Record<string, number>>((acc, item) => {
      acc[item.key] = 0;
      return acc;
    }, {});

    members.forEach((member) => {
      if (member.status !== 'pago') return;
      const date = parseBRDate(member.lastPayment);
      if (!date) return;
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      if (Object.prototype.hasOwnProperty.call(totalsByMonth, key)) {
        totalsByMonth[key] += Number(member.value || 0);
      }
    });

    return {
      labels: months.map((item) => item.label),
      data: months.map((item) => totalsByMonth[item.key] || 0),
    };
  }, [members]);

  // ── Integração Caixa: cria transação ao marcar como pago ──
  const createCaixaTransaction = async (member: MembershipItem) => {
    try {
      const monthLabel = monthFilter || getMonthKey(new Date());
      const [year, month] = monthLabel.split('-');
      const monthName = monthNames[parseInt(month, 10) - 1] || month;
      await addCashTransaction({
        label: `Mensalidade ${member.name} — ${monthName}/${year}`,
        type: 'entrada',
        amount: member.value,
        date: new Date().toLocaleDateString('pt-BR'),
        method: 'mensalidade',
        created_at: new Date().toISOString(),
      }, profile?.email);
    } catch (err) {
      console.error('Erro ao criar transação no caixa:', err);
    }
  };

  // Remove transação do caixa ao desmarcar pagamento
  const removeCaixaTransaction = async (member: MembershipItem) => {
    if (!db) return;
    try {
      const monthLabel = monthFilter || getMonthKey(new Date());
      const [year, month] = monthLabel.split('-');
      const monthName = monthNames[parseInt(month, 10) - 1] || month;
      const searchLabel = `Mensalidade ${member.name} — ${monthName}/${year}`;

      // Busca a transação correspondente
      const snapshot = await getDocs(collection(db, COLLECTIONS.CASH_TRANSACTIONS));
      const matchingDoc = snapshot.docs.find((d) => {
        const data = d.data();
        return data.label === searchLabel && data.method === 'mensalidade';
      });
      if (matchingDoc) {
        await deleteDoc(doc(db, COLLECTIONS.CASH_TRANSACTIONS, matchingDoc.id));
      }
    } catch (err) {
      console.error('Erro ao remover transação do caixa:', err);
    }
  };

  const handleToggle = async (member: MembershipItem) => {
    if (!canEdit) return;
    if (!member.id) return;
    const nextStatus = member.status === 'pago' ? 'pendente' : 'pago';
    const nextPayment =
      nextStatus === 'pago' ? new Date().toLocaleDateString('pt-BR') : member.lastPayment;
    await updateMembership(member.id, { status: nextStatus, lastPayment: nextPayment }, profile?.email);
    setMembers((prev) =>
      prev.map((item) =>
        item.id === member.id ? { ...item, status: nextStatus, lastPayment: nextPayment } : item
      )
    );

    // ── Integração com Caixa ──
    if (nextStatus === 'pago') {
      await createCaixaTransaction(member);
      showToast(`${member.name} marcado como pago! Transação adicionada ao caixa.`, 'success');
    } else {
      await removeCaixaTransaction(member);
      showToast(`${member.name} marcado como pendente. Transação removida do caixa.`, 'info');
    }
  };

  const handleResetMembers = async () => {
    if (!canEdit) return;
    if (!window.confirm('Isso vai apagar todos os registros atuais e recriar a lista padrão. Deseja continuar?')) return;
    setResetting(true);
    try {
      await clearMemberships();
      const monthKey = monthFilter || getMonthKey(new Date());
      const created = await Promise.all(
        defaultNames.map(async (name) => {
          const payload: Omit<MembershipItem, 'id'> = {
            name,
            value: defaultMemberValue,
            status: 'pendente',
            lastPayment: '—',
            created_at: new Date().toISOString(),
            month: monthKey,
          };
          const id = await addMembership(payload);
          return { id, ...payload };
        })
      );
      setMembers(created);
      setSearch('');
      setStatusFilter('todos');
      showToast('Lista recriada com sucesso!', 'success');
    } finally {
      setResetting(false);
    }
  };

  const handleAddMember = async () => {
    if (!canEdit) return;
    if (!newMemberName || !newMemberValue) return;
    setAdding(true);
    try {
      const monthKey = getMonthKey(new Date());
      const payload: Omit<MembershipItem, 'id'> = {
        name: newMemberName,
        value: Number(newMemberValue),
        status: 'pendente',
        lastPayment: '—',
        created_at: new Date().toISOString(),
        month: monthKey,
      };
      const id = await addMembership(payload, profile?.email);
      setMembers((prev) => [{ id, ...payload }, ...prev]);
      setNewMemberName('');
      setNewMemberValue('');
      showToast(`${payload.name} adicionado!`, 'success');
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveMember = async (member: MembershipItem) => {
    if (!canEdit) return;
    if (!member.id) return;
    if (!window.confirm(`Remover ${member.name}?`)) return;
    await deleteMembership(member.id, profile?.email);
    // Se estava pago, remove do caixa também
    if (member.status === 'pago') {
      await removeCaixaTransaction(member);
    }
    setMembers((prev) => prev.filter((item) => item.id !== member.id));
    showToast(`${member.name} removido.`, 'success');
  };

  const handleApplyGoalReduction = () => {
    const value = Number(goalReductionInput);
    if (!value || value <= 0) return;
    setGoalReduction((prev) => Math.min(monthlyGoalBase, prev + value));
    setGoalReductionInput('');
  };

  const handleApplyPaidReduction = () => {
    const value = Number(paidReductionInput);
    if (!value || value <= 0) return;
    setPaidReduction((prev) => Math.max(0, prev + value));
    setPaidReductionInput('');
  };

  const handleApplyDebtReduction = () => {
    const value = Number(debtReductionInput);
    if (!value || value <= 0) return;
    setDebtReduction((prev) => Math.max(0, prev + value));
    setDebtReductionInput('');
  };

  const handleExport = () => {
    const rows = filtered.length > 0 ? filtered : members;
    if (rows.length === 0) return;
    const header = ['Nome', 'Status', 'Valor', 'Último pagamento'];
    const escapeCell = (value: string | number) => {
      const text = String(value ?? '');
      if (text.includes('"') || text.includes(';') || text.includes('\n')) {
        return `"${text.replace(/"/g, '""')}"`;
      }
      return text;
    };
    const lines = [
      header.map(escapeCell).join(';'),
      ...rows.map((member) =>
        [
          member.name,
          member.status === 'pago' ? 'Pago' : 'Pendente',
          formatBRL(member.value),
          member.lastPayment,
        ]
          .map(escapeCell)
          .join(';')
      ),
    ];
    const csv = lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mensalidades-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showToast('Relatório exportado!', 'success');
  };

  const progressPercent = monthlyGoal > 0 ? Math.min(100, (totals.paid / monthlyGoal) * 100) : 0;

  return (
    <AppShell
      title="Mensalidades"
      subtitle="Controle de pagamentos, pendências e evolução mensal."
      actions={
        <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:items-center">
            <button
              onClick={handleResetMembers}
              disabled={resetting || !canEdit}
              className="w-full rounded-xl border border-ink-200 bg-white px-4 py-2 text-sm font-semibold text-ink-700 hover:border-ink-300 disabled:opacity-60 sm:w-auto"
            >
              {resetting ? 'Recriando...' : 'Criar lista padrão'}
            </button>
          <button
            onClick={handleExport}
            disabled={loading || members.length === 0}
            className="w-full rounded-xl border border-ink-200 bg-white px-4 py-2 text-sm font-semibold text-ink-700 hover:border-ink-300 disabled:opacity-60 sm:w-auto"
          >
            Exportar relatório
          </button>
        </div>
      }
    >
      {/* Progress bar */}
      <div className="mb-6 rounded-2xl border border-ink-100 bg-white p-5 shadow-floating">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-ink-300">Progresso do mês</div>
            <div className="mt-1 text-lg font-semibold text-ink-900">
              R$ {formatBRL(totals.paid)} <span className="text-sm font-normal text-ink-400">/ R$ {formatBRL(monthlyGoal)}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-ink-900">{progressPercent.toFixed(0)}%</div>
            <div className="text-xs text-ink-400">
              {totals.paidCount}/{totals.totalMembers} pagos
            </div>
          </div>
        </div>
        <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-ink-100">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              progressPercent >= 100 ? 'bg-emerald-500' : progressPercent >= 50 ? 'bg-amber-400' : 'bg-rose-400'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="mt-2 flex items-center gap-4 text-xs text-ink-400">
          <span>💡 Pagamentos de mensalidade são registrados automaticamente no Caixa</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-floating">
          <div className="text-xs uppercase tracking-[0.2em] text-ink-300">Meta mensal</div>
          <div className="mt-2 text-2xl font-semibold text-ink-900">R$ {formatBRL(monthlyGoal)}</div>
          <div className="mt-3 text-xs text-ink-500">Meta base: R$ {formatBRL(monthlyGoalBase)}</div>
          <div className="mt-3 rounded-xl border border-ink-100 bg-ink-50/80 p-3 text-xs text-ink-600">
            <div className="text-[11px] uppercase tracking-[0.25em] text-ink-400">Retirar valor</div>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                type="number"
                min="0"
                className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-700 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100 sm:w-36"
                placeholder="Ex.: 50"
                value={goalReductionInput}
                onChange={(e) => setGoalReductionInput(e.target.value)}
                disabled={!canEdit}
              />
              <button
                onClick={handleApplyGoalReduction}
                disabled={!canEdit || !goalReductionInput || Number(goalReductionInput) <= 0}
                className="rounded-lg bg-ink-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-ink-700 disabled:opacity-60"
                type="button"
              >
                Retirar
              </button>
            </div>
            {goalReduction > 0 && (
              <div className="mt-2 text-[11px] text-ink-400">Total retirado: R$ {formatBRL(goalReduction)}</div>
            )}
          </div>
        </div>
        <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-floating">
          <div className="text-xs uppercase tracking-[0.2em] text-ink-300">Recebido</div>
          <div className="mt-2 text-2xl font-semibold text-emerald-600">
            R$ {formatBRL(Math.max(0, totals.paid - paidReduction))}
          </div>
          <div className="mt-3 text-xs text-ink-500">Valor bruto: R$ {formatBRL(totals.paid)}</div>
          <div className="mt-3 rounded-xl border border-ink-100 bg-ink-50/80 p-3 text-xs text-ink-600">
            <div className="text-[11px] uppercase tracking-[0.25em] text-ink-400">Retirar valor</div>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                type="number"
                min="0"
                className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-700 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100 sm:w-36"
                placeholder="Ex.: 50"
                value={paidReductionInput}
                onChange={(e) => setPaidReductionInput(e.target.value)}
                disabled={!canEdit}
              />
              <button
                onClick={handleApplyPaidReduction}
                disabled={!canEdit || !paidReductionInput || Number(paidReductionInput) <= 0}
                className="rounded-lg bg-ink-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-ink-700 disabled:opacity-60"
                type="button"
              >
                Retirar
              </button>
            </div>
            {paidReduction > 0 && (
              <div className="mt-2 text-[11px] text-ink-400">Total retirado: R$ {formatBRL(paidReduction)}</div>
            )}
          </div>
        </div>
        <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-floating">
          <div className="text-xs uppercase tracking-[0.2em] text-ink-300">Inadimplência</div>
          <div className="mt-2 text-2xl font-semibold text-rose-500">
            R$ {formatBRL(Math.max(0, Math.max(0, monthlyGoal - totals.paid) - debtReduction))}
          </div>
          <div className="mt-3 text-xs text-ink-500">
            {totals.pendingCount} membro{totals.pendingCount !== 1 ? 's' : ''} pendente{totals.pendingCount !== 1 ? 's' : ''}
          </div>
          <div className="mt-3 rounded-xl border border-ink-100 bg-ink-50/80 p-3 text-xs text-ink-600">
            <div className="text-[11px] uppercase tracking-[0.25em] text-ink-400">Retirar valor</div>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                type="number"
                min="0"
                className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-700 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100 sm:w-36"
                placeholder="Ex.: 50"
                value={debtReductionInput}
                onChange={(e) => setDebtReductionInput(e.target.value)}
                disabled={!canEdit}
              />
              <button
                onClick={handleApplyDebtReduction}
                disabled={!canEdit || !debtReductionInput || Number(debtReductionInput) <= 0}
                className="rounded-lg bg-ink-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-ink-700 disabled:opacity-60"
                type="button"
              >
                Retirar
              </button>
            </div>
            {debtReduction > 0 && (
              <div className="mt-2 text-[11px] text-ink-400">Total retirado: R$ {formatBRL(debtReduction)}</div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[2fr_1.1fr]">
        <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-floating">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-ink-300">Pagamentos</div>
              <div className="text-lg font-semibold text-ink-900">Status por membro</div>
            </div>
            <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center">
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-ink-400">
                <button
                  onClick={() => setStatusFilter('todos')}
                  className={`rounded-full px-3 py-1 ${
                    statusFilter === 'todos' ? 'bg-ink-900 text-white' : 'bg-ink-100'
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setStatusFilter('pago')}
                  className={`rounded-full px-3 py-1 ${
                    statusFilter === 'pago' ? 'bg-emerald-500 text-white' : 'bg-ink-100'
                  }`}
                >
                  Pagos
                </button>
                <button
                  onClick={() => setStatusFilter('pendente')}
                  className={`rounded-full px-3 py-1 ${
                    statusFilter === 'pendente' ? 'bg-amber-500 text-white' : 'bg-ink-100'
                  }`}
                >
                  Pendentes
                </button>
              </div>
              <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center">
                <input
                  type="month"
                  className="w-full rounded-xl border border-ink-100 bg-white px-3 py-2 text-sm text-ink-700 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100 md:w-40"
                  value={monthFilter}
                  onChange={(event) => setMonthFilter(event.target.value)}
                />
                <input
                  className="w-full rounded-xl border border-ink-100 bg-white px-3 py-2 text-sm text-ink-700 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100 md:w-72"
                  placeholder="Buscar membro..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-3">
            <div className="rounded-2xl border border-ink-100 bg-ink-50/50 p-4">
              <div className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-ink-400">
                Adicionar membro
              </div>
              <div className="flex flex-col gap-2 md:flex-row md:items-center">
                <input
                  className="w-full rounded-xl border border-ink-100 bg-white px-3 py-2 text-sm text-ink-700 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                  placeholder="Nome do membro"
                  value={newMemberName}
                  onChange={(event) => setNewMemberName(event.target.value)}
                  disabled={!canEdit}
                />
                <input
                  type="number"
                  className="w-full rounded-xl border border-ink-100 bg-white px-3 py-2 text-sm text-ink-700 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100 md:w-40"
                  placeholder={`R$ ${formatBRL(defaultMemberValue)}`}
                  value={newMemberValue}
                  onChange={(event) => setNewMemberValue(event.target.value)}
                  disabled={!canEdit}
                />
                <button
                  onClick={handleAddMember}
                  disabled={!canEdit || adding || newMemberName.trim().length === 0}
                  className="w-full rounded-xl bg-ink-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-ink-700 disabled:opacity-60 md:w-auto"
                >
                  {adding ? 'Adicionando...' : 'Adicionar'}
                </button>
              </div>
            </div>
            {filtered.map((member) => (
              <div key={member.id} className="rounded-2xl border border-ink-100 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-ink-900">{member.name}</div>
                    <div className="text-xs text-ink-400">
                      R$ {formatBRL(member.value)} • Último pagamento: {lastPaymentByName.get(member.name) || '—'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        member.status === 'pago' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {member.status === 'pago' ? '✓ Pago' : '⏳ Pendente'}
                    </span>
                    <button
                      onClick={() => handleToggle(member)}
                      disabled={!canEdit}
                      className={`rounded-lg border px-3 py-1 text-xs font-semibold disabled:opacity-60 ${
                        member.status === 'pago'
                          ? 'border-amber-200 text-amber-600 hover:border-amber-300'
                          : 'border-emerald-200 text-emerald-600 hover:border-emerald-300'
                      }`}
                    >
                      {member.status === 'pago' ? 'Desfazer' : 'Marcar pago'}
                    </button>
                    <button
                      onClick={() => handleRemoveMember(member)}
                      disabled={!canEdit}
                      className="rounded-lg border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 hover:border-rose-300 disabled:opacity-60"
                    >
                      Remover
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="py-8 text-center text-sm text-ink-400">Carregando membros...</div>
            )}
            {!loading && filtered.length === 0 && (
              <div className="py-8 text-center text-sm text-ink-400">Nenhum membro encontrado.</div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-floating">
          <div className="text-xs uppercase tracking-[0.2em] text-ink-300">Evolução</div>
          <div className="text-lg font-semibold text-ink-900">Recebimentos por mês</div>
          <div className="mt-4">
            <LineChart
              data={monthlySeries.data}
              height={110}
              labels={monthlySeries.labels}
              strokeColor="#7c3aed"
              fillColor="rgba(124,58,237,0.28)"
              dotColor="#6d28d9"
              valueFormatter={(value) => `R$ ${formatBRL(value)}`}
            />
          </div>
          <div className="mt-3 text-xs text-ink-400">Meta atual: R$ {formatBRL(monthlyGoal)}/mês</div>
        </div>
      </div>
    </AppShell>
  );
}
