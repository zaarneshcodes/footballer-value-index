"""Build the model table: one row per player valuation (anchor date).

Target = market value ~5 years after the anchor (nearest valuation within
180 days). Rows: split="train" (target known, anchor >= 2013-07-01) and
split="predict" (latest valuation of each current site player).
Stats use the last season fully completed before the anchor (no leakage).
"""
import sys
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
RAW, PROC = ROOT / "data" / "raw", ROOT / "data" / "processed"
YEAR5, TOL = pd.Timedelta(days=1826), pd.Timedelta(days=180)
STAT_COLS = ["appearances", "minutes", "goals", "assists", "yellow_cards", "red_cards"]


def asof(left, right, left_on, right_on, tol, direction="nearest"):
    out = pd.merge_asof(left.sort_values(left_on), right.sort_values(right_on),
                        left_on=left_on, right_on=right_on, by="player_id",
                        direction=direction, tolerance=tol)
    return out


def main() -> int:
    if not (PROC / "valuations.parquet").exists():
        print("ERROR: run pipeline/clean.py first.")
        return 1
    vals = pd.read_parquet(PROC / "valuations.parquet")
    vals = vals[vals["market_value_in_eur"] > 0][["player_id", "date", "market_value_in_eur"]]
    vals = vals.rename(columns={"market_value_in_eur": "value"}).sort_values(["player_id", "date"])

    a = vals.copy()
    g = a.groupby("player_id")["value"]
    a["peak_value_so_far"] = g.cummax()
    a["n_valuations_so_far"] = g.cumcount() + 1

    # Target: value ~5y later.
    t = vals.rename(columns={"date": "target_date", "value": "target_value"})
    a["target_lookup"] = a["date"] + YEAR5
    a = asof(a, t, "target_lookup", "target_date", TOL)
    # Value ~1y earlier (momentum).
    p = vals.rename(columns={"date": "prev_date", "value": "value_1y_ago"})
    a["prev_lookup"] = a["date"] - pd.Timedelta(days=365)
    a = asof(a, p, "prev_lookup", "prev_date", pd.Timedelta(days=120))

    # Player attributes.
    bio = pd.read_csv(RAW / "players.csv", usecols=["player_id", "date_of_birth", "position",
                      "sub_position", "foot", "height_in_cm"], parse_dates=["date_of_birth"])
    a = a.merge(bio, on="player_id", how="left")
    a["age"] = (a["date"] - a["date_of_birth"]).dt.days / 365.25

    # Last completed season (seasons treated as ending by 1 June).
    a["stats_season"] = np.where(a["date"].dt.month >= 6, a["date"].dt.year - 1, a["date"].dt.year - 2)
    s = pd.read_parquet(PROC / "season_stats.parquet")
    league = (s.sort_values("minutes").groupby(["player_id", "season"])["league"].last())
    s = s.groupby(["player_id", "season"])[STAT_COLS].sum().join(league).reset_index()
    s = s.rename(columns={"season": "stats_season", **{c: f"ls_{c}" for c in STAT_COLS},
                          "league": "ls_league"})
    a = a.merge(s, on=["player_id", "stats_season"], how="left")
    a["ls_league"] = a["ls_league"].fillna("none")
    a[[f"ls_{c}" for c in STAT_COLS]] = a[[f"ls_{c}" for c in STAT_COLS]].fillna(0)

    # Split.
    site = pd.read_parquet(PROC / "players.parquet", columns=["player_id", "market_value_date"])
    is_pred = a.merge(site, left_on=["player_id", "date"],
                      right_on=["player_id", "market_value_date"], how="left",
                      indicator=True)["_merge"].eq("both").to_numpy()
    is_train = a["target_value"].notna() & (a["date"] >= "2013-07-01")
    a["split"] = np.select([is_pred, is_train], ["predict", "train"], default="drop")
    a = a[a["split"] != "drop"].drop(columns=["target_lookup", "prev_lookup", "prev_date",
                                               "date_of_birth"])
    a.to_parquet(PROC / "features.parquet", index=False)

    tr, pr = a[a["split"] == "train"], a[a["split"] == "predict"]
    print(f"train:   {len(tr):,} rows | players {tr['player_id'].nunique():,} | "
          f"anchors {tr['date'].min().date()} -> {tr['date'].max().date()}")
    print(f"predict: {len(pr):,} rows | site players {len(site):,} | dup ids {pr['player_id'].duplicated().sum()}")
    print(f"train median value {tr['value'].median():,.0f} -> 5y {tr['target_value'].median():,.0f}")
    print("null % (train):")
    print((tr.isna().mean() * 100).round(1)[lambda x: x > 0].to_string())
    return 0


if __name__ == "__main__":
    sys.exit(main())
