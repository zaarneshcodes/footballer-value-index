import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { eur, monthYear } from "@/lib/format";
import { estimateByAge, getPlayer, topPlayerIds, type AgeBand } from "@/lib/queries";

export const metadata: Metadata = {
  title: "How the estimates work",
  description: "How the five-year value ranges are made, how well they did on past seasons, and what they can't see.",
};

// Validation results from the training run (pipeline/train.py, docs/train_output.txt).
// They only change when the model is retrained, so they are written here, not queried.
const VALIDATION = {
  trainRows: "81,896",
  trainPlayers: "8,064",
  modelMae: 0.836,
  baselineMae: 1.485,
  improvement: 44,
  modelMedianErr: 62,
  baselineMedianErr: 84,
  coverage: 77.6,
};
const EXAMPLE_ID = "433177"; // Bukayo Saka; falls back to the most valuable player

const delay = (ms: number) => ({ "--delay": `${ms}ms` }) as CSSProperties;

export default async function HowItWorks() {
  const [bands, example] = await Promise.all([estimateByAge(), exampleProjection()]);

  return (
    <article className="flex max-w-3xl flex-col gap-14">
      <header className="flex flex-col gap-4">
        <h1 className="font-display text-5xl font-bold tracking-tight text-pitch">How the estimates work</h1>
        <p className="text-lg leading-relaxed">
          Every player gets a <span className="font-semibold text-flood">five-year value range</span>, not a
          single number. Here is how it is made, how well it did on seasons it had never seen, and what it
          can&apos;t know.
        </p>
      </header>

      {example && <ReadingAnEstimate p={example} />}

      <section className="flex flex-col gap-5">
        <h2 className="font-display text-3xl font-semibold">How it&apos;s built</h2>
        <ol className="flex flex-col gap-5">
          {[
            [
              "Learn from the past",
              `The model looked at ${VALIDATION.trainRows} past market valuations of ${VALIDATION.trainPlayers} players (2013–2021) and, for each one, what that player was worth about five years later.`,
            ],
            [
              "Describe the player on that day",
              "Age, position, preferred foot, height, current and highest value so far, how the value moved over the past year, and last season's league, minutes, goals, assists and cards. Only information available on that day is used, so the model never peeks at the future.",
            ],
            [
              "Ask three questions, not one",
              "Three LightGBM models (gradient-boosted decision trees) each answer a different question: what is a pessimistic outcome (only 1 in 10 players do worse), a middle outcome, and an optimistic one (only 1 in 10 do better)? Together they make the range.",
            ],
            [
              "Apply it to today's players",
              "Each current player's latest Transfermarkt value goes through the same three models, giving the low, middle and high values for five years after that date.",
            ],
          ].map(([title, body], i) => (
            <li key={title} className="grid grid-cols-[2.5rem_1fr] gap-3">
              <span className="font-display text-4xl leading-none font-bold text-pitch/40">{i + 1}</span>
              <div>
                <h3 className="font-display text-xl font-semibold">{title}</h3>
                <p className="mt-1 leading-relaxed text-muted">{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="flex flex-col gap-5">
        <h2 className="font-display text-3xl font-semibold">How well it works</h2>
        <p className="leading-relaxed text-muted">
          The fair test is to hide the recent past. The model was trained only on valuations from before 2020,
          then asked about valuations from 2020 and 2021, whose five-year outcomes were already known. It was
          compared with the simplest guess: &ldquo;the value stays the same&rdquo;.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat value={`${VALIDATION.improvement}%`} label="smaller error than “value stays the same”" note={`Average log-error ${VALIDATION.modelMae} vs ${VALIDATION.baselineMae}`} />
          <Stat value={`${VALIDATION.modelMedianErr}%`} label="typical miss on the middle estimate" note={`vs ${VALIDATION.baselineMedianErr}% for “stays the same”. That's why we show ranges`} />
          <Stat value={`${VALIDATION.coverage}%`} label="of real values landed inside the range" note="The aim was 80% (8 in 10)" />
        </div>
        <p className="leading-relaxed text-muted">
          In plain words: clearly better than guessing, still far from certain. Five years is a long time in
          football, so a single number would pretend to know more than anyone can.
        </p>
      </section>

      <AgeChart bands={bands} />

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-3xl font-semibold">What it can&apos;t see</h2>
        <ul className="flex list-disc flex-col gap-2 pl-5 leading-relaxed text-muted marker:text-flood">
          <li>Injuries, contracts, wages, transfer rumours, managers, or anything that happens after the latest data.</li>
          <li>
            Players who retired or left the data before five years had passed can&apos;t be learned from, so the
            estimates may lean a little optimistic.
          </li>
          <li>
            Some players&apos; latest valuation is a few years old. Each range starts from the value date shown on
            the player page, not from today.
          </li>
          <li>It is a statistical estimate, not advice. Real values can, and often do, land outside the range.</li>
        </ul>
      </section>

      <p className="text-sm leading-relaxed text-muted">
        Market values and stats: Transfermarkt, via the Kaggle dataset davidcariboo/player-scores. The model
        code and full results are in the{" "}
        <a className="underline underline-offset-2" href="https://github.com/zaarneshcodes/footballer-value-index">
          project repository
        </a>
        .
      </p>
    </article>
  );
}

async function exampleProjection() {
  const p = (await getPlayer(EXAMPLE_ID)) ?? (await getPlayer((await topPlayerIds(1))[0]));
  return p?.projection ? { id: p.id, name: p.name, value: p.value, ...p.projection } : null;
}

function Stat({ value, label, note }: { value: string; label: string; note: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-rule bg-sheet p-4">
      <p className="font-display text-5xl leading-none font-bold text-pitch">{value}</p>
      <p className="font-medium">{label}</p>
      <p className="text-sm text-muted">{note}</p>
    </div>
  );
}

type Example = NonNullable<Awaited<ReturnType<typeof exampleProjection>>>;

const exampleRows = (p: Example): [string, number, string][] => [
  ["High", p.high, "Only 1 in 10 end up above"],
  ["Middle", p.mid, "Half above, half below"],
  ["Low", p.low, "Only 1 in 10 end up below"],
];

/** A worked example: today's value fanning out to the low / middle / high estimates. */
function ReadingAnEstimate({ p }: { p: Example }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-display text-3xl font-semibold">Reading an estimate</h2>
      <p className="leading-relaxed text-muted">
        <Link href={`/players/${p.id}`} className="font-semibold text-pitch underline underline-offset-2">
          {p.name}
        </Link>{" "}
        was worth {eur(p.current)} in {monthYear(p.value_date)}. The estimate for {monthYear(p.projection_date)} is{" "}
        <span className="font-semibold text-flood">
          {eur(p.low)} to {eur(p.high)}
        </span>
        , with {eur(p.mid)} in the middle.
      </p>
      <figure className="rounded-xl border border-rule bg-sheet p-3">
        {/* Wide version with labels beside the range; phones get a compact chart plus a list. */}
        <EstimateSvg p={p} compact={false} />
        <EstimateSvg p={p} compact />
        <ul className="mt-2 flex flex-col gap-2 px-1 pb-1 sm:hidden">
          {exampleRows(p).map(([name, v, note]) => (
            <li key={name} className="flex items-baseline justify-between gap-3">
              <span className="font-semibold">
                {name} {eur(v)}
              </span>
              <span className="text-right text-sm text-muted">{note}</span>
            </li>
          ))}
        </ul>
      </figure>
    </section>
  );
}

function EstimateSvg({ p, compact }: { p: Example; compact: boolean }) {
  const W = compact ? 340 : 600, H = 260, x0 = compact ? 40 : 60, x1 = compact ? 300 : 360, top = 20, bottom = 230;
  const max = Math.max(p.current, p.high) * 1.08;
  const y = (v: number) => bottom - (v / max) * (bottom - top);
  const rows = exampleRows(p);
  // Keep the three right-hand labels from overlapping.
  const labelY = rows.map(([, v]) => y(v));
  for (let i = 1; i < labelY.length; i++) labelY[i] = Math.max(labelY[i], labelY[i - 1] + 38);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={`h-auto w-full ${compact ? "sm:hidden" : "max-sm:hidden"}`}
      role="img"
      aria-label={`${p.name}: ${eur(p.current)} now; five-year estimate ${eur(p.low)} to ${eur(p.high)}, middle ${eur(p.mid)}`}
    >
      <line x1={x0} y1={bottom} x2={x1} y2={bottom} stroke="var(--rule)" strokeWidth="1" />
      <polygon
        className="fan"
        style={{ transformOrigin: `${x0}px ${y(p.current)}px`, ...delay(150) }}
        points={`${x0},${y(p.current)} ${x1},${y(p.high)} ${x1},${y(p.low)}`}
        fill="var(--flood-fill)"
        fillOpacity="0.32"
      />
      <line
        className="draw"
        pathLength={1}
        style={delay(500)}
        x1={x0}
        y1={y(p.current)}
        x2={x1}
        y2={y(p.mid)}
        stroke="var(--flood)"
        strokeWidth="2"
        strokeDasharray="6 5"
      />
      <line x1={x1} y1={y(p.high)} x2={x1} y2={y(p.low)} stroke="var(--flood-fill)" strokeWidth="5" strokeLinecap="round" />
      <circle cx={x0} cy={y(p.current)} r="6" fill="var(--pitch)" stroke="var(--sheet)" strokeWidth="2" />
      <text x={x0} y={y(p.current) - 14} textAnchor="middle" className="fill-ink text-[13px] font-semibold">
        {eur(p.current)}
      </text>
      <text x={x0} y={bottom + 20} textAnchor="middle" className="fill-muted text-[12px]">
        {monthYear(p.value_date)}
      </text>
      <text x={x1} y={bottom + 20} textAnchor="middle" className="fill-muted text-[12px]">
        {monthYear(p.projection_date)}
      </text>
      {!compact &&
        rows.map(([name, v, note], i) => (
          <g key={name} className="fade-in" style={delay(700 + i * 80)}>
            <line x1={x1 + 4} y1={y(v)} x2={x1 + 16} y2={labelY[i]} stroke="var(--rule)" />
            <text x={x1 + 22} y={labelY[i] + 4} className="fill-ink text-[14px] font-semibold">
              {name} {eur(v)}
            </text>
            <text x={x1 + 22} y={labelY[i] + 20} className="fill-muted text-[11px]">
              {note}
            </text>
          </g>
        ))}
    </svg>
  );
}

/** Median expected change by age group: diverging bars around "no change". */
function AgeChart({ bands }: { bands: AgeBand[] }) {
  const pct = (r: number) => Math.round((r - 1) * 100);
  const maxGain = Math.max(100, ...bands.map((b) => pct(b.median_ratio)));
  // Losses can't go below -100%; leave room after the longest bar for its label.
  const span = 100 + maxGain * 1.4;
  const zero = (100 / span) * 100; // % from the left where "no change" sits
  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-display text-3xl font-semibold">Age matters most</h2>
      <p className="leading-relaxed text-muted">
        Age is the strongest signal the model uses, followed by a player&apos;s peak value so far and how long
        they&apos;ve been valued. Young players usually rise; most players past their mid-twenties lose value
        over five years. That is why the typical estimate on this site is lower than today&apos;s value.
      </p>
      <table className="w-full border-separate border-spacing-y-2 text-sm">
        <caption className="mb-1 text-left text-sm text-muted">
          Typical (median) middle estimate vs today&apos;s value, current players by age
        </caption>
        <thead className="sr-only">
          <tr>
            <th>Age</th>
            <th>Median change in 5 years</th>
            <th>Players</th>
          </tr>
        </thead>
        <tbody>
          {bands.map((b, i) => {
            const v = pct(b.median_ratio);
            const width = (Math.abs(v) / span) * 100;
            return (
              <tr key={b.band} title={`${b.band}: ${b.players.toLocaleString("en-GB")} players, median ${v > 0 ? "+" : ""}${v}%`}>
                <th scope="row" className="w-28 pr-3 text-left align-middle font-medium whitespace-nowrap">
                  {b.band}
                  <span className="block text-xs font-normal text-muted">{b.players.toLocaleString("en-GB")} players</span>
                </th>
                <td className="relative h-9 align-middle">
                  <div className="absolute inset-y-0 w-px bg-ink/40" style={{ left: `${zero}%` }} aria-hidden />
                  <div
                    className="bar-grow absolute top-1/2 h-4 -translate-y-1/2 rounded-[4px] bg-flood"
                    style={{
                      ...(v >= 0 ? { left: `${zero}%` } : { right: `${100 - zero}%` }),
                      width: `${width}%`,
                      transformOrigin: v >= 0 ? "left" : "right",
                      ...delay(i * 60),
                    }}
                    aria-hidden
                  />
                  <span
                    className="absolute top-1/2 -translate-y-1/2 font-display text-base font-bold whitespace-nowrap"
                    style={v >= 0 ? { left: `calc(${zero + width}% + 6px)` } : { right: `calc(${100 - zero + width}% + 6px)` }}
                  >
                    {v > 0 ? "+" : ""}
                    {v}%
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="flex justify-between text-xs text-muted" aria-hidden style={{ paddingLeft: "7rem" }}>
        <span>← loses value</span>
        <span>no change at the line</span>
        <span>gains value →</span>
      </p>
    </section>
  );
}
