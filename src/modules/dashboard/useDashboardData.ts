import { useEffect, useMemo, useState } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
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
import { db } from '@services/firebase';
import { COLLECTIONS } from '@services/firestoreCollections';
import { STOCK_CRITICAL_THRESHOLD, FIRESTORE_BATCH_LIMIT } from '@services/constants';

// ── Types ────────────────────────────────────────────────────
export type ActivityItem = {
  id: string;
  label: string;
  amount: string;
  tone: 'pos' | 'neg' | 'info';
  time: string;
};

export type FocusItem = { id: string; message: string; created_at: string };

export type AgendaItem = {
  id: string;
  title: string;
  date: string;
  time: string;
  status: 'confirmado' | 'pendente';
  leader?: string;
};

export type ActionItem = {
  id: string;
  title: string;
  status: 'pendente' | 'em_andamento' | 'concluido';
  owner: string;
  created_by: string;
  created_at: string;
};

// ── Helpers ──────────────────────────────────────────────────
export const formatBRL = (value: number) =>
  new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

function parseDateBR(dateStr: string): Date {
  const parts = dateStr.split('/');
  if (parts.length !== 3) return new Date(0);
  const [day, month, year] = parts.map(Number);
  return new Date(year, month - 1, day);
}

/** Chunk an array for Firestore batch operations (max ~450 per batch). */
function chunkArray<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

// ── Hook ─────────────────────────────────────────────────────
export function useDashboardData(user: FirebaseUser | null) {
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [cashTotal, setCashTotal] = useState(0);
  const [hasCashData, setHasCashData] = useState(false);
  const [cashSeries, setCashSeries] = useState<number[]>([]);
  const [cashLabels, setCashLabels] = useState<string[]>([]);
  const [membersPaid, setMembersPaid] = useState({ paid: 0, total: 0 });
  const [hasMembershipData, setHasMembershipData] = useState(false);
  const [criticalStock, setCriticalStock] = useState(0);
  const [hasStockData, setHasStockData] = useState(false);
  const [nextEvent, setNextEvent] = useState<{ date: string; time: string; title: string } | null>(null);
  const [agendaList, setAgendaList] = useState<AgendaItem[]>([]);
  const [focusSavedNote, setFocusSavedNote] = useState('');
  const [focusSavedAt, setFocusSavedAt] = useState('');
  const [focusHistory, setFocusHistory] = useState<FocusItem[]>([]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);

  useEffect(() => {
    if (!user || !db) return;

    // Cash transactions
    const cashUnsub = onSnapshot(collection(db, COLLECTIONS.CASH_TRANSACTIONS), (snapshot) => {
      let entradas = 0;
      let saidas = 0;
      const recentActivity: ActivityItem[] = [];
      const byDate = new Map<string, number>();
      setHasCashData(!snapshot.empty);

      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as { type: 'entrada' | 'saida'; amount: number; label?: string; date?: string };
        const amountValue = Number(data.amount || 0);
        const amountLabel =
          amountValue > 0
            ? `${data.type === 'entrada' ? '+' : '-'} R$ ${formatBRL(amountValue)}`
            : '—';
        if (data.type === 'entrada') entradas += amountValue;
        if (data.type === 'saida') saidas += amountValue;

        const dateLabel = data.date || '';
        if (dateLabel) {
          const current = byDate.get(dateLabel) || 0;
          const signed = data.type === 'entrada' ? amountValue : -amountValue;
          byDate.set(dateLabel, current + signed);
        }

        recentActivity.push({
          id: docSnap.id,
          label: data.label || 'Movimento',
          amount: amountLabel,
          tone: data.type === 'entrada' ? 'pos' : 'neg',
          time: data.date || '',
        });
      });

      setCashTotal(entradas - saidas);
      const sorted = Array.from(byDate.entries()).sort(
        (a, b) => parseDateBR(a[0]).getTime() - parseDateBR(b[0]).getTime()
      );
      setCashLabels(sorted.map(([label]) => label));
      setCashSeries(sorted.map(([, value]) => value));
      setActivity(recentActivity.slice(0, 5));
    });

    // Memberships
    const membershipUnsub = onSnapshot(collection(db, COLLECTIONS.MEMBERSHIPS), (snapshot) => {
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

    // Stock
    const stockUnsub = onSnapshot(collection(db, COLLECTIONS.STOCK_ITEMS), (snapshot) => {
      let critical = 0;
      setHasStockData(!snapshot.empty);
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as { quantity: number };
        if (Number(data.quantity || 0) <= STOCK_CRITICAL_THRESHOLD) critical += 1;
      });
      setCriticalStock(critical);
    });

    // Next event
    const eventsUnsub = onSnapshot(
      query(collection(db, COLLECTIONS.EVENTS), orderBy('date', 'asc'), limit(1)),
      (snapshot) => {
        const docSnap = snapshot.docs[0];
        if (!docSnap) { setNextEvent(null); return; }
        const data = docSnap.data() as { date: string; time: string; title: string };
        setNextEvent({ date: data.date, time: data.time, title: data.title });
      }
    );

    // Agenda (next 4 events)
    const agendaUnsub = onSnapshot(
      query(collection(db, COLLECTIONS.EVENTS), orderBy('date', 'asc'), limit(4)),
      (snapshot) => {
        setAgendaList(
          snapshot.docs.map((docSnap) => {
            const data = docSnap.data() as AgendaItem;
            return {
              id: docSnap.id,
              title: data.title,
              date: data.date,
              time: data.time,
              status: data.status || 'pendente',
              leader: data.leader,
            };
          })
        );
      }
    );

    // Focus notes
    const focusUnsub = onSnapshot(
      query(collection(db, COLLECTIONS.FOCUS_NOTES), orderBy('created_at', 'desc'), limit(5)),
      (snapshot) => {
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
        setFocusHistory(
          snapshot.docs.map((item) => {
            const focusData = item.data() as { message?: string; created_at?: string };
            return { id: item.id, message: focusData.message || '', created_at: focusData.created_at || '' };
          })
        );
      }
    );

    // Action items (checklist)
    const actionsUnsub = onSnapshot(
      query(collection(db, COLLECTIONS.ACTION_ITEMS), orderBy('created_at', 'desc'), limit(10)),
      (snapshot) => {
        setActionItems(
          snapshot.docs.map((docSnap) => {
            const data = docSnap.data() as ActionItem;
            return {
              id: docSnap.id,
              title: data.title,
              status: data.status || 'pendente',
              owner: data.owner || 'Membro',
              created_by: data.created_by,
              created_at: data.created_at,
            };
          })
        );
      }
    );

    return () => {
      cashUnsub();
      membershipUnsub();
      stockUnsub();
      eventsUnsub();
      agendaUnsub();
      focusUnsub();
      actionsUnsub();
    };
  }, [user]);

  // ── Derived state ──
  const membershipProgress = membersPaid.total > 0 ? Math.min(100, (membersPaid.paid / membersPaid.total) * 100) : 0;

  const cashStatus = hasCashData && cashTotal < 0
    ? { label: 'Caixa negativo', className: 'bg-rose-100 text-rose-700' }
    : hasCashData
      ? { label: 'Saudável', className: 'bg-emerald-100 text-emerald-700' }
      : { label: 'Sem dados', className: 'bg-ink-100 text-ink-600' };

  const membershipStatus = membershipProgress >= 80
    ? { label: 'Meta ok', className: 'bg-emerald-100 text-emerald-700' }
    : membershipProgress >= 40
      ? { label: 'Acompanhar', className: 'bg-amber-100 text-amber-700' }
      : { label: 'Crítico', className: 'bg-rose-100 text-rose-700' };

  const stockStatus = criticalStock === 0
    ? { label: 'Estoque em dia', className: 'bg-emerald-100 text-emerald-700' }
    : { label: 'Repor itens', className: 'bg-amber-100 text-amber-700' };

  // ── Actions ──
  const saveFocusNote = async (message: string) => {
    if (!db) throw new Error('Firebase não configurado');
    await addDoc(collection(db, COLLECTIONS.FOCUS_NOTES), {
      message,
      created_at: new Date().toISOString(),
    });
  };

  const clearCashTransactions = async () => {
    if (!db) throw new Error('Firebase não configurado');
    const snapshot = await getDocs(collection(db, COLLECTIONS.CASH_TRANSACTIONS));
    const chunks = chunkArray(snapshot.docs, FIRESTORE_BATCH_LIMIT);
    for (const chunk of chunks) {
      const batch = writeBatch(db);
      chunk.forEach((docSnap) => batch.delete(docSnap.ref));
      await batch.commit();
    }
    setActivity([]);
    setCashTotal(0);
    setCashLabels([]);
    setCashSeries([]);
    setHasCashData(false);
  };

  const addAction = async (title: string, owner: string, createdBy: string) => {
    if (!db) throw new Error('Firebase não configurado');
    await addDoc(collection(db, COLLECTIONS.ACTION_ITEMS), {
      title,
      status: 'pendente',
      owner,
      created_by: createdBy,
      created_at: new Date().toISOString(),
    });
  };

  const updateActionStatus = async (itemId: string, status: ActionItem['status']) => {
    if (!db) throw new Error('Firebase não configurado');
    await updateDoc(doc(db, COLLECTIONS.ACTION_ITEMS, itemId), { status });
  };

  const deleteAction = async (itemId: string) => {
    if (!db) throw new Error('Firebase não configurado');
    await deleteDoc(doc(db, COLLECTIONS.ACTION_ITEMS, itemId));
  };

  return {
    // Cash
    cashTotal, hasCashData, cashSeries, cashLabels, cashStatus, activity,
    clearCashTransactions,
    // Membership
    membersPaid, hasMembershipData, membershipProgress, membershipStatus,
    // Stock
    criticalStock, hasStockData, stockStatus,
    // Events
    nextEvent, agendaList,
    // Focus notes
    focusSavedNote, focusSavedAt, focusHistory, saveFocusNote,
    // Actions
    actionItems, addAction, updateActionStatus, deleteAction,
    // Helpers
    formatBRL,
  };
}
