import React, { useEffect, useMemo, useState } from 'react';
import AppShell from '@components/AppShell';
import { useAuth } from '@contexts/AuthContext';
import { addCashTransaction, getCashTransactions, CashTransaction } from '@services/transactionService';

export default function DoacoesPage() {
  const { profile } = useAuth();
  const normalizedRole = (profile?.role || '').trim().toUpperCase();
  const isMaster = normalizedRole === 'MASTER';
  const isEditor = normalizedRole === 'EDITOR';
  const permissions = profile?.permissions || [];
  const canEdit = isMaster || (isEditor && permissions.includes('caixa'));

  const [donor, setDonor] = useState('');
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [transactions, setTransactions] = useState<CashTransaction[]>([]);

  useEffect(() => {
    getCashTransactions()
      .then((data) => {
        setTransactions(data.filter((t) => (t.method || '').toLowerCase() === 'doação'));
      })
      .finally(() => setLoading(false));
  }, []);

  const total = useMemo(
    () => transactions.reduce((acc, t) => acc + Number(t.amount || 0), 0),
    [transactions]
  );

  const handleAdd = async () => {
    if (!canEdit) return;
    const amount = Number(value);
    if (!donor.trim() || !amount || amount <= 0) return;
    setSaving(true);
    try {
      const payload: Omit<CashTransaction, 'id'> = {
        label: `Doação - ${donor.trim()}`,
        amount,
        type: 'entrada',
        method: 'Doação',
        created_at: new Date().toISOString(),
      };
      const id = await addCashTransaction(payload, profile?.email);
      setTransactions((prev) => [{ id, ...payload }, ...prev]);
      setDonor('');
      setValue('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell title="Doações" subtitle="Registre entradas de doadores e atualize o caixa.">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_0.9fr]">
        <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-floating">
          <div className="text-xs uppercase tracking-[0.2em] text-ink-300">Nova doação</div>
          <div className="mt-3 flex flex-col gap-3">
            <input
              className="rounded-xl border border-ink-100 bg-white px-3 py-2 text-sm text-ink-700 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
              placeholder="Nome do doador"
              value={donor}
              onChange={(e) => setDonor(e.target.value)}
              disabled={!canEdit || saving}
            />
            <input
              type="number"
              className="rounded-xl border border-ink-100 bg-white px-3 py-2 text-sm text-ink-700 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
              placeholder="Valor"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              disabled={!canEdit || saving}
              min="0"
              step="0.01"
            />
            <button
              onClick={handleAdd}
              disabled={!canEdit || saving || !donor.trim() || !value}
              className="w-full rounded-xl bg-ink-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-ink-700 disabled:opacity-60"
            >
              {saving ? 'Registrando...' : 'Registrar doação'}
            </button>
            {!canEdit && (
              <div className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700">
                Você não tem permissão para registrar doações.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-floating">
          <div className="text-xs uppercase tracking-[0.2em] text-ink-300">Total recebido</div>
          <div className="mt-2 text-3xl font-semibold text-emerald-600">
            R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mt-4 text-xs text-ink-400">Somatório de todas as doações registradas.</div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-ink-100 bg-white p-5 shadow-floating">
        <div className="text-xs uppercase tracking-[0.2em] text-ink-300">Histórico</div>
        {loading ? (
          <div className="py-6 text-sm text-ink-400">Carregando...</div>
        ) : transactions.length === 0 ? (
          <div className="py-6 text-sm text-ink-400">Nenhuma doação registrada.</div>
        ) : (
          <div className="mt-3 space-y-2">
            {transactions.map((t) => (
              <div key={t.id} className="rounded-xl border border-ink-100 bg-ink-50/60 p-3">
                <div className="flex items-center justify-between text-sm font-semibold text-ink-900">
                  <span>{t.label}</span>
                  <span className="text-emerald-600">R$ {Number(t.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="mt-1 text-xs text-ink-400">{new Date(t.created_at).toLocaleDateString('pt-BR')}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
