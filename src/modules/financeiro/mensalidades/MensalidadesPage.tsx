import React, { useEffect, useMemo, useState } from 'react';
import AppShell from '@components/AppShell';
import { useAuth } from '@contexts/AuthContext';
import LineChart from '@components/charts/LineChart';
import {
  addMembership,
  clearMemberships,
  deleteMembership,
  getMemberships,
  MembershipItem,
  updateMembership,
} from '@services/membershipService';
import { logService } from '@services/logService';

export default function MensalidadesPage() {
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
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberValue, setNewMemberValue] = useState('');
  const { profile } = useAuth();
  const isMaster = profile?.role === 'MASTER';
  const monthlyGoal = 690;
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
      if (!hasCurrentMonth) {
        const created = await Promise.all(
          defaultNames.map(async (name) => {
            const payload: Omit<MembershipItem, 'id'> = {
              name,
              value: defaultMemberValue,
              status: 'pendente',
              lastPayment: 'â€”',
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
  }, []);

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
    const paid = members.filter((member) => member.status === 'pago').reduce((acc, member) => acc + member.value, 0);
    return { paid };
  }, [members]);

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

  const handleToggle = async (member: MembershipItem) => {
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
  };

  const handleResetMembers = async () => {
    const confirmed = window.confirm(
      'Isso vai apagar todos os registros atuais e recriar a lista padr\u00e3o. Deseja continuar?'
    );
    if (!confirmed) return;
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
            lastPayment: 'â€”',
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
    } finally {
      setResetting(false);
    }
  };

  const handleAddMember = async () => {
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
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveMember = async (member: MembershipItem) => {
    if (!member.id) return;
    const confirmed = window.confirm(`Remover ${member.name}?`);
    if (!confirmed) return;
    await deleteMembership(member.id, profile?.email);
    setMembers((prev) => prev.filter((item) => item.id !== member.id));
  };

  const handleExport = () => {
    const rows = filtered.length > 0 ? filtered : members;
    if (rows.length === 0) return;
    const header = ['Nome', 'Status', 'Valor', 'Ultimo pagamento'];
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
  };

  return (
    <AppShell
      title="Mensalidades"
      subtitle="Controle de pagamentos, pendencias e evolucao mensal."
      actions={
        <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:items-center">
            <button
              onClick={handleResetMembers}
              disabled={resetting || !isMaster}
              className="w-full rounded-xl border border-ink-200 bg-white px-4 py-2 text-sm font-semibold text-ink-700 hover:border-ink-300 disabled:opacity-60 sm:w-auto"
            >
              {resetting ? 'Recriando...' : 'Criar lista padr\u00e3o'}
            </button>
          <button
            onClick={handleExport}
            disabled={loading || members.length === 0}
            className="w-full rounded-xl border border-ink-200 bg-white px-4 py-2 text-sm font-semibold text-ink-700 hover:border-ink-300 disabled:opacity-60 sm:w-auto"
          >
            Exportar relatorio
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-floating">
          <div className="text-xs uppercase tracking-[0.2em] text-ink-300">Meta mensal</div>
          <div className="mt-2 text-2xl font-semibold text-ink-900">R$ {formatBRL(monthlyGoal)}</div>
        </div>
        <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-floating">
          <div className="text-xs uppercase tracking-[0.2em] text-ink-300">Recebido</div>
          <div className="mt-2 text-2xl font-semibold text-emerald-600">R$ {formatBRL(totals.paid)}</div>
        </div>
        <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-floating">
          <div className="text-xs uppercase tracking-[0.2em] text-ink-300">Inadimplencia</div>
          <div className="mt-2 text-2xl font-semibold text-rose-500">
            {formatBRL(Math.max(0, monthlyGoal - totals.paid))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[2fr_1.1fr]">
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
                  disabled={!isMaster}
                />
                <input
                  type="number"
                  className="w-full rounded-xl border border-ink-100 bg-white px-3 py-2 text-sm text-ink-700 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100 md:w-40"
                  placeholder={`R$ ${formatBRL(defaultMemberValue)}`}
                  value={newMemberValue}
                  onChange={(event) => setNewMemberValue(event.target.value)}
                  disabled={!isMaster}
                />
                <button
                  onClick={handleAddMember}
                  disabled={!isMaster || adding || newMemberName.trim().length === 0}
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
                      Ultimo pagamento: {lastPaymentByName.get(member.name) || 'â€”'}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        member.status === 'pago' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {member.status === 'pago' ? 'Pago' : 'Pendente'}
                    </span>
                    <button
                      onClick={() => handleToggle(member)}
                      disabled={!isMaster}
                      className="rounded-lg border border-ink-200 px-3 py-1 text-xs font-semibold text-ink-600 hover:border-ink-300 disabled:opacity-60"
                    >
                      Alternar
                    </button>
                    <button
                      onClick={() => handleRemoveMember(member)}
                      disabled={!isMaster}
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
            {filtered.length === 0 && (
              <div className="py-8 text-center text-sm text-ink-400">Nenhum membro encontrado.</div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-floating">
          <div className="text-xs uppercase tracking-[0.2em] text-ink-300">Evolucao</div>
          <div className="text-lg font-semibold text-ink-900">Recebimentos por mes</div>
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
          <div className="mt-3 text-xs text-ink-400">Meta atual: R$ {formatBRL(monthlyGoal)}/mÃªs</div>
        </div>
      </div>
    </AppShell>
  );
}
