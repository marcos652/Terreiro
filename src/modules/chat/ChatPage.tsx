import React, { useEffect, useRef, useState } from 'react';
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
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  limit,
} from 'firebase/firestore';
import { COLLECTIONS } from '@services/firestoreCollections';

// ── Types ──

type ChatGroup = {
  id: string;
  name: string;
  description: string;
  members: string[];
  createdBy: string;
  createdByName: string;
  created_at: any;
};

type ChatMessage = {
  id: string;
  author: string;
  authorUid: string;
  authorPhoto?: string;
  text: string;
  created_at: any;
};

type UserPresence = {
  uid: string;
  name: string;
  photoURL?: string;
  online: boolean;
  last_seen: any;
};

type UserInfo = {
  id: string;
  name: string;
  email: string;
  photoURL?: string;
};

// ── Helpers ──

function formatTime(timestamp: any): string {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function lastSeenText(timestamp: any): string {
  if (!timestamp) return 'nunca';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = Date.now();
  const diff = Math.floor((now - date.getTime()) / 1000);
  if (diff < 60) return 'agora';
  if (diff < 3600) return `${Math.floor(diff / 60)}min atrás`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`;
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

// ── Presence Hook ──

function usePresence(uid: string | undefined, name: string, photoURL?: string) {
  useEffect(() => {
    if (!db || !uid) return;
    const presenceRef = doc(db, COLLECTIONS.USER_PRESENCE, uid);

    // Set online
    setDoc(presenceRef, {
      uid,
      name,
      photoURL: photoURL || '',
      online: true,
      last_seen: serverTimestamp(),
    }, { merge: true });

    // Heartbeat every 30s
    const interval = setInterval(() => {
      setDoc(presenceRef, { online: true, last_seen: serverTimestamp() }, { merge: true });
    }, 30000);

    // Set offline on unload
    const handleUnload = () => {
      // Use sendBeacon for reliability
      const data = JSON.stringify({ online: false });
      navigator.sendBeacon?.(`https://firestore.googleapis.com/`, data);
      // Fallback: just update
      setDoc(presenceRef, { online: false, last_seen: serverTimestamp() }, { merge: true });
    };

    window.addEventListener('beforeunload', handleUnload);
    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleUnload);
      setDoc(presenceRef, { online: false, last_seen: serverTimestamp() }, { merge: true });
    };
  }, [uid, name, photoURL]);
}

// ── Main Component ──

export default function ChatPage() {
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  const isMaster = (profile?.role || '').trim().toUpperCase() === 'MASTER';

  // Presence
  usePresence(user?.uid, profile?.name || user?.email || '', profile?.photoURL);

  // State
  const [groups, setGroups] = useState<ChatGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [presenceList, setPresenceList] = useState<UserPresence[]>([]);
  const [allUsers, setAllUsers] = useState<UserInfo[]>([]);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ── Fetch all users for member selection ──
  useEffect(() => {
    if (!db) return;
    const unsub = onSnapshot(collection(db, COLLECTIONS.USERS), (snapshot) => {
      setAllUsers(
        snapshot.docs.map((d) => ({
          id: d.id,
          name: d.data().name || '',
          email: d.data().email || '',
          photoURL: d.data().photoURL || '',
        }))
      );
    });
    return () => unsub();
  }, []);

  // ── Listen to groups ──
  useEffect(() => {
    if (!db || !user) return;
    const q = query(collection(db, COLLECTIONS.CHAT_GROUPS), orderBy('created_at', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const allGroups = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as ChatGroup[];
      // Show groups where user is a member or creator, or the "Geral" group
      const myGroups = allGroups.filter(
        (g) => g.members?.includes(user.uid) || g.createdBy === user.uid || g.name === 'Geral'
      );
      setGroups(myGroups);
      // Auto-select first group if none selected
      if (!selectedGroupId && myGroups.length > 0) {
        setSelectedGroupId(myGroups[0].id);
      }
    });
    return () => unsub();
  }, [user]);

  // ── Listen to messages for selected group ──
  useEffect(() => {
    if (!db || !selectedGroupId) { setMessages([]); return; }
    const q = query(
      collection(db, COLLECTIONS.CHAT_GROUPS, selectedGroupId, 'messages'),
      orderBy('created_at', 'asc'),
      limit(200)
    );
    const unsub = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as ChatMessage[]);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });
    return () => unsub();
  }, [selectedGroupId]);

  // ── Listen to presence ──
  useEffect(() => {
    if (!db) return;
    const unsub = onSnapshot(collection(db, COLLECTIONS.USER_PRESENCE), (snapshot) => {
      setPresenceList(
        snapshot.docs.map((d) => ({ uid: d.id, ...d.data() })) as UserPresence[]
      );
    });
    return () => unsub();
  }, []);

  // ── Send message ──
  const handleSend = async () => {
    if (!db || !user || !selectedGroupId || !text.trim()) return;
    setSending(true);
    try {
      await addDoc(collection(db, COLLECTIONS.CHAT_GROUPS, selectedGroupId, 'messages'), {
        author: profile?.name || user.email || 'Anônimo',
        authorUid: user.uid,
        authorPhoto: profile?.photoURL || '',
        text: text.trim(),
        created_at: serverTimestamp(),
      });
      setText('');
    } catch {
      showToast('Erro ao enviar mensagem.', 'error');
    } finally {
      setSending(false);
    }
  };

  // ── Create group ──
  const handleCreateGroup = async () => {
    if (!db || !user || !newGroupName.trim()) {
      showToast('Dê um nome ao grupo.', 'warning');
      return;
    }
    setCreatingGroup(true);
    try {
      const members = [...new Set([user.uid, ...selectedMembers])];
      const docRef = await addDoc(collection(db, COLLECTIONS.CHAT_GROUPS), {
        name: newGroupName.trim(),
        description: newGroupDesc.trim(),
        members,
        createdBy: user.uid,
        createdByName: profile?.name || user.email || 'Membro',
        created_at: serverTimestamp(),
      });
      setSelectedGroupId(docRef.id);
      setShowCreateGroup(false);
      setNewGroupName('');
      setNewGroupDesc('');
      setSelectedMembers([]);
      showToast('Grupo criado!', 'success');
    } catch {
      showToast('Erro ao criar grupo.', 'error');
    } finally {
      setCreatingGroup(false);
    }
  };

  // ── Delete group (master only) ──
  const handleDeleteGroup = async (groupId: string) => {
    if (!db || !isMaster) return;
    if (!window.confirm('Excluir este grupo e todas as mensagens?')) return;
    try {
      await deleteDoc(doc(db, COLLECTIONS.CHAT_GROUPS, groupId));
      if (selectedGroupId === groupId) setSelectedGroupId(groups.find(g => g.id !== groupId)?.id || null);
      showToast('Grupo excluído.', 'success');
    } catch {
      showToast('Erro ao excluir grupo.', 'error');
    }
  };

  const toggleMember = (uid: string) => {
    setSelectedMembers((prev) =>
      prev.includes(uid) ? prev.filter((u) => u !== uid) : [...prev, uid]
    );
  };

  const selectedGroup = groups.find((g) => g.id === selectedGroupId);
  const onlineUsers = presenceList.filter((p) => p.online);
  const offlineUsers = presenceList.filter((p) => !p.online).sort((a, b) => {
    const aTime = a.last_seen?.toDate?.()?.getTime() || 0;
    const bTime = b.last_seen?.toDate?.()?.getTime() || 0;
    return bTime - aTime;
  });

  const Avatar = ({ name, photo, size = 'sm', online }: { name: string; photo?: string; size?: 'sm' | 'md'; online?: boolean }) => {
    const dim = size === 'md' ? 'h-10 w-10 text-sm' : 'h-8 w-8 text-[10px]';
    return (
      <div className="relative flex-shrink-0">
        {photo ? (
          <img src={photo} alt={name} className={`${dim} rounded-full object-cover border-2 border-white`} />
        ) : (
          <div className={`${dim} flex items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 font-bold text-white`}>
            {(name || '?').charAt(0).toUpperCase()}
          </div>
        )}
        {typeof online === 'boolean' && (
          <span className={`absolute -bottom-0.5 -right-0.5 block h-3 w-3 rounded-full border-2 border-white ${online ? 'bg-emerald-400' : 'bg-gray-300'}`} />
        )}
      </div>
    );
  };

  return (
    <AppShell title="Chat" subtitle="Comunicação interna em tempo real.">
      <div className="flex gap-0 overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-floating" style={{ height: 'calc(100dvh - 140px)', minHeight: 400 }}>

        {/* ── LEFT SIDEBAR ── */}
        <div className={`${showSidebar ? 'flex' : 'hidden md:flex'} w-80 flex-shrink-0 flex-col border-r border-ink-100`}>

          {/* Header */}
          <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
            <div className="text-sm font-semibold text-ink-900">Conversas</div>
            <button
              onClick={() => setShowCreateGroup(true)}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink-900 text-white hover:bg-ink-700 transition"
              title="Criar grupo"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
          </div>

          {/* Groups list */}
          <div className="flex-1 overflow-y-auto">
            {groups.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-6 text-center">
                <div className="text-sm text-ink-400">Nenhum grupo ainda.</div>
                <button
                  onClick={() => setShowCreateGroup(true)}
                  className="mt-2 rounded-lg bg-ink-900 px-4 py-2 text-xs font-semibold text-white hover:bg-ink-700"
                >
                  Criar primeiro grupo
                </button>
              </div>
            ) : (
              <div className="flex flex-col">
                {groups.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => { setSelectedGroupId(g.id); setShowSidebar(false); }}
                    className={`flex items-center gap-3 px-4 py-3 text-left transition hover:bg-ink-50 ${
                      selectedGroupId === g.id ? 'bg-ink-50 border-l-2 border-ink-900' : ''
                    }`}
                  >
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-sm font-bold text-white">
                      {g.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <div className="truncate text-sm font-semibold text-ink-900">{g.name}</div>
                      <div className="truncate text-[11px] text-ink-400">
                        {g.members?.length || 0} membros
                        {g.description ? ` • ${g.description}` : ''}
                      </div>
                    </div>
                    {isMaster && g.name !== 'Geral' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteGroup(g.id); }}
                        className="rounded p-1 text-ink-300 hover:text-rose-500 transition"
                      >
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Online section */}
            <div className="border-t border-ink-100 px-4 py-3">
              <div className="text-[11px] uppercase tracking-[0.2em] text-ink-300">
                Online — {onlineUsers.length}
              </div>
              <div className="mt-2 flex flex-col gap-2">
                {onlineUsers.map((u) => (
                  <div key={u.uid} className="flex items-center gap-2.5">
                    <Avatar name={u.name} photo={u.photoURL} online={true} />
                    <div className="flex-1 overflow-hidden">
                      <div className="truncate text-xs font-semibold text-ink-900">{u.name}</div>
                      <div className="text-[10px] text-emerald-500">online agora</div>
                    </div>
                  </div>
                ))}
                {onlineUsers.length === 0 && (
                  <div className="text-[11px] text-ink-400">Ninguém online</div>
                )}
              </div>
            </div>

            {/* Offline section */}
            {offlineUsers.length > 0 && (
              <div className="border-t border-ink-100 px-4 py-3">
                <div className="text-[11px] uppercase tracking-[0.2em] text-ink-300">
                  Offline — {offlineUsers.length}
                </div>
                <div className="mt-2 flex flex-col gap-2">
                  {offlineUsers.map((u) => (
                    <div key={u.uid} className="flex items-center gap-2.5">
                      <Avatar name={u.name} photo={u.photoURL} online={false} />
                      <div className="flex-1 overflow-hidden">
                        <div className="truncate text-xs font-medium text-ink-600">{u.name}</div>
                        <div className="text-[10px] text-ink-400">visto {lastSeenText(u.last_seen)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── CHAT AREA ── */}
        <div className={`${!showSidebar ? 'flex' : 'hidden md:flex'} flex-1 flex-col`}>
          {selectedGroup ? (
            <>
              {/* Chat header */}
              <div className="flex items-center gap-3 border-b border-ink-100 px-4 py-3">
                <button
                  onClick={() => setShowSidebar(true)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-500 hover:bg-ink-50 md:hidden"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </button>
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-sm font-bold text-white">
                  {selectedGroup.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="text-sm font-semibold text-ink-900">{selectedGroup.name}</div>
                  <div className="text-[11px] text-ink-400">
                    {selectedGroup.members?.length || 0} membros
                    {selectedGroup.description ? ` • ${selectedGroup.description}` : ''}
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4">
                {messages.length === 0 && (
                  <div className="flex h-full items-center justify-center text-sm text-ink-400">
                    Nenhuma mensagem ainda. Comece a conversa!
                  </div>
                )}
                <div className="flex flex-col gap-3">
                  {messages.map((msg) => {
                    const isMe = msg.authorUid === user?.uid;
                    return (
                      <div key={msg.id} className={`flex gap-2.5 ${isMe ? 'flex-row-reverse' : ''}`}>
                        <Avatar name={msg.author} photo={msg.authorPhoto} />
                        <div className={`max-w-[70%] ${isMe ? 'items-end' : 'items-start'}`}>
                          <div className={`rounded-2xl px-4 py-2.5 ${
                            isMe
                              ? 'bg-ink-900 text-white rounded-br-md'
                              : 'bg-ink-50 text-ink-800 border border-ink-100 rounded-bl-md'
                          }`}>
                            {!isMe && (
                              <div className="mb-1 text-[11px] font-semibold text-ink-400">{msg.author}</div>
                            )}
                            <div className="text-sm whitespace-pre-wrap">{msg.text}</div>
                          </div>
                          <div className={`mt-0.5 text-[10px] text-ink-400 ${isMe ? 'text-right' : ''}`}>
                            {formatTime(msg.created_at)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Input */}
              <div className="border-t border-ink-100 px-4 py-3">
                <div className="flex gap-2">
                  <input
                    className="flex-1 rounded-xl border border-ink-100 bg-white px-4 py-2.5 text-sm text-ink-700 focus:border-ink-400 focus:outline-none focus:ring-2 focus:ring-ink-100"
                    placeholder="Digite sua mensagem..."
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  />
                  <button
                    onClick={handleSend}
                    disabled={sending || !text.trim()}
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink-900 text-white shadow-sm hover:bg-ink-700 disabled:opacity-60"
                  >
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                    </svg>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
              <svg viewBox="0 0 24 24" className="h-16 w-16 text-ink-200" fill="none" stroke="currentColor" strokeWidth="1.2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <div className="text-ink-400">Selecione um grupo para conversar</div>
              <button
                onClick={() => setShowCreateGroup(true)}
                className="rounded-xl bg-ink-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-ink-700"
              >
                Criar grupo
              </button>
            </div>
          )}
        </div>

        {/* ── CREATE GROUP MODAL ── */}
        {showCreateGroup && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4" onClick={() => setShowCreateGroup(false)}>
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-ink-900">Criar grupo</h3>
                <button onClick={() => setShowCreateGroup(false)}
                  className="rounded-full p-1.5 text-ink-400 hover:bg-ink-50 hover:text-ink-600">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 6l12 12M18 6l-12 12" />
                  </svg>
                </button>
              </div>

              <div className="mt-4 flex flex-col gap-3">
                <input
                  className="w-full rounded-xl border border-ink-100 bg-white px-3 py-2.5 text-sm text-ink-700 focus:border-ink-400 focus:outline-none focus:ring-2 focus:ring-ink-100"
                  placeholder="Nome do grupo"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  autoFocus
                />
                <input
                  className="w-full rounded-xl border border-ink-100 bg-white px-3 py-2.5 text-sm text-ink-700 focus:border-ink-400 focus:outline-none focus:ring-2 focus:ring-ink-100"
                  placeholder="Descrição (opcional)"
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                />

                {/* Member selection */}
                <div>
                  <div className="text-xs font-semibold text-ink-500">Adicionar membros</div>
                  <div className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-ink-100 divide-y divide-ink-50">
                    {allUsers
                      .filter((u) => u.id !== user?.uid)
                      .map((u) => {
                        const isSelected = selectedMembers.includes(u.id);
                        return (
                          <button
                            key={u.id}
                            onClick={() => toggleMember(u.id)}
                            className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition ${
                              isSelected ? 'bg-indigo-50' : 'hover:bg-ink-50'
                            }`}
                          >
                            <Avatar name={u.name} photo={u.photoURL} />
                            <div className="flex-1">
                              <div className="text-sm font-medium text-ink-900">{u.name || u.email}</div>
                              <div className="text-[11px] text-ink-400">{u.email}</div>
                            </div>
                            <div className={`flex h-5 w-5 items-center justify-center rounded-md border-2 transition ${
                              isSelected ? 'border-indigo-500 bg-indigo-500' : 'border-ink-200'
                            }`}>
                              {isSelected && (
                                <svg viewBox="0 0 24 24" className="h-3 w-3 text-white" fill="none" stroke="currentColor" strokeWidth="3">
                                  <path d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                          </button>
                        );
                      })}
                  </div>
                  {selectedMembers.length > 0 && (
                    <div className="mt-1.5 text-[11px] text-ink-400">
                      {selectedMembers.length} selecionado{selectedMembers.length > 1 ? 's' : ''}
                    </div>
                  )}
                </div>

                <button
                  onClick={handleCreateGroup}
                  disabled={creatingGroup || !newGroupName.trim()}
                  className="w-full rounded-xl bg-ink-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-ink-700 disabled:opacity-60"
                >
                  {creatingGroup ? 'Criando...' : 'Criar grupo'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
