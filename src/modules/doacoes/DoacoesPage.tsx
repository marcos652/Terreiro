import React, { useEffect, useState } from 'react';
import AppShell from '@components/AppShell';
import { useAuth } from '@contexts/AuthContext';
import { useToast } from '@contexts/ToastContext';
import { db } from '@services/firebase';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
} from 'firebase/firestore';
import { COLLECTIONS } from '@services/firestoreCollections';
import { addCashTransaction } from '@services/transactionService';

type Doacao = {
  id: string;
  doador: string;
  valor: number;
  data: string;
  descricao: string;
  created_at: string;
};

export default function DoacoesPage() {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const isMaster = (profile?.role || '').trim().toUpperCase() === 'MASTER';
  const isEditor = isMaster || (profile?.role || '').trim().toUpperCase() === 'EDITOR';

  const [doacoes, setDoacoes] = useState<Doacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [doador, setDoador] = useState('');
  const [valor, setValor] = useState('');
  const [data, setData] = useState('');
  const [descricao, setDescricao] = useState('');

  const fetchDoacoes = async () => {
    if (!db) return;
    try {
      const q = query(collection(db, COLLECTIONS.DOACOES), orderBy('created_at', 'desc'));
      const snapshot = await getDocs(q);
      setDoacoes(
        snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })) as Doacao[]
      );
    } catch {
      showToast('Erro ao carregar doações.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoacoes();
  }, []);

  const handleAdd = async () => {
    if (!db || !doador.trim() || !valor.trim()) {
      showToast('Preencha doador e valor.', 'warning');
      return;
    }
    setSaving(true);
    try {
      const valorNum = parseFloat(valor);
      const dataStr = data || new Date().toLocaleDateString('pt-BR');
      const nomeDoador = doador.trim();
      const desc = descricao.trim();

      await addDoc(collection(db, COLLECTIONS.DOACOES), {
        doador: nomeDoador,
        valor: valorNum,
        data: dataStr,
        descricao: desc,
        created_at: new Date().toISOString(),
      });

      // Integração com Caixa: cria transação de entrada
      try {
        await addCashTransaction({
          label: `Doação — ${nomeDoador}${desc ? ` (${desc})` : ''}`,
          type: 'entrada',
          amount: valorNum,
          date: dataStr,
          method: 'doacao',
          created_at: new Date().toISOString(),
        }, profile?.email);
      } catch (err) {
        console.error('Erro ao registrar doação no caixa:', err);
      }

      setDoador('');
      setValor('');
      setData('');
      setDescricao('');
      showToast('Doação registrada e adicionada ao caixa!', 'success');
      fetchDoacoes();
    } catch {
      showToast('Erro ao salvar doação.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!db || !isMaster) return;
    if (!window.confirm('Remover esta doação?')) return;
    try {
      // Busca dados da doação antes de remover para limpar o caixa
      const doacaoRemovida = doacoes.find((d) => d.id === id);
      await deleteDoc(doc(db, COLLECTIONS.DOACOES, id));

      // Remove transação correspondente do caixa
      if (doacaoRemovida) {
        try {
          const snapshot = await getDocs(collection(db, COLLECTIONS.CASH_TRANSACTIONS));
          const searchLabel = `Doação — ${doacaoRemovida.doador}`;
          const matchingDoc = snapshot.docs.find((d) => {
            const data = d.data();
            return data.method === 'doacao' && data.label?.startsWith(searchLabel) && data.amount === doacaoRemovida.valor;
          });
          if (matchingDoc) {
            await deleteDoc(doc(db, COLLECTIONS.CASH_TRANSACTIONS, matchingDoc.id));
          }
        } catch (err) {
          console.error('Erro ao remover doação do caixa:', err);
        }
      }

      showToast('Doação removida do registro e do caixa.', 'success');
      fetchDoacoes();
    } catch {
      showToast('Erro ao remover.', 'error');
    }
  };

  const totalDoacoes = doacoes.reduce((sum, d) => sum + (d.valor || 0), 0);

  return (
    <AppShell title="Doações" subtitle="Registre e acompanhe as doações recebidas pelo terreiro.">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_2fr]">
        {/* Formulário */}
        {isEditor && (
          <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-floating">
            <div className="text-xs uppercase tracking-[0.2em] text-ink-300">Nova doação</div>
            <div className="mt-4 flex flex-col gap-3">
              <input
                className="w-full rounded-xl border border-ink-100 bg-white px-3 py-2 text-sm text-ink-700 focus:border-ink-400 focus:outline-none focus:ring-2 focus:ring-ink-100"
                placeholder="Nome do doador"
                value={doador}
                onChange={(e) => setDoador(e.target.value)}
              />
              <input
                className="w-full rounded-xl border border-ink-100 bg-white px-3 py-2 text-sm text-ink-700 focus:border-ink-400 focus:outline-none focus:ring-2 focus:ring-ink-100"
                placeholder="Valor (R$)"
                type="number"
                step="0.01"
                min="0"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
              />
              <input
                className="w-full rounded-xl border border-ink-100 bg-white px-3 py-2 text-sm text-ink-700 focus:border-ink-400 focus:outline-none focus:ring-2 focus:ring-ink-100"
                placeholder="Data (dd/mm/aaaa)"
                value={data}
                onChange={(e) => setData(e.target.value)}
              />
              <textarea
                className="min-h-[80px] w-full rounded-xl border border-ink-100 bg-white px-3 py-2 text-sm text-ink-700 focus:border-ink-400 focus:outline-none focus:ring-2 focus:ring-ink-100"
                placeholder="Descrição (opcional)"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
              />
              <button
                onClick={handleAdd}
                disabled={saving}
                className="w-full rounded-xl bg-ink-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-ink-700 disabled:opacity-60"
              >
                {saving ? 'Salvando...' : 'Registrar doação'}
              </button>
            </div>
          </div>
        )}

        {/* Lista */}
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-floating">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-ink-300">Total arrecadado</div>
                <div className="mt-1 text-2xl font-semibold text-ink-900">
                  R$ {totalDoacoes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                {doacoes.length} doações
              </span>
            </div>
          </div>

          {loading ? (
            <div className="text-sm text-ink-400">Carregando...</div>
          ) : doacoes.length === 0 ? (
            <div className="rounded-2xl border border-ink-100 bg-white p-6 text-center text-sm text-ink-400">
              Nenhuma doação registrada.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {doacoes.map((d) => (
                <div key={d.id} className="flex items-center justify-between rounded-xl border border-ink-100 bg-white px-4 py-3 shadow-sm">
                  <div>
                    <div className="text-sm font-semibold text-ink-900">{d.doador}</div>
                    <div className="text-xs text-ink-400">
                      {d.data} {d.descricao && `• ${d.descricao}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-emerald-600">
                      + R$ {(d.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                    {isMaster && (
                      <button
                        onClick={() => handleDelete(d.id)}
                        className="rounded-lg border border-rose-200 px-2 py-1 text-[11px] font-semibold text-rose-600 hover:border-rose-300"
                      >
                        Remover
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
