import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { date, season as seasonLabel } from "@/lib/format";
import { LEAGUES, scorerSeasons, topScorers, type ScorerRow } from "@/lib/queries";
import { sql } from "@/lib/db";
import { cacheLife } from "next/cache";

export const metadata: Metadata = { title: "Top scorers" };

const PER_LEAGUE = 10;
const SEASON_PILLS = 6;

async function lastStatsDate(): Promise<string | null> {
  "use cache";
  cacheLife("hours");
  const [r] = (await sql()`SELECT max(date)::text AS d FROM valuations`) as { d: string | null }[];
  return r?.d ?? null;
}

export default function ScorersPage({ searchParams }: PageProps<"/scorers">) {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <h1 className="font-display text-5xl font-bold tracking-tight text-pitch">Golden Boot race</h1>
        <p className="max-w-prose leading-relaxed text-muted">
          Most league goals in each of the top five leagues. This page refreshes itself whenever the
          dataset is reloaded. It only counts players who are in these leagues now, so anyone who
          has since moved abroad is missing.
        </p>
      </div>
      <Suspense fallback={<p className="text-muted">Loading scorers…</p>}>
        <Scorers searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Scorers({ searchParams }: Pick<PageProps<"/scorers">, "searchParams">) {
  const sp = await searchParams;
  const [seasons, updated] = await Promise.all([scorerSeasons(), lastStatsDate()]);
  const asked = Number.parseInt(String(Array.isArray(sp.season) ? sp.season[0] : (sp.season ?? "")), 10);
  const current = seasons.includes(asked) ? asked : seasons[0];
  const rows = await topScorers({ season: current, league: null, limit: PER_LEAGUE });

  return (
    <>
      <nav aria-label="Season" className="flex flex-wrap items-center gap-2">
        {seasons.slice(0, SEASON_PILLS).map((s) => (
          <Link
            key={s}
            href={s === seasons[0] ? "/scorers" : `/scorers?season=${s}`}
            aria-current={s === current ? "page" : undefined}
            className={`press rounded-full border-2 px-3.5 py-1 font-display text-lg font-semibold ${
              s === current ? "border-pitch bg-pitch text-chalk" : "border-rule bg-sheet text-ink hover:border-pitch"
            }`}
          >
            {seasonLabel(s)}
          </Link>
        ))}
        {updated && <span className="ml-auto text-sm text-muted">Dataset up to {date(updated)}</span>}
      </nav>

      <div className="grid gap-5 md:grid-cols-2">
        {LEAGUES.map((league) => (
          <LeagueCard key={`${league}-${current}`} league={league} rows={rows.filter((r) => r.league === league)} />
        ))}
      </div>
    </>
  );
}

function LeagueCard({ league, rows }: { league: string; rows: ScorerRow[] }) {
  const [leader, ...rest] = rows;
  if (!leader) {
    return (
      <section className="rounded-xl border border-rule bg-sheet p-5">
        <h2 className="font-display text-2xl font-bold text-pitch">{league}</h2>
        <p className="mt-2 text-muted">No goals recorded for this season.</p>
      </section>
    );
  }
  const max = leader.goals;
  return (
    <section className="flex flex-col gap-4 overflow-hidden rounded-xl border border-rule bg-sheet">
      <div className="pitch-strip relative flex items-end justify-between gap-4 px-5 pt-4 pb-3 text-[var(--chalk-line)]">
        <div className="min-w-0">
          <h2 className="font-display text-lg font-semibold tracking-wide uppercase opacity-80">{league}</h2>
          <Link href={`/players/${leader.id}`} className="block truncate font-display text-3xl font-bold hover:underline">
            {leader.name}
          </Link>
          <p className="truncate text-sm opacity-80">
            {leader.club} · {leader.assists} assists · {leader.appearances} apps
          </p>
        </div>
        <p className="shrink-0 text-right font-display leading-none">
          <span className="block text-6xl font-bold">{leader.goals}</span>
          <span className="text-sm font-semibold tracking-wide uppercase opacity-80">goals</span>
        </p>
      </div>
      <ol className="flex flex-col gap-2 px-5 pb-5">
        {rest.map((r, i) => (
          <li key={r.id} className="grid grid-cols-[1.5rem_1fr_2rem] items-center gap-x-2 text-sm">
            <span className="text-muted">{i + 2}</span>
            <div className="min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <Link href={`/players/${r.id}`} className="truncate font-medium hover:text-pitch hover:underline">
                  {r.name}
                </Link>
                <span className="truncate text-xs text-muted">{r.club}</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-rule/50">
                <div
                  className="bar-grow h-full rounded-full bg-pitch"
                  style={{ width: `${(r.goals / max) * 100}%`, "--delay": `${i * 40}ms` } as CSSProperties}
                />
              </div>
            </div>
            <span className="text-right font-display text-xl font-bold">{r.goals}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
