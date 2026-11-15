"""Sanity check: projected 5y value / current value, by age band."""
from pathlib import Path

import pandas as pd

PROC = Path(__file__).resolve().parent.parent / "data" / "processed"
proj = pd.read_parquet(PROC / "projections.parquet")
age = pd.read_parquet(PROC / "features.parquet").query("split == 'predict'")[["player_id", "age"]]
p = proj.merge(age, on="player_id")
p["mid_ratio"] = p["proj_mid_eur"] / p["current_value_eur"]
p["high_ratio"] = p["proj_high_eur"] / p["current_value_eur"]
bands = pd.cut(p["age"], [0, 21, 24, 27, 30, 45])
print(p.groupby(bands, observed=True)[["mid_ratio", "high_ratio"]]
      .agg(["count", "median"]).round(2).to_string())
