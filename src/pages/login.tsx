import { useState } from 'react';
import { useRouter } from 'next/router';
import { createUserWithEmailAndPassword, sendPasswordResetEmail, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth, firebaseConfigMissing } from '@services/firebase';
import { getUserById, upsertUser } from '@services/userService';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

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
      if (mode === 'register') {
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        const uid = credential.user.uid;
        const name = email.split('@')[0] || 'Usuário';
        await upsertUser(uid, {
          name,
          email,
          role: 'MEMBER',
          status: 'PENDENTE',
          created_at: new Date().toISOString(),
        });
        setInfo('Conta criada. Aguarde a validação do administrador para acessar o painel.');
        await signOut(auth);
        setLoading(false);
        return;
      } else {
        const credential = await signInWithEmailAndPassword(auth, email, password);
        const uid = credential.user.uid;
        const userDoc = await getUserById(uid);
        if (!userDoc || userDoc.status !== 'APROVADO') {
          setError('Seu acesso está em validação pelo administrador.');
          await signOut(auth);
          setLoading(false);
          return;
        }
      }
      router.push('/');
    } catch (err: any) {
      setError(mode === 'register' ? 'Não foi possível criar a conta.' : 'Usuário ou senha inválidos.');
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
    <div className="min-h-screen bg-[#f7f5f0] text-ink-900">
      <div className="relative min-h-screen overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.20),_rgba(247,245,240,0.8))]" />
        <div className="pointer-events-none absolute -left-24 top-10 h-64 w-64 rounded-full bg-amber-300/25 blur-3xl" />
        <div className="pointer-events-none absolute right-10 top-1/2 h-80 w-80 -translate-y-1/2 rounded-full bg-emerald-300/25 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-sky-300/25 blur-3xl" />

        <div className="relative mx-auto flex min-h-screen w-full max-w-7xl items-center px-4 md:px-10">
          <div className="grid w-full gap-12 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="flex flex-col justify-center gap-6">
              <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.4em] text-ink-400">
                Terreiro
              </div>
              <h1 className="font-display text-5xl font-semibold leading-tight text-ink-900 md:text-6xl">
                Seja bem-vindo, que os orixás te abençoem
              </h1>
              <p className="max-w-md text-lg text-ink-500">
                Acesse o painel com segurança para acompanhar rituais, estoque e financeiro em um
                único lugar.
              </p>
              <div className="flex flex-wrap items-center gap-3 text-xs text-ink-400">
                <span className="rounded-full border border-ink-200/70 bg-white/70 px-3 py-1">Seguro</span>
                <span className="rounded-full border border-ink-200/70 bg-white/70 px-3 py-1">Organizado</span>
                <span className="rounded-full border border-ink-200/70 bg-white/70 px-3 py-1">Confiável</span>
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
                    ? 'Cadastre um novo acesso para o painel.'
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
