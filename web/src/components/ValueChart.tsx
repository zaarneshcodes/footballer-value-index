import type { CSSProperties } from "react";
import { eur, monthYear } from "@/lib/format";
import type { PlayerDetail } from "@/lib/queries";

// Server-rendered SVG: Transfermarkt value history as a step line, then the model's
// five-year estimate as a widening band (10th to 90th percentile) with the middle dashed.
// Log scale, so a doubling looks the same size for a €1m player and a €100m player.

const W = 640;
const H = 340;
const M = { top: 18, right: 112, bottom: 38, left: 76 };
const PW = W - M.left - M.right;
const PH = H - M.top - M.bottom;

// Choreography: the history draws (lead), and the estimate fans out from "today"
// just before the line arrives, so the two read as one gesture.
const DRAW_AT = 250;
const DRAW_MS = 1200;
const FAN_AT = DRAW_AT + DRAW_MS - 150;

const t = (iso: string) => Date.parse(`${iso}T00:00:00Z`);

export function valueTicks(min: number, max: number): number[] {
  for (const steps of [[1, 2, 5], [1, 3], [1]]) {
    const ticks: number[] = [];
    for (let e = Math.floor(Math.log10(min)); e <= Math.ceil(Math.log10(max)); e++) {
      for (const s of steps) {
        const v = s * 10 ** e;
        if (v >= min && v <= max) ticks.push(v);
      }
    }
    if (ticks.length <= 6) return ticks;
  }
  return [];
}

type Props = Pick<PlayerDetail, "name" | "history" | "projection">;

export function ValueChart({ name, history, projection }: Props) {
  const points = history.filter((p) => p.value > 0);
  if (points.length === 0) return null;

  const x0 = t(points[0].date);
  const xEnd = projection ? t(projection.projection_date) : t(points[points.length - 1].date);
  const values = points.map((p) => p.value);
  if (projection) values.push(projection.low, projection.high);
  const vMin = Math.min(...values) / 1.25;
  const vMax = Math.max(...values) * 1.25;

  const sx = (ms: number) => M.left + ((ms - x0) / (xEnd - x0 || 1)) * PW;
  const sy = (v: number) =>
    M.top + PH - ((Math.log(v) - Math.log(vMin)) / (Math.log(vMax) - Math.log(vMin))) * PH;

  // Step line: a value holds until the next valuation.
  let d = `M${sx(t(points[0].date))},${sy(points[0].value)}`;
  for (let i = 1; i < points.length; i++) {
    d += `H${sx(t(points[i].date))}V${sy(points[i].value)}`;
  }
  const lastX = projection ? sx(t(projection.value_date)) : sx(t(points[points.length - 1].date));
  d += `H${lastX}`;

  const firstYear = new Date(x0).getUTCFullYear() + 1;
  const lastYear = new Date(xEnd).getUTCFullYear();
  const yearStep = Math.max(1, Math.ceil((lastYear - firstYear + 1) / 6));
  const years: number[] = [];
  for (let y = firstYear; y <= lastYear; y += yearStep) years.push(y);

  // End labels for the estimate, nudged apart so they never overlap.
  const ends = projection
    ? [
        { key: "high", v: projection.high, label: eur(projection.high) },
        { key: "mid", v: projection.mid, label: eur(projection.mid) },
        { key: "low", v: projection.low, label: eur(projection.low) },
      ].map((e) => ({ ...e, y: sy(e.v) }))
    : [];
  for (let i = 1; i < ends.length; i++) {
    ends[i].y = Math.max(ends[i].y, ends[i - 1].y + 24);
  }

  const summary = projection
    ? `Market value of ${name} from ${monthYear(points[0].date)} to ${eur(projection.current)} in ${monthYear(projection.value_date)}, then an estimated range of ${eur(projection.low)} to ${eur(projection.high)} by ${monthYear(projection.projection_date)}, middle estimate ${eur(projection.mid)}.`
    : `Market value of ${name} from ${monthYear(points[0].date)} to ${monthYear(points[points.length - 1].date)}.`;

  return (
    <figure className="m-0">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="value-chart h-auto w-full"
        role="img"
        aria-label={summary}
        fontSize={15}
      >
        {valueTicks(vMin, vMax).map((v) => (
          <g key={v}>
            <line x1={M.left} x2={M.left + PW} y1={sy(v)} y2={sy(v)} stroke="var(--rule)" />
            <text x={M.left - 8} y={sy(v)} dy="0.32em" textAnchor="end" fill="var(--muted)">
              {eur(v)}
            </text>
          </g>
        ))}
        {years.map((y) => {
          const x = sx(Date.UTC(y, 0, 1));
          return (
            <text key={y} x={x} y={H - 10} textAnchor="middle" fill="var(--muted)">
              {y}
            </text>
          );
        })}

        {projection && (
          <g
            className="fan"
            style={
              {
                transformOrigin: `${lastX}px ${sy(projection.current)}px`,
                "--delay": `${FAN_AT}ms`,
              } as CSSProperties
            }
          >
            <polygon
              points={`${sx(t(projection.value_date))},${sy(projection.current)} ${sx(xEnd)},${sy(projection.high)} ${sx(xEnd)},${sy(projection.low)}`}
              fill="var(--flood-fill)"
              fillOpacity={0.3}
            />
            <line
              x1={sx(t(projection.value_date))}
              y1={sy(projection.current)}
              x2={sx(xEnd)}
              y2={sy(projection.mid)}
              stroke="var(--flood)"
              strokeWidth={2}
              strokeDasharray="6 5"
            />
            <line
              x1={sx(xEnd)}
              x2={sx(xEnd)}
              y1={sy(projection.high)}
              y2={sy(projection.low)}
              stroke="var(--flood-fill)"
              strokeWidth={5}
              strokeLinecap="round"
            />
          </g>
        )}
        {ends.map((e) => (
          <text
            key={e.key}
            x={sx(xEnd) + 10}
            y={e.y}
            dy="0.32em"
            className="fade-in"
            style={{ "--delay": `${FAN_AT + 450}ms` } as CSSProperties}
            fill={e.key === "mid" ? "var(--ink)" : "var(--muted)"}
            fontWeight={e.key === "mid" ? 600 : 400}
          >
            {e.label}
          </text>
        ))}

        <path
          d={d}
          pathLength={1}
          className="draw"
          style={{ "--delay": `${DRAW_AT}ms`, "--dur": `${DRAW_MS}ms` } as CSSProperties}
          fill="none"
          stroke="var(--pitch)"
          strokeWidth={2.5}
          strokeLinejoin="round"
        />
        <circle
          className="fade-in"
          style={{ "--delay": `${DRAW_AT + DRAW_MS - 150}ms` } as CSSProperties}
          cx={lastX}
          cy={sy(projection ? projection.current : points[points.length - 1].value)}
          r={4.5}
          fill="var(--pitch)"
        />
      </svg>
      <figcaption className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted">
        <span className="flex items-center gap-2">
          <span aria-hidden className="inline-block h-0.5 w-5 bg-pitch" />
          Market value (Transfermarkt)
        </span>
        {projection && (
          <span className="flex items-center gap-2">
            <span aria-hidden className="inline-block h-3 w-5 bg-flood-fill/40" />
            Model estimate, 10% to 90% range
          </span>
        )}
        <span>Log scale</span>
      </figcaption>
    </figure>
  );
}
