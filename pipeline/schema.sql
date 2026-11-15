-- Footballer Value Index: Postgres schema (Neon).
-- Column names match data/processed/*.parquet. Market values come from
-- Transfermarkt via the Kaggle dataset davidcariboo/player-scores.
-- Safe to re-run: only creates what is missing.

CREATE TABLE IF NOT EXISTS players (
    player_id                            BIGINT PRIMARY KEY,
    name                                 TEXT NOT NULL,
    last_season                          INTEGER NOT NULL,
    current_club_id                      BIGINT NOT NULL,
    country_of_citizenship               TEXT,
    date_of_birth                        DATE,
    sub_position                         TEXT,
    position                             TEXT,
    foot                                 TEXT,
    height_in_cm                         REAL,
    contract_expiration_date             DATE,
    current_club_domestic_competition_id TEXT NOT NULL,
    current_club_name                    TEXT,
    market_value_in_eur                  BIGINT NOT NULL,
    highest_market_value_in_eur          BIGINT,
    league                               TEXT NOT NULL,
    market_value_date                    DATE NOT NULL
);

CREATE TABLE IF NOT EXISTS valuations (
    player_id           BIGINT NOT NULL REFERENCES players (player_id),
    date                DATE NOT NULL,
    market_value_in_eur BIGINT NOT NULL,
    current_club_id     BIGINT,
    current_club_name   TEXT,
    PRIMARY KEY (player_id, date)
);

CREATE TABLE IF NOT EXISTS season_stats (
    player_id      BIGINT NOT NULL REFERENCES players (player_id),
    season         INTEGER NOT NULL,
    competition_id TEXT NOT NULL,
    appearances    INTEGER NOT NULL,
    minutes        INTEGER NOT NULL,
    goals          INTEGER NOT NULL,
    assists        INTEGER NOT NULL,
    yellow_cards   INTEGER NOT NULL,
    red_cards      INTEGER NOT NULL,
    league         TEXT NOT NULL,
    PRIMARY KEY (player_id, season, competition_id)
);

-- Model estimates (LightGBM 10/50/90 quantiles), not facts.
CREATE TABLE IF NOT EXISTS projections (
    player_id         BIGINT PRIMARY KEY REFERENCES players (player_id),
    value_date        DATE NOT NULL,
    current_value_eur BIGINT NOT NULL,
    proj_low_eur      BIGINT NOT NULL,
    proj_mid_eur      BIGINT NOT NULL,
    proj_high_eur     BIGINT NOT NULL,
    projection_date   DATE NOT NULL,
    CHECK (proj_low_eur <= proj_mid_eur AND proj_mid_eur <= proj_high_eur)
);

CREATE INDEX IF NOT EXISTS players_league_idx ON players (league);
CREATE INDEX IF NOT EXISTS players_name_idx ON players (lower(name));
