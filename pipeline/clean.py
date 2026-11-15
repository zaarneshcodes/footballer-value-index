"""Clean raw Kaggle CSVs into top-5-league tables in data/processed/ (Parquet).

Market values: Transfermarkt, via Kaggle dataset davidcariboo/player-scores.
"""
import sys
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
RAW, OUT = ROOT / "data" / "raw", ROOT / "data" / "processed"
TOP5 = {"GB1": "Premier League", "ES1": "LaLiga", "IT1": "Serie A",
        "L1": "Bundesliga", "FR1": "Ligue 1"}
PLAYER_COLS = ["player_id", "name", "date_of_birth", "country_of_citizenship",
               "position", "sub_position", "foot", "height_in_cm",
               "current_club_id", "current_club_name",
               "current_club_domestic_competition_id", "contract_expiration_date",
               "market_value_in_eur", "highest_market_value_in_eur", "last_season"]


def read(name: str, **kw) -> pd.DataFrame:
    return pd.read_csv(RAW / f"{name}.csv", low_memory=False, **kw)


def main() -> int:
    if not (RAW / "players.csv").exists():
        print(f"ERROR: {RAW} is empty. Run pipeline/download.py first.")
        return 1
    OUT.mkdir(parents=True, exist_ok=True)

    # Season stats: top-5 domestic league games only.
    games = read("games", usecols=["game_id", "season"])
    apps = read("appearances", parse_dates=["date"])
    apps = apps[apps["competition_id"].isin(TOP5)].merge(games, on="game_id", how="left")
    stats = (apps.groupby(["player_id", "season", "competition_id"], as_index=False)
             .agg(appearances=("game_id", "nunique"), minutes=("minutes_played", "sum"),
                  goals=("goals", "sum"), assists=("assists", "sum"),
                  yellow_cards=("yellow_cards", "sum"), red_cards=("red_cards", "sum")))
    stats["league"] = stats["competition_id"].map(TOP5)

    # Valuations: full history of anyone with a top-5 league appearance.
    top5_ids = set(apps["player_id"])
    vals = read("player_valuations", parse_dates=["date"])
    vals = (vals[vals["player_id"].isin(top5_ids)]
            .drop_duplicates(["player_id", "date"]).sort_values(["player_id", "date"]))
    vals = vals[["player_id", "date", "market_value_in_eur", "current_club_id", "current_club_name"]]

    # Players: currently in a top-5 league, latest season.
    players = read("players", usecols=PLAYER_COLS,
                   parse_dates=["date_of_birth", "contract_expiration_date"])
    latest = players["last_season"].max()
    players = players[players["current_club_domestic_competition_id"].isin(TOP5)
                      & (players["last_season"] == latest)].copy()
    players["league"] = players["current_club_domestic_competition_id"].map(TOP5)
    last_val = vals.groupby("player_id")["date"].max().rename("market_value_date")
    players = players.merge(last_val, on="player_id", how="left")

    for name, df in [("players", players), ("valuations", vals), ("season_stats", stats)]:
        df.to_parquet(OUT / f"{name}.parquet", index=False)

    # Sanity checks.
    print(f"latest season: {latest}")
    print(f"players:      {len(players):>9,} rows | dup ids: {players['player_id'].duplicated().sum()}"
          f" | no value: {players['market_value_in_eur'].isna().sum()}")
    print(players["league"].value_counts().to_string())
    print(f"valuations:   {len(vals):>9,} rows | players: {vals['player_id'].nunique():,}"
          f" | {vals['date'].min().date()} -> {vals['date'].max().date()}"
          f" | negative: {(vals['market_value_in_eur'] < 0).sum()}")
    print(f"season_stats: {len(stats):>9,} rows | seasons {stats['season'].min()}-{stats['season'].max()}"
          f" | missing season: {stats['season'].isna().sum()}")
    print(f"current players with no stats: {(~players['player_id'].isin(stats['player_id'])).sum()}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
