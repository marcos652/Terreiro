import React, { useMemo, useState } from 'react';
import AppShell from '@components/AppShell';
import RollerCoasterChart from '@components/charts/RollerCoasterChart';

type MemberItem = {
  id: string;
  name: string;
  value: number;
  status: 'pago' | 'pendente';
  lastPayment: string;
};

const initialMembers: MemberItem[] = [];

export default function MensalidadesPage() {
  const formatBRL = (value: number) =>
    new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  const [members, setMembers] = useState<MemberItem[]>(initialMembers);
  const [search, setSearch] = useState('');
  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  const parseBRDate = (value: string) => {
    const parts = value.split('/');
    if (parts.length !== 3) return null;
    const day = Number(parts[0]);
    const month = Number(parts[1]) - 1;
    const year = Number(parts[2]);
    if (!day || month < 0 || month > 11 || !year) return null;
    return new Date(year, month, day);
  };

  const totals = useMemo(() => {
    const total = members.reduce((acc, member) => acc + member.value, 0);
    const paid = members.filter((member) => member.status === 'pago').reduce((acc, member) => acc + member.value, 0);
    return { total, paid };
  }, [members]);

  const filtered = useMemo(
    () => members.filter((member) => member.name.toLowerCase().includes(search.toLowerCase())),
    [members, search]
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

  const handleToggle = (id: string) => {
    setMembers((prev) =>
      prev.map((member) =>
        member.id === id
          ? {
              ...member,
              status: member.status === 'pago' ? 'pendente' : 'pago',
              lastPayment: member.status === 'pago' ? member.lastPayment : '09/02/2026',
            }
          : member
      )
    );
  };

  return (
    <AppShell
      title="Mensalidades"
      subtitle="Controle de pagamentos, pendencias e evolucao mensal."
      actions={
        <button className="w-full rounded-xl border border-ink-200 bg-white px-4 py-2 text-sm font-semibold text-ink-700 hover:border-ink-300 sm:w-auto">
          Exportar relatorio
        </button>
      }
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-floating">
          <div className="text-xs uppercase tracking-[0.2em] text-ink-300">Total previsto</div>
          <div className="mt-2 text-2xl font-semibold text-ink-900">R$ {formatBRL(totals.total)}</div>
        </div>
        <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-floating">
          <div className="text-xs uppercase tracking-[0.2em] text-ink-300">Recebido</div>
          <div className="mt-2 text-2xl font-semibold text-emerald-600">R$ {formatBRL(totals.paid)}</div>
        </div>
        <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-floating">
          <div className="text-xs uppercase tracking-[0.2em] text-ink-300">Inadimplencia</div>
          <div className="mt-2 text-2xl font-semibold text-rose-500">
            {formatBRL(Math.max(0, totals.total - totals.paid))}
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
            <input
              className="w-full rounded-xl border border-ink-100 bg-white px-3 py-2 text-sm text-ink-700 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100 md:w-72"
              placeholder="Buscar membro..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className="mt-4 flex flex-col gap-3">
            {filtered.map((member) => (
              <div key={member.id} className="rounded-2xl border border-ink-100 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-ink-900">{member.name}</div>
                    <div className="text-xs text-ink-400">Ultimo pagamento: {member.lastPayment}</div>
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
                      onClick={() => handleToggle(member.id)}
                      className="rounded-lg border border-ink-200 px-3 py-1 text-xs font-semibold text-ink-600 hover:border-ink-300"
                    >
                      Alternar
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="py-8 text-center text-sm text-ink-400">Nenhum membro encontrado.</div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-floating">
          <div className="text-xs uppercase tracking-[0.2em] text-ink-300">Evolucao</div>
          <div className="text-lg font-semibold text-ink-900">Recebimentos por mes</div>
          <div className="mt-4">
            <RollerCoasterChart
              data={monthlySeries.data}
              height={110}
              labels={monthlySeries.labels}
              strokeColor="#7c3aed"
              fillColor="rgba(124,58,237,0.28)"
              dotColor="#6d28d9"
              valueFormatter={(value) => `R$ ${formatBRL(value)}`}
            />
          </div>
          <div className="mt-3 text-xs text-ink-400">Meta atual: R$ 3.000,00 • Atualiza conforme pagamentos</div>
        </div>
      </div>
    </AppShell>
  );
}
