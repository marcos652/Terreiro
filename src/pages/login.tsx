import { useState } from 'react';
import { useRouter } from 'next/router';
import { createUserWithEmailAndPassword, sendPasswordResetEmail, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@services/firebase';

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
      if (mode === 'register') {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      router.push('/');
    } catch (err: any) {
      setError(mode === 'register' ? 'Nao foi possivel criar a conta.' : 'Usuario ou senha invalidos.');
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
      await sendPasswordResetEmail(auth, email);
      setInfo('Enviamos um e-mail com o link de recuperacao.');
    } catch (err: any) {
      setError('Nao foi possivel enviar o e-mail de recuperacao.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-sand-50 text-ink-900">
      <div className="relative min-h-screen overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.2),_rgba(255,255,255,0))]" />
        <div className="pointer-events-none absolute -right-32 top-20 h-64 w-64 rounded-full bg-teal-600/15 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-72 w-72 rounded-full bg-coral-400/20 blur-3xl" />
        <div className="relative mx-auto flex min-h-screen w-full max-w-5xl items-center px-4 md:px-6">
          <div className="grid w-full gap-8 md:grid-cols-[1.2fr_1fr]">
            <div className="hidden flex-col justify-center gap-6 md:flex">
              <div className="text-xs uppercase tracking-[0.3em] text-ink-400">Terreiro</div>
              <h1 className="font-display text-4xl font-semibold text-ink-900">
                Painel de gestao com foco em rituais, pessoas e fincas.
              </h1>
              <p className="text-sm text-ink-500">
                Centralize agenda, estoque e financeiro em um unico lugar. Acompanhe as tendencias e
                aja com rapidez.
              </p>
              <div className="flex items-center gap-3 text-xs text-ink-400">
                <span className="rounded-full border border-ink-200 px-3 py-1">Seguro</span>
                <span className="rounded-full border border-ink-200 px-3 py-1">Organizado</span>
                <span className="rounded-full border border-ink-200 px-3 py-1">Confiavel</span>
              </div>
            </div>
            <form
              onSubmit={handleLogin}
              className="w-full rounded-3xl border border-ink-100 bg-white/90 p-6 shadow-xl backdrop-blur md:p-8"
            >
              <div className="mb-6">
                <div className="text-xs uppercase tracking-[0.3em] text-ink-300">Acesso</div>
                <h2 className="font-display text-2xl font-semibold text-ink-900">
                  {mode === 'register' ? 'Criar conta' : 'Entrar no painel'}
                </h2>
                <p className="text-sm text-ink-500">
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
                    className={`rounded-full px-3 py-1 ${
                      mode === 'login' ? 'bg-ink-900 text-white' : 'bg-ink-100'
                    }`}
                  >
                    Entrar
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('register')}
                    className={`rounded-full px-3 py-1 ${
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
                  className="w-full rounded-xl border border-ink-100 bg-white px-4 py-3 text-sm text-ink-700 shadow-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
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
                    className="w-full rounded-xl border border-ink-100 bg-white px-4 py-3 text-sm text-ink-700 shadow-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
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
                  className="mt-2 w-full rounded-xl bg-ink-900 py-3 text-sm font-semibold text-white shadow-lg hover:bg-ink-700 transition"
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
                  Precisa de acesso? Fale com a administracao.
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
