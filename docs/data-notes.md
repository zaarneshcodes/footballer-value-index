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
