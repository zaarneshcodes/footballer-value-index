import type { CSSProperties } from "react";
import Link from "next/link";
import { eur } from "@/lib/format";
import type { RaceLine } from "@/lib/queries";
import { valueTicks } from "@/components/ValueChart";

// Home hero graphic: value histories of the most valuable current players, drawn in
// as one wave. The steepest climb is the lead line; the rest are support.

const W = 960;
const H = 420;
const M = { top: 20, right: 170, bottom: 40, left: 86 };
const PW = W - M.left - M.right;
const PH = H - M.top - M.bottom;
const t = (iso: string) => Date.parse(`${iso}T00:00:00Z`);

export function RaceChart({ lines }: { lines: RaceLine[] }) {
  const usable = lines.filter((l) => l.points.length > 1);
  if (usable.length === 0) return null;

  const all = usable.flatMap((l) => l.points);
  const x0 = Math.min(...all.map((p) => t(p.date)));
  const x1 = Math.max(...all.map((p) => t(p.date)));
  const vMin = Math.max(Math.min(...all.map((p) => p.value)), 1e4) / 1.3;
  const vMax = Math.max(...all.map((p) => p.value)) * 1.15;
  const sx = (ms: number) => M.left + ((ms - x0) / (x1 - x0)) * PW;
  const sy = (v: number) =>
    M.top + PH - ((Math.log(Math.max(v, vMin)) - Math.log(vMin)) / (Math.log(vMax) - Math.log(vMin))) * PH;

  // Lead = biggest rise from first to latest value in the window.
  const growth = (l: RaceLine) => l.points[l.points.length - 1].value / l.points[0].value;
  const leadId = [...usable].sort((a, b) => growth(b) - growth(a))[0].id;
  // Lead draws first; the rest follow with shrinking gaps so the group reads as one wave.
  const order = [leadId, ...usable.filter((l) => l.id !== leadId).map((l) => l.id)];
  const startOf = (id: string) => {
    const k = order.indexOf(id);
    return 300 + Math.round(520 * (1 - 0.7 ** k));
  };
  const DRAW = 1600;

  const paths = usable.map((l) => {
    let d = `M${sx(t(l.points[0].date))},${sy(l.points[0].value)}`;
    for (const p of l.points.slice(1)) d += `H${sx(t(p.date))}V${sy(p.value)}`;
    d += `H${sx(x1)}`;
    return { ...l, d, endY: sy(l.points[l.points.length - 1].value) };
  });

  // Name labels in the right margin, nudged apart so they never overlap.
  const labels = [...paths].sort((a, b) => a.endY - b.endY).map((p) => ({ id: p.id, y: p.endY }));
  for (let i = 1; i < labels.length; i++) labels[i].y = Math.max(labels[i].y, labels[i - 1].y + 19);
  const labelY = new Map(labels.map((l) => [l.id, l.y]));

  const firstYear = new Date(x0).getUTCFullYear() + 1;
  const lastYear = new Date(x1).getUTCFullYear();
  const years: number[] = [];
  for (let y = firstYear; y <= lastYear; y += 2) years.push(y);

  const lead = paths.find((p) => p.id === leadId)!;

  return (
    <figure className="m-0 flex flex-col gap-3">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="race h-auto w-full"
        role="img"
        aria-label={`Market value since ${new Date(x0).getUTCFullYear()} for ${paths.map((p) => `${p.name} (now ${eur(p.value)})`).join(", ")}. ${lead.name} rose the most.`}
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
        {years.map((y) => (
          <text key={y} x={sx(Date.UTC(y, 0, 1))} y={H - 10} textAnchor="middle" fill="var(--muted)">
            {y}
          </text>
        ))}

        {paths
          .sort((a, b) => (a.id === leadId ? 1 : b.id === leadId ? -1 : 0)) // lead painted on top
          .map((p) => {
            const isLead = p.id === leadId;
            const start = startOf(p.id);
            return (
              <g key={p.id} className="race-line">
                <path
                  d={p.d}
                  pathLength={1}
                  className="draw"
                  fill="none"
                  stroke={isLead ? "var(--pitch)" : "var(--muted)"}
                  strokeOpacity={isLead ? 1 : 0.55}
                  strokeWidth={isLead ? 3.5 : 2}
                  strokeLinejoin="round"
                  style={{ "--delay": `${start}ms`, "--dur": `${DRAW}ms` } as CSSProperties}
                />
                {/* Wide invisible stroke makes the thin line easy to hover. */}
                <path d={p.d} fill="none" stroke="transparent" strokeWidth={14} />
                <text
                  x={sx(x1) + 12}
                  y={labelY.get(p.id)}
                  dy="0.32em"
                  className="fade-in max-sm:hidden"
                  fill={isLead ? "var(--pitch)" : "var(--ink)"}
                  fontWeight={isLead ? 700 : 500}
                  style={{ "--delay": `${start + DRAW - 200}ms` } as CSSProperties}
                >
                  {p.name}
                </text>
              </g>
            );
          })}
      </svg>
      <figcaption className="flex flex-col gap-2 text-sm text-muted">
        <ol className="flex flex-wrap gap-x-4 gap-y-1 sm:hidden">
          {[...paths]
            .sort((a, b) => b.value - a.value)
            .map((p) => (
              <li key={p.id} className={p.id === leadId ? "font-semibold text-pitch" : "text-ink"}>
                {p.name}
              </li>
            ))}
        </ol>
        <p>
          The {paths.length} most valuable players today, by Transfermarkt value since{" "}
          {new Date(x0).getUTCFullYear()}. Log scale. The highlighted line is{" "}
          <Link href={`/players/${lead.id}`} className="font-medium text-pitch underline underline-offset-2">
            {lead.name}
          </Link>
          , who rose the most.
        </p>
      </figcaption>
    </figure>
  );
}
