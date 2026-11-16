import "server-only";
import { cacheLife } from "next/cache";
import { sql } from "@/lib/db";

// Read-only queries. All user input goes in as bound parameters.
// Data only changes when the pipeline reloads it, so results are cached for hours.

export const LEAGUES = ["Premier League", "LaLiga", "Serie A", "Bundesliga", "Ligue 1"] as const;
export const POSITIONS = ["Goalkeeper", "Defender", "Midfield", "Attack"] as const;
export const PAGE_SIZE = 50;

// Accent-insensitive name search without a DB extension: map common accented
// letters to plain ones on both sides of the comparison ("Mbappe" finds "Mbappé").
const ACCENT_GROUPS: [string, string][] = [
  ["áàâäãåā", "a"], ["çćč", "c"], ["ďđ", "d"], ["éèêëēě", "e"], ["ğ", "g"],
  ["íìîïīı", "i"], ["ł", "l"], ["ñńň", "n"], ["óòôöõøō", "o"], ["ř", "r"],
  ["śšş", "s"], ["ť", "t"], ["úùûüūů", "u"], ["ýÿ", "y"], ["źžż", "z"],
];
const ACCENTED = ACCENT_GROUPS.map(([from]) => from).join("");
const PLAIN = ACCENT_GROUPS.map(([from, to]) => to.repeat([...from].length)).join("");

export type PlayerRow = {
  id: string;
  name: string;
  club: string | null;
  league: string;
  position: string | null;
  sub_position: string | null;
  age: number | null;
  value: number;
  low: number | null;
  mid: number | null;
  high: number | null;
};

export type ListFilters = { q: string | null; league: string | null; position: string | null; page: number };

export async function listPlayers(f: ListFilters): Promise<{ rows: PlayerRow[]; total: number }> {
  "use cache";
  cacheLife("hours");
  const pattern = f.q ? `%${f.q.toLowerCase().replace(/[\\%_]/g, (c) => `\\${c}`)}%` : null;
  const rows = (await sql()`
    SELECT p.player_id::text AS id, p.name, p.current_club_name AS club, p.league,
           p.position, p.sub_position,
           date_part('year', age(p.date_of_birth))::int AS age,
           p.market_value_in_eur::float8 AS value,
           pr.proj_low_eur::float8 AS low, pr.proj_mid_eur::float8 AS mid,
           pr.proj_high_eur::float8 AS high,
           count(*) OVER ()::int AS total
    FROM players p
    LEFT JOIN projections pr USING (player_id)
    WHERE (${pattern}::text IS NULL
           OR translate(lower(p.name), ${ACCENTED}, ${PLAIN})
              LIKE translate(${pattern}::text, ${ACCENTED}, ${PLAIN}))
      AND (${f.league}::text IS NULL OR p.league = ${f.league})
      AND (${f.position}::text IS NULL OR p.position = ${f.position})
    ORDER BY p.market_value_in_eur DESC, p.name, p.player_id
    LIMIT ${PAGE_SIZE} OFFSET ${(f.page - 1) * PAGE_SIZE}`) as (PlayerRow & { total: number })[];
  return { rows, total: rows[0]?.total ?? 0 };
}

export type PlayerDetail = {
  id: string;
  name: string;
  club: string | null;
  league: string;
  position: string | null;
  sub_position: string | null;
  foot: string | null;
  height_in_cm: number | null;
  country: string | null;
  date_of_birth: string | null;
  age: number | null;
  contract_expiration_date: string | null;
  value: number;
  value_date: string;
  highest_value: number | null;
  projection: null | {
    value_date: string;
    current: number;
    low: number;
    mid: number;
    high: number;
    projection_date: string;
  };
  history: { date: string; value: number }[];
  seasons: {
    season: number;
    league: string;
    appearances: number;
    minutes: number;
    goals: number;
    assists: number;
    yellow_cards: number;
    red_cards: number;
  }[];
};

export async function getPlayer(id: string): Promise<PlayerDetail | null> {
  "use cache";
  cacheLife("hours");
  const db = sql();
  const [players, history, seasons] = await Promise.all([
    db`
      SELECT p.player_id::text AS id, p.name, p.current_club_name AS club, p.league,
             p.position, p.sub_position, p.foot, p.height_in_cm,
             p.country_of_citizenship AS country,
             p.date_of_birth::text AS date_of_birth,
             date_part('year', age(p.date_of_birth))::int AS age,
             p.contract_expiration_date::text AS contract_expiration_date,
             p.market_value_in_eur::float8 AS value,
             p.market_value_date::text AS value_date,
             p.highest_market_value_in_eur::float8 AS highest_value,
             pr.value_date::text AS pr_value_date,
             pr.current_value_eur::float8 AS pr_current,
             pr.proj_low_eur::float8 AS pr_low, pr.proj_mid_eur::float8 AS pr_mid,
             pr.proj_high_eur::float8 AS pr_high,
             pr.projection_date::text AS pr_projection_date
      FROM players p LEFT JOIN projections pr USING (player_id)
      WHERE p.player_id = ${id}::bigint`,
    db`
      SELECT date::text AS date, market_value_in_eur::float8 AS value
      FROM valuations WHERE player_id = ${id}::bigint ORDER BY date`,
    db`
      SELECT season, league, sum(appearances)::int AS appearances, sum(minutes)::int AS minutes,
             sum(goals)::int AS goals, sum(assists)::int AS assists,
             sum(yellow_cards)::int AS yellow_cards, sum(red_cards)::int AS red_cards
      FROM season_stats WHERE player_id = ${id}::bigint
      GROUP BY season, league ORDER BY season DESC, league`,
  ]);
  const r = players[0];
  if (!r) return null;
  return {
    id: r.id,
    name: r.name,
    club: r.club,
    league: r.league,
    position: r.position,
    sub_position: r.sub_position,
    foot: r.foot,
    height_in_cm: r.height_in_cm,
    country: r.country,
    date_of_birth: r.date_of_birth,
    age: r.age,
    contract_expiration_date: r.contract_expiration_date,
    value: r.value,
    value_date: r.value_date,
    highest_value: r.highest_value,
    projection:
      r.pr_mid == null
        ? null
        : {
            value_date: r.pr_value_date,
            current: r.pr_current,
            low: r.pr_low,
            mid: r.pr_mid,
            high: r.pr_high,
            projection_date: r.pr_projection_date,
          },
    history: history as PlayerDetail["history"],
    seasons: seasons as PlayerDetail["seasons"],
  };
}

export type TickerItem = {
  id: string;
  name: string;
  age: number | null;
  group: "top" | "rising";
  value: number;
  low: number;
  mid: number;
  high: number;
  year: number;
};

/**
 * Ticker content: the most valuable players, plus "ones to watch" (worth at least
 * €20m, with the biggest expected rise in the model's middle estimate).
 */
export async function tickerEstimates(top = 13, rising = 7): Promise<TickerItem[]> {
  "use cache";
  cacheLife("hours");
  const rows = (await sql()`
    WITH base AS (
      SELECT p.player_id, p.name, p.market_value_in_eur::float8 AS value,
             date_part('year', age(p.date_of_birth))::int AS age,
             pr.proj_low_eur::float8 AS low, pr.proj_mid_eur::float8 AS mid,
             pr.proj_high_eur::float8 AS high,
             date_part('year', pr.projection_date)::int AS year
      FROM players p JOIN projections pr USING (player_id)),
    t AS (SELECT *, 'top' AS grp, row_number() OVER (ORDER BY value DESC, name) AS rk
          FROM base ORDER BY value DESC, name LIMIT ${top}),
    r AS (SELECT *, 'rising' AS grp, row_number() OVER (ORDER BY mid / value DESC, name) AS rk
          FROM base WHERE value >= 20000000 AND player_id NOT IN (SELECT player_id FROM t)
          ORDER BY mid / value DESC, name LIMIT ${rising})
    SELECT player_id::text AS id, name, age, grp AS "group", value, low, mid, high, year, rk
    FROM t UNION ALL
    SELECT player_id::text, name, age, grp, value, low, mid, high, year, rk FROM r`) as (TickerItem & {
    rk: number;
  })[];
  // Interleave: two big names, then one riser, so every big name is still there.
  const tops = rows.filter((r) => r.group === "top").sort((a, b) => a.rk - b.rk);
  const risers = rows.filter((r) => r.group === "rising").sort((a, b) => a.rk - b.rk);
  const out: typeof rows = [];
  tops.forEach((t, i) => {
    out.push(t);
    if (i % 2 === 1 && risers.length) out.push(risers.shift()!);
  });
  // The extra rank column is harmless to callers; the declared type hides it.
  return [...out, ...risers];
}

export type RaceLine = {
  id: string;
  name: string;
  value: number;
  points: { date: string; value: number }[];
};

/** Value histories since mid-2017 for the most valuable current players. */
export async function topValueHistories(limit = 6): Promise<RaceLine[]> {
  "use cache";
  cacheLife("hours");
  const db = sql();
  const top = (await db`
    SELECT player_id::text AS id, name, market_value_in_eur::float8 AS value
    FROM players ORDER BY market_value_in_eur DESC, name LIMIT ${limit}`) as Omit<RaceLine, "points">[];
  const pts = (await db`
    SELECT player_id::text AS id, date::text AS date, market_value_in_eur::float8 AS value
    FROM valuations
    WHERE player_id = ANY(${top.map((t) => t.id)}::bigint[]) AND date >= '2017-07-01'
    ORDER BY date`) as { id: string; date: string; value: number }[];
  return top.map((t) => ({
    ...t,
    points: pts.filter((p) => p.id === t.id).map(({ date, value }) => ({ date, value })),
  }));
}

/** IDs of the most valuable players, pre-rendered at build so their pages open instantly. */
export async function topPlayerIds(limit: number): Promise<string[]> {
  "use cache";
  cacheLife("hours");
  const rows = (await sql()`
    SELECT player_id::text AS id FROM players
    ORDER BY market_value_in_eur DESC, name, player_id LIMIT ${limit}`) as { id: string }[];
  return rows.map((r) => r.id);
}

export type TopSort = "value" | "estimate" | "growth";

/**
 * Ranked players with optional filters. "estimate" ranks by the model's middle
 * 5-year estimate; "growth" by middle estimate / current value (players worth
 * at least €5m, so tiny values don't dominate the ratio).
 */
export async function topPlayers(f: {
  league: string | null;
  position: string | null;
  maxAge: number | null;
  sort: TopSort;
  limit: number;
}): Promise<PlayerRow[]> {
  "use cache";
  cacheLife("hours");
  return (await sql()`
    SELECT p.player_id::text AS id, p.name, p.current_club_name AS club, p.league,
           p.position, p.sub_position,
           date_part('year', age(p.date_of_birth))::int AS age,
           p.market_value_in_eur::float8 AS value,
           pr.proj_low_eur::float8 AS low, pr.proj_mid_eur::float8 AS mid,
           pr.proj_high_eur::float8 AS high
    FROM players p
    LEFT JOIN projections pr USING (player_id)
    WHERE (${f.league}::text IS NULL OR p.league = ${f.league})
      AND (${f.position}::text IS NULL OR p.position = ${f.position})
      AND (${f.maxAge}::int IS NULL OR date_part('year', age(p.date_of_birth)) <= ${f.maxAge})
      AND (${f.sort} = 'value' OR pr.proj_mid_eur IS NOT NULL)
      AND (${f.sort} <> 'growth' OR p.market_value_in_eur >= 5000000)
    ORDER BY CASE ${f.sort}
               WHEN 'estimate' THEN pr.proj_mid_eur::float8
               WHEN 'growth' THEN pr.proj_mid_eur::float8 / p.market_value_in_eur
               ELSE p.market_value_in_eur::float8 END DESC NULLS LAST,
             p.name, p.player_id
    LIMIT ${f.limit}`) as PlayerRow[];
}

export type ScorerRow = {
  id: string;
  name: string;
  club: string | null;
  league: string;
  goals: number;
  assists: number;
  appearances: number;
  minutes: number;
};

/** Seasons with stats, newest first (start year, e.g. 2025 = 2025/26). */
export async function scorerSeasons(): Promise<number[]> {
  "use cache";
  cacheLife("hours");
  const rows = (await sql()`SELECT DISTINCT season FROM season_stats ORDER BY season DESC`) as {
    season: number;
  }[];
  return rows.map((r) => r.season);
}

export type LeaderStat = "goals" | "assists";

/**
 * League leaders for a season, per league (top `limit` in each), by goals or assists.
 * Only players currently in the top five leagues are in the database.
 * Ties: the other stat (assists for goals, goals for assists), then fewer minutes.
 */
export async function topScorers(f: {
  season: number;
  league: string | null;
  limit: number;
  stat?: LeaderStat;
}): Promise<ScorerRow[]> {
  "use cache";
  cacheLife("hours");
  const stat: LeaderStat = f.stat === "assists" ? "assists" : "goals";
  return (await sql()`
    WITH s AS (
      SELECT st.player_id, st.league, sum(st.goals)::int AS goals, sum(st.assists)::int AS assists,
             sum(st.appearances)::int AS appearances, sum(st.minutes)::int AS minutes
      FROM season_stats st
      WHERE st.season = ${f.season} AND (${f.league}::text IS NULL OR st.league = ${f.league})
      GROUP BY st.player_id, st.league),
    r AS (
      SELECT s.*, row_number() OVER (
               PARTITION BY s.league
               ORDER BY CASE WHEN ${stat}::text = 'assists' THEN s.assists ELSE s.goals END DESC,
                        CASE WHEN ${stat}::text = 'assists' THEN s.goals ELSE s.assists END DESC,
                        s.minutes, s.player_id) AS rk
      FROM s
      WHERE CASE WHEN ${stat}::text = 'assists' THEN s.assists ELSE s.goals END > 0)
    SELECT p.player_id::text AS id, p.name, p.current_club_name AS club, r.league,
           r.goals, r.assists, r.appearances, r.minutes
    FROM r JOIN players p USING (player_id)
    WHERE r.rk <= ${f.limit}
    ORDER BY r.league, r.rk`) as ScorerRow[];
}
