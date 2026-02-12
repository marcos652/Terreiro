import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@contexts/AuthContext';
import { useTestFirestore } from './useTestFirestore';
import AppShell from '@components/AppShell';
import LineChart from '@components/charts/LineChart';
import { seedFirestoreBaseData } from '@services/seedService';
import { db } from '@services/firebase';
import {
  addDoc,
  collection,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  writeBatch,
  updateDoc,
  deleteDoc,
  doc,
} from 'firebase/firestore';
import { COLLECTIONS } from '@services/firestoreCollections';

type ActivityItem = {
  id: string;
  label: string;
  amount: string;
  tone: 'pos' | 'neg' | 'info';
  time: string;
};

type FocusItem = { id: string; message: string; created_at: string };

type AgendaItem = {
  id: string;
  title: string;
  date: string;
  time: string;
  status: 'confirmado' | 'pendente';
  leader?: string;
};

type ActionItem = {
  id: string;
  title: string;
  status: 'pendente' | 'em_andamento' | 'concluido';
  owner: string;
  created_by: string;
  created_at: string;
};

const DashboardPage = () => {
  const formatBRL = (value: number) =>
    new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  const { user, loading, profile } = useAuth();
  const router = useRouter();
  const { data, loading: loadingData, error } = useTestFirestore();
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [focusNote, setFocusNote] = useState('');
  const [focusSavedNote, setFocusSavedNote] = useState('');
  const [focusSavedAt, setFocusSavedAt] = useState('');
  const [focusSaving, setFocusSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [cashTotal, setCashTotal] = useState(0);
  const [membersPaid, setMembersPaid] = useState({ paid: 0, total: 0 });
  const [criticalStock, setCriticalStock] = useState(0);
  const [hasCashData, setHasCashData] = useState(false);
  const [hasMembershipData, setHasMembershipData] = useState(false);
  const [hasStockData, setHasStockData] = useState(false);
  const [cashSeries, setCashSeries] = useState<number[]>([]);
  const [cashLabels, setCashLabels] = useState<string[]>([]);
  const [nextEvent, setNextEvent] = useState<{ date: string; time: string; title: string } | null>(null);
  const [clearingCash, setClearingCash] = useState(false);
  const [focusHistory, setFocusHistory] = useState<FocusItem[]>([]);
  const [agendaList, setAgendaList] = useState<AgendaItem[]>([]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [actionText, setActionText] = useState('');
  const [actionSaving, setActionSaving] = useState(false);
  const isMaster = profile?.role === 'MASTER';

  const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'year'>('month');

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user || !db) return;

    const cashRef = collection(db, COLLECTIONS.CASH_TRANSACTIONS);
    const cashUnsub = onSnapshot(cashRef, (snapshot) => {
      let entradas = 0;
      let saidas = 0;
      const recentActivity: ActivityItem[] = [];
      const byDate = new Map<string, number>();
      setHasCashData(!snapshot.empty);
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as { type: 'entrada' | 'saida'; amount: number };
        const amountValue = Number(data.amount || 0);
        const amountLabel =
          amountValue > 0
            ? `${data.type === 'entrada' ? '+' : '-'} R$ ${formatBRL(amountValue)}`
            : '—';
        if (data.type === 'entrada') entradas += Number(data.amount || 0);
        if (data.type === 'saida') saidas += Number(data.amount || 0);
        const dateLabel = (data as { date?: string }).date || '';
        if (dateLabel) {
          const current = byDate.get(dateLabel) || 0;
          const signed = data.type === 'entrada' ? amountValue : -amountValue;
          byDate.set(dateLabel, current + signed);
        }
        recentActivity.push({
          id: docSnap.id,
          label: (data as { label?: string }).label || 'Movimento',
          amount: amountLabel,
          tone: data.type === 'entrada' ? 'pos' : 'neg',
          time: (data as { date?: string }).date || '',
        });
      });
      setCashTotal(entradas - saidas);
      const sorted = Array.from(byDate.entries()).sort((a, b) => {
        const parse = (value: string) => {
          const parts = value.split('/');
          if (parts.length !== 3) return 0;
          const day = Number(parts[0]);
          const month = Number(parts[1]) - 1;
          const year = Number(parts[2]);
          return new Date(year, month, day).getTime();
        };
        return parse(a[0]) - parse(b[0]);
      });
      setCashLabels(sorted.map(([label]) => label));
      setCashSeries(sorted.map(([, value]) => value));
      setActivity(recentActivity.slice(0, 5));
    });

    const membershipRef = collection(db, COLLECTIONS.MEMBERSHIPS);
    const membershipUnsub = onSnapshot(membershipRef, (snapshot) => {
      let total = 0;
      let paid = 0;
      setHasMembershipData(!snapshot.empty);
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as { status: 'pago' | 'pendente'; value: number };
        total += Number(data.value || 0);
        if (data.status === 'pago') paid += Number(data.value || 0);
      });
      setMembersPaid({ paid, total });
    });

    const stockRef = collection(db, COLLECTIONS.STOCK_ITEMS);
    const stockUnsub = onSnapshot(stockRef, (snapshot) => {
      let critical = 0;
      setHasStockData(!snapshot.empty);
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as { quantity: number };
        if (Number(data.quantity || 0) <= 0) critical += 1;
      });
      setCriticalStock(critical);
    });

    const eventsQuery = query(collection(db, COLLECTIONS.EVENTS), orderBy('date', 'asc'), limit(1));
    const eventsUnsub = onSnapshot(eventsQuery, (snapshot) => {
      const docSnap = snapshot.docs[0];
      if (!docSnap) {
        setNextEvent(null);
        return;
      }
      const data = docSnap.data() as { date: string; time: string; title: string };
      setNextEvent({ date: data.date, time: data.time, title: data.title });
    });

    const agendaQuery = query(collection(db, COLLECTIONS.EVENTS), orderBy('date', 'asc'), limit(4));
    const agendaUnsub = onSnapshot(agendaQuery, (snapshot) => {
      const list: AgendaItem[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data() as AgendaItem;
        return {
          id: docSnap.id,
          title: data.title,
          date: data.date,
          time: data.time,
          status: data.status || 'pendente',
          leader: data.leader,
        };
      });
      setAgendaList(list);
    });

    const focusQuery = query(
      collection(db, COLLECTIONS.FOCUS_NOTES),
      orderBy('created_at', 'desc'),
      limit(5)
    );
    const focusUnsub = onSnapshot(focusQuery, (snapshot) => {
      const docSnap = snapshot.docs[0];
      if (!docSnap) {
        setFocusSavedNote('');
        setFocusSavedAt('');
        setFocusHistory([]);
        return;
      }
      const data = docSnap.data() as { message?: string; created_at?: string };
      setFocusSavedNote(data.message || '');
      setFocusSavedAt(data.created_at || '');
      const history = snapshot.docs.map((item) => {
        const focusData = item.data() as { message?: string; created_at?: string };
        return {
          id: item.id,
          message: focusData.message || '',
          created_at: focusData.created_at || '',
        };
      });
      setFocusHistory(history);
    });

    const actionsQuery = query(
      collection(db, COLLECTIONS.ACTION_ITEMS),
      orderBy('created_at', 'desc'),
      limit(10)
    );
    const actionsUnsub = onSnapshot(actionsQuery, (snapshot) => {
      const list: ActionItem[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data() as ActionItem;
        return {
          id: docSnap.id,
          title: data.title,
          status: data.status || 'pendente',
          owner: data.owner || 'Membro',
          created_by: data.created_by,
          created_at: data.created_at,
        };
      });
      setActionItems(list);
    });

    return () => {
      cashUnsub();
      membershipUnsub();
      stockUnsub();
      eventsUnsub();
      focusUnsub();
      agendaUnsub();
      actionsUnsub();
    };
  }, [user]);

  const rollerData = useMemo(() => cashSeries, [cashSeries]);

  const filteredCashData = useMemo(() => {
    const now = new Date();
    const filtered = cashSeries.filter((_, index) => {
      const date = new Date(cashLabels[index].split('/').reverse().join('-'));
      switch (period) {
        case 'day':
          return date.toDateString() === now.toDateString();
        case 'week':
          const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
          return date >= weekStart;
        case 'month':
          return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
        case 'year':
          return date.getFullYear() === now.getFullYear();
        default:
          return true;
      }
    });
    return filtered;
  }, [cashSeries, cashLabels, period]);

  const handleSeed = async () => {
    if (!db) {
      alert('Configuracao do Firebase nao encontrada.');
      return;
    }
    setSeeding(true);
    try {
      await seedFirestoreBaseData();
      alert('Campos base criados no Firestore!');
    } finally {
      setSeeding(false);
    }
  };

  const handleClearCash = async () => {
    if (!db) {
      alert('Configuracao do Firebase nao encontrada.');
      return;
    }
    const confirmed = window.confirm('Deseja apagar todos os movimentos do caixa?');
    if (!confirmed) return;
    setClearingCash(true);
    try {
      const snapshot = await getDocs(collection(db, COLLECTIONS.CASH_TRANSACTIONS));
      const batch = writeBatch(db);
      snapshot.docs.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });
      await batch.commit();
      setActivity([]);
      setCashTotal(0);
      setCashLabels([]);
      setCashSeries([]);
      setHasCashData(false);
    } finally {
      setClearingCash(false);
    }
  };

  const handleFocusSave = async () => {
    if (!db) {
      alert('Configuracao do Firebase nao encontrada.');
      return;
    }
    const message = focusNote.trim();
    if (!message) {
      return;
    }
    setFocusSaving(true);
    try {
      await addDoc(collection(db, COLLECTIONS.FOCUS_NOTES), {
        message,
        created_at: new Date().toISOString(),
      });
      setFocusNote('');
    } finally {
      setFocusSaving(false);
    }
  };

  const handleAddAction = async () => {
    if (!db || !user) {
      alert('Voce precisa estar logado para adicionar tarefas.');
      return;
    }
    const title = actionText.trim();
    if (!title) return;
    setActionSaving(true);
    try {
      await addDoc(collection(db, COLLECTIONS.ACTION_ITEMS), {
        title,
        status: 'pendente',
        owner: profile?.name || user.email || 'Membro',
        created_by: user.uid,
        created_at: new Date().toISOString(),
      });
      setActionText('');
    } catch (error) {
      console.error(error);
      alert('Nao foi possivel salvar a tarefa. Verifique permissoes e tente novamente.');
    } finally {
      setActionSaving(false);
    }
  };

  const handleUpdateActionStatus = async (item: ActionItem, status: ActionItem['status']) => {
    if (!db || !user) return;
    const canEdit = isMaster || item.created_by === user.uid;
    if (!canEdit) return;
    try {
      await updateDoc(doc(db, COLLECTIONS.ACTION_ITEMS, item.id), { status });
    } catch (error) {
      console.error(error);
      alert('Nao foi possivel atualizar a tarefa. Permissao negada?');
    }
  };

  const handleDeleteAction = async (item: ActionItem) => {
    if (!db || !isMaster) return;
    const confirmed = window.confirm(`Remover a tarefa "${item.title}"?`);
    if (!confirmed) return;
    try {
      await deleteDoc(doc(db, COLLECTIONS.ACTION_ITEMS, item.id));
    } catch (error) {
      console.error(error);
      alert('Nao foi possivel remover a tarefa. Permissao negada?');
    }
  };

  const membershipProgress =
    membersPaid.total > 0 ? Math.min(100, (membersPaid.paid / membersPaid.total) * 100) : 0;
  const cashStatus =
    hasCashData && cashTotal < 0
      ? { label: 'Caixa negativo', className: 'bg-rose-100 text-rose-700' }
      : hasCashData
      ? { label: 'Saudavel', className: 'bg-emerald-100 text-emerald-700' }
      : { label: 'Sem dados', className: 'bg-ink-100 text-ink-600' };
  const membershipStatus =
    membershipProgress >= 80
      ? { label: 'Meta ok', className: 'bg-emerald-100 text-emerald-700' }
      : membershipProgress >= 40
      ? { label: 'Acompanhar', className: 'bg-amber-100 text-amber-700' }
      : { label: 'Critico', className: 'bg-rose-100 text-rose-700' };
  const stockStatus =
    criticalStock === 0
      ? { label: 'Estoque em dia', className: 'bg-emerald-100 text-emerald-700' }
      : { label: 'Repor itens', className: 'bg-amber-100 text-amber-700' };

  if (loading || (!user && typeof window !== 'undefined')) {
    return <div className="flex items-center justify-center min-h-screen">Carregando...</div>;
  }

  return (
    <AppShell
      title="Dashboard"
      subtitle="Panorama geral das financas, presenca e operacoes do terreiro."
      actions={
        <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:items-center">
            <button
              onClick={handleSeed}
              disabled={seeding || !isMaster}
              className="w-full rounded-xl border border-ink-200 bg-white px-4 py-2 text-sm font-semibold text-ink-700 hover:border-ink-300 disabled:opacity-60 sm:w-auto"
            >
              {seeding ? 'Criando campos...' : 'Criar campos base'}
            </button>
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        <div id="card-caixa" className="rounded-2xl border border-ink-100 bg-white p-8 shadow-floating">
          <div className="text-xs uppercase tracking-[0.2em] text-ink-300">Caixa atual</div>
          <div className="mt-2 text-2xl font-semibold text-ink-900">
            {hasCashData ? `R$ ${formatBRL(cashTotal)}` : '—'}
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-ink-500">
            <span className={`rounded-full px-2 py-1 ${cashStatus.className}`}>{cashStatus.label}</span>
            <span>{hasCashData ? 'Movimentacao acumulada' : 'Atualize para exibir valores'}</span>
          </div>
        </div>
        <div id="card-mensalidades" className="rounded-2xl border border-ink-100 bg-white p-8 shadow-floating">
          <div className="text-xs uppercase tracking-[0.2em] text-ink-300">Mensalidades</div>
          <div className="mt-2 text-2xl font-semibold text-ink-900">
            {hasMembershipData ? `R$ ${formatBRL(membersPaid.paid)}` : '—'}
          </div>
          <div className="mt-3 h-2 w-full rounded-full bg-ink-100">
            <div
              className="h-2 rounded-full bg-purple-500"
              style={{
                width: `${membershipProgress}%`,
              }}
            />
          </div>
          <div className="mt-2 text-xs text-ink-500">
            {hasMembershipData
              ? `R$ ${formatBRL(membersPaid.paid)} de R$ ${formatBRL(membersPaid.total)}`
              : 'Sem dados'}
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs text-ink-500">
            <span className={`rounded-full px-2 py-1 ${membershipStatus.className}`}>{membershipStatus.label}</span>
            <span>{membershipProgress}% do objetivo</span>
          </div>
        </div>
        <div id="card-proxima-gira" className="rounded-2xl border border-ink-100 bg-white p-8 shadow-floating">
          <div className="text-xs uppercase tracking-[0.2em] text-ink-300">Proxima gira</div>
          <div className="mt-2 text-lg font-semibold text-ink-900">
            {nextEvent ? `${nextEvent.date} • ${nextEvent.time}` : 'Sem eventos'}
          </div>
          <div className="mt-1 text-sm text-ink-500">
            {nextEvent ? `Tema: ${nextEvent.title}` : 'Sem informacoes'}
          </div>
          <button className="mt-3 text-xs font-semibold text-amber-600 hover:text-amber-700">
            Atualizar detalhes
          </button>
        </div>
        <div id="card-estoque-critico" className="rounded-2xl border border-ink-100 bg-white p-8 shadow-floating">
          <div className="text-xs uppercase tracking-[0.2em] text-ink-300">Estoque critico</div>
          <div className="mt-2 text-2xl font-semibold text-ink-900">
            {hasStockData ? `${criticalStock} itens` : '—'}
          </div>
          <div className="mt-2 text-sm text-ink-500">Sem informacoes</div>
          <div className="mt-2 text-xs text-ink-500">
            <span className={`rounded-full px-2 py-1 ${stockStatus.className}`}>{stockStatus.label}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-6">
          <div id="card-tendencia" className="rounded-2xl border border-ink-100 bg-white p-4 shadow-floating">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-ink-300">Tendencia</div>
                <div className="flex items-center gap-2">
                  <div className="text-lg font-semibold text-ink-900">Balanço do Caixa</div>
                  <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-purple-700">
                    Roxo
                  </span>
                </div>
                <div className="mt-2 h-1 w-20 rounded-full bg-gradient-to-r from-purple-500 via-purple-300 to-transparent" />
              </div>
              <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700">
                Atualizado hoje
              </span>
            </div>
            <LineChart
              data={filteredCashData}
              height={240}
              strokeColor="#7c3aed"
              fillColor="rgba(124,58,237,0.32)"
              dotColor="#6d28d9"
              labels={cashLabels}
              valueFormatter={(value) => `R$ ${formatBRL(value)}`}
            />
          </div>

          <div id="card-atividade" className="rounded-2xl border border-ink-100 bg-white p-5 shadow-floating">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-ink-300">Atividade recente</div>
                <div className="text-lg font-semibold text-ink-900">Ultimos lancamentos</div>
              </div>
              <div className="flex items-center gap-3">
                <button className="text-xs font-semibold text-ink-400 hover:text-ink-600">Ver tudo</button>
                <button
                  onClick={handleClearCash}
                  disabled={clearingCash || !isMaster}
                  className="text-xs font-semibold text-rose-500 hover:text-rose-600 disabled:opacity-60"
                >
                  {clearingCash ? 'Limpando...' : 'Limpar'}
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              {activity.length === 0 && (
                <div className="rounded-xl border border-ink-100 bg-ink-50/50 px-4 py-6 text-sm text-ink-400">
                  Sem atividade registrada.
                </div>
              )}
              {activity.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-xl border border-ink-100 bg-ink-50/50 px-4 py-3"
                >
                  <div>
                    <div className="text-sm font-semibold text-ink-900">{item.label}</div>
                    <div className="text-xs text-ink-400">{item.time}</div>
                  </div>
                  <span
                    className={`text-sm font-semibold ${
                      item.tone === 'pos' ? 'text-emerald-600' : item.tone === 'neg' ? 'text-rose-500' : 'text-ink-500'
                    }`}
                  >
                    {item.amount || '—'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          
        </div>

        <div className="flex flex-col gap-6">
          <div id="card-sugestoes" className="rounded-2xl border border-ink-100 bg-white p-5 shadow-floating">
            <div className="mb-2 text-xs uppercase tracking-[0.2em] text-ink-300">Sugestoes proximo toque</div>
            <p className="text-sm text-ink-600">
              Envie ideias ou necessidades; o historico fica salvo e so o admin pode limpar.
            </p>
            <div className="mt-4 rounded-2xl border border-ink-200 bg-ink-50/70 p-3 shadow-sm">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-500">
                Sugestao
              </div>
              <textarea
                value={focusNote}
                onChange={(event) => setFocusNote(event.target.value)}
                className="min-h-[140px] w-full rounded-xl border border-ink-200 bg-white p-3 text-sm text-ink-800 shadow-sm focus:border-ink-500 focus:outline-none focus:ring-2 focus:ring-ink-200"
                placeholder="Ex.: confirmar equipe de acolhimento, separar ervas, revisar som."
              />
            </div>
            <button
              onClick={handleFocusSave}
              disabled={focusSaving || focusNote.trim().length === 0}
              className="mt-3 w-full rounded-xl bg-ink-900 px-4 py-3 text-xs font-semibold text-white shadow-sm hover:bg-ink-700 disabled:opacity-60"
            >
              {focusSaving ? 'Enviando...' : 'Enviar'}
            </button>
            <div className="mt-4 rounded-xl border border-ink-200 bg-white px-3 py-3 text-sm text-ink-700 shadow-sm">
              {focusSavedNote ? (
                <div className="flex flex-col gap-1">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-400">
                    Mensagem salva
                  </div>
                  <div className="text-sm text-ink-800">{focusSavedNote}</div>
                  {focusSavedAt && <div className="text-xs text-ink-400">{focusSavedAt}</div>}
                </div>
              ) : (
                <div className="text-xs text-ink-400">Nenhuma mensagem salva ainda.</div>
              )}
            </div>
            <div className="mt-3 rounded-xl border border-ink-100 bg-ink-50/70 p-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-ink-400">
                Ultimas enviadas
              </div>
              {focusHistory.length === 0 && (
                <div className="mt-2 text-xs text-ink-400">Sem historico recente.</div>
              )}
              <div className="mt-2 flex flex-col gap-2">
                {focusHistory.map((item, index) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-ink-100 bg-white px-3 py-2 text-xs text-ink-600 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-ink-800">
                        {index === 0 ? 'Mais recente' : `#${index + 1}`}
                      </span>
                      <span className="text-[10px] text-ink-400">{item.created_at}</span>
                    </div>
                    <div className="mt-1">{item.message}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div id="card-checklist" className="rounded-2xl border border-ink-100 bg-white p-5 shadow-floating">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-ink-300">Checklist do toque</div>
                <div className="text-lg font-semibold text-ink-900">Tarefas em tempo real</div>
              </div>
              <span className="rounded-full bg-ink-900 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white">
                Colaborativo
              </span>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <input
                  className="w-full rounded-xl border border-ink-100 bg-white px-3 py-2 text-sm text-ink-700 focus:border-ink-400 focus:outline-none focus:ring-2 focus:ring-ink-100"
                  placeholder="Adicionar tarefa"
                  value={actionText}
                  onChange={(e) => setActionText(e.target.value)}
                />
                <button
                  onClick={handleAddAction}
                  disabled={actionSaving || actionText.trim().length === 0}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-60"
                >
                  {actionSaving ? 'Salvando...' : 'Enviar'}
                </button>
              </div>
              <div className="flex flex-col gap-2">
                {actionItems.map((item) => {
                  const statusPill =
                    item.status === 'concluido'
                      ? 'bg-emerald-100 text-emerald-700'
                      : item.status === 'em_andamento'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-ink-100 text-ink-700';
                  const canEdit = isMaster || item.created_by === user?.uid;
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-xl border border-ink-100 bg-ink-50/60 px-3 py-2"
                    >
                      <div>
                        <div className="text-sm font-semibold text-ink-900">{item.title}</div>
                        <div className="text-[11px] text-ink-400">Resp.: {item.owner}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={item.status}
                          onChange={(e) => handleUpdateActionStatus(item, e.target.value as ActionItem['status'])}
                          disabled={!canEdit}
                          className="rounded-lg border border-ink-200 bg-white px-2 py-1 text-xs text-ink-700 focus:border-ink-400 focus:outline-none focus:ring-2 focus:ring-ink-100"
                        >
                          <option value="pendente">Pendente</option>
                          <option value="em_andamento">Em andamento</option>
                          <option value="concluido">Concluido</option>
                        </select>
                        <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${statusPill}`}>
                          {item.status === 'em_andamento' ? 'Em andamento' : item.status === 'concluido' ? 'Concluido' : 'Pendente'}
                        </span>
                        {(isMaster) && (
                          <button
                            onClick={() => handleDeleteAction(item)}
                            className="rounded-lg border border-rose-200 px-2 py-1 text-[11px] font-semibold text-rose-600 hover:border-rose-300"
                          >
                            Remover
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {actionItems.length === 0 && (
                  <div className="rounded-xl border border-ink-100 bg-white px-3 py-4 text-xs text-ink-400">
                    Nenhuma tarefa cadastrada ainda.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div id="card-agenda" className="rounded-2xl border border-ink-100 bg-white p-5 shadow-floating">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-ink-300">Agenda viva</div>
                <div className="text-lg font-semibold text-ink-900">Proximos toques</div>
              </div>
              <a className="text-xs font-semibold text-teal-600 hover:text-teal-700" href="/eventos">
                Ver eventos
              </a>
            </div>
            <div className="flex flex-col gap-2">
              {agendaList.map((event) => (
                <div key={event.id} className="flex items-center justify-between rounded-xl border border-ink-100 bg-ink-50/60 px-3 py-2">
                  <div>
                    <div className="text-sm font-semibold text-ink-900">{event.title}</div>
                    <div className="text-[11px] text-ink-400">
                      {event.date} • {event.time} {event.leader ? `• ${event.leader}` : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                        event.status === 'confirmado' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {event.status === 'confirmado' ? 'Confirmado' : 'Pendente'}
                    </span>
                  </div>
                </div>
              ))}
              {agendaList.length === 0 && (
                <div className="rounded-xl border border-ink-100 bg-white px-3 py-4 text-xs text-ink-400">
                  Nenhum evento proximo cadastrado.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
};

export default DashboardPage;
