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
  updateDoc,
} from 'firebase/firestore';
import { COLLECTIONS } from '@services/firestoreCollections';

type Fundamento = {
  id: string;
  titulo: string;
  conteudo: string;
  categoria: string;
  created_at: string;
};

const CATEGORIAS = [
  'Orixás',
  'Ervas',
  'Pontos Cantados',
  'Guias Espirituais',
  'Rituais',
  'Fundamentos Gerais',
];

export default function FundamentosPage() {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const isMaster = (profile?.role || '').trim().toUpperCase() === 'MASTER';
  const isEditor = isMaster || (profile?.role || '').trim().toUpperCase() === 'EDITOR';

  const [fundamentos, setFundamentos] = useState<Fundamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [conteudo, setConteudo] = useState('');
  const [categoria, setCategoria] = useState(CATEGORIAS[0]);
  const [filtroCategoria, setFiltroCategoria] = useState('Todos');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitulo, setEditTitulo] = useState('');
  const [editConteudo, setEditConteudo] = useState('');

  const fetchFundamentos = async () => {
    if (!db) return;
    try {
      const q = query(collection(db, COLLECTIONS.FUNDAMENTOS), orderBy('created_at', 'desc'));
      const snapshot = await getDocs(q);
      setFundamentos(
        snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })) as Fundamento[]
      );
    } catch {
      showToast('Erro ao carregar fundamentos.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFundamentos();
  }, []);

  const handleAdd = async () => {
    if (!db || !titulo.trim() || !conteudo.trim()) {
      showToast('Preencha título e conteúdo.', 'warning');
      return;
    }
    setSaving(true);
    try {
      await addDoc(collection(db, COLLECTIONS.FUNDAMENTOS), {
        titulo: titulo.trim(),
        conteudo: conteudo.trim(),
        categoria,
        created_at: new Date().toISOString(),
      });
      setTitulo('');
      setConteudo('');
      showToast('Fundamento adicionado!', 'success');
      fetchFundamentos();
    } catch {
      showToast('Erro ao salvar.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!db || !editTitulo.trim() || !editConteudo.trim()) return;
    try {
      await updateDoc(doc(db, COLLECTIONS.FUNDAMENTOS, id), {
        titulo: editTitulo.trim(),
        conteudo: editConteudo.trim(),
      });
      setEditingId(null);
      showToast('Fundamento atualizado!', 'success');
      fetchFundamentos();
    } catch {
      showToast('Erro ao atualizar.', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!db || !isMaster) return;
    if (!window.confirm('Remover este fundamento?')) return;
    try {
      await deleteDoc(doc(db, COLLECTIONS.FUNDAMENTOS, id));
      showToast('Fundamento removido.', 'success');
      fetchFundamentos();
    } catch {
      showToast('Erro ao remover.', 'error');
    }
  };

  const filtered = filtroCategoria === 'Todos'
    ? fundamentos
    : fundamentos.filter((f) => f.categoria === filtroCategoria);

  return (
    <AppShell title="Fundamentos" subtitle="Base de conhecimento do terreiro — orixás, ervas, rituais e ensinamentos.">
      <div className="flex flex-col gap-6">
        {/* Formulário */}
        {isEditor && (
          <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-floating">
            <div className="text-xs uppercase tracking-[0.2em] text-ink-300">Novo fundamento</div>
            <div className="mt-4 flex flex-col gap-3">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <input
                  className="w-full rounded-xl border border-ink-100 bg-white px-3 py-2 text-sm text-ink-700 focus:border-ink-400 focus:outline-none focus:ring-2 focus:ring-ink-100"
                  placeholder="Título"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                />
                <select
                  className="w-full rounded-xl border border-ink-100 bg-white px-3 py-2 text-sm text-ink-700 focus:border-ink-400 focus:outline-none focus:ring-2 focus:ring-ink-100"
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                >
                  {CATEGORIAS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <textarea
                className="min-h-[120px] w-full rounded-xl border border-ink-100 bg-white px-3 py-2 text-sm text-ink-700 focus:border-ink-400 focus:outline-none focus:ring-2 focus:ring-ink-100"
                placeholder="Conteúdo do fundamento..."
                value={conteudo}
                onChange={(e) => setConteudo(e.target.value)}
              />
              <button
                onClick={handleAdd}
                disabled={saving}
                className="w-full rounded-xl bg-ink-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-ink-700 disabled:opacity-60 md:w-auto"
              >
                {saving ? 'Salvando...' : 'Adicionar fundamento'}
              </button>
            </div>
          </div>
        )}

        {/* Filtro por categoria */}
        <div className="flex flex-wrap gap-2">
          {['Todos', ...CATEGORIAS].map((c) => (
            <button
              key={c}
              onClick={() => setFiltroCategoria(c)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                filtroCategoria === c
                  ? 'bg-ink-900 text-white'
                  : 'border border-ink-200 bg-white text-ink-600 hover:border-ink-300'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Lista */}
        {loading ? (
          <div className="text-sm text-ink-400">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-ink-100 bg-white p-8 text-center text-sm text-ink-400">
            Nenhum fundamento nesta categoria.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((f) => (
              <div key={f.id} className="rounded-2xl border border-ink-100 bg-white shadow-sm">
                <button
                  onClick={() => setExpanded(expanded === f.id ? null : f.id)}
                  className="flex w-full items-center justify-between px-5 py-4 text-left"
                >
                  <div>
                    <div className="text-sm font-semibold text-ink-900">{f.titulo}</div>
                    <span className="mt-1 inline-block rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink-500">
                      {f.categoria}
                    </span>
                  </div>
                  <svg
                    viewBox="0 0 24 24"
                    className={`h-5 w-5 text-ink-400 transition ${expanded === f.id ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
                {expanded === f.id && (
                  <div className="border-t border-ink-100 px-5 py-4">
                    {editingId === f.id ? (
                      <div className="flex flex-col gap-3">
                        <input
                          className="w-full rounded-xl border border-ink-100 bg-white px-3 py-2 text-sm text-ink-700 focus:border-ink-400 focus:outline-none"
                          value={editTitulo}
                          onChange={(e) => setEditTitulo(e.target.value)}
                        />
                        <textarea
                          className="min-h-[100px] w-full rounded-xl border border-ink-100 bg-white px-3 py-2 text-sm text-ink-700 focus:border-ink-400 focus:outline-none"
                          value={editConteudo}
                          onChange={(e) => setEditConteudo(e.target.value)}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleUpdate(f.id)}
                            className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
                          >
                            Salvar
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="rounded-xl border border-ink-200 px-4 py-2 text-xs font-semibold text-ink-600"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="whitespace-pre-wrap text-sm text-ink-700">{f.conteudo}</div>
                        <div className="mt-3 flex gap-2">
                          {isEditor && (
                            <button
                              onClick={() => { setEditingId(f.id); setEditTitulo(f.titulo); setEditConteudo(f.conteudo); }}
                              className="rounded-lg border border-ink-200 px-3 py-1.5 text-[11px] font-semibold text-ink-600 hover:border-ink-300"
                            >
                              Editar
                            </button>
                          )}
                          {isMaster && (
                            <button
                              onClick={() => handleDelete(f.id)}
                              className="rounded-lg border border-rose-200 px-3 py-1.5 text-[11px] font-semibold text-rose-600 hover:border-rose-300"
                            >
                              Remover
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
