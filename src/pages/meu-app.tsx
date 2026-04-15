import React, { useEffect, useState } from 'react';
import AppShell from '@components/AppShell';
import Image from 'next/image';

export default function MeuAppPage() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [installed, setInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Detect platform
    const ua = navigator.userAgent || '';
    setIsIOS(/iPad|iPhone|iPod/.test(ua));
    setIsAndroid(/Android/.test(ua));
    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true);

    // Listen for install prompt (Android Chrome)
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // Detect successful install
    window.addEventListener('appinstalled', () => {
      setInstalled(true);
      setDeferredPrompt(null);
    });

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    if (result.outcome === 'accepted') {
      setInstalled(true);
    }
    setDeferredPrompt(null);
  };

  return (
    <AppShell title="Meu App" subtitle="Instale o aplicativo no seu celular.">
      <div className="mx-auto max-w-2xl">
        {/* Hero card */}
        <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-floating text-center">
          <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-[#0B1533] to-[#1a2555] shadow-lg">
            <div className="relative h-16 w-16">
              <Image src="/logo-templo.svg" alt="Terreiro" fill className="object-contain" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-ink-900">Terreiro</h2>
          <p className="mt-1 text-sm text-ink-500">Templo de Umbanda Luz e Fé</p>

          {isStandalone ? (
            <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              <div className="flex items-center justify-center gap-2">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <span className="font-semibold">App instalado! Você já está usando o aplicativo.</span>
              </div>
            </div>
          ) : installed ? (
            <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              <div className="flex items-center justify-center gap-2">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <span className="font-semibold">Instalado com sucesso! Procure o ícone na sua tela inicial.</span>
              </div>
            </div>
          ) : deferredPrompt ? (
            <button
              onClick={handleInstall}
              className="mt-6 inline-flex items-center gap-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-4 text-lg font-semibold text-white shadow-lg hover:from-indigo-500 hover:to-purple-500 transition"
            >
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Instalar aplicativo
            </button>
          ) : (
            <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              Siga as instruções abaixo para instalar.
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Android */}
          <div className={`rounded-2xl border p-5 shadow-floating ${isAndroid ? 'border-emerald-200 bg-emerald-50/30' : 'border-ink-100 bg-white'}`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                  <path d="M17.523 2.258a.674.674 0 0 0-.922.244l-1.473 2.54A8.092 8.092 0 0 0 12 4.5c-1.1 0-2.16.185-3.128.542L7.399 2.502a.674.674 0 0 0-1.166.678l1.393 2.404A8.06 8.06 0 0 0 4 11.5h16a8.06 8.06 0 0 0-3.626-5.916l1.393-2.404a.674.674 0 0 0-.244-.922zM8.5 9.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm7 0a1 1 0 1 1 0-2 1 1 0 0 1 0 2zM4 12.5h16v7a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-7z" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-bold text-ink-900">Android</div>
                <div className="text-[11px] text-ink-400">Google Chrome</div>
              </div>
              {isAndroid && <span className="ml-auto rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">SEU DISPOSITIVO</span>}
            </div>
            <ol className="space-y-2.5 text-sm text-ink-600">
              <li className="flex gap-2">
                <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-ink-100 text-[11px] font-bold text-ink-600">1</span>
                <span>Abra o site no <strong>Chrome</strong></span>
              </li>
              <li className="flex gap-2">
                <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-ink-100 text-[11px] font-bold text-ink-600">2</span>
                <span>Toque nos <strong>3 pontinhos</strong> (⋮) no topo</span>
              </li>
              <li className="flex gap-2">
                <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-ink-100 text-[11px] font-bold text-ink-600">3</span>
                <span>Toque em <strong>"Instalar aplicativo"</strong></span>
              </li>
              <li className="flex gap-2">
                <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-ink-100 text-[11px] font-bold text-ink-600">4</span>
                <span>Confirme e pronto! 🎉</span>
              </li>
            </ol>
          </div>

          {/* iPhone */}
          <div className={`rounded-2xl border p-5 shadow-floating ${isIOS ? 'border-blue-200 bg-blue-50/30' : 'border-ink-100 bg-white'}`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-bold text-ink-900">iPhone / iPad</div>
                <div className="text-[11px] text-ink-400">Safari</div>
              </div>
              {isIOS && <span className="ml-auto rounded bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">SEU DISPOSITIVO</span>}
            </div>
            <ol className="space-y-2.5 text-sm text-ink-600">
              <li className="flex gap-2">
                <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-ink-100 text-[11px] font-bold text-ink-600">1</span>
                <span>Abra o site no <strong>Safari</strong></span>
              </li>
              <li className="flex gap-2">
                <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-ink-100 text-[11px] font-bold text-ink-600">2</span>
                <span>Toque no botão <strong>Compartilhar</strong> (⬆️)</span>
              </li>
              <li className="flex gap-2">
                <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-ink-100 text-[11px] font-bold text-ink-600">3</span>
                <span>Toque em <strong>"Adicionar à Tela de Início"</strong></span>
              </li>
              <li className="flex gap-2">
                <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-ink-100 text-[11px] font-bold text-ink-600">4</span>
                <span>Confirme e pronto! 🎉</span>
              </li>
            </ol>
          </div>
        </div>

        {/* Features */}
        <div className="mt-6 rounded-2xl border border-ink-100 bg-white p-5 shadow-floating">
          <div className="text-xs uppercase tracking-[0.2em] text-ink-300 mb-4">Recursos do app</div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { icon: '📱', label: 'Tela cheia', desc: 'Sem barra do navegador' },
              { icon: '⚡', label: 'Rápido', desc: 'Carga instantânea' },
              { icon: '🔔', label: 'Notificações', desc: 'Alertas em tempo real' },
              { icon: '🌙', label: 'Modo escuro', desc: 'Economia de bateria' },
            ].map((f) => (
              <div key={f.label} className="rounded-xl border border-ink-100 bg-ink-50/50 p-3 text-center">
                <div className="text-2xl">{f.icon}</div>
                <div className="mt-1 text-xs font-semibold text-ink-900">{f.label}</div>
                <div className="text-[10px] text-ink-400">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
