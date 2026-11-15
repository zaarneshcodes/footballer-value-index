"""Profile the raw Kaggle CSVs in data/raw/ (read-only, prints a summary).

Market values come from Transfermarkt via the Kaggle dataset
davidcariboo/player-scores.
"""
import sys
from pathlib import Path

import pandas as pd

RAW_DIR = Path(__file__).resolve().parent.parent / "data" / "raw"

# Transfermarkt competition ids for the top 5 leagues.
TOP5 = {
    "GB1": "Premier League",
    "ES1": "LaLiga",
    "IT1": "Serie A",
    "L1": "Bundesliga",
    "FR1": "Ligue 1",
}


def section(title: str) -> None:
    print(f"\n=== {title} ===")


def main() -> int:
    csvs = sorted(RAW_DIR.glob("*.csv"))
    if not csvs:
        print(f"ERROR: no CSV files in {RAW_DIR}. Run pipeline/download.py first.")
        return 1

    section("Files")
    frames: dict[str, pd.DataFrame] = {}
    for f in csvs:
        df = pd.read_csv(f, low_memory=False)
        frames[f.stem] = df
        print(f"{f.stem:20s} rows={len(df):>10,}  cols={df.shape[1]}")

    section("Columns (null %)")
    for name, df in frames.items():
        nulls = (df.isna().mean() * 100).round(1)
        cols = ", ".join(f"{c}({nulls[c]}%)" for c in df.columns)
        print(f"{name}: {cols}\n")

    section("Date coverage")
    for name, df in frames.items():
        if "date" in df.columns:
            d = pd.to_datetime(df["date"], errors="coerce")
            print(f"{name:20s} {d.min()} -> {d.max()}  (unparseable: {d.isna().sum():,})")

    players = frames.get("players")
    if players is not None and "current_club_domestic_competition_id" in players.columns:
        section("Players by current league (top 5)")
        top5 = players[players["current_club_domestic_competition_id"].isin(TOP5)]
        counts = top5["current_club_domestic_competition_id"].map(TOP5).value_counts()
        print(counts.to_string())
        print(f"Total top-5 players (any season): {len(top5):,}")
        if "last_season" in players.columns:
            latest = players["last_season"].max()
            active = top5[top5["last_season"] == latest]
            print(f"Top-5 players with last_season == {latest}: {len(active):,}")
        if "market_value_in_eur" in players.columns:
            mv = top5["market_value_in_eur"]
            print(f"Top-5 players with a current market value: {mv.notna().sum():,}")

    vals = frames.get("player_valuations")
    if vals is not None and "player_id" in vals.columns:
        section("Valuation history per player")
        per_player = vals.groupby("player_id").size()
        print(per_player.describe().round(1).to_string())

    return 0


if __name__ == "__main__":
    sys.exit(main())
