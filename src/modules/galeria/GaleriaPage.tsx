import React, { useCallback, useEffect, useRef, useState } from 'react';
import AppShell from '@components/AppShell';
import { useAuth } from '@contexts/AuthContext';
import { useToast } from '@contexts/ToastContext';
import { db } from '@services/firebase';
import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from 'firebase/firestore';
import { COLLECTIONS } from '@services/firestoreCollections';

type GaleriaItem = {
  id: string;
  titulo: string;
  descricao: string;
  base64: string;
  mimeType: string;
  tipo: 'imagem' | 'video';
  fileName: string;
  likes: string[];
  created_at: string;
  authorName?: string;
};

type Comment = {
  id: string;
  authorUid: string;
  authorName: string;
  text: string;
  created_at: string;
};

/**
 * Compress an image file using canvas.
 */
function compressImage(file: File, maxDimension = 1600, quality = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Canvas not supported')); return; }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return 'agora';
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return new Date(dateStr).toLocaleDateString('pt-BR');
}

export default function GaleriaPage() {
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  const isMaster = (profile?.role || '').trim().toUpperCase() === 'MASTER';
  const isEditor = isMaster || (profile?.role || '').trim().toUpperCase() === 'EDITOR';

  const [items, setItems] = useState<GaleriaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [processedBase64, setProcessedBase64] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [lightboxId, setLightboxId] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const [likeAnimating, setLikeAnimating] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  // Real-time gallery listener
  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, COLLECTIONS.GALERIA), orderBy('created_at', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      setItems(
        snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            titulo: data.titulo || '',
            descricao: data.descricao || '',
            base64: data.base64 || '',
            mimeType: data.mimeType || '',
            tipo: data.tipo || 'imagem',
            fileName: data.fileName || '',
            likes: data.likes || [],
            created_at: data.created_at || '',
            authorName: data.authorName || '',
          };
        })
      );
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // The lightbox item always reads from the live items array
  const lightbox = lightboxId ? items.find((i) => i.id === lightboxId) || null : null;
  const setLightbox = (item: GaleriaItem | null) => setLightboxId(item?.id || null);
  const closeLightbox = () => setLightboxId(null);

  // Comments listener for lightbox item
  useEffect(() => {
    if (!db || !lightboxId) { setComments([]); return; }
    const q = query(
      collection(db, COLLECTIONS.GALERIA, lightboxId, 'comments'),
      orderBy('created_at', 'asc')
    );
    const unsub = onSnapshot(q, (snapshot) => {
      setComments(
        snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })) as Comment[]
      );
      setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });
    return () => unsub();
  }, [lightboxId]);

  // ── Like ──
  const handleLike = async (item: GaleriaItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!db || !user) return;
    const isLiked = item.likes.includes(user.uid);
    try {
      await updateDoc(doc(db, COLLECTIONS.GALERIA, item.id), {
        likes: isLiked ? arrayRemove(user.uid) : arrayUnion(user.uid),
      });
      if (!isLiked) {
        setLikeAnimating(item.id);
        setTimeout(() => setLikeAnimating(null), 600);
      }
    } catch {
      showToast('Erro ao curtir.', 'error');
    }
  };

  // Double tap to like
  const lastTap = useRef<{ id: string; time: number }>({ id: '', time: 0 });
  const handleDoubleTap = (item: GaleriaItem) => {
    const now = Date.now();
    if (lastTap.current.id === item.id && now - lastTap.current.time < 400) {
      if (!item.likes.includes(user?.uid || '')) handleLike(item);
      setLikeAnimating(item.id);
      setTimeout(() => setLikeAnimating(null), 600);
    }
    lastTap.current = { id: item.id, time: now };
  };

  // ── Comment ──
  const handleAddComment = async () => {
    if (!db || !user || !lightboxId || !commentText.trim()) return;
    setSendingComment(true);
    try {
      await addDoc(collection(db, COLLECTIONS.GALERIA, lightboxId, 'comments'), {
        authorUid: user.uid,
        authorName: profile?.name || user.email || 'Membro',
        text: commentText.trim(),
        created_at: new Date().toISOString(),
      });
      setCommentText('');
    } catch {
      showToast('Erro ao enviar comentário.', 'error');
    } finally {
      setSendingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!db || !lightboxId) return;
    try {
      await deleteDoc(doc(db, COLLECTIONS.GALERIA, lightboxId, 'comments', commentId));
    } catch {
      showToast('Erro ao remover comentário.', 'error');
    }
  };

  // ── Upload ──
  const handleFileSelect = async (file: File) => {
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    if (!isImage && !isVideo) { showToast('Formato não suportado.', 'warning'); return; }
    setSelectedFile(file);
    try {
      const result = isImage ? await compressImage(file) : await fileToBase64(file);
      setPreview(result);
      setProcessedBase64(result);
    } catch { showToast('Erro ao processar arquivo.', 'error'); }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  }, []);

  const handleAdd = async () => {
    if (!db || !selectedFile || !processedBase64) return;
    setSaving(true);
    try {
      const isVideo = selectedFile.type.startsWith('video/');
      await addDoc(collection(db, COLLECTIONS.GALERIA), {
        titulo: titulo.trim() || selectedFile.name,
        descricao: descricao.trim(),
        base64: processedBase64,
        mimeType: isVideo ? selectedFile.type : 'image/jpeg',
        tipo: isVideo ? 'video' : 'imagem',
        fileName: selectedFile.name,
        likes: [],
        authorName: profile?.name || user?.email || 'Membro',
        created_at: new Date().toISOString(),
      });
      setTitulo(''); setDescricao(''); setSelectedFile(null); setPreview(null); setProcessedBase64(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setShowUpload(false);
      showToast('Publicação enviada!', 'success');
    } catch {
      showToast('Erro ao publicar.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!db || !isEditor) return;
    if (!window.confirm('Remover esta publicação?')) return;
    try {
      await deleteDoc(doc(db, COLLECTIONS.GALERIA, id));
      if (lightboxId === id) closeLightbox();
      showToast('Publicação removida.', 'success');
    } catch { showToast('Erro ao remover.', 'error'); }
  };

  const handleDownload = (item: GaleriaItem) => {
    try {
      const link = document.createElement('a');
      link.href = item.base64;
      const ext = item.mimeType?.split('/')[1] || (item.tipo === 'video' ? 'mp4' : 'jpg');
      link.download = item.fileName || `${item.titulo || 'galeria'}.${ext}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Download iniciado!', 'success');
    } catch {
      showToast('Erro ao baixar.', 'error');
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setPreview(null);
    setProcessedBase64(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const isLiked = (item: GaleriaItem) => user ? item.likes.includes(user.uid) : false;

  return (
    <AppShell
      title="Galeria"
      subtitle="Fotos e vídeos do terreiro e dos eventos."
      actions={
        isEditor ? (
          <button
            onClick={() => setShowUpload(!showUpload)}
            className="flex items-center gap-2 rounded-xl bg-ink-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-ink-700"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Nova publicação
          </button>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-6">
        {/* Upload form (collapsible) */}
        {showUpload && isEditor && (
          <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-floating animate-[slideUp_200ms_ease-out]">
            <div className="flex flex-col gap-4 lg:flex-row">
              <div
                className={`relative flex flex-1 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 transition ${
                  dragActive ? 'border-emerald-400 bg-emerald-50' : 'border-ink-200 bg-ink-50/50 hover:border-ink-300'
                }`}
                onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input ref={fileInputRef} type="file" accept="image/*,video/*" onChange={handleInputChange} className="hidden" />
                {preview ? (
                  <div className="flex flex-col items-center gap-3">
                    {selectedFile?.type.startsWith('video/') ? (
                      <video src={preview} className="h-40 max-w-full rounded-xl object-contain" controls muted />
                    ) : (
                      <img src={preview} alt="Preview" className="h-40 max-w-full rounded-xl object-contain" />
                    )}
                    <button type="button" onClick={(e) => { e.stopPropagation(); clearSelection(); }}
                      className="rounded-lg border border-rose-200 px-3 py-1 text-[11px] font-semibold text-rose-600 hover:border-rose-300">
                      Remover
                    </button>
                  </div>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" className="mb-2 h-10 w-10 text-ink-300" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    <div className="text-sm font-semibold text-ink-500">Arraste uma foto ou vídeo</div>
                    <div className="mt-1 text-xs text-ink-400">ou clique para selecionar</div>
                  </>
                )}
              </div>
              <div className="flex w-full flex-col gap-3 lg:w-72">
                <input className="w-full rounded-xl border border-ink-100 bg-white px-3 py-2 text-sm text-ink-700 focus:border-ink-400 focus:outline-none focus:ring-2 focus:ring-ink-100"
                  placeholder="Legenda (opcional)" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
                <textarea className="min-h-[60px] w-full rounded-xl border border-ink-100 bg-white px-3 py-2 text-sm text-ink-700 focus:border-ink-400 focus:outline-none focus:ring-2 focus:ring-ink-100"
                  placeholder="Descrição (opcional)" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
                <button onClick={handleAdd} disabled={saving || !selectedFile}
                  className="w-full rounded-xl bg-ink-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-ink-700 disabled:opacity-60">
                  {saving ? 'Publicando...' : 'Publicar'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Feed — Instagram-style cards */}
        {loading ? (
          <div className="text-sm text-ink-400">Carregando...</div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-ink-100 bg-white p-12 text-center text-sm text-ink-400">
            Nenhuma publicação ainda. Seja o primeiro a publicar!
          </div>
        ) : (
          <div className="mx-auto grid w-full max-w-2xl grid-cols-1 gap-6">
            {items.map((item) => {
              const liked = isLiked(item);
              return (
                <div key={item.id} className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-floating">
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-xs font-bold text-white">
                        {(item.authorName || 'M').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-ink-900">{item.authorName || 'Membro'}</div>
                        <div className="text-[11px] text-ink-400">{timeAgo(item.created_at)}</div>
                      </div>
                    </div>
                    {isEditor && (
                      <button onClick={() => handleDelete(item.id)}
                        className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-50 hover:text-rose-500 transition"
                        title="Remover publicação">
                        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    )}
                  </div>

                  {/* Media */}
                  <div className="relative cursor-pointer select-none" onClick={() => handleDoubleTap(item)}>
                    {item.tipo === 'imagem' ? (
                      <img src={item.base64} alt={item.titulo} className="w-full object-cover" style={{ maxHeight: 600 }} loading="lazy" />
                    ) : (
                      <video src={item.base64} className="w-full object-cover" style={{ maxHeight: 600 }} controls muted preload="metadata" />
                    )}
                    {/* Double-tap heart animation */}
                    {likeAnimating === item.id && (
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <svg viewBox="0 0 24 24" className="h-20 w-20 animate-[heartPop_600ms_ease-out_forwards] text-white drop-shadow-lg" fill="currentColor">
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Actions bar */}
                  <div className="flex items-center gap-4 px-4 pt-3">
                    <button onClick={(e) => handleLike(item, e)} className="group flex items-center gap-1.5 transition">
                      {liked ? (
                        <svg viewBox="0 0 24 24" className="h-6 w-6 text-rose-500 transition hover:scale-110" fill="currentColor">
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" className="h-6 w-6 text-ink-600 transition hover:scale-110 hover:text-rose-500" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                        </svg>
                      )}
                    </button>
                    <button onClick={() => setLightbox(item)} className="group">
                      <svg viewBox="0 0 24 24" className="h-6 w-6 text-ink-600 transition hover:scale-110 hover:text-ink-900" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                    </button>
                    <button onClick={() => handleDownload(item)} className="group" title="Baixar">
                      <svg viewBox="0 0 24 24" className="h-6 w-6 text-ink-600 transition hover:scale-110 hover:text-ink-900" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                    </button>
                  </div>

                  {/* Like count */}
                  <div className="px-4 pt-1.5">
                    <span className="text-sm font-semibold text-ink-900">
                      {item.likes.length} {item.likes.length === 1 ? 'curtida' : 'curtidas'}
                    </span>
                  </div>

                  {/* Caption */}
                  {(item.titulo || item.descricao) && (
                    <div className="px-4 pt-1">
                      {item.titulo && (
                        <span className="text-sm">
                          <span className="font-semibold text-ink-900">{item.authorName || 'Membro'}</span>{' '}
                          <span className="text-ink-700">{item.titulo}</span>
                        </span>
                      )}
                      {item.descricao && <div className="text-sm text-ink-500">{item.descricao}</div>}
                    </div>
                  )}

                  {/* View comments link */}
                  <button
                    onClick={() => setLightbox(item)}
                    className="px-4 pt-1 pb-3 text-[13px] text-ink-400 hover:text-ink-600"
                  >
                    Ver comentários
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Lightbox with comments panel */}
        {lightbox && (
          <div className="fixed inset-0 z-[9999] flex items-stretch bg-black/90" onClick={closeLightbox}>
            {/* Close button */}
            <button onClick={closeLightbox}
              className="absolute right-4 top-4 z-10 rounded-full bg-white/20 p-2 text-white hover:bg-white/30 transition" aria-label="Fechar">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M18 6l-12 12" /></svg>
            </button>

            {/* Media side */}
            <div className="flex flex-1 items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
              {lightbox.tipo === 'imagem' ? (
                <img src={lightbox.base64} alt={lightbox.titulo} className="max-h-[95vh] max-w-full rounded-xl object-contain" />
              ) : (
                <video src={lightbox.base64} className="max-h-[95vh] max-w-full rounded-xl" controls autoPlay />
              )}
            </div>

            {/* Comments panel */}
            <div className="hidden w-96 flex-col border-l border-white/10 bg-white md:flex" onClick={(e) => e.stopPropagation()}>
              {/* Post header with close button */}
              <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-xs font-bold text-white">
                    {(lightbox.authorName || 'M').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-ink-900">{lightbox.authorName || 'Membro'}</div>
                    <div className="text-[11px] text-ink-400">{timeAgo(lightbox.created_at)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isEditor && (
                    <button
                      onClick={() => handleDelete(lightbox.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-rose-200 text-rose-500 hover:bg-rose-50 hover:text-rose-600 transition"
                      title="Remover publicação"
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  )}
                  <button
                    onClick={() => handleDownload(lightbox)}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-ink-200 text-ink-500 hover:bg-ink-50 hover:text-ink-700 transition"
                    title="Baixar"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                  </button>
                  <button
                    onClick={closeLightbox}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-ink-200 text-ink-500 hover:bg-ink-50 hover:text-ink-900 transition"
                    aria-label="Fechar comentários"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M6 6l12 12M18 6l-12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Caption in comments */}
              {lightbox.titulo && (
                <div className="border-b border-ink-100 px-4 py-3">
                  <span className="text-sm">
                    <span className="font-semibold text-ink-900">{lightbox.authorName || 'Membro'}</span>{' '}
                    <span className="text-ink-700">{lightbox.titulo}</span>
                  </span>
                </div>
              )}

              {/* Comments list */}
              <div className="flex-1 overflow-y-auto px-4 py-3">
                {comments.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-ink-400">
                    Nenhum comentário ainda.
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {comments.map((c) => (
                      <div key={c.id} className="group flex gap-3">
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-ink-100 text-[10px] font-bold text-ink-600">
                          {c.authorName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm">
                            <span className="font-semibold text-ink-900">{c.authorName}</span>{' '}
                            <span className="text-ink-700">{c.text}</span>
                          </div>
                          <div className="mt-0.5 flex items-center gap-3 text-[11px] text-ink-400">
                            <span>{timeAgo(c.created_at)}</span>
                            {(c.authorUid === user?.uid || isMaster) && (
                              <button onClick={() => handleDeleteComment(c.id)}
                                className="font-semibold text-ink-400 opacity-0 transition group-hover:opacity-100 hover:text-rose-500">
                                Excluir
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={commentsEndRef} />
                  </div>
                )}
              </div>

              {/* Like bar */}
              <div className="border-t border-ink-100 px-4 py-2">
                <div className="flex items-center gap-4">
                  <button onClick={(e) => handleLike(lightbox, e)}>
                    {isLiked(lightbox) ? (
                      <svg viewBox="0 0 24 24" className="h-6 w-6 text-rose-500 hover:scale-110 transition" fill="currentColor">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" className="h-6 w-6 text-ink-600 hover:scale-110 hover:text-rose-500 transition" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                      </svg>
                    )}
                  </button>
                  <span className="text-sm font-semibold text-ink-900">
                    {lightbox.likes.length} {lightbox.likes.length === 1 ? 'curtida' : 'curtidas'}
                  </span>
                </div>
              </div>

              {/* Comment input */}
              <div className="border-t border-ink-100 px-4 py-3">
                <div className="flex gap-2">
                  <input
                    className="flex-1 rounded-xl border border-ink-100 bg-white px-3 py-2 text-sm text-ink-700 focus:border-ink-400 focus:outline-none"
                    placeholder="Adicionar comentário..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddComment(); } }}
                  />
                  <button onClick={handleAddComment} disabled={sendingComment || !commentText.trim()}
                    className="rounded-xl px-4 py-2 text-sm font-semibold text-blue-500 hover:text-blue-600 disabled:opacity-40">
                    Publicar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Heart pop animation */}
      <style>{`
        @keyframes heartPop {
          0% { transform: scale(0); opacity: 0; }
          30% { transform: scale(1.3); opacity: 1; }
          50% { transform: scale(1); opacity: 1; }
          100% { transform: scale(1.1); opacity: 0; }
        }
      `}</style>
    </AppShell>
  );
}
