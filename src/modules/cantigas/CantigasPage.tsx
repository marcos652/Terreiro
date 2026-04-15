import React, { useEffect, useMemo, useRef, useState } from 'react';
import AppShell from '@components/AppShell';
import { useAuth } from '@contexts/AuthContext';
import { useToast } from '@contexts/ToastContext';
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
  const [renameValue, setRenameValue] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const audioInputRef = useRef<HTMLInputElement>(null);
  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [savingRecording, setSavingRecording] = useState(false);
  const [recordingName, setRecordingName] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { profile } = useAuth();
  const { showToast } = useToast();
  const normalizedRole = (profile?.role || "").trim().toUpperCase();
  const isMaster = normalizedRole === "MASTER";
  const isEditor = normalizedRole === "EDITOR";
  const permissions = profile?.permissions || [];
  const canEdit = isMaster || (isEditor && permissions.includes("cantigas"));

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
    return () => { active = false; };
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    cantigas.forEach((item) => { if (item.category) set.add(item.category); });
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
    setCantigas((prev) => [{ id: tempId, category, title: title || undefined, lyrics, created_at: new Date().toISOString() }, ...prev]);
    try {
      await auth?.currentUser?.getIdToken(true);
      const payload: Omit<CantigaItem, 'id'> = { category, title: title || undefined, lyrics, created_at: new Date().toISOString() };
      const id = await addCantiga(payload, profile?.email);
      setCantigas((prev) => prev.map((item) => (item.id === tempId ? { id, ...payload } : item)));
      setForm({ category: '', title: '', lyrics: '' });
      showToast('Cantiga salva!', 'success');
    } catch {
      setErrorMsg('Não foi possível salvar: verifique permissões.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (item: CantigaItem) => {
    if (!item.id) return;
    if (!window.confirm(`Remover "${item.title || 'cantiga'}"?`)) return;
    setCantigas((prev) => prev.filter((entry) => entry.id !== item.id));
    try {
      await auth?.currentUser?.getIdToken(true);
      await deleteCantiga(item.id, profile?.email);
      showToast('Removido.', 'success');
    } catch {
      console.error('Erro ao remover cantiga');
    }
  };

  const handleAddInCategory = async (category: string) => {
    const draft = categoryDrafts[category] || { title: '', lyrics: '' };
    const title = draft.title.trim();
    const lyrics = draft.lyrics.trim();
    if (!lyrics) return;
    setSaving(true);
    const tempId = `temp-${Date.now()}`;
    setCantigas((prev) => [{ id: tempId, category, title: title || undefined, lyrics, created_at: new Date().toISOString() }, ...prev]);
    try {
      setErrorMsg('');
      await auth?.currentUser?.getIdToken(true);
      const payload: Omit<CantigaItem, 'id'> = { category, title: title || undefined, lyrics, created_at: new Date().toISOString() };
      const id = await addCantiga(payload, profile?.email);
      setCantigas((prev) => prev.map((item) => (item.id === tempId ? { id, ...payload } : item)));
      setCategoryDrafts((prev) => ({ ...prev, [category]: { title: '', lyrics: '' } }));
      setModalCategory(category);
      showToast('Cantiga adicionada!', 'success');
    } catch {
      setErrorMsg('Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  };

  const handleRenameCategory = async (oldName: string) => {
    const newName = renameValue.trim();
    if (!newName || newName === oldName) return;
    setRenaming(true);
    try {
      const toUpdate = cantigas.filter((i) => i.category === oldName && i.id);
      await Promise.all(toUpdate.map((i) => updateCantiga(i.id as string, { category: newName }, profile?.email)));
      setCantigas((prev) => prev.map((i) => (i.category === oldName ? { ...i, category: newName } : i)));
      setModalCategory(newName);
      setRenameValue('');
      showToast('Pasta renomeada!', 'success');
    } catch {
      setErrorMsg('Erro ao renomear.');
    } finally {
      setRenaming(false);
    }
  };

  // ── Audio upload ──
  const handleAudioUpload = async (category: string) => {
    const file = audioInputRef.current?.files?.[0];
    if (!file || !category) return;
    if (!file.type.startsWith('audio/')) {
      showToast('Selecione um arquivo de áudio válido.', 'warning');
      return;
    }
    setUploadingAudio(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const payload: Omit<CantigaItem, 'id'> = {
        category,
        title: file.name.replace(/\.[^/.]+$/, ''),
        lyrics: '🎵 Áudio',
        audioBase64: base64,
        audioName: file.name,
        created_at: new Date().toISOString(),
      };
      const id = await addCantiga(payload, profile?.email);
      setCantigas((prev) => [{ id, ...payload }, ...prev]);
      if (audioInputRef.current) audioInputRef.current.value = '';
      showToast(`Áudio "${file.name}" enviado!`, 'success');
    } catch {
      showToast('Erro ao enviar áudio.', 'error');
    } finally {
      setUploadingAudio(false);
    }
  };

  // ── Recording functions ──
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setRecordedBlob(blob);
        setRecordedUrl(URL.createObjectURL(blob));
        // Stop all tracks
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      setRecordedBlob(null);
      setRecordedUrl(null);
      setRecordingName('');

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch {
      showToast('Não foi possível acessar o microfone.', 'error');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  const cancelRecording = () => {
    stopRecording();
    setRecordedBlob(null);
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setRecordedUrl(null);
    setRecordingName('');
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  const saveRecording = async (category: string) => {
    if (!recordedBlob) return;
    setSavingRecording(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(recordedBlob);
      });
      const name = recordingName.trim() || `Gravação ${new Date().toLocaleString('pt-BR')}`;
      const payload: Omit<CantigaItem, 'id'> = {
        category,
        title: name,
        lyrics: '🎙️ Gravação',
        audioBase64: base64,
        audioName: `${name}.webm`,
        created_at: new Date().toISOString(),
      };
      const id = await addCantiga(payload, profile?.email);
      setCantigas((prev) => [{ id, ...payload }, ...prev]);
      setRecordedBlob(null);
      if (recordedUrl) URL.revokeObjectURL(recordedUrl);
      setRecordedUrl(null);
      setRecordingName('');
      showToast(`Gravação "${name}" salva!`, 'success');
    } catch {
      showToast('Erro ao salvar gravação.', 'error');
    } finally {
      setSavingRecording(false);
    }
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <AppShell title="Cantigas" subtitle="Organize letras e áudios por categoria.">
      {errorMsg && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{errorMsg}</div>
      )}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_2fr]">
        {/* Sidebar — nova cantiga */}
        <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-floating">
          <div className="text-xs uppercase tracking-[0.2em] text-ink-300">Nova cantiga</div>
          <div className="mt-4 flex flex-col gap-3">
            <input
              list="cantiga-categories"
              className="rounded-xl border border-ink-100 bg-white px-3 py-2 text-sm text-ink-700 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-100"
              placeholder="Categoria (ex.: Cantiga de Exu)"
              value={form.category}
              onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
              disabled={!canEdit}
            />
            <datalist id="cantiga-categories">
              {categories.map((c) => <option key={c} value={c} />)}
            </datalist>
            <input
              className="rounded-xl border border-ink-100 bg-white px-3 py-2 text-sm text-ink-700 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-100"
              placeholder="Título (opcional)"
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              disabled={!canEdit}
            />
            <textarea
              className="min-h-[180px] rounded-xl border border-ink-100 bg-white px-3 py-2 text-sm text-ink-700 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-100"
              placeholder="Digite a letra da cantiga..."
              value={form.lyrics}
              onChange={(e) => setForm((prev) => ({ ...prev, lyrics: e.target.value }))}
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

        {/* Grid de pastas */}
        <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-floating">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-ink-300">Categorias</div>
              <div className="text-lg font-semibold text-ink-900">Cantigas registradas</div>
            </div>
            <div className="text-xs text-ink-400">{cantigas.length} cantigas</div>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            {Object.keys(grouped).sort((a, b) => a.localeCompare(b)).map((category) => {
              const items = grouped[category];
              const audioCount = items.filter((i) => i.audioBase64).length;
              const textCount = items.length - audioCount;
              return (
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
                      <div className="flex items-center gap-2 text-xs text-ink-500">
                        <span>{textCount} letra{textCount !== 1 ? 's' : ''}</span>
                        {audioCount > 0 && (
                          <span className="flex items-center gap-1 text-teal-600">
                            <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M9 18a3 3 0 1 1-6 0V6l10-2v10" /><circle cx="16" cy="17" r="3" />
                            </svg>
                            {audioCount} áudio{audioCount !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
            {loading && <div className="py-6 text-center text-sm text-ink-400">Carregando cantigas...</div>}
            {!loading && cantigas.length === 0 && (
              <div className="py-8 text-center text-sm text-ink-400">Nenhuma cantiga cadastrada.</div>
            )}
          </div>
        </div>
      </div>

      {/* ── Modal da pasta ── */}
      {modalCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4" onClick={() => setModalCategory(null)}>
          <div className="w-full max-w-3xl rounded-2xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-ink-400">Pasta</div>
                <div className="text-lg font-semibold text-ink-900">{modalCategory}</div>
              </div>
              <button
                onClick={() => setModalCategory(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-ink-200 text-ink-500 hover:bg-ink-50 transition"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M6 6l12 12M18 6l-12 12" />
                </svg>
              </button>
            </div>

            {/* Rename */}
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

            {/* Add cantiga text */}
            {canEdit && (
              <div className="mt-4 rounded-xl border border-ink-100 bg-ink-50/70 p-4">
                <div className="text-[11px] uppercase tracking-[0.2em] text-ink-400">Adicionar cantiga</div>
                <div className="mt-2 flex flex-col gap-2">
                  <input
                    className="rounded-xl border border-ink-100 bg-white px-3 py-2 text-sm text-ink-700 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-100"
                    placeholder="Título (opcional)"
                    value={categoryDrafts[modalCategory]?.title ?? ''}
                    onChange={(e) =>
                      setCategoryDrafts((prev) => ({
                        ...prev,
                        [modalCategory]: { title: e.target.value, lyrics: prev[modalCategory]?.lyrics ?? '' },
                      }))
                    }
                    disabled={saving}
                  />
                  <textarea
                    className="min-h-[100px] rounded-xl border border-ink-100 bg-white px-3 py-2 text-sm text-ink-700 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-100"
                    placeholder="Letra da cantiga"
                    value={categoryDrafts[modalCategory]?.lyrics ?? ''}
                    onChange={(e) =>
                      setCategoryDrafts((prev) => ({
                        ...prev,
                        [modalCategory]: { title: prev[modalCategory]?.title ?? '', lyrics: e.target.value },
                      }))
                    }
                    disabled={saving}
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

            {/* ── AUDIO UPLOAD ── */}
            {canEdit && (
              <div className="mt-3 rounded-xl border border-teal-200 bg-teal-50/50 p-4">
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-teal-700">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 18a3 3 0 1 1-6 0V6l10-2v10" />
                    <circle cx="16" cy="17" r="3" />
                  </svg>
                  Subir áudio
                </div>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    ref={audioInputRef}
                    type="file"
                    accept="audio/*"
                    className="flex-1 text-sm text-ink-600 file:mr-3 file:rounded-lg file:border-0 file:bg-teal-600 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white hover:file:bg-teal-500"
                    disabled={uploadingAudio}
                  />
                  <button
                    onClick={() => handleAudioUpload(modalCategory)}
                    disabled={uploadingAudio}
                    className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-500 disabled:opacity-60"
                  >
                    {uploadingAudio ? 'Enviando...' : 'Enviar áudio'}
                  </button>
                </div>
                <div className="mt-1.5 text-[11px] text-ink-400">
                  MP3, WAV, OGG, M4A — o áudio será salvo na pasta.
                </div>
              </div>
            )}

            {/* ── GRAVAR ÁUDIO ── */}
            {canEdit && (
              <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50/40 p-4">
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-rose-700">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="23" />
                    <line x1="8" y1="23" x2="16" y2="23" />
                  </svg>
                  Gravar áudio
                </div>

                {!isRecording && !recordedUrl && (
                  <div className="mt-3">
                    <button
                      onClick={startRecording}
                      className="flex items-center gap-2 rounded-xl bg-rose-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-rose-600 transition"
                    >
                      <span className="relative flex h-3 w-3">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-40"></span>
                        <span className="relative inline-flex h-3 w-3 rounded-full bg-white"></span>
                      </span>
                      Iniciar gravação
                    </button>
                    <div className="mt-1.5 text-[11px] text-ink-400">
                      Clique para gravar pelo microfone do dispositivo.
                    </div>
                  </div>
                )}

                {isRecording && (
                  <div className="mt-3 flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-3 w-3">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-500 opacity-75"></span>
                        <span className="relative inline-flex h-3 w-3 rounded-full bg-rose-500"></span>
                      </span>
                      <span className="font-mono text-lg font-bold text-rose-600">{formatTime(recordingTime)}</span>
                      <span className="text-xs text-rose-500">Gravando...</span>
                    </div>
                    <button
                      onClick={stopRecording}
                      className="flex items-center gap-2 rounded-xl bg-ink-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-ink-700 transition"
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                        <rect x="6" y="6" width="12" height="12" rx="2" />
                      </svg>
                      Parar
                    </button>
                  </div>
                )}

                {recordedUrl && !isRecording && (
                  <div className="mt-3 space-y-3">
                    <div className="rounded-lg border border-ink-100 bg-white p-3">
                      <div className="text-[11px] text-ink-400 mb-1">Pré-visualização</div>
                      <audio controls src={recordedUrl} className="w-full h-10" preload="metadata" />
                    </div>
                    <input
                      className="w-full rounded-xl border border-ink-100 bg-white px-3 py-2 text-sm text-ink-700 focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-100"
                      placeholder="Nome da gravação (opcional)"
                      value={recordingName}
                      onChange={(e) => setRecordingName(e.target.value)}
                      disabled={savingRecording}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveRecording(modalCategory!)}
                        disabled={savingRecording}
                        className="flex-1 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-500 disabled:opacity-60"
                      >
                        {savingRecording ? 'Salvando...' : 'Salvar gravação'}
                      </button>
                      <button
                        onClick={cancelRecording}
                        disabled={savingRecording}
                        className="rounded-xl border border-ink-200 px-4 py-2 text-sm font-semibold text-ink-600 hover:border-ink-300 disabled:opacity-60"
                      >
                        Descartar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Lista de cantigas + áudios ── */}
            <div className="mt-4 max-h-[50vh] space-y-3 overflow-y-auto pr-1">
              {grouped[modalCategory]?.map((item) => (
                <div key={item.id} className="rounded-xl border border-ink-100 bg-ink-50/60 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {item.audioBase64 && (
                          <span className="rounded bg-teal-100 px-1.5 py-0.5 text-[10px] font-semibold text-teal-700">ÁUDIO</span>
                        )}
                        <div className="text-sm font-semibold text-ink-900">
                          {item.title || 'Cantiga sem título'}
                        </div>
                      </div>
                      {item.audioBase64 ? (
                        <div className="mt-2">
                          <audio controls className="w-full h-10 rounded-lg" preload="metadata">
                            <source src={item.audioBase64} />
                          </audio>
                          {item.audioName && (
                            <div className="mt-1 text-[11px] text-ink-400">📁 {item.audioName}</div>
                          )}
                        </div>
                      ) : (
                        <pre className="mt-2 whitespace-pre-wrap text-sm text-ink-600">{item.lyrics}</pre>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemove(item)}
                      disabled={!canEdit}
                      className="flex-shrink-0 rounded-lg border border-rose-200 px-2 py-1 text-[11px] font-semibold text-rose-500 hover:border-rose-300 disabled:opacity-60"
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
