import React, { useEffect, useMemo, useState } from 'react';
import AppShell from '@components/AppShell';
import { useAuth } from '@contexts/AuthContext';
import { addCantiga, CantigaItem, deleteCantiga, getCantigas, updateCantiga } from '@services/cantigasService';
import { logService } from '@services/logService';
import { auth } from '@services/firebase';

export default function CantigasPage() {
  const [cantigas, setCantigas] = useState<CantigaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ category: '', title: '', lyrics: '' });
  const [categoryDrafts, setCategoryDrafts] = useState<Record<string, { title: string; lyrics: string }>>({});
  const [modalCategory, setModalCategory] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [renameValue, setRenameValue] = useState('');
  const [renaming, setRenaming] = useState(false);
  const { profile } = useAuth();
  const isMaster = profile?.role?.toUpperCase() === "MASTER";
  const canEdit = isMaster || (profile?.role === "EDITOR" && profile.permissions?.includes("cantigas"));

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
    setErrorMsg('');
    const category = form.category.trim();
    const title = form.title.trim();
    const lyrics = form.lyrics.trim();
    if (!category || !lyrics) return;
    setSaving(true);
    const tempId = `temp-${Date.now()}`;
    const tempCantiga: CantigaItem & { localOnly?: boolean } = {
      id: tempId,
      category,
      title: title || undefined,
      lyrics,
      created_at: new Date().toISOString(),
    };
    setCantigas((prev) => [{ ...tempCantiga }, ...prev]);
    try {
      await auth?.currentUser?.getIdToken(true);
      const payload: Omit<CantigaItem, 'id'> = {
        category,
        title: title || undefined,
        lyrics,
        created_at: new Date().toISOString(),
      };
      const id = await addCantiga(payload, profile?.email);
      setCantigas((prev) => prev.map((item) => (item.id === tempId ? { id, ...payload } : item)));
      setForm({ category: '', title: '', lyrics: '' });
    } catch (error) {
      console.error('Erro ao salvar cantiga', error);
      setErrorMsg('Não foi possível salvar: verifique permissões no Firestore (role MASTER).');
      setCantigas((prev) =>
        prev.map((item) => (item.id === tempId ? { ...item, localOnly: true } : item))
      );
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (item: CantigaItem) => {
    if (!item.id) return;
    const confirmed = window.confirm(`Remover cantiga de "${item.category}"?`);
    if (!confirmed) return;
    setErrorMsg('');
    // otimista: tira da lista imediatamente
    setCantigas((prev) => prev.filter((entry) => entry.id !== item.id));
    try {
      await auth?.currentUser?.getIdToken(true);
      await deleteCantiga(item.id, profile?.email);
    } catch (error) {
      // Loga, mas mantém removido localmente para não travar operação
      console.error('Erro ao remover cantiga (mantida apenas localmente)', error);
    }
  };

  const handleAddInCategory = async (category: string) => {
    const draft = categoryDrafts[category] || { title: '', lyrics: '' };
    const title = draft.title.trim();
    const lyrics = draft.lyrics.trim();
    if (!lyrics) return;
    setSaving(true);
    const tempId = `temp-${Date.now()}`;
    const tempCantiga: CantigaItem & { localOnly?: boolean } = {
      id: tempId,
      category,
      title: title || undefined,
      lyrics,
      created_at: new Date().toISOString(),
    };
    setCantigas((prev) => [{ ...tempCantiga }, ...prev]);
    try {
      setErrorMsg('');
      await auth?.currentUser?.getIdToken(true);
      const payload: Omit<CantigaItem, 'id'> = {
        category,
        title: title || undefined,
        lyrics,
        created_at: new Date().toISOString(),
      };
      const id = await addCantiga(payload, profile?.email);
      setCantigas((prev) => prev.map((item) => (item.id === tempId ? { id, ...payload } : item)));
      setCategoryDrafts((prev) => ({ ...prev, [category]: { title: '', lyrics: '' } }));
      setModalCategory(category);
    } catch (error) {
      console.error('Erro ao salvar cantiga', error);
      setErrorMsg('Não foi possível salvar: verifique permissões no Firestore (role MASTER).');
      setCantigas((prev) =>
        prev.map((item) => (item.id === tempId ? { ...item, localOnly: true } : item))
      );
    } finally {
      setSaving(false);
    }
  };

  const handleRenameCategory = async (oldName: string) => {
    const newName = renameValue.trim();
    if (!newName || newName === oldName) return;
    setRenaming(true);
    try {
      const toUpdate = cantigas.filter((item) => item.category === oldName && item.id);
      await Promise.all(
        toUpdate.map((item) => updateCantiga(item.id as string, { category: newName }, profile?.email))
      );
      setCantigas((prev) => prev.map((item) => (item.category === oldName ? { ...item, category: newName } : item)));
      setModalCategory(newName);
      setRenameValue('');
    } catch (error) {
      console.error('Erro ao renomear pasta', error);
      setErrorMsg('Não foi possível renomear a pasta. Verifique permissões.');
    } finally {
      setRenaming(false);
    }
  };

  return (
    <AppShell
      title="Cantigas"
      subtitle="Organize letras por categoria e mantenha o repertorio do terreiro."
    >
      {errorMsg && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMsg}
        </div>
      )}
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
              disabled={!canEdit}
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
              disabled={!canEdit}
            />
            <textarea
              className="min-h-[180px] rounded-xl border border-ink-100 bg-white px-3 py-2 text-sm text-ink-700 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-100"
              placeholder="Digite a letra da cantiga..."
              value={form.lyrics}
              onChange={(event) => setForm((prev) => ({ ...prev, lyrics: event.target.value }))}
              disabled={!canEdit}
            />
            <button
              onClick={handleAdd}
              disabled={!canEdit || saving || !form.category.trim() || !form.lyrics.trim()}
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
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            {Object.keys(grouped)
              .sort((a, b) => a.localeCompare(b))
              .map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setModalCategory(category)}
                  className="flex w-full flex-col items-start gap-3 rounded-2xl border border-ink-100 bg-white p-4 text-left shadow-floating transition hover:-translate-y-1 hover:border-ink-200"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-ink-900 text-white shadow-sm">
                      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M3 7h5l2 2h9v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
                        <path d="M3 7V5a2 2 0 0 1 2-2h4l2 2h6" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-ink-900">Culto: {category}</div>
                      <div className="text-xs text-ink-500">{grouped[category].length} cantigas</div>
                    </div>
                  </div>
                  <div className="rounded-xl bg-ink-50 p-3 text-xs text-ink-500">
                    Clique para abrir a pasta, ver as letras e adicionar novas cantigas.
                  </div>
                </button>
              ))}
{loading && <div className="py-6 text-center text-sm text-ink-400">Carregando cantigas...</div>}
            {!loading && cantigas.length === 0 && (
              <div className="py-8 text-center text-sm text-ink-400">Nenhuma cantiga cadastrada.</div>
            )}
          </div>
        </div>
      </div>
      {modalCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-transparent backdrop-blur-lg px-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-ink-400">Pasta</div>
                <div className="text-lg font-semibold text-ink-900">{modalCategory}</div>
              </div>
              <button
                onClick={() => setModalCategory(null)}
                className="rounded-full border border-ink-200 px-3 py-1 text-sm font-semibold text-ink-600 hover:border-ink-300"
              >
                Fechar
              </button>
            </div>
            {isMaster && (
              <div className="mt-3 flex flex-col gap-2 rounded-xl border border-ink-100 bg-ink-50/70 p-3">
                <div className="text-[11px] uppercase tracking-[0.2em] text-ink-400">Renomear pasta</div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    className="w-full rounded-xl border border-ink-100 bg-white px-3 py-2 text-sm text-ink-700 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-100"
                    placeholder="Novo nome do culto/pasta"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    disabled={renaming}
                  />
                  <button
                    onClick={() => handleRenameCategory(modalCategory)}
                    disabled={renaming || !renameValue.trim()}
                    className="w-full rounded-xl bg-ink-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-ink-700 disabled:opacity-60 sm:w-auto"
                  >
                    {renaming ? 'Renomeando...' : 'Salvar nome'}
                  </button>
                </div>
              </div>
            )}
            {isMaster && (
              <div className="mt-4 rounded-xl border border-ink-100 bg-ink-50/70 p-4">
                <div className="text-[11px] uppercase tracking-[0.2em] text-ink-400">Adicionar cantiga</div>
                <div className="mt-2 flex flex-col gap-2">
                  <input
                    className="rounded-xl border border-ink-100 bg-white px-3 py-2 text-sm text-ink-700 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-100"
                    placeholder="Título (opcional)"
                    value={categoryDrafts[modalCategory]?.title ?? ''}
                    onChange={(event) =>
                      setCategoryDrafts((prev) => ({
                        ...prev,
                        [modalCategory]: { title: event.target.value, lyrics: prev[modalCategory]?.lyrics ?? '' },
                      }))
                    }
                    disabled={!canEdit || saving}
                  />
                  <textarea
                    className="min-h-[140px] rounded-xl border border-ink-100 bg-white px-3 py-2 text-sm text-ink-700 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-100"
                    placeholder="Letra da cantiga"
                    value={categoryDrafts[modalCategory]?.lyrics ?? ''}
                    onChange={(event) =>
                      setCategoryDrafts((prev) => ({
                        ...prev,
                        [modalCategory]: { title: prev[modalCategory]?.title ?? '', lyrics: event.target.value },
                      }))
                    }
                    disabled={!canEdit || saving}
                  />
                  <button
                    onClick={() => handleAddInCategory(modalCategory)}
                    disabled={saving || !(categoryDrafts[modalCategory]?.lyrics || '').trim()}
                    className="w-full rounded-xl bg-ink-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-ink-700 disabled:opacity-60"
                  >
                    {saving ? 'Salvando...' : 'Salvar cantiga'}
                  </button>
                </div>
              </div>
            )}
            <div className="mt-4 max-h-[60vh] space-y-3 overflow-y-auto pr-1">
              {grouped[modalCategory]?.map((item) => (
                <div key={item.id} className="rounded-xl border border-ink-100 bg-ink-50/60 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-ink-900">
                        {item.title || 'Cantiga sem titulo'}
                      </div>
                      <pre className="mt-2 whitespace-pre-wrap text-sm text-ink-600">{item.lyrics}</pre>
                    </div>
                    <button
                      onClick={() => handleRemove(item)}
                      disabled={!canEdit}
                      className="text-xs font-semibold text-rose-500 hover:text-rose-600 disabled:opacity-60"
                    >
                      Remover
                    </button>
                  </div>
                </div>
              ))}
              {(!grouped[modalCategory] || grouped[modalCategory].length === 0) && (
                <div className="rounded-xl border border-ink-100 bg-white p-4 text-sm text-ink-400">
                  Nenhuma cantiga nesta pasta.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
