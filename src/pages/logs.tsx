import { useEffect, useState } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "../services/firebase";
import AppShell from "../components/AppShell";

export default function LogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchLogs() {
      setLoading(true);
      setError("");
      try {
        const q = query(collection(db, "logs"), orderBy("timestamp", "desc"));
        const snapshot = await getDocs(q);
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setLogs(items);
      } catch (err) {
        setError("Erro ao carregar logs: " + (err?.message || ""));
      } finally {
        setLoading(false);
      }
    }
    fetchLogs();
  }, []);

  return (
    <AppShell title="Logs de Auditoria">
      <div className="bg-white rounded-2xl p-6 shadow-floating">
        {loading ? (
          <div>Carregando...</div>
        ) : error ? (
          <div className="text-red-600">{error}</div>
        ) : logs.length === 0 ? (
          <div>Nenhum log encontrado.</div>
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
                {logs.map(log => (
                  <tr key={log.id} className="border-b last:border-none">
                    <td className="px-4 py-2">{log.timestamp?.toDate?.().toLocaleString?.() || "-"}</td>
                    <td className="px-4 py-2">{log.userEmail}</td>
                    <td className="px-4 py-2">{log.action}</td>
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
