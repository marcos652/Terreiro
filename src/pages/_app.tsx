import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { useEffect } from 'react';
import { AuthProvider } from '@contexts/AuthContext';
import { NotificationProvider } from '@contexts/NotificationContext';

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedTheme = window.localStorage.getItem('theme-mode');
    const shouldUseDark = savedTheme === 'dark';
    document.documentElement.classList.toggle('theme-dark', shouldUseDark);
  }, []);

  return (
    <AuthProvider>
      <NotificationProvider>
        <Component {...pageProps} />
      </NotificationProvider>
    </AuthProvider>
  );
}
