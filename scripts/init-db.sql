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
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_markets_lng_lat ON markets(lng, lat);
CREATE INDEX IF NOT EXISTS idx_markets_resolved ON markets(resolved);
