"""Download the Kaggle dataset davidcariboo/player-scores into data/raw/.

Credentials are read from the KAGGLE_USERNAME and KAGGLE_KEY environment
variables (Codespaces secrets). They are never printed or written to disk.
"""
import os
import sys
from pathlib import Path

DATASET = "davidcariboo/player-scores"
RAW_DIR = Path(__file__).resolve().parent.parent / "data" / "raw"


def main() -> int:
    missing = [v for v in ("KAGGLE_USERNAME", "KAGGLE_KEY") if not os.environ.get(v)]
    if missing:
        print(f"ERROR: missing environment variable(s): {', '.join(missing)}")
        print("Add them as Codespaces secrets, then rebuild/restart the Codespace.")
        return 1

    # Imported only after the env check: importing kaggle triggers authentication.
    from kaggle.api.kaggle_api_extended import KaggleApi

    api = KaggleApi()
    api.authenticate()

    RAW_DIR.mkdir(parents=True, exist_ok=True)
    print(f"Downloading {DATASET} -> {RAW_DIR} ...")
    api.dataset_download_files(DATASET, path=str(RAW_DIR), unzip=True, quiet=False)

    csvs = sorted(RAW_DIR.glob("*.csv"))
    print(f"Done. {len(csvs)} CSV file(s):")
    for f in csvs:
        print(f"  {f.name:30s} {f.stat().st_size / 1_048_576:8.1f} MB")
    return 0 if csvs else 1


if __name__ == "__main__":
    sys.exit(main())
