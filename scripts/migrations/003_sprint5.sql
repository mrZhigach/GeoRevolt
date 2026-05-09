-- GeoRevolt Migration 003: Sprint 5 — Price History, Countries, Geocode, Simulated
-- Применять на PostgreSQL. Все конструкции используют IF NOT EXISTS / IF EXISTS.

-- 1. price_history (если ещё не создана через lib/db.ts)
CREATE TABLE IF NOT EXISTS price_history (
  id SERIAL PRIMARY KEY,
  market_id TEXT NOT NULL,
  timestamp BIGINT NOT NULL,
  price_yes DOUBLE PRECISION NOT NULL,
  price_no DOUBLE PRECISION NOT NULL,
  liquidity DOUBLE PRECISION
);
CREATE INDEX IF NOT EXISTS idx_price_history_market_time ON price_history(market_id, timestamp);

-- 2. allowed_countries
CREATE TABLE IF NOT EXISTS allowed_countries (
  country_code TEXT PRIMARY KEY
);

-- 3. geocode_cache
CREATE TABLE IF NOT EXISTS geocode_cache (
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  country_code TEXT NOT NULL,
  PRIMARY KEY (lat, lng)
);

-- 4. simulated колонка в markets (если отсутствует)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'markets' AND column_name = 'simulated'
  ) THEN
    ALTER TABLE markets ADD COLUMN simulated BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;
END $$;
