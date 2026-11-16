# Data notes

Source: Kaggle dataset `davidcariboo/player-scores` (market values from
Transfermarkt). This is the only data source; no scraping.

## How to reproduce
```bash
pip install -r pipeline/requirements.txt
python pipeline/download.py      # needs KAGGLE_USERNAME / KAGGLE_KEY secrets
python pipeline/profile_data.py
```

## Findings (profile run 2026-11-15, full output in `profile_output.txt`)

### Tables
| Table | Rows | Use for us |
|---|---|---|
| players | 50,149 | player profile, current value, league |
| player_valuations | 656,301 | value history, the main model target |
| appearances | 1,894,350 | per-game stats (goals, assists, minutes, cards) |
| games / club_games | 88,958 / 177,916 | match context, team results |
| game_events / game_lineups | 1.27M / 3.18M | probably not needed for v1 |
| transfers | 175,165 | transfer history (fee 35% missing) |
| clubs / competitions / countries / national_teams | small | lookups |

### Date coverage
- Valuations: 2000-01-20 to **2026-06-12**, which is the latest value in the snapshot.
- Appearances (per-game stats): **2012-07-03** to 2026-06-28.
- On the site, "current value" means the latest valuation and must show its date.

### Top-5 leagues (by `players.current_club_domestic_competition_id`)
| League | Players (any season) |
|---|---|
| Serie A | 3,200 |
| LaLiga | 2,278 |
| Premier League | 2,259 |
| Ligue 1 | 2,253 |
| Bundesliga | 1,823 |
| **Total** | **11,813** |

- Players whose `last_season == 2025`, the active pool to show on the site: **3,627**.
- Players with a current market value: 10,715.

### Valuation history depth
- 41,528 players have at least one valuation. Per player: median 15, mean 15.8, middle 50% between 8 and 23, max 57.

### Gaps and data-quality issues
- `clubs.total_market_value` is 100% empty. Don't use it.
- `players.contract_expiration_date` is 37% empty and `agent_name` 46.5% empty.
- `players.market_value_in_eur` is 17% empty: retired or inactive players.
- `foot` is 11.8% empty and `height_in_cm` 8.7% empty, so features must handle missing values.
- `player_valuations.player_club_domestic_competition_id` is 14% empty. Use `players` for the league instead.
- `transfers.transfer_fee` is 35% empty: free transfers, loans and unknown fees.

### Implications for the 5-year projection
- Training target: the value about 5 years after an anchor date. The data ends in mid-2026, so the latest usable anchor is about mid-2021.
- Stats features start in 2012-07, so stats-based training anchors cover roughly 2013 to 2021.
- Few players have a full 5-year future, so results will be noisy. Show ranges (quantiles), never single numbers.

## Decisions
_None yet. Pending the next step: cleaning and filtering to the top-5 leagues._

## Cleaning decisions (pipeline/clean.py)
- Stats: only top-5 domestic league games, aggregated per player, season and league.
- Valuations: full history for anyone with a top-5 league appearance since 2012.
- Players shown on site: current top-5 club and `last_season` equal to the dataset max.
- Site players without a current market value are dropped.
- Players with no top-5 stats are kept (shown as "no league stats").

## Features (pipeline/features.py)
- One row per valuation. Target: value ~5y later (nearest valuation within 180 days).
- Stats come from the last season completed before the anchor, so no future data leaks in.

## Model (pipeline/train.py)
- LightGBM quantile regression (10/50/90) on log(value in 5y / value now).
- Validation: fit on anchors before 2020, test on 2020-2021; baseline = "no change".
- Known bias: players without a 5y valuation (retired/left) are absent, so projections may lean optimistic.
- Results (2026-11-15, validation on 2020-21 anchors): log-ratio MAE 0.836 vs baseline 1.485 (44% better);
  median abs % error 62% vs 84%; 10-90 range coverage 77.6% (target 80%).
- Current players: median projected mid value is 0.43x today's value.
- Age check (2026-11-15, `check_output.txt`): median mid ratio by age is 2.74x (<=21), 0.88x (22-24),
  0.44x (25-27), 0.18x (28-30), 0.16x (31+). The overall 0.43x reflects the age mix, which follows the
  normal rise-then-decline curve. Ranges for under-21s are very wide (90th-percentile ratio 13.6x), so show ranges only.
- High-end (90th percentile) ratio by age: 13.62x (<=21), 3.09x (22-24), 1.27x (25-27), 0.44x (28-30), 0.31x (31+).

## Database (pipeline/schema.sql, pipeline/load_db.py)
- Neon Postgres, 4 tables: `players`, `valuations`, `season_stats`, `projections`. Column names match the parquet files.
- Only site players are loaded: `valuations` and `season_stats` are filtered to `players.player_id`, with foreign keys enforced.
- `projections` stores model estimates (10/50/90 quantiles). A CHECK keeps low <= mid <= high.
- Some projections start from an older valuation (`value_date` 2022-2025), so the site must show `value_date`.
- Load: `python pipeline/load_db.py` only fills empty tables. `--replace` empties and reloads all 4 in one transaction; any error or count mismatch rolls back.
- `--dry-run` validates the data without connecting. The connection string comes only from `DATABASE_URL` and is never printed.
- First load (2026-11-15): players 3,012 / valuations 59,064 / season_stats 13,086 / projections 3,012, all matching the parquet files; database size 17 MB.

## Web (web/)
- Next.js 16.4.6 (App Router, TypeScript, `src/`), Tailwind 4. All versions pinned exactly in `web/package.json`.
- Database access: `@neondatabase/serverless` 1.2.0 (Neon's HTTP driver, suited to Vercel serverless functions). Server-only module `web/src/lib/db.ts` reads `DATABASE_URL`.
- `GET /api/health` returns table row counts only. It answers 503 with a generic message if the DB is unreachable and never echoes errors.
- `npm audit`: 0 vulnerabilities in production deps; 7 moderate in ESLint dev tooling only (not shipped).

## Chatbot (/chat, /api/chat) — 2026-11-16
- Gemini free tier via plain REST `fetch` (no SDK dependency).
- Model routing (2026-11-16): tries gemini-3.5-flash-lite -> 3.1-flash-lite -> 3.8-flash -> 3.5-flash
  (each free-tier model has its own quota). A busy model is skipped for a while (429: Gemini's
  retryDelay or 60s; 5xx: 20s; timeout: 30s; 404/retired: 1h). One model per question (thought
  signatures are model-specific); if it fails mid-way the question restarts on the next model.
  Limits: 15s per call, 45s per question, `maxDuration = 60`. `CHAT_MODELS` env var (comma list,
  not secret) overrides the order. Skips are logged as `chat: <model> unavailable (<reason>)`;
  the answering model is in the `x-chat-model` response header. 2.5 models are closed to new keys.
- Gemini can only call four read-only tools (web/src/lib/chat-tools.ts): `search_players`,
  `get_player`, `top_players`, `top_scorers`. Arguments are validated; our fixed SQL runs (no model-written SQL).
  Money and dates are pre-formatted so the model doesn't do arithmetic.
- System prompt: answer only from tool results, estimates as ranges labelled as estimates,
  credit Transfermarkt, decline off-topic, links only to /players/{id}.
- Limits: last 12 messages, 500 chars each, max 4 tool rounds, 25s per Gemini call.
- Replies are rendered by a small formatter (bold, lists, /players links only), never as HTML.
- Free-tier note shown under the chat: Google may use prompts to improve its products.
- Needs `GEMINI_API_KEY` (Codespaces secret + Vercel env var). Without it the API returns 503.
- The bot is "The Scout". Avatar (components/ScoutAvatar.tsx) is an original SVG cartoon in
  Barcelona-style blue/garnet stripes with #19. Deliberately NOT a likeness of a real player:
  no traced face, no club crest or sponsor, not named after anyone.
- Page renamed "The Dugout" (nav: Dugout). House SOPs for off-topic messages (greetings, questions
  about the user, insults, betting, rule-breaking, gibberish...) live in web/src/lib/scout-sop.ts,
  plain English, appended after the core rules (core rules always win). Tested: no repeated replies.
- Meme mode (2026-11-16): for off-topic messages the SOP asks for meme-format, lightly trolling
  replies with hard limits (roast the question not the person; no swearing, slurs, identity or
  looks; PG). The model starts such replies with a tag like `[card:yellow]`; the route whitelists
  it (yellow, red, var, offside, board), strips it and returns `{ reply, card }`. ChatBox shows an
  original SVG reaction card (components/ReactionCard.tsx) and sends cards back as tags in history
  so the bot can escalate yellow -> red. Real data answers never carry a card.
- MemeCULT-1K (GitHub, research benchmark of 1,000 South Asian memes) was considered and rejected:
  no data in the repo yet, no licence, third-party meme images, not football, and outside the
  Kaggle-only data rule.
- Today's date goes into the system prompt so "last season" maps to the latest season in the data.

## Top scorers (/scorers) and top assists (/assists) — 2026-11-16
- "Golden Boot race": top 10 league scorers per league for a season (pills for the last 6 seasons,
  `?season=2024` etc.). Query `topScorers()` in queries.ts; ties broken by assists, then fewer minutes.
- "Playmaker race" (/assists, added later the same day): same board ranked by assists (ties: goals, then
  fewer minutes). Shared code in components/Leaderboard.tsx with a Goals | Assists tab that keeps the
  chosen season. No 4th nav button (wouldn't fit on phones); reached via the tab. Chat tool
  `top_scorers` takes `stat: goals | assists`.
- Updates automatically whenever the dataset is reloaded into Neon (no scraping, no live feed).
- Caveat shown on the page: only players currently in the top five leagues are in the database,
  so players who left (e.g. moved abroad) are missing from past rankings.

## Guardrails and evals (chatbot) — 2026-11-16
- Grounding check, repair-then-fallback, blocklist, rate limit, safe links: see docs/evals.md.
- `npm run test:guard` (11 unit tests) and `npm run eval:chat` (29 cases; report in
  docs/evals/chat-eval-latest.md). First local run 26/29 -> fixes -> 29/29 (97/97 checks).
- Env knobs (not secrets): CHAT_RATE_PER_MIN (default 8), CHAT_RATE_PER_DAY (150), CHAT_MODELS.

## "How the estimates work" page (/how-it-works) — 2026-11-16
- Plain-English explainer: worked example (Bukayo Saka, live from the DB, falls back to the most
  valuable player), 4 build steps, validation stats from docs/train_output.txt (hard-coded: they only
  change on retrain), "age matters most" chart and limitations.
- Age chart is live: median (middle estimate / current value) by current age group via
  `estimateByAge()`; one amber series (estimates colour), position + signed labels carry gain/loss
  (red/green failed the colour-blind check). Data table markup, so screen readers get the numbers.
- Linked from the footer disclaimer (every page) and under the estimate on player pages.
