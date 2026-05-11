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
      simulated INTEGER NOT NULL DEFAULT 0,
      radius REAL NOT NULL DEFAULT 100,
      address TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_markets_lng_lat ON markets(lng, lat);
    CREATE INDEX IF NOT EXISTS idx_markets_lat_lng ON markets(lat, lng);
    CREATE INDEX IF NOT EXISTS idx_markets_resolved ON markets(resolved);
  `);
  try { db.exec(`ALTER TABLE markets ADD COLUMN radius REAL NOT NULL DEFAULT 100;`); } catch { /* already exists */ }
  try { db.exec(`ALTER TABLE markets ADD COLUMN address TEXT;`); } catch { /* already exists */ }
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
  db.exec(`
    CREATE TABLE IF NOT EXISTS price_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      market_id TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      price_yes REAL NOT NULL,
      price_no REAL NOT NULL,
      liquidity REAL
    );
    CREATE INDEX IF NOT EXISTS idx_price_history_market_time ON price_history(market_id, timestamp);
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS allowed_countries (
      country_code TEXT PRIMARY KEY
    );
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS geocode_cache (
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      country_code TEXT NOT NULL,
      PRIMARY KEY (lat, lng)
    );
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
      simulated BOOLEAN NOT NULL DEFAULT FALSE,
      radius DOUBLE PRECISION NOT NULL DEFAULT 100,
      address TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_markets_lng_lat ON markets(lng, lat);
    CREATE INDEX IF NOT EXISTS idx_markets_lat_lng ON markets(lat, lng);
    CREATE INDEX IF NOT EXISTS idx_markets_resolved ON markets(resolved);
  `);
  await pool.query(`ALTER TABLE markets ADD COLUMN IF NOT EXISTS radius DOUBLE PRECISION NOT NULL DEFAULT 100;`);
  await pool.query(`ALTER TABLE markets ADD COLUMN IF NOT EXISTS address TEXT;`);
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
  await pool.query(`
    CREATE TABLE IF NOT EXISTS price_history (
      id SERIAL PRIMARY KEY,
      market_id TEXT NOT NULL,
      timestamp BIGINT NOT NULL,
      price_yes DOUBLE PRECISION NOT NULL,
      price_no DOUBLE PRECISION NOT NULL,
      liquidity DOUBLE PRECISION
    );
    CREATE INDEX IF NOT EXISTS idx_price_history_market_time ON price_history(market_id, timestamp);
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS allowed_countries (
      country_code TEXT PRIMARY KEY
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS geocode_cache (
      lat DOUBLE PRECISION NOT NULL,
      lng DOUBLE PRECISION NOT NULL,
      country_code TEXT NOT NULL,
      PRIMARY KEY (lat, lng)
    );
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
    simulated: usePostgres() ? row.simulated : Boolean(row.simulated),
    radius: Number(row.radius ?? 100),
    address: row.address ?? null,
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
  simulated: boolean;
  radius: number;
  address: string | null;
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
  simulated?: boolean;
  radius?: number;
  address?: string | null;
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
      `INSERT INTO markets (contract_address, name, description, category, lng, lat, end_time, resolution_time, liquidity, simulated, radius, address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
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
        input.simulated ?? false,
        input.radius ?? 100,
        input.address ?? null,
      ]
    );
    return normalizeRow(result.rows[0]);
  }
  const db = await getSqliteDb();
  const stmt = db.prepare(`
    INSERT INTO markets (contract_address, name, description, category, lng, lat, end_time, resolution_time, liquidity, simulated, radius, address)
    VALUES (@contract_address, @name, @description, @category, @lng, @lat, @end_time, @resolution_time, @liquidity, @simulated, @radius, @address)
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
    simulated: input.simulated ? 1 : 0,
    radius: input.radius ?? 100,
    address: input.address ?? null,
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
        simulated: m.simulated,
        radius: m.radius,
        address: m.address,
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

export interface PriceSnapshot {
  id: number;
  market_id: string;
  timestamp: number;
  price_yes: number;
  price_no: number;
  liquidity: number | null;
}

export async function getMarketByContractAddress(contractAddress: string): Promise<Market | undefined> {
  if (usePostgres()) {
    const pool = await getPgPool();
    const result = await pool.query('SELECT * FROM markets WHERE contract_address = $1', [contractAddress]);
    return result.rows.length ? normalizeRow(result.rows[0]) : undefined;
  }
  const db = await getSqliteDb();
  const row = db.prepare('SELECT * FROM markets WHERE contract_address = ?').get(contractAddress) as DBRow | undefined;
  return row ? normalizeRow(row) : undefined;
}

export async function savePriceSnapshot(
  marketId: string,
  priceYes: number,
  priceNo: number,
  liquidity: number | null = null
): Promise<PriceSnapshot> {
  const now = Math.floor(Date.now() / 1000);
  if (usePostgres()) {
    const pool = await getPgPool();
    const result = await pool.query(
      `INSERT INTO price_history (market_id, timestamp, price_yes, price_no, liquidity)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [marketId, now, priceYes, priceNo, liquidity]
    );
    return normalizePriceSnapshot(result.rows[0]);
  }
  const db = await getSqliteDb();
  const stmt = db.prepare(`
    INSERT INTO price_history (market_id, timestamp, price_yes, price_no, liquidity)
    VALUES (?, ?, ?, ?, ?)
  `);
  stmt.run(marketId, now, priceYes, priceNo, liquidity);
  const row = db.prepare('SELECT * FROM price_history WHERE id = last_insert_rowid()').get() as DBRow;
  return normalizePriceSnapshot(row);
}

export async function getPriceHistory(
  marketId: string,
  limit: number = 100
): Promise<PriceSnapshot[]> {
  if (usePostgres()) {
    const pool = await getPgPool();
    const result = await pool.query(
      'SELECT * FROM price_history WHERE market_id = $1 ORDER BY timestamp DESC LIMIT $2',
      [marketId, limit]
    );
    return result.rows.map(normalizePriceSnapshot);
  }
  const db = await getSqliteDb();
  const rows = db.prepare(
    'SELECT * FROM price_history WHERE market_id = ? ORDER BY timestamp DESC LIMIT ?'
  ).all(marketId, limit) as DBRow[];
  return rows.map(normalizePriceSnapshot);
}

function normalizePriceSnapshot(row: DBRow): PriceSnapshot {
  return {
    id: row.id,
    market_id: row.market_id,
    timestamp: Number(row.timestamp),
    price_yes: Number(row.price_yes),
    price_no: Number(row.price_no),
    liquidity: row.liquidity === null ? null : Number(row.liquidity),
  };
}

export interface AdminStats {
  totalMarkets: number;
  totalLiquidityUSDC: number;
  activeMarkets: number;
  resolvedMarkets: number;
  topMarketsByLiquidity: { name: string; liquidity: number }[];
  liquidityByCategory: Record<string, number>;
}

export async function getAdminStats(): Promise<AdminStats> {
  if (usePostgres()) {
    const pool = await getPgPool();
    // Single aggregated query for counts + sums + top markets + category breakdown
    const aggQuery = `
      SELECT
        (SELECT COUNT(*) FROM markets)::int AS total_markets,
        (SELECT COALESCE(SUM(liquidity), 0) FROM markets) AS total_liquidity,
        (SELECT COUNT(*) FROM markets WHERE resolved = false AND end_time > EXTRACT(EPOCH FROM NOW()))::int AS active_markets,
        (SELECT COUNT(*) FROM markets WHERE resolved = true)::int AS resolved_markets
    `;
    const aggResult = (await pool.query(aggQuery)).rows[0];
    const topRows = (await pool.query('SELECT name, liquidity FROM markets ORDER BY liquidity DESC LIMIT 5')).rows;
    const catRows = (await pool.query('SELECT category, SUM(liquidity)::float AS s FROM markets GROUP BY category ORDER BY s DESC')).rows;
    const liquidityByCategory: Record<string, number> = {};
    for (const r of catRows) liquidityByCategory[r.category] = Number(r.s);
    return {
      totalMarkets: Number(aggResult.total_markets),
      totalLiquidityUSDC: Number(aggResult.total_liquidity),
      activeMarkets: Number(aggResult.active_markets),
      resolvedMarkets: Number(aggResult.resolved_markets),
      topMarketsByLiquidity: topRows.map((r: any) => ({ name: r.name, liquidity: Number(r.liquidity) })),
      liquidityByCategory,
    };
  }
  const db = await getSqliteDb();
  const now = Date.now() / 1000;
  // Single query with sub-selects for SQLite (avoids 4 separate round-trips)
  const aggRow = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM markets) AS total_markets,
      (SELECT COALESCE(SUM(liquidity), 0) FROM markets) AS total_liquidity,
      (SELECT COUNT(*) FROM markets WHERE resolved = 0 AND end_time > ?) AS active_markets,
      (SELECT COUNT(*) FROM markets WHERE resolved = 1) AS resolved_markets
  `).get(now) as any;
  const topRows = db.prepare('SELECT name, liquidity FROM markets ORDER BY liquidity DESC LIMIT 5').all() as any[];
  const catRows = db.prepare('SELECT category, SUM(liquidity) as s FROM markets GROUP BY category ORDER BY s DESC').all() as any[];
  const liquidityByCategory: Record<string, number> = {};
  for (const r of catRows) liquidityByCategory[r.category] = Number(r.s);
  return {
    totalMarkets: aggRow.total_markets as number,
    totalLiquidityUSDC: aggRow.total_liquidity as number,
    activeMarkets: aggRow.active_markets as number,
    resolvedMarkets: aggRow.resolved_markets as number,
    topMarketsByLiquidity: topRows.map((r: any) => ({ name: r.name, liquidity: Number(r.liquidity) })),
    liquidityByCategory,
  };
}

export interface AdminMarketsQuery {
  status?: 'open' | 'closed' | 'resolved';
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface AdminMarketsResult {
  markets: Market[];
  total: number;
  page: number;
  limit: number;
}

export async function getAdminMarkets(query: AdminMarketsQuery): Promise<AdminMarketsResult> {
  const conditions: string[] = [];
  const params: any[] = [];
  let paramIdx = 1;

  if (query.status === 'resolved') {
    conditions.push('resolved = ' + (usePostgres() ? 'TRUE' : '1'));
  } else if (query.status === 'open') {
    if (usePostgres()) {
      conditions.push('resolved = FALSE AND end_time > EXTRACT(EPOCH FROM NOW())');
    } else {
      conditions.push('resolved = 0 AND end_time > ?');
      params.push(Date.now() / 1000);
    }
  } else if (query.status === 'closed') {
    if (usePostgres()) {
      conditions.push('resolved = FALSE AND end_time <= EXTRACT(EPOCH FROM NOW())');
    } else {
      conditions.push('resolved = 0 AND end_time <= ?');
      params.push(Date.now() / 1000);
    }
  }

  if (query.category) {
    conditions.push('category = ' + (usePostgres() ? `$${paramIdx++}` : '?'));
    params.push(query.category);
  }

  if (query.search) {
    conditions.push('name LIKE ' + (usePostgres() ? `$${paramIdx++}` : '?'));
    params.push(`%${query.search}%`);
  }

  const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
  const page = query.page ?? 1;
  const limit = query.limit ?? 10;
  const offset = (page - 1) * limit;

  if (usePostgres()) {
    const pool = await getPgPool();
    const countResult = await pool.query(`SELECT COUNT(*) as c FROM markets ${where}`, params);
    const total = Number(countResult.rows[0].c);
    const result = await pool.query(
      `SELECT * FROM markets ${where} ORDER BY created_at DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...params, limit, offset]
    );
    return { markets: result.rows.map(normalizeRow), total, page, limit };
  }
  const db = await getSqliteDb();
  const countRow = db.prepare(`SELECT COUNT(*) as c FROM markets ${where}`).get(...params) as any;
  const total = countRow.c as number;
  const rows = db.prepare(`SELECT * FROM markets ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`).all(...params, limit, offset) as DBRow[];
  return { markets: rows.map(normalizeRow), total, page, limit };
}

export async function getAllowedCountries(): Promise<string[]> {
  if (usePostgres()) {
    const pool = await getPgPool();
    const result = await pool.query('SELECT country_code FROM allowed_countries ORDER BY country_code');
    return result.rows.map((r: any) => r.country_code);
  }
  const db = await getSqliteDb();
  const rows = db.prepare('SELECT country_code FROM allowed_countries ORDER BY country_code').all() as any[];
  return rows.map((r: any) => r.country_code);
}

export async function setAllowedCountries(countries: string[]): Promise<void> {
  if (usePostgres()) {
    const pool = await getPgPool();
    await pool.query('DELETE FROM allowed_countries');
    for (const code of countries) {
      await pool.query('INSERT INTO allowed_countries (country_code) VALUES ($1)', [code.toUpperCase()]);
    }
    return;
  }
  const db = await getSqliteDb();
  db.prepare('DELETE FROM allowed_countries').run();
  const stmt = db.prepare('INSERT INTO allowed_countries (country_code) VALUES (?)');
  for (const code of countries) {
    stmt.run(code.toUpperCase());
  }
}

export async function getCountryCodeFromCache(lat: number, lng: number): Promise<string | null> {
  const roundedLat = Math.round(lat * 100) / 100;
  const roundedLng = Math.round(lng * 100) / 100;
  if (usePostgres()) {
    const pool = await getPgPool();
    const result = await pool.query(
      'SELECT country_code FROM geocode_cache WHERE lat = $1 AND lng = $2',
      [roundedLat, roundedLng]
    );
    return result.rows.length > 0 ? result.rows[0].country_code : null;
  }
  const db = await getSqliteDb();
  const row = db.prepare('SELECT country_code FROM geocode_cache WHERE lat = ? AND lng = ?').get(roundedLat, roundedLng) as any;
  return row ? row.country_code : null;
}

export async function cacheCountryCode(lat: number, lng: number, countryCode: string): Promise<void> {
  const roundedLat = Math.round(lat * 100) / 100;
  const roundedLng = Math.round(lng * 100) / 100;
  if (usePostgres()) {
    const pool = await getPgPool();
    await pool.query(
      `INSERT INTO geocode_cache (lat, lng, country_code) VALUES ($1, $2, $3)
       ON CONFLICT (lat, lng) DO UPDATE SET country_code = $3`,
      [roundedLat, roundedLng, countryCode]
    );
    return;
  }
  const db = await getSqliteDb();
  db.prepare('INSERT OR REPLACE INTO geocode_cache (lat, lng, country_code) VALUES (?, ?, ?)').run(roundedLat, roundedLng, countryCode);
}

export async function getCountryCode(lat: number, lng: number): Promise<string> {
  const cached = await getCountryCodeFromCache(lat, lng);
  if (cached) return cached;

  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`,
      { signal: AbortSignal.timeout(3000) }
    );
    if (res.ok) {
      const data = await res.json();
      const code = (data.countryCode || 'XX') as string;
      await cacheCountryCode(lat, lng, code);
      return code;
    }
  } catch {
    // geocoding failed, return unknown
  }

  await cacheCountryCode(lat, lng, 'XX');
  return 'XX';
}

export async function isCountryAllowed(countryCode: string): Promise<boolean> {
  const allowed = await getAllowedCountries();
  if (allowed.length === 0) return true;
  return allowed.includes(countryCode);
}

export async function closeDb() {
  if (pgPool) {
    await pgPool.end();
    pgPool = null;
  }
}
