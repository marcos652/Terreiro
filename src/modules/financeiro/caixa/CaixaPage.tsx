import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import AppShell from '@components/AppShell';
import {
  addCashTransaction,
  getCashTransactions,
  CashTransaction,
} from '@services/transactionService';
import { getMemberships, MembershipItem } from '@services/membershipService';
import { useAuth } from '@contexts/AuthContext';
import { useToast } from '@contexts/ToastContext';
import { SkeletonCards, SkeletonList } from '@components/SkeletonLoader';
import { logService } from '@services/logService';
import { db } from '@services/firebase';
import { doc, getDoc, setDoc, collection, getDocs, orderBy, query } from 'firebase/firestore';
import { COLLECTIONS } from '@services/firestoreCollections';

const GOAL_DOC_ID = 'caixa_goal';

// Máscara de moeda brasileira: 1500 -> 1.500,00
const formatCurrencyInput = (raw: string): string => {
  // Remove tudo que não é dígito
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  // Converte para centavos
  const cents = parseInt(digits, 10);
  // Formata como BRL
  const formatted = (cents / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return formatted;
};

// Converte "1.500,00" -> 1500.00
const parseBRLCurrency = (formatted: string): number => {
  if (!formatted) return 0;
  const cleaned = formatted.replace(/\./g, '').replace(',', '.');
  const val = parseFloat(cleaned);
  return Number.isNaN(val) ? 0 : val;
};

export default function CaixaPage() {
  const formatBRL = (value: number) =>
    new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  const { user, loading: authLoading, profile } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const normalizedRole = (profile?.role || '').trim().toUpperCase();
  const isMaster = normalizedRole === 'MASTER';
  const isEditor = normalizedRole === 'EDITOR';
  const permissions = profile?.permissions || [];
  const canEdit = isMaster || (isEditor && permissions.includes('caixa'));
  const [transactions, setTransactions] = useState<CashTransaction[]>([]);
  const [filter, setFilter] = useState<'todos' | 'entrada' | 'saida'>('todos');
  const [monthFilter, setMonthFilter] = useState('');
  const [form, setForm] = useState({ label: '', amount: '', type: 'entrada', method: 'Pix' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // ── Meta do Caixa ──
  const [goalValue, setGoalValue] = useState<number>(0);
  const [goalInput, setGoalInput] = useState('');
  const [editingGoal, setEditingGoal] = useState(false);
  const [savingGoal, setSavingGoal] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [user, authLoading, router]);

  // Carregar meta do Firestore
  useEffect(() => {
    if (!user) return;
    const loadGoal = async () => {
      try {
        const goalDoc = await getDoc(doc(db, COLLECTIONS.SETTINGS, GOAL_DOC_ID));
        if (goalDoc.exists()) {
          const data = goalDoc.data();
          setGoalValue(data.value || 0);
        }
      } catch (err) {
        console.error('Erro ao carregar meta do caixa:', err);
      }
    };
    loadGoal();
  }, [user]);

  useEffect(() => {
    let active = true;
    if (!user) return () => {};
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
  }, [user]);

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
    let result = transactions;
    // Filtro por tipo
    if (filter !== 'todos') {
      result = result.filter((t) => t.type === filter);
    }
    // Filtro por mês
    if (monthFilter) {
      result = result.filter((t) => {
        if (!t.date) return false;
        const parts = t.date.split('/');
        if (parts.length !== 3) return false;
        const key = `${parts[2]}-${parts[1]}`;
        return key === monthFilter;
      });
    }
    return result;
  }, [transactions, filter, monthFilter]);

  const progressPercent = goalValue > 0 ? Math.min(100, (totals.saldo / goalValue) * 100) : 0;

  const handleSaveGoal = async () => {
    const parsed = Number(String(goalInput).replace(',', '.'));
    if (Number.isNaN(parsed) || parsed < 0) return;
    setSavingGoal(true);
    try {
      await setDoc(doc(db, COLLECTIONS.SETTINGS, GOAL_DOC_ID), {
        value: parsed,
        updated_at: new Date().toISOString(),
        updated_by: profile?.email || 'unknown',
      }, { merge: true });
      setGoalValue(parsed);
      setEditingGoal(false);
      setGoalInput('');
    } catch (err) {
      console.error('Erro ao salvar meta:', err);
    } finally {
      setSavingGoal(false);
    }
  };

  // ── Exportar Relatório Analítico Contábil ──
  const handleExportReport = async () => {
    setExporting(true);
    try {
      // Buscar mensalidades
      const memberships = await getMemberships();
      const paidMemberships = memberships.filter((m) => m.status === 'pago');
      const pendingMemberships = memberships.filter((m) => m.status === 'pendente');
      const totalMensalidadesPago = paidMemberships.reduce((sum, m) => sum + m.value, 0);
      const totalMensalidadesPendente = pendingMemberships.reduce((sum, m) => sum + m.value, 0);

      // Buscar doações
      type Doacao = { id: string; doador: string; valor: number; data: string; descricao: string };
      let doacoes: Doacao[] = [];
      try {
        const q = query(collection(db, COLLECTIONS.DOACOES), orderBy('created_at', 'desc'));
        const snap = await getDocs(q);
        doacoes = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Doacao[];
      } catch (err) {
        console.error('Erro ao buscar doações para relatório:', err);
      }
      const totalDoacoes = doacoes.reduce((sum, d) => sum + (d.valor || 0), 0);

      // Dados do caixa (já carregados)
      const caixaEntradas = transactions.filter((t) => t.type === 'entrada');
      const caixaSaidas = transactions.filter((t) => t.type === 'saida');
      const totalEntradas = caixaEntradas.reduce((sum, t) => sum + t.amount, 0);
      const totalSaidas = caixaSaidas.reduce((sum, t) => sum + t.amount, 0);
      const saldoCaixa = totalEntradas - totalSaidas;

      const dataHoje = new Date().toLocaleDateString('pt-BR');
      const horaHoje = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      const esc = (v: string | number) => {
        const t = String(v ?? '');
        if (t.includes('"') || t.includes(';') || t.includes('\n')) return `"${t.replace(/"/g, '""')}"`;
        return t;
      };
      const fmtVal = (v: number) => formatBRL(v);

      const lines: string[] = [];

      // ══ Cabeçalho ══
      lines.push('RELATÓRIO ANALÍTICO CONTÁBIL');
      lines.push(`Data de emissão;${dataHoje} às ${horaHoje}`);
      lines.push(`Emitido por;${profile?.email || 'Sistema'}`);
      lines.push('');

      // ══ Resumo Geral ══
      lines.push('═══════════════════════════════════════');
      lines.push('RESUMO GERAL');
      lines.push('═══════════════════════════════════════');
      lines.push(`Saldo do Caixa;R$ ${fmtVal(saldoCaixa)}`);
      lines.push(`Total Entradas (Caixa);R$ ${fmtVal(totalEntradas)}`);
      lines.push(`Total Saídas (Caixa);R$ ${fmtVal(totalSaidas)}`);
      lines.push('');
      lines.push(`Total Mensalidades Recebidas;R$ ${fmtVal(totalMensalidadesPago)}`);
      lines.push(`Total Mensalidades Pendentes;R$ ${fmtVal(totalMensalidadesPendente)}`);
      lines.push(`Membros Pagos;${paidMemberships.length}`);
      lines.push(`Membros Pendentes;${pendingMemberships.length}`);
      lines.push('');
      lines.push(`Total Doações;R$ ${fmtVal(totalDoacoes)}`);
      lines.push(`Quantidade de Doações;${doacoes.length}`);
      lines.push('');
      const receitaTotal = totalMensalidadesPago + totalDoacoes;
      lines.push(`Receita Total (Mensalidades + Doações);R$ ${fmtVal(receitaTotal)}`);
      if (goalValue > 0) {
        lines.push(`Meta do Caixa;R$ ${fmtVal(goalValue)}`);
        lines.push(`Progresso da Meta;${progressPercent.toFixed(1)}%`);
      }
      lines.push('');

      // ══ Seção Caixa ══
      lines.push('═══════════════════════════════════════');
      lines.push('MOVIMENTAÇÕES DO CAIXA');
      lines.push('═══════════════════════════════════════');
      lines.push('Data;Descrição;Tipo;Método;Valor');
      transactions.forEach((t) => {
        lines.push(
          [esc(t.date), esc(t.label), t.type === 'entrada' ? 'Entrada' : 'Saída', esc(t.method), `R$ ${fmtVal(t.amount)}`]
            .join(';')
        );
      });
      lines.push('');
      lines.push(`Subtotal Entradas;;Entrada;;R$ ${fmtVal(totalEntradas)}`);
      lines.push(`Subtotal Saídas;;Saída;;R$ ${fmtVal(totalSaidas)}`);
      lines.push(`Saldo;;;;;;R$ ${fmtVal(saldoCaixa)}`);
      lines.push('');

      // ══ Seção Mensalidades ══
      lines.push('═══════════════════════════════════════');
      lines.push('MENSALIDADES');
      lines.push('═══════════════════════════════════════');
      lines.push('Mês;Nome;Valor;Status;Último Pagamento');
      // Agrupar por mês
      const byMonth = new Map<string, MembershipItem[]>();
      memberships.forEach((m) => {
        const key = m.month || 'sem-mes';
        if (!byMonth.has(key)) byMonth.set(key, []);
        byMonth.get(key)!.push(m);
      });
      const sortedMonths = Array.from(byMonth.keys()).sort().reverse();
      sortedMonths.forEach((month) => {
        const items = byMonth.get(month) || [];
        items.forEach((m) => {
          lines.push(
            [esc(month), esc(m.name), `R$ ${fmtVal(m.value)}`, m.status === 'pago' ? 'Pago' : 'Pendente', esc(m.lastPayment)]
              .join(';')
          );
        });
      });
      lines.push('');
      lines.push(`Subtotal Pago;;;;R$ ${fmtVal(totalMensalidadesPago)}`);
      lines.push(`Subtotal Pendente;;;;R$ ${fmtVal(totalMensalidadesPendente)}`);
      lines.push('');

      // ══ Seção Doações ══
      lines.push('═══════════════════════════════════════');
      lines.push('DOAÇÕES');
      lines.push('═══════════════════════════════════════');
      lines.push('Data;Doador;Valor;Descrição');
      doacoes.forEach((d) => {
        lines.push(
          [esc(d.data), esc(d.doador), `R$ ${fmtVal(d.valor || 0)}`, esc(d.descricao || '')]
            .join(';')
        );
      });
      lines.push('');
      lines.push(`Subtotal Doações;;;R$ ${fmtVal(totalDoacoes)}`);
      lines.push('');

      // ══ Rodapé ══
      lines.push('═══════════════════════════════════════');
      lines.push(`Relatório gerado automaticamente pelo sistema Terreiro em ${dataHoje}`);

      // Gerar CSV
      const bom = '\uFEFF';
      const csv = bom + lines.join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `relatorio-contabil-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Erro ao gerar relatório:', err);
    } finally {
      setExporting(false);
    }
  };

  const handleAmountChange = (raw: string) => {
    const masked = formatCurrencyInput(raw);
    setForm((prev) => ({ ...prev, amount: masked }));
  };

  const handleAdd = async () => {
    if (!canEdit) return;
    const amountNumber = parseBRLCurrency(form.amount);
    if (!form.label || amountNumber <= 0) {
      setErrorMsg('Preencha descrição e valor numérico maior que zero.');
      return;
    }
    setSaving(true);
    setErrorMsg('');
    const payload: Omit<CashTransaction, 'id'> = {
      label: form.label,
      type: form.type as 'entrada' | 'saida',
      amount: amountNumber,
      date: new Date().toLocaleDateString('pt-BR'),
      method: form.method,
      created_at: new Date().toISOString(),
    };
    try {
      const id = await addCashTransaction(payload, profile?.email);
      setTransactions((prev) => [{ id, ...payload }, ...prev]);
      setForm({ label: '', amount: '', type: 'entrada', method: 'Pix' });
      showToast(
        `${payload.type === 'entrada' ? 'Entrada' : 'Saída'} de R$ ${formatBRL(amountNumber)} registrada!`,
        payload.type === 'entrada' ? 'success' : 'info'
      );
    } catch (err: any) {
      console.error('Erro ao registrar movimento', err);
      const code = err?.code || '';
      if (code === 'permission-denied') {
        setErrorMsg('Sem permissão para registrar. Precisa ser MASTER.');
      } else {
        setErrorMsg('Não foi possível registrar. Verifique permissão ou conexão.');
      }
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || (!user && typeof window !== 'undefined')) {
    return <div className="flex items-center justify-center min-h-screen">Carregando...</div>;
  }

  return (
    <AppShell
      title="Caixa"
      subtitle="Fluxo de entradas, saídas e saldo diário."
      actions={
        <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:items-center">
          <button
            onClick={handleExportReport}
            disabled={exporting || loading}
            className="w-full rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 hover:border-indigo-300 hover:bg-indigo-100 disabled:opacity-60 sm:w-auto"
          >
            {exporting ? 'Gerando...' : '📊 Relatório Contábil'}
          </button>
          <button
            onClick={() => setForm((prev) => ({ ...prev, type: 'entrada' }))}
            disabled={!canEdit}
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
            disabled={!canEdit}
            className={`w-full rounded-xl border px-4 py-2 text-sm font-semibold sm:w-auto ${
              form.type === 'saida'
                ? 'border-rose-500 bg-rose-500 text-white'
                : 'border-ink-200 bg-white text-ink-700 hover:border-ink-300'
            }`}
          >
            Retirada
          </button>
        </div>
      }
    >
      {/* ── Meta do Caixa com barra de progresso ── */}
      <div className="mb-6 rounded-2xl border border-ink-100 bg-white p-5 shadow-floating">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-ink-300">Meta do Caixa</div>
            {goalValue > 0 ? (
              <div className="mt-1 text-lg font-semibold text-ink-900">
                R$ {formatBRL(totals.saldo)}{' '}
                <span className="text-sm font-normal text-ink-400">/ R$ {formatBRL(goalValue)}</span>
              </div>
            ) : (
              <div className="mt-1 text-sm text-ink-400">Nenhuma meta definida</div>
            )}
          </div>
          <div className="flex items-center gap-3">
            {goalValue > 0 && (
              <div className="text-right">
                <div className="text-2xl font-bold text-ink-900">{progressPercent.toFixed(0)}%</div>
                <div className="text-xs text-ink-400">alcançado</div>
              </div>
            )}
          </div>
        </div>

        {goalValue > 0 && (
          <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-ink-100">
            <div
              className={`h-full rounded-full transition-all duration-700 ease-out ${
                progressPercent >= 100
                  ? 'bg-emerald-500'
                  : progressPercent >= 50
                  ? 'bg-amber-400'
                  : 'bg-rose-400'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}

        {/* Formulário para definir meta */}
        {canEdit && (
          <div className="mt-4 rounded-xl border border-ink-100 bg-ink-50/80 p-3">
            <div className="text-[11px] uppercase tracking-[0.25em] text-ink-400">
              {goalValue > 0 ? 'Alterar meta' : 'Definir meta'}
            </div>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-400">R$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-full rounded-lg border border-ink-200 bg-white py-2 pl-10 pr-3 text-sm text-ink-700 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                  placeholder={goalValue > 0 ? formatBRL(goalValue) : 'Ex.: 5000'}
                  value={goalInput}
                  onChange={(e) => setGoalInput(e.target.value)}
                />
              </div>
              <button
                onClick={handleSaveGoal}
                disabled={savingGoal || !goalInput || Number(goalInput) < 0}
                className="rounded-lg bg-ink-900 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-ink-700 disabled:opacity-60"
                type="button"
              >
                {savingGoal ? 'Salvando...' : goalValue > 0 ? 'Atualizar meta' : 'Salvar meta'}
              </button>
              {goalValue > 0 && (
                <button
                  onClick={async () => {
                    setSavingGoal(true);
                    try {
                      await setDoc(doc(db, COLLECTIONS.SETTINGS, GOAL_DOC_ID), {
                        value: 0,
                        updated_at: new Date().toISOString(),
                        updated_by: profile?.email || 'unknown',
                      }, { merge: true });
                      setGoalValue(0);
                      setGoalInput('');
                    } catch (err) {
                      console.error('Erro ao remover meta:', err);
                    } finally {
                      setSavingGoal(false);
                    }
                  }}
                  disabled={savingGoal}
                  className="rounded-lg border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-500 hover:border-rose-300 hover:bg-rose-50 disabled:opacity-60"
                  type="button"
                >
                  Remover
                </button>
              )}
            </div>
            {goalValue > 0 && totals.saldo >= goalValue && (
              <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                <span>🎉</span> Meta atingida! Parabéns!
              </div>
            )}
            {goalValue > 0 && totals.saldo < goalValue && (
              <div className="mt-2 text-[11px] text-ink-400">
                Faltam R$ {formatBRL(goalValue - totals.saldo)} para atingir a meta
              </div>
            )}
          </div>
        )}

        {!canEdit && goalValue > 0 && (
          <div className="mt-3 text-xs text-ink-400">
            {totals.saldo >= goalValue
              ? '🎉 Meta atingida!'
              : `Faltam R$ ${formatBRL(goalValue - totals.saldo)} para atingir a meta`}
          </div>
        )}
      </div>

      {loading ? <SkeletonCards /> : (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-floating">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-500">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
            </div>
            <div className="text-xs uppercase tracking-[0.2em] text-ink-300">Saldo</div>
          </div>
          <div className="mt-2 text-2xl font-semibold text-ink-900">
            {transactions.length > 0 ? `R$ ${formatBRL(totals.saldo)}` : '—'}
          </div>
        </div>
        <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-floating">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-500">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
            </div>
            <div className="text-xs uppercase tracking-[0.2em] text-ink-300">Entradas</div>
          </div>
          <div className="mt-2 text-2xl font-semibold text-emerald-600">
            {transactions.length > 0 ? `R$ ${formatBRL(totals.entradas)}` : '—'}
          </div>
        </div>
        <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-floating">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-rose-500">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M19 12l-7 7-7-7" /></svg>
            </div>
            <div className="text-xs uppercase tracking-[0.2em] text-ink-300">Saídas</div>
          </div>
          <div className="mt-2 text-2xl font-semibold text-rose-500">
            {transactions.length > 0 ? `R$ ${formatBRL(totals.saidas)}` : '—'}
          </div>
        </div>
      </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_2fr]">
        <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-floating">
          <div className="text-xs uppercase tracking-[0.2em] text-ink-300">Novo lançamento</div>
          <div className="mt-4 flex flex-col gap-3">
            <input
              className="rounded-xl border border-ink-100 bg-white px-3 py-2 text-sm text-ink-700 focus:border-ink-400 focus:outline-none focus:ring-2 focus:ring-ink-100"
              placeholder="Descrição"
              value={form.label}
              onChange={(event) => setForm((prev) => ({ ...prev, label: event.target.value }))}
              disabled={!canEdit}
            />
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-ink-400">R$</span>
              <input
                type="text"
                inputMode="numeric"
                className="w-full rounded-xl border border-ink-100 bg-white py-2 pl-10 pr-3 text-sm text-ink-700 focus:border-ink-400 focus:outline-none focus:ring-2 focus:ring-ink-100"
                placeholder="0,00"
                value={form.amount}
                onChange={(event) => handleAmountChange(event.target.value)}
                disabled={!canEdit}
              />
            </div>
            <div className="flex gap-2">
              <select
                className="w-full rounded-xl border border-ink-100 bg-white px-3 py-2 text-sm text-ink-700 focus:border-ink-400 focus:outline-none focus:ring-2 focus:ring-ink-100"
                value={form.type}
                onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value }))}
                disabled={!canEdit}
              >
                <option value="entrada">Entrada</option>
                <option value="saida">Saída</option>
              </select>
              <select
                className="w-full rounded-xl border border-ink-100 bg-white px-3 py-2 text-sm text-ink-700 focus:border-ink-400 focus:outline-none focus:ring-2 focus:ring-ink-100"
                value={form.method}
                onChange={(event) => setForm((prev) => ({ ...prev, method: event.target.value }))}
                disabled={!canEdit}
              >
                <option>Pix</option>
                <option>Dinheiro</option>
                <option>Cartão</option>
              </select>
            </div>
            <button
              onClick={handleAdd}
              className="w-full rounded-xl bg-ink-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-ink-700 disabled:opacity-60"
              disabled={!canEdit || saving}
            >
              {saving ? 'Salvando...' : 'Registrar movimento'}
            </button>
            {errorMsg && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                {errorMsg}
              </div>
            )}
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
            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <input
                type="month"
                className="rounded-xl border border-ink-100 bg-white px-3 py-1.5 text-xs text-ink-700 focus:border-ink-400 focus:outline-none focus:ring-2 focus:ring-ink-100"
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
              />
              {monthFilter && (
                <button
                  onClick={() => setMonthFilter('')}
                  className="rounded-full bg-ink-100 px-2.5 py-1 text-[10px] font-semibold text-ink-500 hover:bg-ink-200"
                >
                  Limpar filtro
                </button>
              )}
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
            {loading && <SkeletonList />}
            {!loading && filtered.length === 0 && (
              <div className="flex flex-col items-center gap-3 py-10">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-ink-50 text-2xl">📋</div>
                <div className="text-sm font-medium text-ink-500">Nenhum lançamento encontrado</div>
                <div className="text-xs text-ink-400">Registre um movimento para começar</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
