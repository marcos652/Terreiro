import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { createUserWithEmailAndPassword, sendPasswordResetEmail, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth, firebaseConfig, firebaseConfigMissing } from '@services/firebase';
import { getUserById, upsertUser } from '@services/userService';
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getEvents, EventItem } from '@services/eventService';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [nextEvent, setNextEvent] = useState<EventItem | null>(null);
  const router = useRouter();

  const destaques = [
    { label: 'Financeiro', value: 'Caixa + Mensalidades', color: 'from-amber-400 to-orange-500' },
    { label: 'Agenda', value: 'Próximas giras e equipes', color: 'from-emerald-400 to-teal-500' },
    { label: 'Cantigas', value: 'Repertório e gravações', color: 'from-indigo-400 to-sky-500' },
  ];

  useEffect(() => {
    const parseDateTime = (event: EventItem) => {
      const raw = (event.date || '').trim();
      const timeRaw = (event.time || '').trim();

      // Formato dd/mm/aaaa
      if (raw.includes('/')) {
        const [day, month, year] = raw.split('/').map(Number);
        if (day && month && year) {
          const [hour, minute] = timeRaw.split(':').map(Number);
          return new Date(year, month - 1, day, hour || 0, minute || 0, 0);
        }
      }
      // Formato yyyy-mm-dd
      if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        const [year, month, day] = raw.split('-').map(Number);
        const [hour, minute] = timeRaw.split(':').map(Number);
        return new Date(year, month - 1, day, hour || 0, minute || 0, 0);
      }
      // ISO em created_at como fallback
      if (event.created_at) {
        const d = new Date(event.created_at);
        if (!Number.isNaN(d.getTime())) return d;
      }
      return null;
    };

    getEvents()
      .then((events) => {
        const candidates = events.filter((e) => e.status !== 'cancelado');
        if (candidates.length === 0) return setNextEvent(null);

        const withDate = candidates.map((e) => ({
          ...e,
          dateObj: parseDateTime(e),
        }));

        const valid = withDate.filter((e) => e.dateObj && !Number.isNaN(e.dateObj.getTime())) as (EventItem & {
          dateObj: Date;
        })[];

        const now = new Date();
        const upcoming = valid
          .filter((e) => e.dateObj >= now)
          .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

        const chosen = upcoming[0]
          || valid.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime())[0]
          || candidates[0];

        setNextEvent(chosen);
      })
      .catch(() => setNextEvent(null));
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
            status: 'PENDENTE',
            created_at: new Date().toISOString(),
          });
          await signOut(auth).catch(() => {});
          setInfo('Conta criada. Aguarde aprovação do master para acessar.');
          setPassword('');
          setMode('login');
          setLoading(false);
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
            const generic = 'Não foi possível criar a conta. Verifique o e-mail ou tente outra senha.';
            const msg = err?.message ? `${generic} (Detalhe: ${err.message})` : generic;
            setError(msg);
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
        if (isNotFound) {
          setError('Usuário não encontrado ou senha inválida.');
        } else {
          setError('Usuário ou senha inválidos.');
        }
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
          status: 'PENDENTE' as const,
          created_at: new Date().toISOString(),
        };
        try {
          await upsertUser(uid, synthesized);
          userDoc = { id: uid, ...synthesized };
        } catch (err) {
          setError('Seu usuário ainda não foi cadastrado no painel e não conseguimos criar automaticamente.');
          await signOut(auth);
          setLoading(false);
          return;
        }
      }
      if (userDoc.status !== 'APROVADO') {
        if (userDoc.status === 'BLOQUEADO') {
          setError('Usuário bloqueado. Fale com o master.');
        } else if (userDoc.status === 'DESATIVADO') {
          setError('Usuário desativado.');
        } else {
          setError('Seu acesso está em validação pelo administrador.');
        }
        await signOut(auth);
        setLoading(false);
        return;
      }
      router.push('/');
    } catch (err: any) {
      setError('Usuário ou senha inválidos.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!email) {
      setError('Digite o e-mail para recuperar a senha.');
      return;
    }
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
      await sendPasswordResetEmail(auth, email);
      setInfo('Enviamos um e-mail com o link de recuperação.');
    } catch (err: any) {
      setError('Não foi possível enviar o e-mail de recuperação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f5f0] text-ink-900 overflow-x-hidden">
      <div className="relative min-h-screen overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.20),_rgba(247,245,240,0.8))]" />
        <div className="pointer-events-none absolute -left-24 top-10 h-64 w-64 rounded-full bg-amber-300/25 blur-3xl" />
        <div className="pointer-events-none absolute right-10 top-1/2 h-80 w-80 -translate-y-1/2 rounded-full bg-emerald-300/25 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-sky-300/25 blur-3xl" />

        <div className="relative mx-auto flex min-h-screen w-full max-w-7xl items-center px-4 md:px-10 min-w-0">
          <div className="grid w-full min-w-0 gap-12 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="flex flex-col justify-center gap-6">
              <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.4em] text-ink-400">
                <div className="relative h-14 w-14 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-ink-100/60">
                  <Image
                    src="/logo-templo.svg"
                    alt="Templo de Umbanda Luz e Fé"
                    fill
                    sizes="56px"
                    className="object-contain"
                    priority
                  />
                </div>
                <span>Templo Luz e Fé</span>
              </div>
            <h1 className="font-display text-5xl font-semibold leading-tight text-ink-900 md:text-6xl">
              Seja bem-vindo, que os orixás te abençoem!
            </h1>
            <div className="flex flex-col gap-3 rounded-3xl bg-white/90 p-5 shadow-[0_30px_90px_-40px_rgba(15,23,42,0.6)] ring-1 ring-ink-100/80">
              <div className="flex items-center justify-between">
                <div className="text-[11px] uppercase tracking-[0.28em] text-amber-500">Próxima gira</div>
                {nextEvent && (
                  <span
                    className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                      nextEvent.status === 'confirmado'
                        ? 'bg-emerald-100 text-emerald-700'
                        : nextEvent.status === 'cancelado'
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {nextEvent.status === 'confirmado'
                      ? 'Confirmado'
                      : nextEvent.status === 'cancelado'
                      ? 'Cancelado'
                      : 'Pendente'}
                  </span>
                )}
              </div>
              <div className="text-xl font-semibold text-ink-900">
                {nextEvent ? `${nextEvent.date} • ${nextEvent.time || 'horário a confirmar'}` : 'Sem data definida'}
              </div>
              <div className="text-sm text-ink-500">
                {nextEvent ? (nextEvent.title || 'Evento') : 'Cadastre um evento em Eventos'}
              </div>
              <div className="text-xs text-ink-400">Estrada Vicinal - Avencas, Marília/SP • CEP 17532-000</div>
            </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-ink-400">
                <span className="rounded-full border border-ink-200/70 bg-white/70 px-3 py-1">Seguro</span>
                <span className="rounded-full border border-ink-200/70 bg-white/70 px-3 py-1">Organizado</span>
                <span className="rounded-full border border-ink-200/70 bg-white/70 px-3 py-1">Confiável</span>
                <button
                  type="button"
                  onClick={() => setAboutOpen(true)}
                  className="rounded-full border border-ink-200/70 bg-white/90 px-3 py-1 text-ink-700 shadow-sm hover:border-ink-300"
                >
                  Sobre o terreiro
                </button>
                <a
                  href="https://instagram.com/umbanda_luz_e_fe"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-ink-200/70 bg-white/70 px-3 py-1 hover:border-ink-300"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4 text-ink-500" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <rect x="4" y="4" width="16" height="16" rx="4" />
                    <circle cx="12" cy="12" r="4" />
                    <circle cx="17.5" cy="6.5" r="1" />
                  </svg>
                  <span className="font-semibold text-ink-700">@umbanda_luz_e_fe</span>
                </a>
            </div>
            </div>

            <form
              onSubmit={handleLogin}
              className="w-full rounded-[36px] border border-ink-100/80 bg-white/90 p-10 shadow-[0_50px_110px_-70px_rgba(15,23,42,0.65)] backdrop-blur md:p-12 lg:p-14"
            >
              <div className="mb-6">
                <div className="text-xs uppercase tracking-[0.3em] text-ink-300">Acesso</div>
                <h2 className="font-display text-4xl font-semibold text-ink-900">
                  {mode === 'register' ? 'Criar conta' : 'Entrar no painel'}
                </h2>
                <p className="text-lg text-ink-500">
                  {mode === 'register'
                    ? 'Cadastre um acesso. Se for editor ou master, peça para atribuirem seu papel.'
                    : 'Use seu e-mail e senha cadastrados.'}
                </p>
              </div>
              <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-ink-400">
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className={`rounded-full px-4 py-1 ${
                    mode === 'login' ? 'bg-ink-900 text-white' : 'bg-ink-100'
                  }`}
                >
                  Entrar
                </button>
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className={`rounded-full px-4 py-1 ${
                    mode === 'register' ? 'bg-ink-900 text-white' : 'bg-ink-100'
                  }`}
                >
                  Criar conta
                </button>
              </div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-400">
                  E-mail
                </label>
                <input
                  type="email"
                  placeholder="voce@terreiro.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-2xl border border-ink-100 bg-white px-5 py-4 text-lg text-ink-700 shadow-sm focus:border-ink-900 focus:outline-none focus:ring-2 focus:ring-ink-200"
                  required
                />
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-400">
                  Senha
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Digite sua senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-2xl border border-ink-100 bg-white px-5 py-4 text-lg text-ink-700 shadow-sm focus:border-ink-900 focus:outline-none focus:ring-2 focus:ring-ink-200"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-ink-400 hover:text-ink-600"
                  >
                    {showPassword ? 'Ocultar' : 'Mostrar'}
                  </button>
                </div>
                {error && <div className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</div>}
                {info && <div className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{info}</div>}
                <button
                  type="submit"
                  className="mt-2 w-full rounded-2xl bg-ink-900 py-4 text-lg font-semibold text-white shadow-lg hover:bg-ink-800 transition"
                  disabled={loading}
                >
                  {loading ? 'Processando...' : mode === 'register' ? 'Criar conta' : 'Entrar'}
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-xs font-semibold text-ink-400 hover:text-ink-600"
                  disabled={loading}
                >
                  Esqueci minha senha
                </button>
                <div className="mt-2 text-center text-xs text-ink-400">
                  Precisa de acesso? Fale com a administra??o.
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>

      {aboutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur">
          <div className="w-full max-w-3xl rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-[0.3em] text-amber-500">Quem somos</div>
                <div className="mt-1 text-2xl font-semibold text-ink-900">Templo de Umbanda Luz e F?</div>
                <div className="text-sm text-ink-500">Mar?lia/SP ? Estrada Vicinal - Avencas ? CEP 17532-000</div>
              </div>
              <button
                onClick={() => setAboutOpen(false)}
                className="rounded-full border border-ink-200 px-3 py-1 text-sm font-semibold text-ink-600 hover:border-ink-300"
              >
                Fechar
              </button>
            </div>
            <p className="mt-4 text-sm text-ink-600">
              Somos uma casa dedicada ? f?, caridade e organiza??o. Conduzimos giras semanais, desenvolvimento medi?nico e a??es sociais,
              apoiados por um portal interno para finan?as, eventos, estoque e cantigas.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/quem-somos"
                className="rounded-2xl bg-ink-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-ink-700"
                onClick={() => setAboutOpen(false)}
              >
                Ver p?gina completa
              </Link>
              <a
                href="https://instagram.com/umbanda_luz_e_fe"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-2xl border border-ink-200 bg-white px-4 py-2 text-sm font-semibold text-ink-700 hover:border-ink-300"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <rect x="4" y="4" width="16" height="16" rx="4" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17.5" cy="6.5" r="1" />
                </svg>
                @umbanda_luz_e_fe
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}










