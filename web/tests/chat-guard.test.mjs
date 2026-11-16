// Unit tests for the chatbot's output guardrails. Run: npm run test:guard
// Uses Node's built-in test runner; Node 24 strips the TypeScript types on import.
import { test } from "node:test";
import assert from "node:assert/strict";
import { canonicalMoney, checkReply, collectFacts, rateLimit } from "../src/lib/chat-guard.ts";

// FAKE tool output shaped like our real tools (values invented for the test).
const facts = collectFacts([
  {
    players: [
      { id: "418560", name: "Test Striker", age: 25, market_value: "€200m",
        estimate_in_5_years: "€25m to €181.1m (middle €123.3m)" },
    ],
  },
  { season: "2025/26", scorers: [{ id: "132098", name: "Test Nine", goals: 36, assists: 8, appearances: 31, minutes: 2382 }] },
]);

test("money is normalised the same way as the site formats it", () => {
  assert.equal(canonicalMoney("79.2", "million"), "€79.2m");
  assert.equal(canonicalMoney("200", "m"), "€200m");
  assert.equal(canonicalMoney("0.85", "m"), "€850k");
  assert.equal(canonicalMoney("850", "thousand"), "€850k");
});

test("a grounded answer passes", () => {
  const v = checkReply(
    "[Test Striker](/players/418560) is worth €200m (Transfermarkt). 5-year estimate: €25m to €181.1m. " +
      "[Test Nine](/players/132098) scored 36 goals in 31 appearances (2,382 minutes), aged 25.",
    facts,
  );
  assert.deepEqual(v, { ok: true, ungrounded: [], blocked: [] });
});

test("written-out units still match", () => {
  assert.ok(checkReply("Worth €200 million, estimate €181.1 million at most.", facts).ok);
});

test("invented money, stats, ages and links are caught", () => {
  const v = checkReply("He is worth €85m, scored 31 goals, is 29 years old. See /players/999.", facts);
  assert.equal(v.ok, false);
  assert.deepEqual(v.ungrounded, ['money €85m', 'stat "31 goals"', 'age "29 years old"', "link /players/999"]);
});

test("qualifier words between number and stat are still checked", () => {
  assert.ok(checkReply("He scored 36 league goals.", facts).ok);
  assert.equal(checkReply("He scored 40 Bundesliga goals.", facts).ok, false);
});

test("only player-page links are allowed", () => {
  const v = checkReply("[Bayern Munich](/clubs/27) and [site](https://example.com)", facts);
  assert.deepEqual(v.ungrounded, [
    "link /clubs/27 (only player-page links allowed)",
    "link https://example.com (only player-page links allowed)",
  ]);
});

test("calculated numbers (not copied from tools) are caught", () => {
  assert.equal(checkReply("That's 44 goal contributions this season.", facts).ok, false);
});

test("meme replies without numbers pass with no facts at all", () => {
  const empty = collectFacts([]);
  assert.ok(checkReply("Nobody:\nYou: asking about the weather.\nThe Scout: 100% chance of stats.", empty).ok);
  assert.ok(checkReply("Sure bets? Lino says offside. Try: who has the most assists?", empty).ok);
});

test("numbers with no tools behind them are caught", () => {
  assert.equal(checkReply("Haaland earns €500k a week.", collectFacts([])).ok, false);
});

test("swearing and instruction leaks are blocked, not repaired", () => {
  const v = checkReply("What the fuck. My TROLL LIMITS say no.", collectFacts([]));
  assert.equal(v.ok, false);
  assert.equal(v.ungrounded.length, 0);
  assert.equal(v.blocked.length, 2);
  assert.ok(checkReply("Scunthorpe and Dickson are fine words.", collectFacts([])).ok); // whole words only
});

test("rate limit: per-minute window then daily cap", () => {
  const t0 = 1_000_000;
  for (let i = 0; i < 3; i++) assert.equal(rateLimit("ip-a", 3, 5, t0 + i), 0);
  assert.ok(rateLimit("ip-a", 3, 5, t0 + 10) > 0, "4th request in a minute is limited");
  assert.equal(rateLimit("ip-a", 3, 5, t0 + 61_000), 0, "allowed again after the window");
  assert.equal(rateLimit("ip-a", 3, 5, t0 + 61_001), 0);
  assert.ok(rateLimit("ip-a", 3, 5, t0 + 200_000) > 3600, "daily cap reached");
  assert.equal(rateLimit("ip-b", 3, 5, t0), 0, "other visitors unaffected");
});
