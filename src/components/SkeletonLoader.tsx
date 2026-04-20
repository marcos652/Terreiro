import React from 'react';

type SkeletonLoaderProps = {
  variant?: 'page' | 'cards' | 'list';
};

function Pulse({ className }: { className: string }) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-ink-100 ${className}`}
      style={{ animationDuration: '1.4s' }}
    />
  );
}

export function SkeletonCards() {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-2xl border border-ink-100 bg-white p-6 shadow-floating">
          <Pulse className="h-3 w-24" />
          <Pulse className="mt-4 h-7 w-32" />
          <Pulse className="mt-3 h-3 w-40" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonList() {
  return (
    <div className="flex flex-col gap-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center justify-between rounded-2xl border border-ink-100 bg-white p-4">
          <div className="flex-1">
            <Pulse className="h-4 w-44" />
            <Pulse className="mt-2 h-3 w-28" />
          </div>
          <Pulse className="h-5 w-20" />
        </div>
      ))}
    </div>
  );
}

export default function SkeletonLoader({ variant = 'page' }: SkeletonLoaderProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-sand-50">
      <div className="flex flex-col items-center gap-4">
        {/* Logo pulse */}
        <div className="relative">
          <div
            className="h-14 w-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600"
            style={{
              animation: 'breathe 2s ease-in-out infinite',
            }}
          />
          <div
            className="absolute inset-0 rounded-2xl bg-gradient-to-br from-amber-400/40 to-amber-600/40"
            style={{
              animation: 'ping-slow 2s ease-in-out infinite',
            }}
          />
        </div>
        <div className="text-sm font-semibold text-ink-400" style={{ animation: 'fadeInUp 600ms ease-out' }}>
          Carregando...
        </div>
        {/* Loading bar */}
        <div className="h-1 w-40 overflow-hidden rounded-full bg-ink-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400"
            style={{
              animation: 'loadingBar 1.5s ease-in-out infinite',
              width: '40%',
            }}
          />
        </div>
      </div>
      <style jsx>{`
        @keyframes breathe {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.08); opacity: 0.85; }
        }
        @keyframes ping-slow {
          0%, 100% { transform: scale(1); opacity: 0.4; }
          50% { transform: scale(1.4); opacity: 0; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes loadingBar {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(150%); }
          100% { transform: translateX(250%); }
        }
      `}</style>
    </div>
  );
}
