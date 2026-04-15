import React, { createContext, useCallback, useContext, useState, ReactNode } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

type Toast = {
  id: string;
  message: string;
  type: ToastType;
};

type ToastContextType = {
  toasts: Toast[];
  showToast: (message: string, type?: ToastType) => void;
  dismissToast: (id: string) => void;
};

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    // Auto dismiss after 4 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, showToast, dismissToast }}>
      {children}
      {/* Toast container */}
      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2" style={{ maxWidth: 380 }}>
          {toasts.map((toast) => {
            const colors: Record<ToastType, string> = {
              success: 'bg-emerald-600 text-white',
              error: 'bg-rose-600 text-white',
              warning: 'bg-amber-500 text-white',
              info: 'bg-ink-900 text-white',
            };
            const icons: Record<ToastType, string> = {
              success: '✓',
              error: '✕',
              warning: '⚠',
              info: 'ℹ',
            };
            return (
              <div
                key={toast.id}
                className={`flex items-center gap-3 rounded-2xl px-5 py-3.5 shadow-lg backdrop-blur transition-all animate-[slideUp_200ms_ease-out] ${colors[toast.type]}`}
                role="alert"
              >
                <span className="text-lg font-bold">{icons[toast.type]}</span>
                <span className="flex-1 text-sm font-medium">{toast.message}</span>
                <button
                  onClick={() => dismissToast(toast.id)}
                  className="ml-2 rounded-full p-1 opacity-70 hover:opacity-100 transition"
                  aria-label="Fechar"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
