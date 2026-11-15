"""Train LightGBM quantile models for the 5-year market value projection.

Target: log(value in 5y / value now). Quantiles 10/50/90 give a range.
Validation: train on anchors before 2020, test on 2020-2021 anchors,
compared with a "value stays the same" baseline. Final models are refit on
all training rows. Outputs are estimates, not facts.
"""
import sys
from pathlib import Path

import lightgbm as lgb
import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
PROC, MODELS = ROOT / "data" / "processed", ROOT / "models"
QUANTILES = {"low": 0.1, "mid": 0.5, "high": 0.9}
CATS = ["position", "sub_position", "foot", "ls_league"]
NUMS = ["log_value", "log_peak", "momentum", "n_valuations_so_far", "age", "height_in_cm",
        "ls_appearances", "ls_minutes", "ls_goals", "ls_assists", "ls_yellow_cards",
        "ls_red_cards", "ls_goal_contrib_per90"]
PARAMS = dict(learning_rate=0.05, num_leaves=31, min_child_samples=50,
              bagging_fraction=0.8, bagging_freq=1, feature_fraction=0.8, verbose=-1)
SPLIT_DATE = "2020-01-01"


def prepare(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["log_value"] = np.log(df["value"])
    df["log_peak"] = np.log(df["peak_value_so_far"])
    df["momentum"] = df["log_value"] - np.log(df["value_1y_ago"])
    df["ls_goal_contrib_per90"] = ((df["ls_goals"] + df["ls_assists"])
                                   / df["ls_minutes"].where(df["ls_minutes"] > 0) * 90)
    for c in CATS:
        df[c] = df[c].astype("category")
    df["y"] = np.log(df["target_value"]) - df["log_value"]
    return df


def fit(X, y, alpha, rounds, valid=None):
    params = dict(objective="quantile", alpha=alpha, **PARAMS)
    dtrain = lgb.Dataset(X, y)
    kw = {}
    if valid is not None:
        kw = dict(valid_sets=[lgb.Dataset(*valid, reference=dtrain)],
                  callbacks=[lgb.early_stopping(50, verbose=False)])
    return lgb.train(params, dtrain, num_boost_round=rounds, **kw)


def main() -> int:
    if not (PROC / "features.parquet").exists():
        print("ERROR: run pipeline/features.py first.")
        return 1
    df = prepare(pd.read_parquet(PROC / "features.parquet"))
    train, pred = df[df["split"] == "train"], df[df["split"] == "predict"]
    X = train[NUMS + CATS]
    early = (train["date"] < SPLIT_DATE).to_numpy()
    Xa, ya, Xb, yb = X[early], train["y"][early], X[~early], train["y"][~early]
    print(f"rows: fit {len(Xa):,} | validate {len(Xb):,} (anchors >= {SPLIT_DATE})")

    # Validate.
    val_pred, best = {}, {}
    for name, q in QUANTILES.items():
        m = fit(Xa, ya, q, 2000, valid=(Xb, yb))
        best[name] = max(m.best_iteration or 100, 50)
        val_pred[name] = m.predict(Xb)
    lo, mid, hi = np.sort(np.column_stack([val_pred[k] for k in QUANTILES]), axis=1).T
    mae_model, mae_base = np.abs(yb - mid).mean(), np.abs(yb).mean()
    print(f"validation MAE (log ratio): model {mae_model:.3f} | baseline {mae_base:.3f} "
          f"| improvement {(1 - mae_model / mae_base) * 100:.1f}%")
    print(f"validation median abs % error (value): model "
          f"{np.median(np.abs(np.exp(yb - mid) - 1)) * 100:.0f}% | baseline "
          f"{np.median(np.abs(np.exp(yb) - 1)) * 100:.0f}%")
    print(f"10-90 range coverage: {((yb >= lo) & (yb <= hi)).mean() * 100:.1f}% (target ~80%)")
    print(f"best rounds: {best}")

    # Refit on all training rows and project current players.
    MODELS.mkdir(exist_ok=True)
    out = {}
    for name, q in QUANTILES.items():
        m = fit(X, train["y"], q, best[name])
        m.save_model(str(MODELS / f"value_{name}.txt"))
        out[name] = m.predict(pred[NUMS + CATS])
        if name == "mid":
            imp = pd.Series(m.feature_importance("gain"), index=NUMS + CATS)
            print("top features (mid):", ", ".join((imp.sort_values(ascending=False)
                                                   .head(6).index)))
    q = np.sort(np.column_stack([out[k] for k in QUANTILES]), axis=1)
    proj = pred[["player_id", "date", "value"]].rename(
        columns={"date": "value_date", "value": "current_value_eur"}).reset_index(drop=True)
    for i, name in enumerate(QUANTILES):
        proj[f"proj_{name}_eur"] = (proj["current_value_eur"] * np.exp(q[:, i])).round(-4)
    proj["projection_date"] = proj["value_date"] + pd.DateOffset(years=5)
    proj.to_parquet(PROC / "projections.parquet", index=False)
    ratio = proj["proj_mid_eur"] / proj["current_value_eur"]
    print(f"projections: {len(proj):,} players | median mid/current ratio {ratio.median():.2f} "
          f"| low>mid or mid>high: {((proj.proj_low_eur > proj.proj_mid_eur) | (proj.proj_mid_eur > proj.proj_high_eur)).sum()}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
