-- GeoRevolt Migration 004: Sprint 6 — Radius, Indexes, Address
-- Применять на PostgreSQL. Все конструкции используют IF NOT EXISTS / IF EXISTS.

-- 1. radius колонка в markets (метры, по умолчанию 100)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'markets' AND column_name = 'radius'
  ) THEN
    ALTER TABLE markets ADD COLUMN radius DOUBLE PRECISION NOT NULL DEFAULT 100;
  END IF;
END $$;

-- 2. address колонка в markets (если ещё не добавлена)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'markets' AND column_name = 'address'
  ) THEN
    ALTER TABLE markets ADD COLUMN address TEXT;
  END IF;
END $$;

-- 3. Дополнительный индекс (lat, lng) для геопространственных запросов
CREATE INDEX IF NOT EXISTS idx_markets_lat_lng ON markets(lat, lng);
