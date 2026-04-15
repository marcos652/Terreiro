import Head from "next/head";
import "../styles/globals.css";
import type { AppProps } from "next/app";
import { useEffect } from "react";
import { AuthProvider } from "@contexts/AuthContext";
import { NotificationProvider } from "@contexts/NotificationContext";
import { ToastProvider } from "@contexts/ToastContext";

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
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="Terreiro" />
        <meta name="description" content="Painel administrativo do Templo de Umbanda Luz e Fé" />
      </Head>
      <AuthProvider>
        <NotificationProvider>
          <ToastProvider>
            <Component {...pageProps} />
          </ToastProvider>
        </NotificationProvider>
      </AuthProvider>
    </>
  );
}

