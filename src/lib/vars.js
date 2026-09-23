/**
 * lib/vars.js — runtime configuration.
 *
 * Lets the owner change settings live (no .env, no redeploy). Values persist
 * in the local store (or Mongo when DATABASE_URL is set), overriding the .env
 * defaults at runtime. Unknown keys are rejected honestly.
 */
import { store } from './database.js'
import settings from '../../settings.js'

const db = store('vars')

/** The settings this system controls, with validation. */
export const SCHEMA = {
  PREFIX: { type: 'string' },
  MODE: { type: 'enum', values: ['public', 'private', 'group', 'inbox'] },
  BOT_NAME: { type: 'string' },
  WELCOME: { type: 'bool' },
  ANTI_LINK: { type: 'bool' },
  AUTO_READ: { type: 'bool' },
  ANTI_SPAM: { type: 'bool' },
  OWNER_NUMBER: { type: 'number' },
}

function currentDefault(key) {
  const map = {
    PREFIX: settings.prefix, MODE: 'public', BOT_NAME: settings.botName,
    WELCOME: settings.welcome, ANTI_LINK: settings.antiLink,
    AUTO_READ: settings.autoRead, ANTI_SPAM: false, OWNER_NUMBER: settings.ownerNumber,
  }
  return map[key]
}

function coerce(key, raw) {
  if (!(key in SCHEMA)) throw new Error(`Unknown setting: ${key}. Valid: ${Object.keys(SCHEMA).join(', ')}`)
  const sch = SCHEMA[key]
  if (sch.type === 'enum' && !sch.values.includes(raw.toLowerCase()))
    throw new Error(`Value must be one of: ${sch.values.join('/')}`)
  if (sch.type === 'bool') return ['1', 'true', 'on', 'yes'].includes(String(raw).toLowerCase())
  if (sch.type === 'number') return String(raw).replace(/\D/g, '')
  return String(raw)
}

export async function getVar(key) {
  const k = key.toUpperCase()
  const stored = await db.get(k)
  return stored === undefined ? currentDefault(k) : stored
}

const SETTINGS_FIELDS = {
  PREFIX: 'prefix',
  MODE: 'mode',
  BOT_NAME: 'botName',
  WELCOME: 'welcome',
  ANTI_LINK: 'antiLink',
  AUTO_READ: 'autoRead',
  OWNER_NUMBER: 'ownerNumber',
}

function applyRuntimeValue(key, value) {
  const field = SETTINGS_FIELDS[key]
  if (!field) return
  settings[field] = key === 'OWNER_NUMBER'
    ? String(value).replace(/\D/g, '')
    : value
  if (key === 'OWNER_NUMBER') process.env.OWNER_NUMBER = settings[field]
  else if (key === 'PREFIX') process.env.PREFIX = String(value)
}

export async function setVar(key, value) {
  const k = key.toUpperCase()
  const coerced = coerce(k, value)
  await db.set(k, coerced)
  applyRuntimeValue(k, coerced)
  return coerced
}

export async function delVar(key) {
  const k = key.toUpperCase()
  await db.delete(k)
  const def = currentDefault(k)
  applyRuntimeValue(k, def)
  return def
}

export async function allVars() {
  const overrides = await db.all()
  return Object.keys(SCHEMA).map((k) => ({
    key: k,
    value: overrides[k] !== undefined ? overrides[k] : currentDefault(k),
    source: overrides[k] !== undefined ? 'db' : 'env',
  }))
}

export async function hydrateRuntimeVars() {
  const overrides = await db.all()
  for (const [key, value] of Object.entries(overrides)) applyRuntimeValue(key, value)
  return overrides
}

/** Current effective value (checks runtime override then default). */
export async function getEffective(key) {
  const k = key.toUpperCase()
  const v = await getVar(k)
  const map = { PREFIX: 'prefix', MODE: 'mode', BOT_NAME: 'botName', WELCOME: 'welcome', ANTI_LINK: 'antiLink', AUTO_READ: 'autoRead', OWNER_NUMBER: 'ownerNumber' }
  return { key: k, value: v, field: map[k] }
}
