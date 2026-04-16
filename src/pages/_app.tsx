import Head from "next/head";
import "../styles/globals.css";
import type { AppProps } from "next/app";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { AuthProvider, useAuth } from "@contexts/AuthContext";
import { NotificationProvider } from "@contexts/NotificationContext";
import { ToastProvider } from "@contexts/ToastContext";
import { db } from "@services/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { COLLECTIONS } from "@services/firestoreCollections";

function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth();
  const router = useRouter();
  const [maintenance, setMaintenance] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!db) { setChecked(true); return; }
    const unsub = onSnapshot(doc(db, COLLECTIONS.SETTINGS, 'app'), (snap) => {
      setMaintenance(!!snap.data()?.maintenance_mode);
      setChecked(true);
    }, () => { setChecked(true); });
    return () => unsub();
  }, []);

  // Pages that are always accessible
  const publicPages = ['/login', '/quem-somos'];
  const isPublicPage = publicPages.includes(router.pathname);

  if (!checked || loading) return <>{children}</>;
  if (isPublicPage) return <>{children}</>;

  const normalizedRole = (profile?.role || '').trim().toUpperCase();
  const isMaster = normalizedRole === 'MASTER';

  if (maintenance && !isMaster) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 px-6 text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-white/10 text-4xl backdrop-blur-sm">
          🔒
        </div>
        <h1 className="text-2xl font-bold text-white">Acesso Restrito</h1>
        <p className="mt-3 max-w-md text-sm text-gray-400">
          O sistema do Templo de Umbanda Luz e Fé está temporariamente com acesso restrito.
          Por favor, tente novamente mais tarde.
        </p>
        <div className="mt-8 flex items-center gap-2 rounded-full bg-rose-500/20 px-4 py-2 text-xs font-semibold text-rose-300">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500"></span>
          </span>
          Modo restrito ativado
        </div>
      </div>
    );
  }

  return (
    <>
      {maintenance && isMaster && (
        <div className="sticky top-0 z-[9999] flex items-center justify-center gap-2 bg-rose-500 px-4 py-1.5 text-xs font-semibold text-white">
          🔒 Modo restrito ativo — apenas Masters podem acessar
        </div>
      )}
      {children}
    </>
  );
}

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedTheme = window.localStorage.getItem("theme-mode");
    const shouldUseDark = savedTheme === "dark";
    document.documentElement.classList.toggle("theme-dark", shouldUseDark);
  }, []);

  // Register service worker for PWA
  useEffect(() => {
    if (typeof window === "undefined") return;
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        {/* PWA */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0c0c14" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Terreiro" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="192x192" href="/icons/icon-192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="Terreiro" />
        <meta name="description" content="Painel administrativo do Templo de Umbanda Luz e Fé" />
      </Head>
      <AuthProvider>
        <NotificationProvider>
          <ToastProvider>
            <MaintenanceGate>
              <Component {...pageProps} />
            </MaintenanceGate>
          </ToastProvider>
        </NotificationProvider>
      </AuthProvider>
    </>
  );
}

