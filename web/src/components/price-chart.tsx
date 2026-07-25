import type { Quote } from "@/lib/api";

/**
 * Lightweight server-rendered SVG price line (no client JS, no charting
 * dependency — keeps the company page fast and Lighthouse-friendly). Can be
 * swapped for lightweight-charts/recharts later if interactivity is needed.
 */
export function PriceChart({ quotes, height = 180 }: { quotes: Quote[]; height?: number }) {
  const points = quotes.filter((q): q is { date: string; close: number } => q.close !== null);
  if (points.length < 2) return null;

  const width = 720;
  const pad = 8;
  const closes = points.map((p) => p.close);
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const span = max - min || 1;
  const dx = (width - pad * 2) / (points.length - 1);

  const xy = points.map((p, i) => {
    const x = pad + i * dx;
    const y = pad + (1 - (p.close - min) / span) * (height - pad * 2);
    return [x, y] as const;
  });

  const line = xy.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${xy[xy.length - 1][0].toFixed(1)},${height - pad} L${xy[0][0].toFixed(1)},${height - pad} Z`;
  const up = points[points.length - 1].close >= points[0].close;
  const stroke = up ? "var(--color-brand-700)" : "#dc2626";

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-auto w-full"
      preserveAspectRatio="none"
      role="img"
      aria-label="Historique de cours"
    >
      <defs>
        <linearGradient id="pc-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.18" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#pc-fill)" />
      <path d={line} fill="none" stroke={stroke} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
