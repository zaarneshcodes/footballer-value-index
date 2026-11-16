// Output guardrails for The Scout. Pure functions with no imports, so they can be
// unit-tested directly (web/tests/chat-guard.test.mjs).
//
// The main check is GROUNDING: every money amount, stat count, age and player link
// in a reply must appear in what our database tools returned for this question.
// The model may phrase things freely, but it may not invent numbers.

export type StatKind = "goals" | "assists" | "appearances" | "minutes" | "yellow_cards" | "red_cards" | "age";

export type Facts = {
  money: Set<string>; // canonical "€79.2m", "€850k"
  stats: Map<StatKind, Set<string>>; // values seen under each stat key, e.g. goals -> {"36", "25"}
  ids: Set<string>; // player ids returned by tools
};

const STAT_KEYS = new Set<string>(["goals", "assists", "appearances", "minutes", "yellow_cards", "red_cards", "age"]);

/** Which tool field a phrase like "31 apps" or "4 yellow cards" refers to. */
function statKind(word: string): StatKind | null {
  const w = word.toLowerCase();
  if (w.startsWith("goal contribution")) return null; // always calculated: never grounded
  if (w.startsWith("goal")) return "goals";
  if (w.startsWith("assist")) return "assists";
  if (["appearances", "apps", "matches", "games"].includes(w)) return "appearances";
  if (w === "minutes" || w === "mins") return "minutes";
  if (w.startsWith("yellow")) return "yellow_cards";
  if (w.startsWith("red")) return "red_cards";
  return null;
}

export type Verdict = {
  ok: boolean;
  /** Problems the model can fix by answering again from the tool results. */
  ungrounded: string[];
  /** Problems that are never acceptable: replace the reply instead of repairing. */
  blocked: string[];
};

const MONEY_RE = /€\s?(\d+(?:[.,]\d+)?)\s?(bn|billion|m|million|k|thousand)?\b/gi;
// "36 goals", "2,382 minutes", "31 appearances", "4 yellow cards", "aged 27", "27 years old"
// Up to two qualifier words may sit between the number and the stat ("36 league goals").
const STAT_RE =
  /\b(\d{1,3}(?:,\d{3})*|\d+)\s+(?:[A-Za-z][\w'-]*\s+){0,2}?(goals?|assists?|appearances|apps|matches|games|minutes|mins|yellow cards?|red cards?|goal contributions?)\b/gi;
const AGE_RE = /\b(?:aged?|age of)\s+(\d{1,2})\b|\b(\d{1,2})[\s-]years?[\s-]old\b/gi;
const LINK_RE = /\/players\/(\d+)/g;
// Any markdown link that isn't a player page (e.g. invented "/clubs/27" or outside URLs).
const BAD_LINK_RE = /\]\((?!\/players\/\d+\))([^)\s]*)\)/g;

// Words The Scout must never output (troll mode included). Matched as whole words.
const BLOCKLIST = [
  "fuck", "fucking", "fucker", "shit", "bullshit", "bitch", "bastard", "asshole", "arsehole",
  "cunt", "dick", "wanker", "twat", "prick", "slut", "whore", "retard", "retarded",
];
const BLOCK_RE = new RegExp(`\\b(${BLOCKLIST.join("|")})\\b`, "i");

// Phrases that only appear in our hidden instructions: seeing one means a prompt leak.
const LEAK_MARKERS = ["TROLL LIMITS", "CARD TABLE", "House SOPs", "SITUATIONS AND EXAMPLE LINES", "Rules you must always follow"];

/** "€79.2 million" / "€79,2m" / "€ 80M" -> "€79.2m"; "€850 thousand" -> "€850k". */
export function canonicalMoney(amount: string, unit: string | undefined): string {
  const n = Number.parseFloat(amount.replace(",", "."));
  const u = (unit ?? "").toLowerCase();
  let eur = n;
  if (u === "bn" || u === "billion") eur = n * 1e9;
  else if (u === "m" || u === "million") eur = n * 1e6;
  else if (u === "k" || u === "thousand") eur = n * 1e3;
  // Same formatting as lib/format.ts eur(): one decimal for millions, dropped when whole.
  if (eur >= 1e6) return `€${(eur / 1e6).toFixed(1).replace(/\.0$/, "")}m`;
  if (eur >= 1e3) return `€${Math.round(eur / 1e3)}k`;
  return `€${Math.round(eur)}`;
}

function moneyIn(text: string): string[] {
  return [...text.matchAll(MONEY_RE)].map((m) => canonicalMoney(m[1], m[2]));
}

/** Collect every value the tools returned, walking nested objects and arrays. */
export function collectFacts(toolOutputs: unknown[]): Facts {
  const facts: Facts = { money: new Set(), stats: new Map(), ids: new Set() };
  const walk = (v: unknown, key?: string) => {
    if (v == null) return;
    if (typeof v === "number") {
      if (key && STAT_KEYS.has(key) && Number.isInteger(v)) {
        const kind = key as StatKind;
        if (!facts.stats.has(kind)) facts.stats.set(kind, new Set());
        facts.stats.get(kind)!.add(String(v));
      }
      return;
    }
    if (typeof v === "string") {
      for (const m of moneyIn(v)) facts.money.add(m);
      if (key === "id" && /^\d+$/.test(v)) facts.ids.add(v);
      for (const l of v.matchAll(LINK_RE)) facts.ids.add(l[1]);
      return;
    }
    if (Array.isArray(v)) return v.forEach((x) => walk(x));
    if (typeof v === "object") for (const [k, x] of Object.entries(v)) walk(x, k);
  };
  toolOutputs.forEach((o) => walk(o));
  return facts;
}

/** Check one reply against the facts from this question's tool calls. */
export function checkReply(reply: string, facts: Facts): Verdict {
  const ungrounded: string[] = [];
  const blocked: string[] = [];

  for (const m of moneyIn(reply)) if (!facts.money.has(m)) ungrounded.push(`money ${m}`);

  const has = (kind: StatKind | null, n: string) => kind != null && (facts.stats.get(kind)?.has(n) ?? false);
  for (const m of reply.matchAll(STAT_RE)) {
    const n = String(Number(m[1].replace(/,/g, "")));
    if (!has(statKind(m[2]), n)) ungrounded.push(`stat "${m[0]}"`);
  }
  for (const m of reply.matchAll(AGE_RE)) {
    if (!has("age", String(Number(m[1] ?? m[2])))) ungrounded.push(`age "${m[0]}"`);
  }
  for (const m of reply.matchAll(LINK_RE)) if (!facts.ids.has(m[1])) ungrounded.push(`link /players/${m[1]}`);
  for (const m of reply.matchAll(BAD_LINK_RE)) ungrounded.push(`link ${m[1] || "(empty)"} (only player-page links allowed)`);

  const bad = BLOCK_RE.exec(reply);
  if (bad) blocked.push(`blocked word "${bad[1]}"`);
  for (const marker of LEAK_MARKERS) if (reply.includes(marker)) blocked.push(`instruction leak "${marker}"`);

  return { ok: ungrounded.length === 0 && blocked.length === 0, ungrounded, blocked };
}

/** Message sent back to the model when its answer had numbers we couldn't find. */
export function repairPrompt(v: Verdict): string {
  return (
    "[Automatic fact check, not from the user] Your last reply contained things that are not in this " +
    `question's tool results: ${v.ungrounded.slice(0, 6).join("; ")}. Rewrite your reply to the user's ` +
    "last message: keep the same intent and tone, but remove or correct those parts. Only use values and " +
    "player ids the tools returned (call a tool first if you need one), copied exactly, and only link " +
    "players as [Name](/players/<id>). If the database doesn't have what they asked for, say so plainly. " +
    "Do not mention this check."
  );
}

export const FALLBACK_REPLY =
  "I couldn't double-check that answer against the database, so I won't guess. Try asking about one player, league or season at a time.";

// ---- Rate limiting (per server instance; resets on cold start) ----

type Bucket = { minute: number[]; dayStart: number; day: number };
const buckets = new Map<string, Bucket>();

/**
 * Sliding one-minute window plus a daily cap per visitor key (IP). Returns seconds to wait,
 * or 0 if allowed. Protects the shared free Gemini quota from one heavy user.
 */
export function rateLimit(key: string, perMinute: number, perDay: number, now = Date.now()): number {
  let b = buckets.get(key);
  if (!b || now - b.dayStart > 86_400_000) {
    b = { minute: [], dayStart: now, day: 0 };
    buckets.set(key, b);
  }
  b.minute = b.minute.filter((t) => now - t < 60_000);
  if (b.day >= perDay) return Math.ceil((b.dayStart + 86_400_000 - now) / 1000);
  if (b.minute.length >= perMinute) return Math.ceil((b.minute[0] + 60_000 - now) / 1000);
  b.minute.push(now);
  b.day++;
  if (buckets.size > 5_000) buckets.delete(buckets.keys().next().value!); // bound memory
  return 0;
}
