import "server-only";
import { date, eur, monthYear, season } from "@/lib/format";
import {
  LEAGUES,
  POSITIONS,
  getPlayer,
  listPlayers,
  scorerSeasons,
  topPlayers,
  topScorers,
  type PlayerRow,
  type TopSort,
} from "@/lib/queries";

// The only things the chatbot can do: four read-only lookups over our own
// database. Gemini picks a tool and its arguments; we validate the arguments
// and run our own fixed queries. The model never writes SQL.
// Money comes back pre-formatted so the model doesn't do arithmetic on it.

export const TOOL_DECLARATIONS = [
  {
    name: "search_players",
    description:
      "Find players in the database by (part of) their name. Returns up to 8 matches with id, club, league, position, age, current market value and 5-year estimate range. Use this first to get a player's id.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Player name or part of it, e.g. 'Mbappe'" },
        league: { type: "string", enum: [...LEAGUES] },
        position: { type: "string", enum: [...POSITIONS] },
      },
      required: ["name"],
    },
  },
  {
    name: "get_player",
    description:
      "Full details for one player by id: profile, current market value, highest value, 5-year estimate range, market value history (summarised) and per-season stats (appearances, minutes, goals, assists, cards).",
    parameters: {
      type: "object",
      properties: { id: { type: "string", description: "Player id from search_players or top_players" } },
      required: ["id"],
    },
  },
  {
    name: "top_players",
    description:
      "Ranked list of players. sort='value' = highest current market value; 'estimate' = highest middle 5-year estimate; 'growth' = biggest expected rise (middle estimate / current value, players worth at least €5m). Optional filters: league, position, max_age.",
    parameters: {
      type: "object",
      properties: {
        sort: { type: "string", enum: ["value", "estimate", "growth"] },
        league: { type: "string", enum: [...LEAGUES] },
        position: { type: "string", enum: [...POSITIONS] },
        max_age: { type: "integer", description: "Only players this age or younger" },
        limit: { type: "integer", description: "1 to 15, default 10" },
      },
      required: ["sort"],
    },
  },
  {
    name: "top_scorers",
    description:
      "League leaders in a season, per league: most goals (stat='goals', default) or most assists (stat='assists'). Also returns the other stat, appearances and minutes. Only players currently in the top five leagues are included. Season is the start year: 2025 means 2025/26. Omit season for the latest one.",
    parameters: {
      type: "object",
      properties: {
        stat: { type: "string", enum: ["goals", "assists"] },
        league: { type: "string", enum: [...LEAGUES] },
        season: { type: "integer", description: "Season start year, e.g. 2025 for 2025/26" },
        limit: { type: "integer", description: "Per league, 1 to 10, default 5" },
      },
    },
  },
];

type Args = Record<string, unknown>;

function str(v: unknown, max = 60): string | null {
  return typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;
}
function oneOf<T extends string>(v: unknown, allowed: readonly T[]): T | null {
  return typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : null;
}
function int(v: unknown, min: number, max: number): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : null;
}

function rowSummary(r: PlayerRow) {
  return {
    id: r.id,
    name: r.name,
    club: r.club,
    league: r.league,
    position: r.sub_position ?? r.position,
    age: r.age,
    market_value: eur(r.value),
    estimate_in_5_years:
      r.mid == null ? "no estimate" : `${eur(r.low!)} to ${eur(r.high!)} (middle ${eur(r.mid)})`,
  };
}

async function searchPlayers(a: Args) {
  const q = str(a.name);
  if (!q) return { error: "name is required" };
  const { rows, total } = await listPlayers({
    q,
    league: oneOf(a.league, LEAGUES),
    position: oneOf(a.position, POSITIONS),
    page: 1,
  });
  return { total_matches: total, players: rows.slice(0, 8).map(rowSummary) };
}

async function playerDetails(a: Args) {
  const id = str(a.id, 20);
  if (!id || !/^\d+$/.test(id)) return { error: "id must be a numeric player id" };
  const p = await getPlayer(id);
  if (!p) return { error: "no player with that id" };
  const h = p.history;
  // Keep the history short: yearly points (last value of each year) plus the latest.
  const yearly = new Map<string, { date: string; value: number }>();
  for (const pt of h) yearly.set(pt.date.slice(0, 4), pt);
  return {
    id: p.id,
    name: p.name,
    club: p.club,
    league: p.league,
    position: p.sub_position ?? p.position,
    foot: p.foot,
    height_cm: p.height_in_cm,
    nationality: p.country,
    age: p.age,
    contract_until: p.contract_expiration_date ? date(p.contract_expiration_date) : null,
    market_value: eur(p.value),
    market_value_date: date(p.value_date),
    highest_market_value: p.highest_value == null ? null : eur(p.highest_value),
    estimate_in_5_years: p.projection
      ? {
          low: eur(p.projection.low),
          middle: eur(p.projection.mid),
          high: eur(p.projection.high),
          for_date: monthYear(p.projection.projection_date),
        }
      : "no estimate",
    value_history_end_of_each_year: [...yearly.values()].map((pt) => ({
      date: date(pt.date),
      value: eur(pt.value),
    })),
    seasons: p.seasons.slice(0, 8).map((s) => ({ ...s, season: season(s.season) })),
    page: `/players/${p.id}`,
  };
}

async function rankedPlayers(a: Args) {
  const sort = oneOf<TopSort>(a.sort, ["value", "estimate", "growth"]) ?? "value";
  const rows = await topPlayers({
    sort,
    league: oneOf(a.league, LEAGUES),
    position: oneOf(a.position, POSITIONS),
    maxAge: int(a.max_age, 15, 45),
    limit: int(a.limit, 1, 15) ?? 10,
  });
  return { sort, players: rows.map(rowSummary) };
}

async function scorers(a: Args) {
  const seasons = await scorerSeasons();
  const wanted = int(a.season, 1900, 2100);
  const s = wanted != null && seasons.includes(wanted) ? wanted : seasons[0];
  const rows = await topScorers({
    season: s,
    league: oneOf(a.league, LEAGUES),
    limit: int(a.limit, 1, 10) ?? 5,
    stat: oneOf(a.stat, ["goals", "assists"] as const) ?? "goals",
  });
  return {
    ranked_by: oneOf(a.stat, ["goals", "assists"] as const) ?? "goals",
    season: season(s),
    note:
      wanted != null && wanted !== s ? `No data for that season; showing ${season(s)}.` : undefined,
    seasons_available: seasons.map(season),
    only_current_top5_players: true,
    scorers: rows,
  };
}

export async function runTool(name: string, args: Args): Promise<unknown> {
  try {
    switch (name) {
      case "search_players":
        return await searchPlayers(args);
      case "get_player":
        return await playerDetails(args);
      case "top_players":
        return await rankedPlayers(args);
      case "top_scorers":
        return await scorers(args);
      default:
        return { error: `unknown tool ${name}` };
    }
  } catch {
    // Don't pass DB errors to the model: they could contain connection details.
    return { error: "database lookup failed" };
  }
}
