import React, { useEffect } from 'react';

type ConfirmModalProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
};

const variantStyles = {
  danger: {
    icon: '⚠️',
    button: 'bg-rose-500 hover:bg-rose-600 text-white',
    ring: 'ring-rose-500/20',
  },
  warning: {
    icon: '⚡',
    button: 'bg-amber-500 hover:bg-amber-600 text-white',
    ring: 'ring-amber-500/20',
  },
  info: {
    icon: 'ℹ️',
    button: 'bg-indigo-500 hover:bg-indigo-600 text-white',
    ring: 'ring-indigo-500/20',
  },
};

export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'danger',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const styles = variantStyles[variant];

  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[9998] bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
        style={{ animation: 'fadeIn 150ms ease-out' }}
      />
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        <div
          className={`w-full max-w-sm rounded-2xl border border-ink-200 bg-white p-6 shadow-2xl ring-4 ${styles.ring}`}
          style={{ animation: 'scaleIn 200ms ease-out' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-ink-50 text-xl">
              {styles.icon}
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-ink-900">{title}</h3>
              <p className="mt-1 text-sm text-ink-500 leading-relaxed">{message}</p>
            </div>
          </div>
          <div className="mt-6 flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50 transition"
            >
              {cancelLabel}
            </button>
            <button
              onClick={onConfirm}
              className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm transition ${styles.button}`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95) translateY(8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </>
  );
}
