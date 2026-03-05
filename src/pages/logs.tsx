import { useEffect, useState } from 'react';
import { Timestamp, collection, getDocs, orderBy, query, deleteDoc } from 'firebase/firestore';
import AppShell from '@components/AppShell';
import { db } from '@services/firebase';
import { useAuth } from '@contexts/AuthContext';
import { useAuth } from '@contexts/AuthContext';

type LogItem = {
  id: string;
  action?: string;
  userEmail?: string;
  timestamp?: Timestamp;
};

export default function LogsPage() {
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [clearing, setClearing] = useState(false);
  const { profile } = useAuth();
  const canManageLogs =
    profile?.role === 'MASTER' ||
    (profile?.role === 'EDITOR' && profile.permissions?.includes('logs'));

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      setError('');
      try {
        const q = query(collection(db, 'logs'), orderBy('timestamp', 'desc'));
        const snapshot = await getDocs(q);
        const items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as LogItem[];
        setLogs(items);
      } catch (err) {
        setError(`Erro ao carregar logs: ${(err as Error)?.message || ''}`);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, []);

  const formatDate = (ts?: Timestamp) => {
    try {
      return ts ? ts.toDate().toLocaleString('pt-BR') : '—';
    } catch {
      return '—';
    }
  };

  return (
    <AppShell title="Logs de Auditoria">
      <div className="rounded-2xl bg-white p-6 shadow-floating">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm font-semibold text-ink-800">Histórico de auditoria</div>
          <button
            onClick={async () => {
              if (!canManageLogs) return;
              setClearing(true);
              setError('');
              try {
                const snap = await getDocs(collection(db, 'logs'));
                await Promise.all(snap.docs.map((doc) => deleteDoc(doc.ref)));
                setLogs([]);
              } catch (err) {
                setError('Não foi possível limpar os logs. Verifique permissão.');
              } finally {
                setClearing(false);
              }
            }}
            disabled={!canManageLogs || clearing || logs.length === 0}
            className="rounded-xl border border-ink-200 bg-white px-4 py-2 text-xs font-semibold text-ink-700 shadow-sm hover:border-ink-300 disabled:opacity-60"
          >
            {clearing ? 'Limpando...' : 'Limpar logs'}
          </button>
        </div>
        {loading ? (
          <div className="text-sm text-ink-500">Carregando...</div>
        ) : error ? (
          <div className="text-sm text-rose-600">{error}</div>
        ) : logs.length === 0 ? (
          <div className="text-sm text-ink-500">Nenhum log encontrado.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left">Data/Hora</th>
                  <th className="px-4 py-2 text-left">Email</th>
                  <th className="px-4 py-2 text-left">Ação</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b last:border-none">
                    <td className="px-4 py-2">{formatDate(log.timestamp)}</td>
                    <td className="px-4 py-2">{log.userEmail || '—'}</td>
                    <td className="px-4 py-2">{log.action || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
