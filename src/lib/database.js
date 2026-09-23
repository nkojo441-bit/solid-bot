/**
 * database.js — pluggable persistence.
 *
 * Public API (unchanged from before):
 *   store(name)         → a collection-like object with get/set/delete/all
 *   initDatabase()      → resolves the driver, returns { type, ... }
 *   dbType              → 'json' | 'mongo' | 'postgres' | 'mysql'
 *
 * Drivers are picked from DATABASE_URL:
 *   mongodb:// / mongodb+srv:// → MongoDB
 *   postgres:// / postgresql:// → PostgreSQL
 *   mysql:// / mysql2://        → MySQL
 *   anything else / empty       → local JSON in /data
 *
 * Each driver implements the same async interface:
 *   - new Store(name)
 *   - await store.get(key)
 *   - await store.set(key, value)   // value must be JSON-serializable
 *   - await store.delete(key)
 *   - await store.all()
 *
 * This means plugins never change when you swap backends.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import settings from '../../settings.js'
import { logger } from './logger.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, '..', '..', 'data')

/* ────────────────────────────────────────────────────────────────
 * Driver detection
 * ──────────────────────────────────────────────────────────────── */
export const dbType = (() => {
  const url = settings.databaseUrl || ''
  if (!url) return 'json'
  const m = url.match(/^(mongodb|mongodb\+srv|postgres|postgresql|mysql|mysql2)/i)
  if (!m) return 'json'
  const raw = m[1].toLowerCase()
  if (raw.startsWith('mongodb')) return 'mongo'
  if (raw.startsWith('postgres')) return 'postgres'
  if (raw.startsWith('mysql')) return 'mysql'
  return 'json'
})()

let _driver = null // the selected driver module (after initDatabase)

/* ────────────────────────────────────────────────────────────────
 * JSON driver (default — zero dependencies)
 * ──────────────────────────────────────────────────────────────── */
class JsonStore {
  constructor(name) {
    this.file = path.join(DATA_DIR, `${name}.json`)
    fs.mkdirSync(path.dirname(this.file), { recursive: true })
    this.data = this.#read()
  }
  #read() {
    try {
      const raw = fs.readFileSync(this.file, 'utf-8')
      return raw.trim() ? JSON.parse(raw) : {}
    } catch { return {} }
  }
  #refresh() { this.data = this.#read(); return this.data }
  #write() {
    const tmp = `${this.file}.${process.pid}.${Date.now()}.tmp`
    fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2), 'utf-8')
    fs.renameSync(tmp, this.file)
  }
  async get(key) { this.#refresh(); return this.data[key] }
  async set(key, value) { this.#refresh(); this.data[key] = value; this.#write(); return value }
  async delete(key) { this.#refresh(); delete this.data[key]; this.#write(); return true }
  async all() { this.#refresh(); return { ...this.data } }
  async close() {}
}

const jsonDriver = {
  name: 'json',
  makeStore: (name) => new JsonStore(name),
  init: async () => {
    fs.mkdirSync(DATA_DIR, { recursive: true })
    return { type: 'json', dir: DATA_DIR }
  },
  close: async () => {},
}

/* ────────────────────────────────────────────────────────────────
 * Mongo driver (optional — requires "mongodb")
 * ──────────────────────────────────────────────────────────────── */
let _mongoClient = null
let _mongoDb = null

const mongoDriver = {
  name: 'mongo',
  init: async (url) => {
    let mongodb
    try { mongodb = await import('mongodb') }
    catch { throw new Error('MongoDB requested but "mongodb" is not installed. Run: npm i mongodb') }
    const { MongoClient } = mongodb
    _mongoClient = new MongoClient(url)
    await _mongoClient.connect()
    _mongoDb = _mongoClient.db()
    // sanity check
    await _mongoDb.command({ ping: 1 })
    logger.info('[db] Connected to MongoDB')
    return { type: 'mongo' }
  },
  makeStore: (name) => {
    if (!_mongoDb) throw new Error('Mongo not initialized — call initDatabase() first.')
    const col = _mongoDb.collection(name)
    return {
      async get(key) {
        const doc = await col.findOne({ _id: key })
        return doc ? doc.v : undefined
      },
      async set(key, value) {
        await col.updateOne({ _id: key }, { $set: { v: value } }, { upsert: true })
        return value
      },
      async delete(key) {
        await col.deleteOne({ _id: key })
        return true
      },
      async all() {
        const docs = await col.find({}).toArray()
        const out = {}
        for (const d of docs) out[d._id] = d.v
        return out
      },
    }
  },
  close: async () => { if (_mongoClient) await _mongoClient.close() },
}

/* ────────────────────────────────────────────────────────────────
 * Postgres driver (optional — requires "pg")
 * ──────────────────────────────────────────────────────────────── */
let _pgPool = null

const postgresDriver = {
  name: 'postgres',
  init: async (url) => {
    let pg
    try { pg = await import('pg') }
    catch { throw new Error('PostgreSQL requested but "pg" is not installed. Run: npm i pg') }
    const { Pool } = pg.default || pg
    _pgPool = new Pool({ connectionString: url })
    await _pgPool.query('SELECT 1')
    logger.info('[db] Connected to PostgreSQL')
    return { type: 'postgres' }
  },
  makeStore: (name) => {
    if (!_pgPool) throw new Error('Postgres not initialized — call initDatabase() first.')
    const table = `kv_${name.replace(/[^a-z0-9_]/gi, '_').toLowerCase()}`
    // Lazy table creation, once per store name
    const ready = _pgPool.query(
      `CREATE TABLE IF NOT EXISTS ${table} (
        key TEXT PRIMARY KEY,
        value JSONB NOT NULL
      )`
    )
    return {
      async get(key) {
        await ready
        const r = await _pgPool.query(`SELECT value FROM ${table} WHERE key = $1`, [key])
        return r.rows[0]?.value
      },
      async set(key, value) {
        await ready
        await _pgPool.query(
          `INSERT INTO ${table} (key, value) VALUES ($1, $2)
           ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
          [key, value]
        )
        return value
      },
      async delete(key) {
        await ready
        await _pgPool.query(`DELETE FROM ${table} WHERE key = $1`, [key])
        return true
      },
      async all() {
        await ready
        const r = await _pgPool.query(`SELECT key, value FROM ${table}`)
        const out = {}
        for (const row of r.rows) out[row.key] = row.value
        return out
      },
    }
  },
  close: async () => { if (_pgPool) await _pgPool.end() },
}

/* ────────────────────────────────────────────────────────────────
 * MySQL driver (optional — requires "mysql2")
 * ──────────────────────────────────────────────────────────────── */
let _mysqlPool = null

const mysqlDriver = {
  name: 'mysql',
  init: async (url) => {
    let mysql
    try { mysql = await import('mysql2/promise') }
    catch { throw new Error('MySQL requested but "mysql2" is not installed. Run: npm i mysql2') }
    const createPool = mysql.createPool || mysql.default?.createPool
    _mysqlPool = createPool({ uri: url, waitForConnections: true, connectionLimit: 10 })
    await _mysqlPool.query('SELECT 1')
    logger.info('[db] Connected to MySQL')
    return { type: 'mysql' }
  },
  makeStore: (name) => {
    if (!_mysqlPool) throw new Error('MySQL not initialized — call initDatabase() first.')
    const table = `kv_${name.replace(/[^a-z0-9_]/gi, '_').toLowerCase()}`
    const ready = _mysqlPool.query(
      `CREATE TABLE IF NOT EXISTS \`${table}\` (
        \`key\` VARCHAR(191) PRIMARY KEY,
        \`value\` JSON NOT NULL
      )`
    )
    return {
      async get(key) {
        await ready
        const [rows] = await _mysqlPool.query(`SELECT value FROM \`${table}\` WHERE \`key\` = ?`, [key])
        return rows[0]?.value
      },
      async set(key, value) {
        await ready
        await _mysqlPool.query(
          `INSERT INTO \`${table}\` (\`key\`, \`value\`) VALUES (?, ?)
           ON DUPLICATE KEY UPDATE \`value\` = VALUES(\`value\`)`,
          [key, JSON.stringify(value)]
        )
        return value
      },
      async delete(key) {
        await ready
        await _mysqlPool.query(`DELETE FROM \`${table}\` WHERE \`key\` = ?`, [key])
        return true
      },
      async all() {
        await ready
        const [rows] = await _mysqlPool.query(`SELECT \`key\`, \`value\` FROM \`${table}\``)
        const out = {}
        for (const row of rows) out[row.key] = row.value
        return out
      },
    }
  },
  close: async () => { if (_mysqlPool) await _mysqlPool.end() },
}

/* ────────────────────────────────────────────────────────────────
 * Public API
 * ──────────────────────────────────────────────────────────────── */
const DRIVERS = {
  json: jsonDriver,
  mongo: mongoDriver,
  postgres: postgresDriver,
  mysql: mysqlDriver,
}

const _stores = new Map()

export function store(name) {
  if (!_driver) {
    // Some modules call store() at import time before the app boot completes.
    // Fall back to the safe JSON backend rather than crashing every import.
    _driver = DRIVERS[dbType] || DRIVERS.json
    if (_driver.name !== 'json') {
      logger.warn(`[db] store() called before initDatabase(); defaulting to JSON for ${name}.`)
      _driver = DRIVERS.json
    }
  }
  const key = String(name)
  if (!_stores.has(key)) _stores.set(key, _driver.makeStore(key))
  return _stores.get(key)
}

export async function initDatabase() {
  const driver = DRIVERS[dbType] || DRIVERS.json
  if (dbType !== 'json' && !settings.databaseUrl) {
    logger.warn(`[db] dbType=${dbType} but DATABASE_URL is empty — falling back to JSON.`)
    _driver = DRIVERS.json
    return _driver.init()
  }
  try {
    _driver = driver
    const info = await driver.init(settings.databaseUrl)
    logger.info(`[db] using ${info.type} storage`)
    return info
  } catch (e) {
    logger.error(`[db] ${dbType} init failed: ${e.message}`)
    logger.warn('[db] falling back to local JSON storage.')
    _driver = DRIVERS.json
    return _driver.init()
  }
}

export async function closeDatabase() {
  if (_driver) await _driver.close()
}

export function currentDriver() {
  return _driver?.name || null
}