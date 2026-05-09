import path from 'path';
import { Pool } from 'pg';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'data', 'georevolt.db');
const DATABASE_URL = process.env.DATABASE_URL || '';

type DBRow = Record<string, any>;

function usePostgres(): boolean {
  return !!DATABASE_URL;
}

let pgPool: Pool | null = null;
let sqliteDb: any = null;

async function getPgPool(): Promise<Pool> {
  if (!pgPool) {
    const { default: pg } = await import('pg');
    pgPool = new pg.Pool({ connectionString: DATABASE_URL });
    await initPgSchema(pgPool);
  }
  return pgPool;
}

let sqliteUnavailable = false;

async function getSqliteDb(): Promise<any> {
  if (sqliteUnavailable) throw new Error('SQLite unavailable');
  if (!sqliteDb) {
    const Database = (await import('better-sqlite3').catch(() => {
      sqliteUnavailable = true;
      throw new Error('better-sqlite3 not available in this environment');
    })).default;
    sqliteDb = new Database(DB_PATH);
    sqliteDb.pragma('journal_mode = WAL');
    sqliteDb.pragma('foreign_keys = ON');
    initSqliteSchema(sqliteDb);
  }
  return sqliteDb;
}

export async function getDb(): Promise<any> {
  return usePostgres() ? getPgPool() : getSqliteDb();
}

export async function isDbAvailable(): Promise<boolean> {
  try {
    await getDb();
    return true;
  } catch {
    return false;
  }
}

function initSqliteSchema(db: any) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS markets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contract_address TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT 'general',
      lng REAL NOT NULL,
      lat REAL NOT NULL,
      end_time INTEGER NOT NULL,
      resolution_time INTEGER NOT NULL,
      resolved INTEGER NOT NULL DEFAULT 0,
      outcome INTEGER,
      liquidity REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_markets_lng_lat ON markets(lng, lat);
    CREATE INDEX IF NOT EXISTS idx_markets_resolved ON markets(resolved);
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      market_id INTEGER,
      event_type TEXT NOT NULL,
      data TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at DESC);
  `);
}

async function initPgSchema(pool: Pool) {
  await pool.query(`
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
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_markets_lng_lat ON markets(lng, lat);
    CREATE INDEX IF NOT EXISTS idx_markets_resolved ON markets(resolved);
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS events (
      id SERIAL PRIMARY KEY,
      market_id INTEGER REFERENCES markets(id),
      event_type TEXT NOT NULL,
      data JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at DESC);
  `);
}

function normalizeRow(row: DBRow): Market {
  return {
    id: row.id,
    contract_address: row.contract_address,
    name: row.name,
    description: row.description,
    category: row.category,
    lng: row.lng,
    lat: row.lat,
    end_time: row.end_time,
    resolution_time: row.resolution_time,
    resolved: usePostgres() ? row.resolved : Boolean(row.resolved),
    outcome: row.outcome === null ? null : Boolean(row.outcome),
    liquidity: Number(row.liquidity ?? 0),
    created_at: row.created_at,
  };
}

export interface Market {
  id: number;
  contract_address: string;
  name: string;
  description: string;
  category: string;
  lng: number;
  lat: number;
  end_time: number;
  resolution_time: number;
  resolved: boolean;
  outcome: boolean | null;
  liquidity: number;
  created_at: string;
}

export interface AppEvent {
  id: number;
  market_id: number | null;
  event_type: string;
  data: Record<string, any>;
  created_at: string;
}

export interface CreateMarketInput {
  contract_address: string;
  name: string;
  description?: string;
  category?: string;
  lng: number;
  lat: number;
  end_time: number;
  resolution_time: number;
  liquidity?: number;
}

export async function getAllMarkets(): Promise<Market[]> {
  if (usePostgres()) {
    const pool = await getPgPool();
    const result = await pool.query('SELECT * FROM markets ORDER BY created_at DESC');
    return result.rows.map(normalizeRow);
  }
  const db = await getSqliteDb();
  const rows = db.prepare('SELECT * FROM markets ORDER BY created_at DESC').all() as DBRow[];
  return rows.map(normalizeRow);
}

export async function getMarketById(id: number): Promise<Market | undefined> {
  if (usePostgres()) {
    const pool = await getPgPool();
    const result = await pool.query('SELECT * FROM markets WHERE id = $1', [id]);
    return result.rows.length ? normalizeRow(result.rows[0]) : undefined;
  }
  const db = await getSqliteDb();
  const row = db.prepare('SELECT * FROM markets WHERE id = ?').get(id) as DBRow | undefined;
  return row ? normalizeRow(row) : undefined;
}

export async function createMarket(input: CreateMarketInput): Promise<Market> {
  if (usePostgres()) {
    const pool = await getPgPool();
    const result = await pool.query(
      `INSERT INTO markets (contract_address, name, description, category, lng, lat, end_time, resolution_time, liquidity)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        input.contract_address,
        input.name,
        input.description ?? '',
        input.category ?? 'general',
        input.lng,
        input.lat,
        input.end_time,
        input.resolution_time,
        input.liquidity ?? 200,
      ]
    );
    return normalizeRow(result.rows[0]);
  }
  const db = await getSqliteDb();
  const stmt = db.prepare(`
    INSERT INTO markets (contract_address, name, description, category, lng, lat, end_time, resolution_time, liquidity)
    VALUES (@contract_address, @name, @description, @category, @lng, @lat, @end_time, @resolution_time, @liquidity)
  `);
  const result = stmt.run({
    contract_address: input.contract_address,
    name: input.name,
    description: input.description ?? '',
    category: input.category ?? 'general',
    lng: input.lng,
    lat: input.lat,
    end_time: input.end_time,
    resolution_time: input.resolution_time,
    liquidity: input.liquidity ?? 200,
  });
  return (await getMarketById(result.lastInsertRowid as number)) as Market;
}

export async function updateMarketLiquidity(id: number, liquidity: number): Promise<Market | undefined> {
  if (usePostgres()) {
    const pool = await getPgPool();
    await pool.query('UPDATE markets SET liquidity = $1 WHERE id = $2', [liquidity, id]);
    return getMarketById(id);
  }
  const db = await getSqliteDb();
  db.prepare('UPDATE markets SET liquidity = ? WHERE id = ?').run(liquidity, id);
  return getMarketById(id);
}

export async function resolveMarket(id: number, outcome: boolean): Promise<Market | undefined> {
  if (usePostgres()) {
    const pool = await getPgPool();
    await pool.query('UPDATE markets SET resolved = TRUE, outcome = $1 WHERE id = $2', [outcome, id]);
    return getMarketById(id);
  }
  const db = await getSqliteDb();
  db.prepare('UPDATE markets SET resolved = 1, outcome = ? WHERE id = ?').run(outcome ? 1 : 0, id);
  return getMarketById(id);
}

export function toGeoJSON(markets: Market[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: markets.map((m) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [m.lng, m.lat] },
      properties: {
        id: m.id,
        contract_address: m.contract_address,
        name: m.name,
        description: m.description,
        category: m.category,
        status: m.resolved ? 'resolved' : Date.now() / 1000 > m.end_time ? 'closed' : 'open',
        end_time: m.end_time,
        resolution_time: m.resolution_time,
        resolved: m.resolved,
        outcome: m.outcome,
        liquidity: m.liquidity,
      },
    })),
  };
}

export async function getRecentEvents(limit: number = 20): Promise<AppEvent[]> {
  if (usePostgres()) {
    const pool = await getPgPool();
    const result = await pool.query(
      'SELECT * FROM events ORDER BY created_at DESC LIMIT $1', [limit]
    );
    return result.rows.map(normalizeEventRow);
  }
  const db = await getSqliteDb();
  const rows = db.prepare('SELECT * FROM events ORDER BY created_at DESC LIMIT ?').all(limit) as DBRow[];
  return rows.map(normalizeEventRow);
}

export async function createEvent(event: Omit<AppEvent, 'id' | 'created_at'>): Promise<AppEvent> {
  if (usePostgres()) {
    const pool = await getPgPool();
    const result = await pool.query(
      `INSERT INTO events (market_id, event_type, data)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [event.market_id, event.event_type, JSON.stringify(event.data)]
    );
    return normalizeEventRow(result.rows[0]);
  }
  const db = await getSqliteDb();
  const stmt = db.prepare(`
    INSERT INTO events (market_id, event_type, data)
    VALUES (?, ?, ?)
  `);
  const result = stmt.run(event.market_id, event.event_type, JSON.stringify(event.data));
  return (await getEventById(result.lastInsertRowid as number)) as AppEvent;
}

function normalizeEventRow(row: DBRow): AppEvent {
  return {
    id: row.id,
    market_id: row.market_id,
    event_type: row.event_type,
    data: typeof row.data === 'string' ? JSON.parse(row.data) : row.data,
    created_at: row.created_at,
  };
}

async function getEventById(id: number): Promise<AppEvent | undefined> {
  if (usePostgres()) {
    const pool = await getPgPool();
    const result = await pool.query('SELECT * FROM events WHERE id = $1', [id]);
    return result.rows.length ? normalizeEventRow(result.rows[0]) : undefined;
  }
  const db = await getSqliteDb();
  const row = db.prepare('SELECT * FROM events WHERE id = ?').get(id) as DBRow | undefined;
  return row ? normalizeEventRow(row) : undefined;
}

export async function closeDb() {
  if (pgPool) {
    await pgPool.end();
    pgPool = null;
  }
}
