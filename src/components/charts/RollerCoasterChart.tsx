import React, { useMemo, useState } from 'react';

type RollerCoasterChartProps = {
  data: number[];
  height?: number;
  strokeColor?: string;
  fillColor?: string;
  dotColor?: string;
  labels?: string[];
  valueFormatter?: (value: number) => string;
};

function buildSmoothPath(points: { x: number; y: number }[], width: number, height: number) {
  if (points.length === 0) return '';
  if (points.length === 1) return `M${points[0].x},${points[0].y}`;

  const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
  const smoothing = 0.18;
  let d = `M${points[0].x},${points[0].y}`;

  for (let i = 1; i < points.length; i += 1) {
    const point = points[i];
    const prev = points[i - 1];
    const next = points[i + 1] || point;
    const prevPrev = points[i - 2] || prev;

    const cp1x = prev.x + (point.x - prevPrev.x) * smoothing;
    const cp1y = prev.y + (point.y - prevPrev.y) * smoothing;
    const cp2x = point.x - (next.x - prev.x) * smoothing;
    const cp2y = point.y - (next.y - prev.y) * smoothing;

    const safeCp1x = clamp(cp1x, 0, width);
    const safeCp2x = clamp(cp2x, 0, width);
    const safeCp1y = clamp(cp1y, 4, height - 4);
    const safeCp2y = clamp(cp2y, 4, height - 4);

    d += ` C${safeCp1x.toFixed(1)},${safeCp1y.toFixed(1)} ${safeCp2x.toFixed(1)},${safeCp2y.toFixed(1)} ${point.x.toFixed(1)},${point.y.toFixed(1)}`;
  }

  return d;
}

export default function RollerCoasterChart({
  data,
  height = 160,
  strokeColor = '#0e7490',
  fillColor = 'rgba(14,116,144,0.35)',
  dotColor = '#0f766e',
  labels,
  valueFormatter,
}: RollerCoasterChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const width = 420;
  const { path, areaPath, points } = useMemo(() => {
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = Math.max(1, max - min);
    const step = width / Math.max(1, data.length - 1);

    const pts = data.map((value, index) => {
      const x = index * step;
      const y = height - ((value - min) / range) * (height - 24) - 12;
      return { x, y };
    });

    const line = buildSmoothPath(pts, width, height);
    const area = `${line} L${width},${height} L0,${height} Z`;

    return { path: line, areaPath: area, points: pts };
  }, [data, height]);

  const handleMove = (event: React.MouseEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const ratio = x / rect.width;
    const index = Math.round(ratio * (data.length - 1));
    const safeIndex = Math.max(0, Math.min(data.length - 1, index));
    setHoverIndex(safeIndex);
  };

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl border border-ink-100 bg-white/85 p-4 shadow-floating">
      <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_top,_rgba(124,58,237,0.12),_rgba(255,255,255,0))]" />
      <div className="absolute inset-0 rounded-2xl bg-[linear-gradient(90deg,_rgba(148,163,184,0.10)_1px,_transparent_1px),linear-gradient(0deg,_rgba(148,163,184,0.10)_1px,_transparent_1px)] [background-size:42px_32px] opacity-60" />
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="relative z-10 h-full w-full"
        role="img"
        aria-label="Gráfico de tendência em formato montanha russa"
        onMouseMove={handleMove}
        onMouseLeave={() => setHoverIndex(null)}
        style={{ overflow: 'hidden' }}
      >
        <defs>
          <linearGradient id="rollerFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={fillColor} />
            <stop offset="100%" stopColor="rgba(14,116,144,0.02)" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#rollerFill)" />
        <path d={path} fill="none" stroke={strokeColor} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((point, index) => (
          <circle
            key={index}
            cx={point.x}
            cy={point.y}
            r="3.5"
            fill={dotColor}
            className={`transition-all duration-200 ${hoverIndex === index ? 'r-[6]' : ''}`}
          >
            <title>Valor {data[index]}</title>
          </circle>
        ))}
        {hoverIndex !== null && points[hoverIndex] && (
          <>
            <line
              x1={points[hoverIndex].x}
              y1={0}
              x2={points[hoverIndex].x}
              y2={height}
              stroke="rgba(15,23,42,0.15)"
              strokeDasharray="4 4"
            />
            <circle
              cx={points[hoverIndex].x}
              cy={points[hoverIndex].y}
              r="6"
              fill="#fff"
              stroke={strokeColor}
              strokeWidth="2"
            />
          </>
        )}
      </svg>
      {hoverIndex !== null && (
        <div className="absolute right-4 top-4 z-20 rounded-xl border border-ink-100 bg-white px-3 py-2 text-xs font-semibold text-ink-700 shadow-floating">
          <div className="text-[10px] uppercase tracking-[0.2em] text-ink-400">
            {labels && labels[hoverIndex] ? labels[hoverIndex] : `Período ${hoverIndex + 1}`}
          </div>
          <div className="text-sm">
            {valueFormatter ? valueFormatter(data[hoverIndex]) : data[hoverIndex]}
          </div>
        </div>
      )}
      <div className="relative z-10 mt-2 flex items-center justify-between text-xs text-ink-400">
        <span>{labels ? `Últimos ${labels.length} meses` : 'Últimos 8 meses'}</span>
        <span>Tendência positiva</span>
      </div>
      {labels && labels.length === data.length && (
        <div className="relative z-10 mt-3 grid grid-cols-6 gap-2 text-[10px] font-semibold text-ink-400 md:grid-cols-12">
          {labels.map((label) => (
            <span key={label} className="text-center">
              {label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

