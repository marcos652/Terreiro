import { useEffect, useState } from 'react';
import { Timestamp, collection, getDocs, orderBy, query } from 'firebase/firestore';
import AppShell from '@components/AppShell';
import { db } from '@services/firebase';

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
