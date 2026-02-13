import React, { useEffect, useMemo, useState } from 'react';
import AppShell from '@components/AppShell';
import { useAuth } from '@contexts/AuthContext';
import { addCantiga, CantigaItem, deleteCantiga, getCantigas } from '@services/cantigasService';
import YoutubeAudioSearch from '@components/YoutubeAudioSearch';

export default function CantigasPage() {
  const [cantigas, setCantigas] = useState<CantigaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ category: '', title: '', lyrics: '' });
  const { profile } = useAuth();
  const isMaster = profile?.role === 'MASTER';

  useEffect(() => {
    let active = true;
    getCantigas()
      .then((data) => {
        if (!active) return;
        setCantigas(data);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    cantigas.forEach((item) => {
      if (item.category) {
        set.add(item.category);
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [cantigas]);

  const grouped = useMemo(() => {
    return cantigas.reduce<Record<string, CantigaItem[]>>((acc, item) => {
      const key = item.category || 'Sem categoria';
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});
  }, [cantigas]);

  const handleAdd = async () => {
    const category = form.category.trim();
    const title = form.title.trim();
    const lyrics = form.lyrics.trim();
    if (!category || !lyrics) return;
    setSaving(true);
    try {
      const payload: Omit<CantigaItem, 'id'> = {
        category,
        title: title || undefined,
        lyrics,
        created_at: new Date().toISOString(),
      };
      const id = await addCantiga(payload);
      setCantigas((prev) => [{ id, ...payload }, ...prev]);
      setForm({ category: '', title: '', lyrics: '' });
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (item: CantigaItem) => {
    if (!item.id) return;
    const confirmed = window.confirm(`Remover cantiga de "${item.category}"?`);
    if (!confirmed) return;
    await deleteCantiga(item.id);
    setCantigas((prev) => prev.filter((entry) => entry.id !== item.id));
  };

  return (
    <AppShell
      title="Cantigas"
      subtitle="Organize letras por categoria e mantenha o repertorio do terreiro."
    >
      <div className="grid grid-cols-1 gap-6">
        <YoutubeAudioSearch />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_2fr]">
        <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-floating">
          <div className="text-xs uppercase tracking-[0.2em] text-ink-300">Nova cantiga</div>
          <div className="mt-4 flex flex-col gap-3">
            <input
              list="cantiga-categories"
              className="rounded-xl border border-ink-100 bg-white px-3 py-2 text-sm text-ink-700 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-100"
              placeholder="Categoria (ex.: Cantiga de Exu)"
              value={form.category}
              onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
              disabled={!isMaster}
            />
            <datalist id="cantiga-categories">
              {categories.map((category) => (
                <option key={category} value={category} />
              ))}
            </datalist>
            <input
              className="rounded-xl border border-ink-100 bg-white px-3 py-2 text-sm text-ink-700 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-100"
              placeholder="Titulo (opcional)"
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
              disabled={!isMaster}
            />
            <textarea
              className="min-h-[180px] rounded-xl border border-ink-100 bg-white px-3 py-2 text-sm text-ink-700 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-100"
              placeholder="Digite a letra da cantiga..."
              value={form.lyrics}
              onChange={(event) => setForm((prev) => ({ ...prev, lyrics: event.target.value }))}
              disabled={!isMaster}
            />
            <button
              onClick={handleAdd}
              disabled={!isMaster || saving || !form.category.trim() || !form.lyrics.trim()}
              className="w-full rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-500 disabled:opacity-60"
            >
              {saving ? 'Salvando...' : 'Salvar cantiga'}
            </button>
            <div className="rounded-xl border border-ink-100 bg-ink-50 p-3 text-xs text-ink-500">
              Crie a categoria digitando o nome e adicione as letras abaixo.
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-floating">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-ink-300">Categorias</div>
              <div className="text-lg font-semibold text-ink-900">Cantigas registradas</div>
            </div>
            <div className="text-xs text-ink-400">{cantigas.length} cantigas</div>
          </div>
          <div className="mt-4 flex flex-col gap-4">
            {Object.keys(grouped)
              .sort((a, b) => a.localeCompare(b))
              .map((category) => (
                <div key={category} className="rounded-2xl border border-ink-100 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="text-sm font-semibold text-ink-900">{category}</div>
                    <div className="text-xs text-ink-400">{grouped[category].length} cantigas</div>
                  </div>
                  <div className="flex flex-col gap-3">
                    {grouped[category].map((item) => (
                      <div key={item.id} className="rounded-xl border border-ink-100 bg-ink-50/50 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-ink-900">
                              {item.title || 'Cantiga sem titulo'}
                            </div>
                            <pre className="mt-2 whitespace-pre-wrap text-sm text-ink-600">{item.lyrics}</pre>
                          </div>
                          <button
                            onClick={() => handleRemove(item)}
                            disabled={!isMaster}
                            className="text-xs font-semibold text-rose-500 hover:text-rose-600 disabled:opacity-60"
                          >
                            Remover
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            {loading && <div className="py-6 text-center text-sm text-ink-400">Carregando cantigas...</div>}
            {!loading && cantigas.length === 0 && (
              <div className="py-8 text-center text-sm text-ink-400">Nenhuma cantiga cadastrada.</div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
