import { useEffect, useState } from 'react';
import { Timestamp, collection, getDocs, orderBy, query, deleteDoc, doc, setDoc, getDoc } from 'firebase/firestore';
import AppShell from '@components/AppShell';
import { db } from '@services/firebase';
import { useAuth } from '@contexts/AuthContext';
import { COLLECTIONS } from '@services/firestoreCollections';

type LogItem = {
  id: string;
  action?: string;
  userEmail?: string;
  timestamp?: Timestamp;
};

function extractIp(action?: string): string | null {
  if (!action) return null;
  const match = action.match(/IP:\s*([\d.]+)/);
  return match ? match[1] : null;
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [clearing, setClearing] = useState(false);
  const [blockingIp, setBlockingIp] = useState<string | null>(null);
  const [blockedIps, setBlockedIps] = useState<Set<string>>(new Set());
  const { profile, loading: authLoading } = useAuth();
  const normalizedRole = (profile?.role || '').trim().toUpperCase();
  const canManageLogs = normalizedRole === 'MASTER';

  useEffect(() => {
    if (authLoading) return;
    const fetchLogs = async () => {
      setLoading(true);
      setError('');
      try {
        const q = query(collection(db, 'logs'), orderBy('timestamp', 'desc'));
        const snapshot = await getDocs(q);
        const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as LogItem[];
        setLogs(items);

        // Load blocked IPs
        if (canManageLogs) {
          const ipSnap = await getDocs(collection(db, COLLECTIONS.BLOCKED_IPS));
          const blocked = new Set<string>();
          ipSnap.forEach((d) => {
            if (d.data()?.blocked) blocked.add(d.data()?.ip || '');
          });
          setBlockedIps(blocked);
        }
      } catch (err) {
        setError(`Erro ao carregar logs: ${(err as Error)?.message || ''}`);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, [authLoading]);

  const formatDate = (ts?: Timestamp) => {
    try {
      return ts ? ts.toDate().toLocaleString('pt-BR') : '—';
    } catch {
      return '—';
    }
  };

  const handleBlockIp = async (ip: string) => {
    if (!canManageLogs || !ip) return;
    setBlockingIp(ip);
    try {
      const ipKey = ip.replace(/\./g, '_');
      await setDoc(doc(db, COLLECTIONS.BLOCKED_IPS, ipKey), {
        ip,
        blocked: true,
        blocked_at: new Date().toISOString(),
        blocked_by: profile?.email || 'master',
      });
      setBlockedIps((prev) => new Set(prev).add(ip));
    } catch {
      setError('Erro ao bloquear IP.');
    } finally {
      setBlockingIp(null);
    }
  };

  const handleUnblockIp = async (ip: string) => {
    if (!canManageLogs || !ip) return;
    setBlockingIp(ip);
    try {
      const ipKey = ip.replace(/\./g, '_');
      await setDoc(doc(db, COLLECTIONS.BLOCKED_IPS, ipKey), { ip, blocked: false }, { merge: true });
      setBlockedIps((prev) => {
        const next = new Set(prev);
        next.delete(ip);
        return next;
      });
    } catch {
      setError('Erro ao desbloquear IP.');
    } finally {
      setBlockingIp(null);
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
                await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
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
                  {canManageLogs && <th className="px-4 py-2 text-left">IP</th>}
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const ip = extractIp(log.action);
                  const isBlocked = ip ? blockedIps.has(ip) : false;
                  return (
                    <tr key={log.id} className="border-b last:border-none">
                      <td className="px-4 py-2 whitespace-nowrap">{formatDate(log.timestamp)}</td>
                      <td className="px-4 py-2">{log.userEmail || '—'}</td>
                      <td className="px-4 py-2">{log.action || '—'}</td>
                      {canManageLogs && (
                        <td className="px-4 py-2 whitespace-nowrap">
                          {ip ? (
                            <div className="flex items-center gap-1.5">
                              {isBlocked ? (
                                <button
                                  onClick={() => handleUnblockIp(ip)}
                                  disabled={blockingIp === ip}
                                  className="flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
                                >
                                  🔓 Desbloquear
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleBlockIp(ip)}
                                  disabled={blockingIp === ip}
                                  className="flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-600 hover:bg-rose-100 disabled:opacity-60"
                                >
                                  🔒 Bloquear IP
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="text-ink-300">—</span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
