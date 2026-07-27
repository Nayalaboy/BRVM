import type { Quote } from "@/lib/api";
import { formatNumber } from "@/lib/format";

/**
 * Server-rendered SVG price chart (no client JS, no charting dependency —
 * keeps the company page fast and Lighthouse-friendly). Renders a close-price
 * line with area fill, horizontal gridlines with price labels, session dates
 * on the x-axis, a volume band, and ex-dividend markers.
 */
export function PriceChart({
  quotes,
  exDates = [],
  locale = "fr",
  height = 200,
}: {
  quotes: Quote[];
  exDates?: string[];
  locale?: string;
  height?: number;
}) {
  const points = quotes.filter((q): q is Quote & { close: number } => q.close !== null);
  if (points.length < 2) return null;

  const width = 720;
  const padTop = 12;
  const padLeft = 10;
  const padRight = 64;
  const volH = 34;
  const axisH = 18;
  const priceBottom = height - volH - axisH - 6;
  const plotW = width - padLeft - padRight;

  const closes = points.map((p) => p.close);
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const span = max - min || max * 0.02 || 1;
  const dx = plotW / (points.length - 1);
  const y = (close: number) => padTop + (1 - (close - min) / span) * (priceBottom - padTop);
  const x = (i: number) => padLeft + i * dx;

  const line = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.close).toFixed(1)}`)
    .join(" ");
  const area = `${line} L${x(points.length - 1).toFixed(1)},${priceBottom} L${padLeft},${priceBottom} Z`;
  const up = points[points.length - 1].close >= points[0].close;
  // Finance convention: green when the period closes up, red when down.
  const stroke = up ? "#059669" : "#dc2626";

  const maxVolume = Math.max(...points.map((p) => p.volume ?? 0));
  const volTop = priceBottom + 6;
  const volBottom = volTop + volH;

  const gridLevels = [min, min + span / 2, max];
  const dateFmt = new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
  });
  const dateIndex = new Map(points.map((p, i) => [p.date, i]));
  const markers = exDates
    .map((d) => dateIndex.get(d))
    .filter((i): i is number => i !== undefined);
  const xLabelIdx = [0, Math.floor((points.length - 1) / 2), points.length - 1];

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-auto w-full"
      role="img"
      aria-label={locale === "fr" ? "Historique de cours" : "Price history"}
    >
      <defs>
        <linearGradient id="pc-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.16" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>

      {gridLevels.map((level) => (
        <g key={level}>
          <line
            x1={padLeft}
            x2={width - padRight}
            y1={y(level)}
            y2={y(level)}
            stroke="#d4d4d8"
            strokeWidth="1"
            strokeDasharray="2 4"
          />
          <text
            x={width - padRight + 6}
            y={y(level) + 3}
            fontSize="10"
            fontFamily="ui-monospace, monospace"
            fill="#71717a"
          >
            {formatNumber(level, 0)}
          </text>
        </g>
      ))}

      {markers.map((i) => (
        <g key={`div-${i}`}>
          <line
            x1={x(i)}
            x2={x(i)}
            y1={padTop}
            y2={priceBottom}
            stroke="#b45309"
            strokeWidth="1"
            strokeDasharray="3 3"
            opacity="0.7"
          />
          <text
            x={x(i)}
            y={padTop - 2}
            fontSize="9"
            fontWeight="bold"
            fontFamily="ui-monospace, monospace"
            fill="#b45309"
            textAnchor="middle"
          >
            DIV
          </text>
        </g>
      ))}

      <path d={area} fill="url(#pc-fill)" />
      <path d={line} fill="none" stroke={stroke} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(points.length - 1)} cy={y(points[points.length - 1].close)} r="3" fill={stroke} />

      {maxVolume > 0
        ? points.map((p, i) =>
            p.volume ? (
              <rect
                key={`v-${p.date}`}
                x={x(i) - Math.max(dx * 0.35, 0.4)}
                y={volBottom - (p.volume / maxVolume) * volH}
                width={Math.max(dx * 0.7, 0.8)}
                height={(p.volume / maxVolume) * volH}
                fill="#a1a1aa"
                opacity="0.55"
              />
            ) : null,
          )
        : null}
      <text
        x={padLeft}
        y={volTop + 8}
        fontSize="9"
        fontFamily="ui-monospace, monospace"
        fill="#a1a1aa"
      >
        VOL
      </text>

      {xLabelIdx.map((i, k) => (
        <text
          key={`x-${i}`}
          x={x(i)}
          y={height - 4}
          fontSize="10"
          fontFamily="ui-monospace, monospace"
          fill="#71717a"
          textAnchor={k === 0 ? "start" : k === xLabelIdx.length - 1 ? "end" : "middle"}
        >
          {dateFmt.format(new Date(points[i].date))}
        </text>
      ))}
    </svg>
  );
}
