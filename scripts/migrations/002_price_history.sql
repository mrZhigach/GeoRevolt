-- GeoRevolt Migration 002: Price History
-- Добавляет таблицу для хранения снимков цен YES/NO

CREATE TABLE IF NOT EXISTS price_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  market_id TEXT NOT NULL,      -- contract address
  timestamp INTEGER NOT NULL,   -- unix seconds
  price_yes REAL NOT NULL,      -- цена YES в USDC
  price_no REAL NOT NULL,       -- цена NO в USDC
  liquidity REAL                -- зафиксированная ликвидность
);
CREATE INDEX IF NOT EXISTS idx_price_history_market_time ON price_history(market_id, timestamp);
