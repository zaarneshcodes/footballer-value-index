"""Load processed parquet files into Neon Postgres.

Usage:
    python pipeline/load_db.py --dry-run   # prepare + validate data, no DB connection
    python pipeline/load_db.py             # load into EMPTY tables (refuses if any have rows)
    python pipeline/load_db.py --replace   # empty the 4 tables and reload (one transaction)

Reads the connection string only from the DATABASE_URL environment variable
and never prints it. Valuations and season stats are filtered to site players.
"""
import argparse
import os
import re
import sys
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
PROC = ROOT / "data" / "processed"
SCHEMA = Path(__file__).resolve().parent / "schema.sql"

# Load order matters (foreign keys -> players first).
TABLES = ["players", "valuations", "season_stats", "projections"]
INT_COLS = {
    "players": ["market_value_in_eur", "highest_market_value_in_eur"],
    "projections": ["proj_low_eur", "proj_mid_eur", "proj_high_eur"],
}


def prepare() -> dict[str, pd.DataFrame]:
    frames = {t: pd.read_parquet(PROC / f"{t}.parquet") for t in TABLES}
    ids = set(frames["players"]["player_id"])
    for t in ["valuations", "season_stats", "projections"]:
        frames[t] = frames[t][frames[t]["player_id"].isin(ids)].reset_index(drop=True)
    for t, cols in INT_COLS.items():
        for c in cols:
            frames[t][c] = frames[t][c].round().astype("Int64")
    return frames


def rows(df: pd.DataFrame):
    """Yield tuples with NaN/NaT -> None, timestamps -> date, numpy -> Python."""
    date_cols = {c for c in df.columns if pd.api.types.is_datetime64_any_dtype(df[c])}
    obj = df.astype(object).where(df.notna(), None)
    for rec in obj.itertuples(index=False, name=None):
        yield tuple(
            (v.date() if c in date_cols and v is not None else
             v.item() if hasattr(v, "item") else v)
            for c, v in zip(df.columns, rec)
        )


def redact(msg: str) -> str:
    return re.sub(r"(postgres(?:ql)?://)[^@\s]+@", r"\1***@", msg)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true", help="validate data only, no DB")
    ap.add_argument("--replace", action="store_true",
                    help="TRUNCATE the 4 tables before loading (deletes existing rows)")
    args = ap.parse_args()

    frames = prepare()
    for t, df in frames.items():
        print(f"prepared {t:<13} {len(df):>8,} rows")
    if args.dry_run:
        # Exercise the row conversion without a DB.
        for t, df in frames.items():
            n = sum(1 for _ in rows(df))
            assert n == len(df), t
        print("dry run OK (no database contacted)")
        return 0

    url = os.environ.get("DATABASE_URL")
    if not url:
        print("ERROR: DATABASE_URL is not set (add it as a Codespaces secret).")
        return 1

    import psycopg  # imported here so --dry-run works without it

    try:
        with psycopg.connect(url, connect_timeout=15) as conn:
            with conn.cursor() as cur:
                cur.execute(SCHEMA.read_text())
                counts = {}
                for t in TABLES:
                    cur.execute(f"SELECT count(*) FROM {t}")
                    counts[t] = cur.fetchone()[0]
                if any(counts.values()):
                    if not args.replace:
                        print(f"ERROR: tables already have rows {counts}. "
                              "Re-run with --replace to empty and reload them.")
                        return 1
                    cur.execute("TRUNCATE " + ", ".join(TABLES))
                    print("truncated existing rows (inside the load transaction)")
                for t in TABLES:
                    df = frames[t]
                    cols = ", ".join(df.columns)
                    with cur.copy(f"COPY {t} ({cols}) FROM STDIN") as cp:
                        for r in rows(df):
                            cp.write_row(r)

            # Still the same transaction: counts below see the new rows.
            ok = True
            with conn.cursor() as cur:
                for t in TABLES:
                    cur.execute(f"SELECT count(*) FROM {t}")
                    n = cur.fetchone()[0]
                    match = n == len(frames[t])
                    ok &= match
                    print(f"db {t:<13} {n:>8,} rows | parquet {len(frames[t]):>8,} | "
                          f"{'OK' if match else 'MISMATCH'}")
                cur.execute("SELECT pg_size_pretty(pg_database_size(current_database()))")
            if not ok:
                conn.rollback()
                print("ERROR: count mismatch, rolled back (previous data kept).")
                return 1
            conn.commit()
            with conn.cursor() as cur:
                cur.execute("SELECT pg_size_pretty(pg_database_size(current_database()))")
                print(f"committed. database size: {cur.fetchone()[0]}")
    except psycopg.Error as e:
        print("DB ERROR:", redact(str(e)))
        return 1
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
