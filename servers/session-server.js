/**
 * servers/session-server.js — BEMPSX-NOVA session custody server.
 *
 * Deploy this ONCE (separate from the bot). It stores session credentials
 * keyed by short public codes like:
 *
 *     BEMPSX-K7M2-9XPQ
 *
 * Users pair their WhatsApp once on a "helper" client, POST the creds here,
 * get back a short code, and then paste that code as SESSION_ID into any bot
 * deployment. The bot calls GET /api/grab/:code to retrieve them.
 *
 * ── Run ─────────────────────────────────────────────────────────
 *   ADMIN_TOKEN=long-random-string \
 *   PORT=8022 \
 *   DATABASE_URL=            # optional; empty = local JSON in /data/sessions
 *   node servers/session-server.js
 *
 * ── Security model ──────────────────────────────────────────────
 *   • POST /api/save    requires x-admin-token (the ADMIN_TOKEN above).
 *   • GET  /api/grab/:code  is public but rate-limited, and codes are
 *                            short-random so they're hard to brute-force.
 *   • Codes expire after CODE_TTL_DAYS (default 30) and can be deleted
 *     with DELETE /api/revoke/:code (admin).
 *   • Creds are stored as opaque JSON; the server never inspects them.
 *
 * ── Endpoints ───────────────────────────────────────────────────
 *   GET  /health                    → { status: 'ok' }
 *   POST /api/save                  body: { creds: string } → { code }
 *   GET  /api/grab/:code            → { creds: string }
 *   DELETE /api/revoke/:code        → { ok: true }   (admin)
 *   GET  /api/list                  → { codes: string[] } (admin)
 */

import http from 'http'
import crypto from 'crypto'
import 'dotenv/config'

// ── config ────────────────────────────────────────────────────
const PORT = Number(process.env.SESSION_PORT || process.env.PORT || 8022)
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || ''
const CODE_TTL_DAYS = Number(process.env.CODE_TTL_DAYS || 30)
const RATE_WINDOW = 60_000
const RATE_LIMIT = Number(process.env.SESSION_RATE_LIMIT || 60)
const MAX_CREDS_BYTES = 64 * 1024 // 64 KB — creds.json is ~1 KB
const MAX_REQ_BYTES = 128 * 1024

if (!ADMIN_TOKEN || ADMIN_TOKEN.length < 16) {
  console.error('❌ ADMIN_TOKEN must be set and at least 16 chars. Generate one with:')
  console.error("   node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"")
  process.exit(1)
}

// ── database (reuses the bot's driver abstraction) ────────────
// We import the bot's database.js so all four backends work identically.
// The store name 'sessions' keeps session codes separate from bot data.
process.env.SESSION_SERVER_MODE = '1' // marker so database.js can skip bot-only init if needed
const { store, initDatabase } = await import('../src/lib/database.js')

let sessionsStore = null

// ── code generation ───────────────────────────────────────────
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no 0/O/1/I/L
function randomCode() {
  const bytes = crypto.randomBytes(8)
  const chars = [...bytes].map((b) => CODE_ALPHABET[b % CODE_ALPHABET.length])
  return `BEMPSX-${chars.slice(0, 4).join('')}-${chars.slice(4, 8).join('')}`
}

function normalizeCode(raw) {
  const s = String(raw || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (s.startsWith('BEMPSX') && s.length === 14) {
    return `BEMPSX-${s.slice(6, 10)}-${s.slice(10, 14)}`
  }
  return s
}

// ── rate limit (per IP, in-memory) ────────────────────────────
const rate = new Map()
const MAX_RATE_ENTRIES = 5000
function allowed(ip) {
  const now = Date.now()
  if (rate.size > MAX_RATE_ENTRIES) {
    for (const [key, row] of rate) if (now - row.started >= RATE_WINDOW) rate.delete(key)
    if (rate.size > MAX_RATE_ENTRIES) return false
  }
  const row = rate.get(ip)
  if (!row || now - row.started >= RATE_WINDOW) {
    rate.set(ip, { started: now, count: 1 })
    return true
  }
  row.count += 1
  return row.count <= RATE_LIMIT
}

// ── helpers ───────────────────────────────────────────────────
function sameSecret(a, b) {
  if (typeof a !== 'string' || !a || a.length !== b.length) return false
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))
}

async function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let total = 0
    req.on('data', (chunk) => {
      total += chunk.length
      if (total > MAX_REQ_BYTES) {
        reject(new Error('Request body too large.'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8') || '{}'
        resolve(JSON.parse(raw))
      } catch {
        reject(new Error('Invalid JSON body.'))
      }
    })
    req.on('error', reject)
  })
}

function isExpired(entry) {
  if (!entry?.createdAt) return false
  const ttlMs = CODE_TTL_DAYS * 24 * 3600 * 1000
  return Date.now() - entry.createdAt > ttlMs
}

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
  res.end(JSON.stringify(body))
}

// ── endpoints ─────────────────────────────────────────────────

/** POST /api/save  body: { creds: string } → { code } */
async function handleSave(req, res) {
  if (!sameSecret(req.headers['x-admin-token'], ADMIN_TOKEN)) {
    return json(res, 401, { ok: false, msg: 'Invalid admin token.' })
  }

  let body
  try { body = await readJsonBody(req) }
  catch (e) { return json(res, 400, { ok: false, msg: e.message }) }

  const creds = String(body?.creds || '').trim()
  if (!creds) return json(res, 400, { ok: false, msg: 'Missing "creds" field.' })
  if (creds.length > MAX_CREDS_BYTES) {
    return json(res, 413, { ok: false, msg: `Creds exceed ${MAX_CREDS_BYTES} bytes.` })
  }

  // Validate it's real JSON so we never store garbage.
  let parsed
  try { parsed = JSON.parse(creds) }
  catch { return json(res, 400, { ok: false, msg: 'Creds must be valid JSON.' }) }
  if (!parsed || typeof parsed !== 'object') {
    return json(res, 400, { ok: false, msg: 'Creds must be a JSON object.' })
  }

  // Generate a unique code (retry a few times on collision).
  let code, tries = 0
  while (tries++ < 8) {
    code = randomCode()
    const existing = await sessionsStore.get(code)
    if (!existing) break
  }
  if (tries >= 8) return json(res, 500, { ok: false, msg: 'Could not allocate a unique code.' })

  await sessionsStore.set(code, {
    creds: JSON.stringify(parsed),
    createdAt: Date.now(),
  })

  console.log(`[session] saved ${code} (${creds.length} bytes)`)
  return json(res, 200, { ok: true, code })
}

/** GET /api/grab/:code → { creds } */
async function handleGrab(req, res, code) {
  const normalized = normalizeCode(code)
  if (!/^BEMPSX-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(normalized)) {
    return json(res, 400, { ok: false, error: 'Invalid session code format.' })
  }

  const entry = await sessionsStore.get(normalized)
  if (!entry) {
    return json(res, 404, { ok: false, error: 'Session code not found or expired.' })
  }
  if (isExpired(entry)) {
    await sessionsStore.delete(normalized)
    return json(res, 410, { ok: false, error: 'Session code expired.' })
  }

  console.log(`[session] grabbed ${normalized}`)
  return json(res, 200, { creds: entry.creds })
}

/** DELETE /api/revoke/:code */
async function handleRevoke(req, res, code) {
  if (!sameSecret(req.headers['x-admin-token'], ADMIN_TOKEN)) {
    return json(res, 401, { ok: false, msg: 'Invalid admin token.' })
  }
  const normalized = normalizeCode(code)
  await sessionsStore.delete(normalized)
  console.log(`[session] revoked ${normalized}`)
  return json(res, 200, { ok: true })
}

/** GET /api/list  (admin) */
async function handleList(req, res) {
  if (!sameSecret(req.headers['x-admin-token'], ADMIN_TOKEN)) {
    return json(res, 401, { ok: false, msg: 'Invalid admin token.' })
  }
  const all = await sessionsStore.all()
  const codes = Object.entries(all)
    .filter(([, v]) => v && v.creds && !isExpired(v))
    .map(([k, v]) => ({ code: k, createdAt: v.createdAt, ageDays: Math.floor((Date.now() - v.createdAt) / 86400e3) }))
  return json(res, 200, { ok: true, codes })
}

// ── server ────────────────────────────────────────────────────
async function main() {
  const info = await initDatabase()
  console.log(`[session] Database: ${info.type}${info.warning ? ` (${info.warning})` : ''}`)

  // Dedicated store so session codes don't mix with bot data.
  sessionsStore = store('sessions')

  const server = http.createServer(async (req, res) => {
    const u = new URL(req.url, `http://${req.headers.host}`)

    // CORS + security headers
    res.setHeader('Access-Control-Allow-Origin', process.env.SESSION_CORS_ORIGIN || 'null')
    res.setHeader('Access-Control-Allow-Headers', 'content-type, x-admin-token')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Referrer-Policy', 'no-referrer')

    if (req.method === 'OPTIONS') { res.writeHead(204); return res.end() }

    // IP for rate-limit; trust x-forwarded-for from a reverse proxy.
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown'

    // ── public health ──
    if (u.pathname === '/health' && req.method === 'GET') {
      return json(res, 200, { status: 'ok', service: 'bempsx-session' })
    }

    // ── rate-limited routes ──
    if (u.pathname.startsWith('/api/')) {
      if (!allowed(ip)) {
        res.writeHead(429, { 'Retry-After': '60' })
        return res.end(JSON.stringify({ ok: false, msg: 'Rate limit exceeded.' }))
      }
    }

    try {
      // GET /api/grab/:code
      const grabMatch = u.pathname.match(/^\/api\/grab\/([^/]+)$/)
      if (grabMatch && req.method === 'GET') {
        return await handleGrab(req, res, decodeURIComponent(grabMatch[1]))
      }

      // POST /api/save
      if (u.pathname === '/api/save' && req.method === 'POST') {
        return await handleSave(req, res)
      }

      // DELETE /api/revoke/:code
      const revokeMatch = u.pathname.match(/^\/api\/revoke\/([^/]+)$/)
      if (revokeMatch && req.method === 'DELETE') {
        return await handleRevoke(req, res, decodeURIComponent(revokeMatch[1]))
      }

      // GET /api/list
      if (u.pathname === '/api/list' && req.method === 'GET') {
        return await handleList(req, res)
      }

      // Fallthrough
      return json(res, 404, { ok: false, msg: 'Not found.' })
    } catch (e) {
      console.error('[session] handler error:', e)
      return json(res, 500, { ok: false, msg: 'Internal server error.' })
    }
  })

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ BEMPSX session server listening on :${PORT}`)
    console.log(`   Code TTL:   ${CODE_TTL_DAYS} days`)
    console.log(`   Rate limit: ${RATE_LIMIT} req/min/IP`)
  })
}

main().catch((e) => {
  console.error('Fatal:', e.message)
  process.exit(1)
})