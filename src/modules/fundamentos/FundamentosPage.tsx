import React, { useEffect, useMemo, useState } from 'react';
import AppShell from '@components/AppShell';
import { useAuth } from '@contexts/AuthContext';
import {
  addFundamental,
  deleteFundamental,
  FundamentalItem,
  getFundamentals,
  updateFundamental,
} from '@services/fundamentalsService';
import { auth } from '@services/firebase';

export default function FundamentosPage() {
  const [items, setItems] = useState<FundamentalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ category: '', title: '', content: '' });
  const [categoryDrafts, setCategoryDrafts] = useState<Record<string, { title: string; content: string }>>({});
  const [modalCategory, setModalCategory] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const { profile } = useAuth();
  const normalizedRole = (profile?.role || '').trim().toUpperCase();
  const isMaster = normalizedRole === 'MASTER';
  const isEditor = normalizedRole === 'EDITOR';
  const permissions = profile?.permissions || [];
  const canEdit = isMaster || (isEditor && permissions.includes('fundamentos'));

  useEffect(() => {
    let active = true;
    getFundamentals()
      .then((data) => {
        if (!active) return;
        setItems(data);
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
    items.forEach((item) => {
      if (item.category) set.add(item.category);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const grouped = useMemo(() => {
    return items.reduce<Record<string, FundamentalItem[]>>((acc, item) => {
      const key = item.category || 'Sem categoria';
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});
  }, [items]);

  const handleAdd = async () => {
    const category = form.category.trim();
    const title = form.title.trim();
    const content = form.content.trim();
    if (!category || !content) return;
    setSaving(true);
    const tempId = `temp-${Date.now()}`;
    const tempItem: FundamentalItem & { localOnly?: boolean } = {
      id: tempId,
      category,
      title: title || undefined,
      content,
      created_at: new Date().toISOString(),
    };
    setItems((prev) => [{ ...tempItem }, ...prev]);
    try {
      await auth?.currentUser?.getIdToken(true);
      const payload: Omit<FundamentalItem, 'id'> = {
        category,
        title: title || undefined,
        content,
        created_at: new Date().toISOString(),
      };
      const id = await addFundamental(payload, profile?.email);
      setItems((prev) => prev.map((item) => (item.id === tempId ? { id, ...payload } : item)));
      setForm({ category: '', title: '', content: '' });
    } catch (error) {
      console.error('Erro ao salvar fundamento', error);
      setItems((prev) => prev.map((item) => (item.id === tempId ? { ...item, localOnly: true } : item)));
    } finally {
      setSaving(false);
    }
  };

  const handleAddInCategory = async (category: string) => {
    const draft = categoryDrafts[category] || { title: '', content: '' };
    const title = draft.title.trim();
    const content = draft.content.trim();
    if (!content) return;
    setSaving(true);
    const tempId = `temp-${Date.now()}`;
    const tempItem: FundamentalItem & { localOnly?: boolean } = {
      id: tempId,
      category,
      title: title || undefined,
      content,
      created_at: new Date().toISOString(),
    };
    setItems((prev) => [{ ...tempItem }, ...prev]);
    try {
      await auth?.currentUser?.getIdToken(true);
      const payload: Omit<FundamentalItem, 'id'> = {
        category,
        title: title || undefined,
        content,
        created_at: new Date().toISOString(),
      };
      const id = await addFundamental(payload, profile?.email);
      setItems((prev) => prev.map((item) => (item.id === tempId ? { id, ...payload } : item)));
      setCategoryDrafts((prev) => ({ ...prev, [category]: { title: '', content: '' } }));
    } catch (error) {
      console.error('Erro ao salvar fundamento', error);
      setItems((prev) => prev.map((item) => (item.id === tempId ? { ...item, localOnly: true } : item)));
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (item: FundamentalItem) => {
    if (!item.id) return;
    const confirmed = window.confirm(`Remover conteúdo de "${item.category}"?`);
    if (!confirmed) return;
    setItems((prev) => prev.filter((entry) => entry.id !== item.id));
    try {
      await auth?.currentUser?.getIdToken(true);
      await deleteFundamental(item.id, profile?.email);
    } catch (error) {
      console.error('Erro ao remover fundamento (mantido apenas localmente)', error);
    }
  };

  const handleRenameCategory = async (oldName: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName) return;
    await Promise.all(
      items
        .filter((item) => item.category === oldName && item.id)
        .map((item) => updateFundamental(item.id as string, { category: trimmed }, profile?.email))
    );
    setItems((prev) => prev.map((item) => (item.category === oldName ? { ...item, category: trimmed } : item)));
  };

  return (
    <AppShell
      title="Fundamentos"
      subtitle="Estruture pastas e textos de estudos e rituais."
    >
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_2fr]">
        <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-floating">
          <div className="text-xs uppercase tracking-[0.2em] text-ink-300">Novo conteúdo</div>
          <div className="mt-4 flex flex-col gap-3">
            <input
              className="rounded-xl border border-ink-100 bg-white px-3 py-2 text-sm text-ink-700 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
              placeholder="Pasta (ex.: Desenvolvimento, Ponto riscado)"
              value={form.category}
              onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
              disabled={!canEdit}
            />
            <input
              className="rounded-xl border border-ink-100 bg-white px-3 py-2 text-sm text-ink-700 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
              placeholder="Título (opcional)"
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
              disabled={!canEdit}
            />
            <textarea
              className="min-h-[160px] rounded-xl border border-ink-100 bg-white px-3 py-2 text-sm text-ink-700 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
              placeholder="Texto do fundamento"
              value={form.content}
              onChange={(event) => setForm((prev) => ({ ...prev, content: event.target.value }))}
              disabled={!canEdit}
            />
            <button
              onClick={handleAdd}
              disabled={!canEdit || saving}
              className="w-full rounded-xl bg-ink-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-ink-700 disabled:opacity-60"
            >
              {saving ? 'Salvando...' : 'Salvar fundamento'}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-floating">
          <div className="text-xs uppercase tracking-[0.2em] text-ink-300">Pastas</div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-ink-500">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setModalCategory(category)}
                className="rounded-full border border-ink-100 bg-ink-50 px-3 py-1 hover:border-ink-200"
              >
                {category}
              </button>
            ))}
            {categories.length === 0 && (
              <div className="text-ink-400">Nenhuma pasta criada.</div>
            )}
          </div>
        </div>
      </div>

      {modalCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur">
          <div className="w-full max-w-5xl rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] uppercase tracking-[0.2em] text-ink-400">Pasta</div>
                <div className="text-lg font-semibold text-ink-900">{modalCategory}</div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  className="rounded-lg border border-ink-200 px-3 py-1 text-sm text-ink-700 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                  placeholder="Renomear pasta"
                  value={categoryDrafts[modalCategory]?.title || ''}
                  onChange={(e) => setRenameValue(e.target.value)}
                  disabled={!canEdit}
                />
                <button
                  onClick={() => handleRenameCategory(modalCategory, renameValue)}
                  disabled={!canEdit || !renameValue.trim()}
                  className="rounded-lg border border-ink-200 px-3 py-1 text-xs font-semibold text-ink-700 hover:border-ink-300 disabled:opacity-60"
                >
                  Renomear
                </button>
                <button
                  onClick={() => setModalCategory(null)}
                  className="rounded-full border border-ink-200 px-3 py-1 text-sm font-semibold text-ink-600 hover:border-ink-300"
                >
                  Fechar
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-2">
                {grouped[modalCategory]?.map((item) => (
                  <div key={item.id} className="rounded-xl border border-ink-100 bg-ink-50/70 p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-semibold text-ink-900">{item.title || 'Sem título'}</div>
                        <div className="text-xs text-ink-400">{new Date(item.created_at).toLocaleDateString('pt-BR')}</div>
                      </div>
                      <button
                        onClick={() => handleRemove(item)}
                        disabled={!canEdit}
                        className="rounded-lg border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 hover:border-rose-300 disabled:opacity-60"
                      >
                        Remover
                      </button>
                    </div>
                    <div className="mt-2 whitespace-pre-wrap text-sm text-ink-700">{item.content}</div>
                  </div>
                ))}
                {grouped[modalCategory]?.length === 0 && (
                  <div className="rounded-xl border border-ink-100 bg-ink-50/60 p-3 text-sm text-ink-500">
                    Nenhum texto nesta pasta.
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-ink-100 bg-white p-3 shadow-sm">
                <div className="text-[11px] uppercase tracking-[0.2em] text-ink-400">Adicionar texto</div>
                <input
                  className="mt-2 w-full rounded-xl border border-ink-100 bg-white px-3 py-2 text-sm text-ink-700 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                  placeholder="Título (opcional)"
                  value={categoryDrafts[modalCategory]?.title || ''}
                  onChange={(e) => setCategoryDrafts((prev) => ({ ...prev, [modalCategory]: { ...(prev[modalCategory] || {}), title: e.target.value } }))}
                  disabled={!canEdit}
                />
                <textarea
                  className="mt-2 min-h-[120px] w-full rounded-xl border border-ink-100 bg-white px-3 py-2 text-sm text-ink-700 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                  placeholder="Conteúdo"
                  value={categoryDrafts[modalCategory]?.content || ''}
                  onChange={(e) => setCategoryDrafts((prev) => ({ ...prev, [modalCategory]: { ...(prev[modalCategory] || {}), content: e.target.value } }))}
                  disabled={!canEdit}
                />
                <button
                  onClick={() => handleAddInCategory(modalCategory)}
                  disabled={!canEdit || saving}
                  className="mt-2 w-full rounded-xl bg-ink-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-ink-700 disabled:opacity-60"
                >
                  {saving ? 'Adicionando...' : 'Adicionar texto'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
