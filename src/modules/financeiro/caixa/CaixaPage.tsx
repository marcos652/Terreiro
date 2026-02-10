import React, { useEffect, useMemo, useState } from 'react';
import AppShell from '@components/AppShell';
import {
  addCashTransaction,
  getCashTransactions,
  CashTransaction,
} from '@services/transactionService';

const initialTransactions: CashTransaction[] = [];

export default function CaixaPage() {
  const formatBRL = (value: number) =>
    new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  const [transactions, setTransactions] = useState<CashTransaction[]>([]);
  const [filter, setFilter] = useState<'todos' | 'entrada' | 'saida'>('todos');
  const [form, setForm] = useState({ label: '', amount: '', type: 'entrada', method: 'Pix' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getCashTransactions()
      .then((data) => {
        if (!active) return;
        setTransactions(data);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const totals = useMemo(() => {
    const entradas = transactions.filter((t) => t.type === 'entrada').reduce((acc, t) => acc + t.amount, 0);
    const saidas = transactions.filter((t) => t.type === 'saida').reduce((acc, t) => acc + t.amount, 0);
    return {
      entradas,
      saidas,
      saldo: entradas - saidas,
    };
  }, [transactions]);

  const filtered = useMemo(() => {
    if (filter === 'todos') {
      return transactions;
    }
    return transactions.filter((t) => t.type === filter);
  }, [transactions, filter]);

  const handleAdd = async () => {
    if (!form.label || !form.amount) {
      return;
    }
    const payload: Omit<CashTransaction, 'id'> = {
      label: form.label,
      type: form.type as 'entrada' | 'saida',
      amount: Number(form.amount),
      date: new Date().toLocaleDateString('pt-BR'),
      method: form.method,
      created_at: new Date().toISOString(),
    };
    const id = await addCashTransaction(payload);
    setTransactions((prev) => [{ id, ...payload }, ...prev]);
    setForm({ label: '', amount: '', type: 'entrada', method: 'Pix' });
  };

  return (
    <AppShell
      title="Caixa"
      subtitle="Fluxo de entradas, saídas e saldo diário."
      actions={
        <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:items-center">
          <button
            onClick={() => setForm((prev) => ({ ...prev, type: 'entrada' }))}
            className={`w-full rounded-xl border px-4 py-2 text-sm font-semibold sm:w-auto ${
              form.type === 'entrada'
                ? 'border-emerald-500 bg-emerald-500 text-white'
                : 'border-ink-200 bg-white text-ink-700 hover:border-ink-300'
            }`}
          >
            Entrada
          </button>
          <button
            onClick={() => setForm((prev) => ({ ...prev, type: 'saida' }))}
            className={`w-full rounded-xl border px-4 py-2 text-sm font-semibold sm:w-auto ${
              form.type === 'saida'
                ? 'border-rose-500 bg-rose-500 text-white'
                : 'border-ink-200 bg-white text-ink-700 hover:border-ink-300'
            }`}
          >
            Retirada
          </button>
          <button
            onClick={handleAdd}
            className="w-full rounded-xl bg-ink-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-ink-700 sm:w-auto"
          >
            Registrar movimento
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-floating">
          <div className="text-xs uppercase tracking-[0.2em] text-ink-300">Saldo</div>
          <div className="mt-2 text-2xl font-semibold text-ink-900">
            {transactions.length > 0 ? `R$ ${formatBRL(totals.saldo)}` : '—'}
          </div>
        </div>
        <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-floating">
          <div className="text-xs uppercase tracking-[0.2em] text-ink-300">Entradas</div>
          <div className="mt-2 text-2xl font-semibold text-emerald-600">
            {transactions.length > 0 ? `R$ ${formatBRL(totals.entradas)}` : '—'}
          </div>
        </div>
        <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-floating">
          <div className="text-xs uppercase tracking-[0.2em] text-ink-300">Saídas</div>
          <div className="mt-2 text-2xl font-semibold text-rose-500">
            {transactions.length > 0 ? `R$ ${formatBRL(totals.saidas)}` : '—'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_2fr]">
        <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-floating">
          <div className="text-xs uppercase tracking-[0.2em] text-ink-300">Novo lançamento</div>
          <div className="mt-4 flex flex-col gap-3">
            <input
              className="rounded-xl border border-ink-100 bg-white px-3 py-2 text-sm text-ink-700 focus:border-ink-400 focus:outline-none focus:ring-2 focus:ring-ink-100"
              placeholder="Descrição"
              value={form.label}
              onChange={(event) => setForm((prev) => ({ ...prev, label: event.target.value }))}
            />
            <input
              type="number"
              className="rounded-xl border border-ink-100 bg-white px-3 py-2 text-sm text-ink-700 focus:border-ink-400 focus:outline-none focus:ring-2 focus:ring-ink-100"
              placeholder="Valor"
              value={form.amount}
              onChange={(event) => setForm((prev) => ({ ...prev, amount: Number(event.target.value) }))}
            />
            <div className="flex gap-2">
              <select
                className="w-full rounded-xl border border-ink-100 bg-white px-3 py-2 text-sm text-ink-700 focus:border-ink-400 focus:outline-none focus:ring-2 focus:ring-ink-100"
                value={form.type}
                onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value }))}
              >
                <option value="entrada">Entrada</option>
                <option value="saida">Saída</option>
              </select>
              <select
                className="w-full rounded-xl border border-ink-100 bg-white px-3 py-2 text-sm text-ink-700 focus:border-ink-400 focus:outline-none focus:ring-2 focus:ring-ink-100"
                value={form.method}
                onChange={(event) => setForm((prev) => ({ ...prev, method: event.target.value }))}
              >
                <option>Pix</option>
                <option>Dinheiro</option>
                <option>Cartão</option>
              </select>
            </div>
            <div className="rounded-xl border border-ink-100 bg-ink-50 p-3 text-xs text-ink-500">
              Os lançamentos são exibidos no histórico imediatamente.
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-floating">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-ink-300">Histórico</div>
              <div className="text-lg font-semibold text-ink-900">Movimentos recentes</div>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-ink-400">
              <button
                onClick={() => setFilter('todos')}
                className={`rounded-full px-3 py-1 ${filter === 'todos' ? 'bg-ink-900 text-white' : 'bg-ink-100'}`}
              >
                Todos
              </button>
              <button
                onClick={() => setFilter('entrada')}
                className={`rounded-full px-3 py-1 ${
                  filter === 'entrada' ? 'bg-emerald-500 text-white' : 'bg-ink-100'
                }`}
              >
                Entradas
              </button>
              <button
                onClick={() => setFilter('saida')}
                className={`rounded-full px-3 py-1 ${
                  filter === 'saida' ? 'bg-rose-500 text-white' : 'bg-ink-100'
                }`}
              >
                Saídas
              </button>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-3">
            {filtered.map((transaction) => (
              <div key={transaction.id} className="rounded-2xl border border-ink-100 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-ink-900">{transaction.label}</div>
                    <div className="text-xs text-ink-400">
                      {transaction.date} • {transaction.method}
                    </div>
                  </div>
                  <div
                    className={`text-sm font-semibold ${
                      transaction.type === 'entrada' ? 'text-emerald-600' : 'text-rose-500'
                    }`}
                  >
                    {transaction.type === 'entrada' ? '+' : '-'} R$ {formatBRL(transaction.amount)}
                  </div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="py-6 text-center text-sm text-ink-400">Carregando lançamentos...</div>
            )}
            {!loading && filtered.length === 0 && (
              <div className="py-8 text-center text-sm text-ink-400">Nenhum lançamento encontrado.</div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
