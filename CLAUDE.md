# Footballer Value Index — rules for Claude Code

## Project
CV project: a website showing player stats, current market value, and a
5-year value projection for players in the top 5 European leagues
(Premier League, LaLiga, Serie A, Bundesliga, Ligue 1), plus a chatbot
that answers questions using ONLY our database.

## Hard constraints (never break)
- ZERO COST. Free tiers only. Never add a paid service, paid API, or anything
  needing a credit card. If something requires payment, STOP and ask.
- LOCKED STACK (no changes without approval):
  - Python 3.12 + pandas + LightGBM for the offline pipeline and model
  - Postgres on Neon (free tier)
  - Next.js (App Router, TypeScript) for site, API routes, chatbot
  - Gemini API (free tier) with function-calling against our DB only
  - Vercel Hobby for deploy
- DATA: Kaggle dataset davidcariboo/player-scores only. NO web scraping.
- SECRETS: read only from environment variables (Codespaces secrets).
  Never print, log, hardcode, or commit secrets. Never write real values
  into any .env file.
- Never commit anything in data/raw/, data/processed/, or model files.

## Working rules
- Work in small steps. Before editing, list files to create/modify and wait
  for approval.
- Every new dependency needs a one-line justification; pin versions.
- After each change, run a verification command and show the real output.
  Never claim something works without running it.
- No destructive commands (rm -rf, git push --force, git reset --hard,
  DROP TABLE, deleting data) without explicit approval.
- Do not expand scope. Put ideas under "SUGGESTED (out of scope)".
- Any sample/fixture data must be clearly labeled as fake.
- Model outputs are estimates: show ranges, never present as fact.
  Market values are credited to Transfermarkt (via the Kaggle dataset).

## Layout
- pipeline/  Python data pipeline + model
- web/       Next.js app
- data/      local data (git-ignored)
- docs/      notes and decisions

## Status format
End every task with:
DONE / NOT VERIFIED / RISKS / NEXT
