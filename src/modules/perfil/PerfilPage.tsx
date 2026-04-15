import React, { useEffect, useRef, useState } from 'react';
import AppShell from '@components/AppShell';
import { useAuth } from '@contexts/AuthContext';
import { useToast } from '@contexts/ToastContext';
import { db } from '@services/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { COLLECTIONS } from '@services/firestoreCollections';

function compressProfilePhoto(file: File, maxDimension = 400, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        // Crop to square from center
        const size = Math.min(width, height);
        const sx = (width - size) / 2;
        const sy = (height - size) / 2;
        const outputSize = Math.min(size, maxDimension);
        canvas.width = outputSize;
        canvas.height = outputSize;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Canvas not supported')); return; }
        ctx.drawImage(img, sx, sy, size, size, 0, 0, outputSize, outputSize);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export default function PerfilPage() {
  const { user, profile } = useAuth();
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setPhotoURL(profile.photoURL || null);
    }
  }, [profile]);

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Selecione uma imagem.', 'warning');
      return;
    }
    try {
      const compressed = await compressProfilePhoto(file);
      setPhotoPreview(compressed);
    } catch {
      showToast('Erro ao processar imagem.', 'error');
    }
  };

  const handleSavePhoto = async () => {
    if (!db || !user || !photoPreview) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, COLLECTIONS.USERS, user.uid), {
        photoURL: photoPreview,
      });
      setPhotoURL(photoPreview);
      setPhotoPreview(null);
      showToast('Foto de perfil atualizada!', 'success');
    } catch {
      showToast('Erro ao salvar foto.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (!db || !user) return;
    if (!window.confirm('Remover sua foto de perfil?')) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, COLLECTIONS.USERS, user.uid), {
        photoURL: '',
      });
      setPhotoURL(null);
      setPhotoPreview(null);
      showToast('Foto removida.', 'success');
    } catch {
      showToast('Erro ao remover foto.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveName = async () => {
    if (!db || !user || !name.trim()) {
      showToast('O nome não pode ficar vazio.', 'warning');
      return;
    }
    setSaving(true);
    try {
      await updateDoc(doc(db, COLLECTIONS.USERS, user.uid), {
        name: name.trim(),
      });
      setEditingName(false);
      showToast('Nome atualizado!', 'success');
    } catch {
      showToast('Erro ao salvar nome.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const displayPhoto = photoPreview || photoURL;
  const initials = (name || profile?.email || 'U').charAt(0).toUpperCase();

  const roleBadge = {
    MASTER: { label: 'Master', color: 'bg-purple-100 text-purple-700' },
    EDITOR: { label: 'Editor', color: 'bg-blue-100 text-blue-700' },
    VISUALIZADOR: { label: 'Visualizador', color: 'bg-gray-100 text-gray-600' },
  };
  const badge = roleBadge[(profile?.role || 'VISUALIZADOR') as keyof typeof roleBadge] || roleBadge.VISUALIZADOR;

  const statusBadge = {
    APROVADO: { label: 'Aprovado', color: 'bg-emerald-100 text-emerald-700' },
    PENDENTE: { label: 'Pendente', color: 'bg-amber-100 text-amber-700' },
    BLOQUEADO: { label: 'Bloqueado', color: 'bg-rose-100 text-rose-700' },
    DESATIVADO: { label: 'Desativado', color: 'bg-gray-100 text-gray-500' },
  };
  const sBadge = statusBadge[(profile?.status || 'PENDENTE') as keyof typeof statusBadge] || statusBadge.PENDENTE;

  return (
    <AppShell title="Meu Perfil" subtitle="Gerencie suas informações pessoais.">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        {/* Profile card */}
        <div className="rounded-2xl border border-ink-100 bg-white p-8 shadow-floating">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
            {/* Photo section */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative group">
                {displayPhoto ? (
                  <img
                    src={displayPhoto}
                    alt="Foto de perfil"
                    className="h-28 w-28 rounded-full border-4 border-white object-cover shadow-lg"
                  />
                ) : (
                  <div className="flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-3xl font-bold text-white shadow-lg">
                    {initials}
                  </div>
                )}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 transition group-hover:bg-black/40"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-8 w-8 text-white opacity-0 transition group-hover:opacity-100"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoSelect}
                  className="hidden"
                />
              </div>

              {/* Photo action buttons */}
              <div className="flex gap-2">
                {photoPreview && (
                  <>
                    <button
                      onClick={handleSavePhoto}
                      disabled={saving}
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
                    >
                      {saving ? 'Salvando...' : 'Salvar foto'}
                    </button>
                    <button
                      onClick={() => setPhotoPreview(null)}
                      className="rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-semibold text-ink-600"
                    >
                      Cancelar
                    </button>
                  </>
                )}
                {!photoPreview && photoURL && (
                  <button
                    onClick={handleRemovePhoto}
                    disabled={saving}
                    className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:border-rose-300 disabled:opacity-60"
                  >
                    Remover foto
                  </button>
                )}
                {!photoPreview && !photoURL && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-semibold text-ink-600 hover:border-ink-300"
                  >
                    Adicionar foto
                  </button>
                )}
              </div>
            </div>

            {/* Info section */}
            <div className="flex flex-1 flex-col gap-4 sm:pt-2">
              {/* Name */}
              <div>
                <div className="text-[11px] uppercase tracking-[0.2em] text-ink-400">Nome</div>
                {editingName ? (
                  <div className="mt-1.5 flex gap-2">
                    <input
                      className="flex-1 rounded-xl border border-ink-100 bg-white px-3 py-2 text-sm text-ink-700 focus:border-ink-400 focus:outline-none focus:ring-2 focus:ring-ink-100"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleSaveName(); }}
                      autoFocus
                    />
                    <button
                      onClick={handleSaveName}
                      disabled={saving}
                      className="rounded-xl bg-ink-900 px-4 py-2 text-xs font-semibold text-white hover:bg-ink-700 disabled:opacity-60"
                    >
                      Salvar
                    </button>
                    <button
                      onClick={() => { setEditingName(false); setName(profile?.name || ''); }}
                      className="rounded-xl border border-ink-200 px-4 py-2 text-xs font-semibold text-ink-600"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <div className="mt-1 flex items-center gap-3">
                    <span className="text-lg font-semibold text-ink-900">{profile?.name || '—'}</span>
                    <button
                      onClick={() => setEditingName(true)}
                      className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-50 hover:text-ink-600 transition"
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>

              {/* Email */}
              <div>
                <div className="text-[11px] uppercase tracking-[0.2em] text-ink-400">E-mail</div>
                <div className="mt-1 text-sm text-ink-700">{profile?.email || user?.email || '—'}</div>
              </div>

              {/* Role & Status */}
              <div className="flex flex-wrap gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badge.color}`}>
                  {badge.label}
                </span>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${sBadge.color}`}>
                  {sBadge.label}
                </span>
              </div>

              {/* Member since */}
              <div>
                <div className="text-[11px] uppercase tracking-[0.2em] text-ink-400">Membro desde</div>
                <div className="mt-1 text-sm text-ink-700">
                  {profile?.created_at
                    ? new Date(profile.created_at).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                      })
                    : '—'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Account info card */}
        <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-floating">
          <div className="text-xs uppercase tracking-[0.2em] text-ink-300">Informações da conta</div>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between rounded-xl bg-ink-50 px-4 py-3">
              <div>
                <div className="text-xs text-ink-400">UID</div>
                <div className="mt-0.5 font-mono text-xs text-ink-600">{user?.uid || '—'}</div>
              </div>
            </div>
            {profile?.permissions && profile.permissions.length > 0 && (
              <div className="rounded-xl bg-ink-50 px-4 py-3">
                <div className="text-xs text-ink-400">Permissões</div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {profile.permissions.map((p) => (
                    <span
                      key={p}
                      className="rounded-full bg-ink-200 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink-600"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
