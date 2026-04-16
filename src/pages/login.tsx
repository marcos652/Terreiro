import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { createUserWithEmailAndPassword, sendPasswordResetEmail, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth, db, firebaseConfig, firebaseConfigMissing } from '@services/firebase';
import { getUserById, upsertUser } from '@services/userService';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { COLLECTIONS } from '@services/firestoreCollections';

type NextEvent = {
  title: string;
  date: string;
  time: string;
  leader: string;
  status: string;
};

function parseEventDate(dateStr: string, timeStr: string): Date {
  // dateStr can be "2026-04-20" or "20/04/2026"
  let parts = dateStr.split('-');
  if (parts.length !== 3) {
    const br = dateStr.split('/');
    if (br.length === 3) parts = [br[2], br[1], br[0]];
  }
  const [year, month, day] = parts.map(Number);
  const [h, m] = (timeStr || '00:00').split(':').map(Number);
  return new Date(year, month - 1, day, h || 0, m || 0);
}

function formatEventDate(dateStr: string): string {
  let parts = dateStr.split('-');
  if (parts.length !== 3) {
    const br = dateStr.split('/');
    if (br.length === 3) parts = [br[2], br[1], br[0]];
  }
  const [year, month, day] = parts.map(Number);
  const d = new Date(year, month - 1, day);
  const weekday = d.toLocaleDateString('pt-BR', { weekday: 'long' });
  const monthName = d.toLocaleDateString('pt-BR', { month: 'long' });
  return `${weekday}, ${day} de ${monthName}`;
}

function daysUntil(dateStr: string, timeStr: string): string {
  const eventDate = parseEventDate(dateStr, timeStr);
  const now = new Date();
  const diff = Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return 'já aconteceu';
  if (diff === 0) return 'hoje!';
  if (diff === 1) return 'amanhã';
  return `em ${diff} dias`;
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [nextEvent, setNextEvent] = useState<NextEvent | null>(null);
  const [eventLoading, setEventLoading] = useState(true);
  const router = useRouter();

  // Fetch next event (public - no auth needed, uses Firestore REST or try/catch)
  useEffect(() => {
    if (!db) { setEventLoading(false); return; }
    const fetchEvents = async () => {
      try {
        const snapshot = await getDocs(collection(db, COLLECTIONS.EVENTS));
        const events = snapshot.docs.map((d) => ({ ...d.data() })) as NextEvent[];
        const now = new Date();
        // Filter future events and sort
        const future = events
          .filter((e) => {
            try {
              return parseEventDate(e.date, e.time) >= now && e.status !== 'cancelado';
            } catch { return false; }
          })
          .sort((a, b) => parseEventDate(a.date, a.time).getTime() - parseEventDate(b.date, b.time).getTime());
        setNextEvent(future[0] || null);
      } catch {
        // Silently fail — user may not have read access yet
      } finally {
        setEventLoading(false);
      }
    };
    fetchEvents();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setInfo('');
    try {
      if (!auth) {
        const missing =
          firebaseConfigMissing.length > 0 ? ` (${firebaseConfigMissing.join(', ')})` : '';
        setError(`Configuração do Firebase não encontrada.${missing}`);
        setLoading(false);
        return;
      }
      const normalizedEmail = email.trim().toLowerCase();
      const normalizedPassword = password.trim();

      if (mode === 'register') {
        try {
          const cred = await createUserWithEmailAndPassword(auth, normalizedEmail, normalizedPassword);
          const uid = cred.user.uid;
          await upsertUser(uid, {
            name: normalizedEmail.split('@')[0],
            email: normalizedEmail,
            role: 'VISUALIZADOR',
            status: 'APROVADO',
            created_at: new Date().toISOString(),
          });
          setInfo('Conta criada e aprovada. Você já está logado.');
          setLoading(false);
          router.push('/');
          return;
        } catch (err: any) {
          const code = err?.code || '';
          if (code === 'auth/email-already-in-use') {
            try {
              await sendPasswordResetEmail(auth, normalizedEmail);
              setInfo('E-mail já cadastrado. Enviamos um link para redefinir a senha.');
            } catch {
              setError('E-mail já cadastrado. Tente recuperar a senha.');
            }
          } else if (code === 'auth/weak-password') {
            setError('Senha muito curta. Use 6 caracteres ou mais.');
          } else {
            setError('Não foi possível criar a conta. Verifique o e-mail ou tente outra senha.');
          }
          setLoading(false);
          return;
        }
      }

      let credential;
      try {
        credential = await signInWithEmailAndPassword(auth, normalizedEmail, normalizedPassword);
      } catch (err: any) {
        const code = err?.code || '';
        const isNotFound = code === 'auth/user-not-found' || code === 'auth/invalid-credential';
        setError(isNotFound ? 'Usuário não encontrado ou senha inválida.' : 'Usuário ou senha inválidos.');
        setLoading(false);
        return;
      }

      const uid = credential.user.uid;
      let userDoc = await getUserById(uid);
      if (!userDoc) {
        const synthesized = {
          name: normalizedEmail.split('@')[0],
          email: normalizedEmail,
          role: 'VISUALIZADOR' as const,
          status: 'APROVADO' as const,
          created_at: new Date().toISOString(),
        };
        try {
          await upsertUser(uid, synthesized);
          userDoc = { id: uid, ...synthesized };
        } catch {
          setError('Seu usuário ainda não foi cadastrado no painel.');
          await signOut(auth);
          setLoading(false);
          return;
        }
      }
      if (userDoc.status !== 'APROVADO') {
        if (userDoc.status === 'BLOQUEADO') setError('Usuário bloqueado. Fale com o master.');
        else if (userDoc.status === 'DESATIVADO') setError('Usuário desativado.');
        else setError('Seu acesso está em validação pelo administrador.');
        await signOut(auth);
        setLoading(false);
        return;
      }
      router.push('/');
    } catch {
      setError('Usuário ou senha inválidos.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!email) { setError('Digite o e-mail para recuperar a senha.'); return; }
    setLoading(true); setError(''); setInfo('');
    try {
      if (!auth) { setError('Firebase não configurado.'); setLoading(false); return; }
      await sendPasswordResetEmail(auth, email);
      setInfo('Enviamos um e-mail com o link de recuperação.');
    } catch { setError('Não foi possível enviar o e-mail de recuperação.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#0c0c14] text-white overflow-x-hidden">
      <div className="relative min-h-screen overflow-hidden">
        {/* Ambient blurs */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(99,102,241,0.15),_transparent_60%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(168,85,247,0.12),_transparent_60%)]" />
        <div className="pointer-events-none absolute -left-32 top-20 h-72 w-72 rounded-full bg-indigo-500/20 blur-[120px]" />
        <div className="pointer-events-none absolute right-0 top-1/3 h-80 w-80 rounded-full bg-purple-500/15 blur-[120px]" />
        <div className="pointer-events-none absolute bottom-0 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-amber-500/10 blur-[100px]" />

        {/* Grid pattern overlay */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

        <div className="relative mx-auto flex min-h-screen w-full max-w-7xl items-center px-4 md:px-10">
          <div className="grid w-full gap-12 lg:grid-cols-[1.1fr_0.9fr]">

            {/* Left side — branding + event card */}
            <div className="flex flex-col justify-center gap-8">
              <div className="flex items-center gap-3">
                <div className="relative h-14 w-14 overflow-hidden rounded-2xl bg-white/10 shadow-lg ring-1 ring-white/10 backdrop-blur">
                  <Image
                    src="/logo-templo.svg"
                    alt="Templo de Umbanda Luz e Fé"
                    fill
                    sizes="56px"
                    className="object-contain"
                    priority
                  />
                </div>
                <span className="text-xs font-semibold uppercase tracking-[0.4em] text-white/50">
                  Templo Luz e Fé
                </span>
              </div>

              <h1 className="font-display text-5xl font-semibold leading-tight text-white md:text-6xl">
                Seja bem-vindo,<br />
                <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  que os orixás te abençoem!
                </span>
              </h1>

              <div className="flex flex-wrap items-center gap-3 text-xs text-white/40">
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 backdrop-blur">🔒 Seguro</span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 backdrop-blur">📋 Organizado</span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 backdrop-blur">⭐ Confiável</span>
              </div>

              {/* Links — Instagram + Quem Somos */}
              <div className="flex flex-wrap items-center gap-3">
                <a
                  href="https://www.instagram.com/umbanda_luz_e_fe/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 backdrop-blur-xl transition-all duration-300 hover:border-pink-500/30 hover:bg-gradient-to-r hover:from-pink-500/10 hover:to-purple-500/10 hover:shadow-lg hover:shadow-pink-500/10"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5 text-pink-400 transition-transform duration-300 group-hover:scale-110" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="20" height="20" rx="5" />
                    <circle cx="12" cy="12" r="5" />
                    <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none" />
                  </svg>
                  <span className="text-sm font-semibold text-white/70 transition-colors group-hover:text-white">
                    @umbanda_luz_e_fe
                  </span>
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-white/30 transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-white/60" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M7 17L17 7M17 7H7M17 7v10" />
                  </svg>
                </a>

                <a
                  href="/quem-somos"
                  className="group inline-flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 backdrop-blur-xl transition-all duration-300 hover:border-indigo-500/30 hover:bg-gradient-to-r hover:from-indigo-500/10 hover:to-purple-500/10 hover:shadow-lg hover:shadow-indigo-500/10"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5 text-indigo-400 transition-transform duration-300 group-hover:scale-110" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                  </svg>
                  <span className="text-sm font-semibold text-white/70 transition-colors group-hover:text-white">
                    Quem Somos
                  </span>
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-white/30 transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-white/60" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </a>
              </div>

              {/* ── Next Event Card ── */}
              {!eventLoading && nextEvent && (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
                  <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-indigo-400">
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" />
                      <path d="M16 2v4M8 2v4M3 10h18" />
                    </svg>
                    Próximo evento
                  </div>

                  <div className="mt-3 text-xl font-semibold text-white">{nextEvent.title}</div>

                  <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                    <span className="flex items-center gap-1.5 text-white/70">
                      <svg viewBox="0 0 24 24" className="h-4 w-4 text-purple-400" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" />
                        <path d="M16 2v4M8 2v4M3 10h18" />
                      </svg>
                      {formatEventDate(nextEvent.date)}
                    </span>
                    <span className="flex items-center gap-1.5 text-white/70">
                      <svg viewBox="0 0 24 24" className="h-4 w-4 text-amber-400" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 6v6l4 2" />
                      </svg>
                      {nextEvent.time}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-[10px] font-bold text-white">
                        {(nextEvent.leader || '?').charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm text-white/60">{nextEvent.leader || 'A definir'}</span>
                    </div>
                    <span className="rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-semibold text-indigo-300">
                      {daysUntil(nextEvent.date, nextEvent.time)}
                    </span>
                  </div>

                  {/* Endereço do terreiro */}
                  <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3">
                    <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1118 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    <div className="text-xs leading-relaxed text-white/50">
                      <div className="font-semibold text-white/70">Estrada vicinal Marília x Avencas, km 7</div>
                      <div>Sítio Alto da Serra</div>
                    </div>
                  </div>
                </div>
              )}

              {!eventLoading && !nextEvent && (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl text-center">
                  <div className="text-sm text-white/40">Nenhum evento futuro agendado</div>
                  {/* Endereço do terreiro */}
                  <div className="mt-4 flex items-center justify-center gap-2.5 rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3">
                    <svg viewBox="0 0 24 24" className="h-4 w-4 flex-shrink-0 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1118 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    <div className="text-xs leading-relaxed text-white/50 text-left">
                      <div className="font-semibold text-white/70">Estrada vicinal Marília x Avencas, km 7</div>
                      <div>Sítio Alto da Serra</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right side — login form */}
            <form
              onSubmit={handleLogin}
              className="w-full rounded-[32px] border border-white/10 bg-white/[0.07] p-10 shadow-[0_50px_110px_-40px_rgba(0,0,0,0.8)] backdrop-blur-xl md:p-12"
            >
              <div className="mb-6">
                <div className="text-xs uppercase tracking-[0.3em] text-white/30">Acesso</div>
                <h2 className="font-display text-4xl font-semibold text-white">
                  {mode === 'register' ? 'Criar conta' : 'Entrar no painel'}
                </h2>
                <p className="mt-1 text-base text-white/40">
                  {mode === 'register'
                    ? 'Cadastre um acesso. O master precisará aprovar.'
                    : 'Use seu e-mail e senha cadastrados.'}
                </p>
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <button type="button" onClick={() => setMode('login')}
                    className={`rounded-full px-4 py-1.5 transition ${mode === 'login' ? 'bg-indigo-500 text-white' : 'bg-white/10 text-white/50 hover:bg-white/15'}`}>
                    Entrar
                  </button>
                  <button type="button" onClick={() => setMode('register')}
                    className={`rounded-full px-4 py-1.5 transition ${mode === 'register' ? 'bg-indigo-500 text-white' : 'bg-white/10 text-white/50 hover:bg-white/15'}`}>
                    Criar conta
                  </button>
                </div>

                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/30">E-mail</label>
                  <input
                    type="email"
                    placeholder="voce@terreiro.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/5 px-5 py-3.5 text-base text-white placeholder:text-white/20 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                    required
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/30">Senha</label>
                  <div className="relative mt-1.5">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Digite sua senha"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-5 py-3.5 text-base text-white placeholder:text-white/20 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                      required
                    />
                    <button type="button" onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-white/30 hover:text-white/60 transition">
                      {showPassword ? 'Ocultar' : 'Mostrar'}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/20 px-4 py-2.5 text-sm text-rose-300">
                    <svg viewBox="0 0 24 24" className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" /><path d="M15 9l-6 6M9 9l6 6" />
                    </svg>
                    {error}
                  </div>
                )}
                {info && (
                  <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-2.5 text-sm text-emerald-300">
                    <svg viewBox="0 0 24 24" className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" /><path d="M9 12l2 2 4-4" />
                    </svg>
                    {info}
                  </div>
                )}

                <button
                  type="submit"
                  className="mt-2 w-full rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 py-3.5 text-base font-semibold text-white shadow-lg shadow-indigo-500/25 hover:from-indigo-600 hover:to-purple-700 transition disabled:opacity-60"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Processando...
                    </span>
                  ) : mode === 'register' ? 'Criar conta' : 'Entrar'}
                </button>

                <button type="button" onClick={handleReset}
                  className="text-xs font-semibold text-white/30 hover:text-indigo-400 transition"
                  disabled={loading}>
                  Esqueci minha senha
                </button>

                <div className="text-center text-xs text-white/20">
                  Precisa de acesso? Fale com a administração.
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
