import React, { useMemo } from 'react';
import dynamic from 'next/dynamic';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler, Legend);

type RollerCoasterChartProps = {
  data: number[];
  height?: number;
  strokeColor?: string;
  fillColor?: string;
  dotColor?: string;
  labels?: string[];
  valueFormatter?: (value: number) => string;
};

const Line = dynamic(() => import('react-chartjs-2').then((mod) => mod.Line), {
  ssr: false,
});

export default function RollerCoasterChart({
  data,
  height = 160,
  strokeColor = '#0e7490',
  fillColor = 'rgba(14,116,144,0.35)',
  dotColor = '#0f766e',
  labels,
  valueFormatter,
}: RollerCoasterChartProps) {
  const chartData = useMemo(
    () => ({
      labels: labels && labels.length === data.length ? labels : data.map((_, index) => `P${index + 1}`),
      datasets: [
        {
          label: 'Tendência',
          data,
          borderColor: strokeColor,
          backgroundColor: fillColor,
          pointBackgroundColor: dotColor,
          pointBorderColor: dotColor,
          pointRadius: 4,
          pointHoverRadius: 6,
          tension: 0.35,
          fill: true,
        },
      ],
    }),
    [data, labels, strokeColor, fillColor, dotColor]
  );

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context: { parsed?: { y?: number } }) => {
              const value = context.parsed?.y ?? 0;
              return valueFormatter ? valueFormatter(value) : String(value);
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#6b7280', font: { size: 10 } },
        },
        y: {
          grid: { color: 'rgba(148,163,184,0.12)' },
          ticks: { color: '#6b7280', font: { size: 10 } },
        },
      },
    }),
    [valueFormatter]
  );

  if (!data || data.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-2xl border border-ink-100 bg-white/85 p-6 text-xs text-ink-400 shadow-floating">
        Sem dados para o gráfico
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl border border-ink-100 bg-white/85 p-4 shadow-floating">
      <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_top,_rgba(124,58,237,0.12),_rgba(255,255,255,0))]" />
      <div className="absolute inset-0 rounded-2xl bg-[linear-gradient(90deg,_rgba(148,163,184,0.10)_1px,_transparent_1px),linear-gradient(0deg,_rgba(148,163,184,0.10)_1px,_transparent_1px)] [background-size:42px_32px] opacity-60" />
      <div className="relative z-10 h-full w-full" style={{ height }}>
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
}
