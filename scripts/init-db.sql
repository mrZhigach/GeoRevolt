-- GeoRevolt database initialization for PostgreSQL
-- This runs automatically on first startup via docker-compose

CREATE TABLE IF NOT EXISTS markets (
    id SERIAL PRIMARY KEY,
    contract_address TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT 'general',
    lng DOUBLE PRECISION NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    end_time BIGINT NOT NULL,
    resolution_time BIGINT NOT NULL,
    resolved BOOLEAN NOT NULL DEFAULT FALSE,
    outcome BOOLEAN,
    liquidity DOUBLE PRECISION NOT NULL DEFAULT 0,
    simulated BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_markets_lng_lat ON markets(lng, lat);
CREATE INDEX IF NOT EXISTS idx_markets_resolved ON markets(resolved);

CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    market_id INTEGER REFERENCES markets(id),
    event_type TEXT NOT NULL,
    data JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at DESC);

CREATE TABLE IF NOT EXISTS price_history (
    id SERIAL PRIMARY KEY,
    market_id TEXT NOT NULL,
    timestamp BIGINT NOT NULL,
    price_yes DOUBLE PRECISION NOT NULL,
    price_no DOUBLE PRECISION NOT NULL,
    liquidity DOUBLE PRECISION
);
CREATE INDEX IF NOT EXISTS idx_price_history_market_time ON price_history(market_id, timestamp);

CREATE TABLE IF NOT EXISTS allowed_countries (
    country_code TEXT PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS geocode_cache (
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    country_code TEXT NOT NULL,
    PRIMARY KEY (lat, lng)
);
