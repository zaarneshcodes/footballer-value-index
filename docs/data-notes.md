# Data notes

Source: Kaggle dataset `davidcariboo/player-scores` (market values from
Transfermarkt). This is the only data source; no scraping.

## How to reproduce
```bash
pip install -r pipeline/requirements.txt
python pipeline/download.py      # needs KAGGLE_USERNAME / KAGGLE_KEY secrets
python pipeline/profile_data.py
```

## Findings
_To be filled in from the real output of `profile_data.py`._

- Tables and row counts:
- Date coverage (games, valuations):
- Top-5 league player counts:
- Valuation history depth per player:
- Gaps / data quality issues:

## Decisions
_None yet._
