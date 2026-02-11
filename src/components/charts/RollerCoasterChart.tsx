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
  type ChartOptions,
  type TooltipItem,
} from 'chart.js';

if (ChartJS && typeof ChartJS.register === 'function') {
  ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler, Legend);
}

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

  const options: ChartOptions<'line'> = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context: TooltipItem<'line'>) => {
              const raw = context.parsed?.y;
              const value = typeof raw === 'number' ? raw : 0;
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
      <div className="flex h-full w-full items-center justify-center text-xs text-ink-400">
        Sem dados para o gráfico
      </div>
    );
  }

  return (
    <div className="h-full w-full" style={{ height }}>
      <Line data={chartData} options={options} />
    </div>
  );
}
