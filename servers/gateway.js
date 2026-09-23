/**
 * servers/gateway.js — the BEMPSX-NOVA GATEWAY (deploy ONCE, serve everyone).
 *
 * Run:  GATEWAY_KEY=super-secret-shared-key node servers/gateway.js
 * Call: GET <GATEWAY_URL>/api/<service>?url=<...>|q=<...>
 *       header: x-gateway-key: <BOT_API_KEY>
 * Returns JSON: { ok:true, data:{ type, buffer?(base64), url?, mimetype?, caption?, fileName? } }
 *            or { ok:false, msg:"reason" }
 *
 * Requires yt-dlp on PATH (https://github.com/yt-dlp/yt-dlp).
 * ffmpeg optional for audio extraction.
 */
import http from 'http'
import { execFile } from 'child_process'
import { promisify } from 'util'
import crypto from 'crypto'
import dns from 'dns/promises'
import net from 'net'

const run = promisify(execFile)
const PORT = Number(process.env.GATEWAY_PORT || process.env.PORT || 8021)
const SHARED_KEY = process.env.GATEWAY_KEY || process.env.BOT_API_KEY || ''
if (!SHARED_KEY) {
  throw new Error('GATEWAY_KEY or BOT_API_KEY must be set before starting the gateway.')
}

/** Pull a media file into a Buffer by streaming yt-dlp to stdout. */
async function ytdlpDownload(url, { audio = false, format } = {}) {
  const args = ['--no-playlist', '--no-warnings']
  if (audio) args.push('-x', '--audio-format', 'mp3', '--audio-quality', '0')
  else args.push('-f', format || 'best[height<=720]/best')
  args.push('-o', '-', url)
  const { stdout } = await run('yt-dlp', args, { maxBuffer: 256 * 1024 * 1024, encoding: 'buffer' })
  return Buffer.isBuffer(stdout) ? stdout : Buffer.from(stdout)
}

async function ytdlpMeta(url) {
  const { stdout } = await run('yt-dlp', ['--no-warnings', '-J', url], { maxBuffer: 16 * 1024 * 1024 })
  return JSON.parse(stdout || '{}')
}

const handlers = {
  youtube: async ({ url, type }) => {
    const audio = type === 'audio'
    return {
      ok: true,
      data: {
        type: audio ? 'audio' : 'video',
        buffer: await ytdlpDownload(url, { audio }),
        mimetype: audio ? 'audio/mp4' : 'video/mp4',
        fileName: audio ? 'audio.mp3' : 'video.mp4',
      },
    }
  },
  tiktok:    async ({ url }) => ({ ok: true, data: { type: 'video', buffer: await ytdlpDownload(url), mimetype: 'video/mp4' } }),
  instagram: async ({ url }) => ({ ok: true, data: { type: 'video', buffer: await ytdlpDownload(url), mimetype: 'video/mp4' } }),
  twitter:   async ({ url }) => ({ ok: true, data: { type: 'video', buffer: await ytdlpDownload(url), mimetype: 'video/mp4' } }),
  facebook:  async ({ url }) => ({ ok: true, data: { type: 'video', buffer: await ytdlpDownload(url), mimetype: 'video/mp4' } }),
  pint:      async ({ url }) => ({ ok: true, data: { type: 'image', buffer: await ytdlpDownload(url), mimetype: 'image/jpeg' } }),

  spotify: async ({ url }) => {
    // Spotify needs metadata-only via yt-dlp unless you wire a real helper.
    try {
      const meta = await ytdlpMeta(url)
      return { ok: true, data: { type: 'image', url: meta.thumbnail || '', caption: `🎵 ${meta.title || url}` } }
    } catch {
      return { ok: false, msg: 'Spotify extraction needs a helper key. Wire your own in the gateway.' }
    }
  },

  mediafire: async ({ url }) => {
    try {
      const j = await ytdlpMeta(url)
      return { ok: true, data: { type: 'file', url: j.url || url, fileName: j.title || 'download', caption: j.title || '' } }
    } catch {
      return { ok: false, msg: 'MediaFire extraction failed (bad or expired link?).' }
    }
  },

  gdrive: async ({ url }) => {
    try {
      const j = await ytdlpMeta(url)
      return { ok: true, data: { type: 'file', url: j.url || url, fileName: j.title || 'file', caption: j.title || '' } }
    } catch {
      return { ok: false, msg: 'Google Drive extraction failed (file may be private or too large).' }
    }
  },

  // Honest: no real backend wired yet.
  apk:    async () => ({ ok: false, msg: 'APK search needs an app-store API. Wire one in the gateway to enable.' }),
  shazam: async () => ({ ok: false, msg: 'Shazam needs the audio uploaded; wire a recognition API in the gateway.' }),
}

/* ── rate limit ──────────────────────────────────────────────── */
const RATE_WINDOW = 60_000
const RATE_LIMIT = Math.max(1, Number(process.env.GATEWAY_RATE_LIMIT || 30))
const rate = new Map()
const MAX_RATE_ENTRIES = 10_000
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

function sameSecret(a, b) {
  if (typeof a !== 'string' || !a || a.length !== b.length) return false
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))
}

/* ── SSRF protection ─────────────────────────────────────────── */
async function isSafeHttpUrl(value) {
  try {
    const u = new URL(value)
    if (!['http:', 'https:'].includes(u.protocol)) return false
    if (u.username || u.password) return false
    const host = u.hostname.replace(/^\[|\]$/g, '').toLowerCase()
    if (host === 'localhost' || host.endsWith('.localhost') || host === 'metadata.google.internal') return false
    if (net.isIP(host)) return !isPrivateIp(host)
    const addresses = await dns.lookup(host, { all: true, verbatim: true })
    return addresses.length > 0 && addresses.every(({ address }) => !isPrivateIp(address))
  } catch {
    return false
  }
}

function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number)
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127)
  }
  if (net.isIPv6(ip)) {
    const v = ip.toLowerCase()
    return v === '::1' || v === '::' || v.startsWith('fc') || v.startsWith('fd') ||
      v.startsWith('fe8') || v.startsWith('fe9') || v.startsWith('fea') || v.startsWith('feb')
  }
  return true
}

/* ── JSON with Buffer support ────────────────────────────────── */
function jsonSafe(value) {
  const encode = (v) => {
    if (Buffer.isBuffer(v)) return { __buffer: true, base64: v.toString('base64') }
    if (Array.isArray(v)) return v.map(encode)
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, encode(x)]))
    return v
  }
  return JSON.stringify(encode(value))
}

/* ── server ──────────────────────────────────────────────────── */
const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, `http://${req.headers.host}`)
  const auth = req.headers['x-gateway-key']

  res.setHeader('Access-Control-Allow-Origin', process.env.GATEWAY_CORS_ORIGIN || 'null')
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Referrer-Policy', 'no-referrer')
  res.setHeader('Access-Control-Allow-Headers', 'x-gateway-key, content-type')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')

  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end() }
  if (req.method !== 'GET') {
    res.writeHead(405, { Allow: 'GET, OPTIONS', 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ ok: false, msg: 'Method not allowed.' }))
  }

  // Public endpoints (no key needed)
  if (u.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ status: 'ok', service: 'bempsx-gateway', services: Object.keys(handlers) }))
  }
  if (u.pathname === '/' || u.pathname === '/api') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ ok: true, services: Object.keys(handlers) }))
  }

  if (!sameSecret(auth, SHARED_KEY)) {
    res.writeHead(401, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ ok: false, msg: 'Invalid gateway key.' }))
  }

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown'
  if (!allowed(ip)) {
    res.writeHead(429, { 'Content-Type': 'application/json', 'Retry-After': '60' })
    return res.end(JSON.stringify({ ok: false, msg: 'Gateway rate limit exceeded. Try again shortly.' }))
  }

  const m = u.pathname.match(/^\/api\/([a-z]+)$/)
  if (!m) {
    res.writeHead(404, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ ok: false, msg: 'Not found.' }))
  }

  const service = m[1]
  const handler = handlers[service]
  if (!handler) {
    res.writeHead(404, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ ok: false, msg: `Unknown service ${service}.` }))
  }

  const requestedUrl = u.searchParams.get('url')
  if (requestedUrl && !(await isSafeHttpUrl(requestedUrl))) {
    res.writeHead(400, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ ok: false, msg: 'Only public http/https URLs are supported.' }))
  }

  try {
    const result = await handler({
      url: requestedUrl,
      q: u.searchParams.get('q'),
      type: u.searchParams.get('type'),
    })
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(jsonSafe(result))
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: false, msg: `Gateway request failed: ${e.message}` }))
  }
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ BEMPSX gateway listening on :${PORT}`)
  console.log(`   Shared key: ${SHARED_KEY === 'change-me' ? 'UNSET — set GATEWAY_KEY' : 'set ✓'}`)
  console.log(`   Services: ${Object.keys(handlers).join(', ')}`)
})