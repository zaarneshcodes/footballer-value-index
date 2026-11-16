import type { CSSProperties } from "react";
import Link from "next/link";
import { cacheLife } from "next/cache";
import { sql } from "@/lib/db";
import { date, season as seasonLabel } from "@/lib/format";
import { LEAGUES, scorerSeasons, topScorers, type LeaderStat, type ScorerRow } from "@/lib/queries";

// League leaders boards, shared by /scorers (goals) and /assists (assists).

const PER_LEAGUE = 10;
const SEASON_PILLS = 6;
const PATH: Record<LeaderStat, "/scorers" | "/assists"> = { goals: "/scorers", assists: "/assists" };

async function lastStatsDate(): Promise<string | null> {
  "use cache";
  cacheLife("hours");
  const [r] = (await sql()`SELECT max(date)::text AS d FROM valuations`) as { d: string | null }[];
  return r?.d ?? null;
}

/** Goals | Assists switch; keeps the chosen season. */
export function StatTabs({ stat, season }: { stat: LeaderStat; season?: number | null }) {
  const q = season ? `?season=${season}` : "";
  return (
    <nav aria-label="Leaderboard" className="flex w-fit rounded-full border-2 border-pitch p-1">
      {(["goals", "assists"] as const).map((s) => (
        <Link
          key={s}
          href={`${PATH[s]}${q}`}
          aria-current={s === stat ? "page" : undefined}
          className={`press rounded-full px-5 py-1.5 font-display text-lg font-bold uppercase tracking-wide ${
            s === stat ? "bg-pitch text-chalk" : "text-pitch hover:bg-pitch/10"
          }`}
        >
          {s}
        </Link>
      ))}
    </nav>
  );
}

export async function Leaderboard({ stat, seasonParam }: { stat: LeaderStat; seasonParam: string | string[] | undefined }) {
  const [seasons, updated] = await Promise.all([scorerSeasons(), lastStatsDate()]);
  const asked = Number.parseInt(String(Array.isArray(seasonParam) ? seasonParam[0] : (seasonParam ?? "")), 10);
  const current = seasons.includes(asked) ? asked : seasons[0];
  const rows = await topScorers({ season: current, league: null, limit: PER_LEAGUE, stat });
  const base = PATH[stat];

  return (
    <>
      <div className="flex flex-col gap-4">
        <StatTabs stat={stat} season={current === seasons[0] ? null : current} />
        <nav aria-label="Season" className="flex flex-wrap items-center gap-2">
          {seasons.slice(0, SEASON_PILLS).map((s) => (
            <Link
              key={s}
              href={s === seasons[0] ? base : `${base}?season=${s}`}
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
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {LEAGUES.map((league) => (
          <LeagueCard
            key={`${league}-${current}-${stat}`}
            league={league}
            stat={stat}
            rows={rows.filter((r) => r.league === league)}
          />
        ))}
      </div>
    </>
  );
}

function LeagueCard({ league, stat, rows }: { league: string; stat: LeaderStat; rows: ScorerRow[] }) {
  const [leader, ...rest] = rows;
  if (!leader) {
    return (
      <section className="rounded-xl border border-rule bg-sheet p-5">
        <h2 className="font-display text-2xl font-bold text-pitch">{league}</h2>
        <p className="mt-2 text-muted">No {stat} recorded for this season.</p>
      </section>
    );
  }
  const other: LeaderStat = stat === "goals" ? "assists" : "goals";
  const max = leader[stat];
  return (
    <section className="flex flex-col gap-4 overflow-hidden rounded-xl border border-rule bg-sheet">
      <div className="pitch-strip relative flex items-end justify-between gap-4 px-5 pt-4 pb-3 text-[var(--chalk-line)]">
        <div className="min-w-0">
          <h2 className="font-display text-lg font-semibold tracking-wide uppercase opacity-80">{league}</h2>
          <Link href={`/players/${leader.id}`} className="block truncate font-display text-3xl font-bold hover:underline">
            {leader.name}
          </Link>
          <p className="truncate text-sm opacity-80">
            {leader.club} · {leader[other]} {other} · {leader.appearances} apps
          </p>
        </div>
        <p className="shrink-0 text-right font-display leading-none">
          <span className="block text-6xl font-bold">{leader[stat]}</span>
          <span className="text-sm font-semibold tracking-wide uppercase opacity-80">{stat}</span>
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
                  style={{ width: `${(r[stat] / max) * 100}%`, "--delay": `${i * 40}ms` } as CSSProperties}
                />
              </div>
            </div>
            <span className="text-right font-display text-xl font-bold">{r[stat]}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
