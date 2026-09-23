/**
 * apis/gateway.js — ONE central media/download gateway.
 *
 * This is the "give my users one key" design.
 *
 *   • The bot OWNER (BEMPSX) runs a single gateway server (see
 *     servers/gateway.js) that holds the real upstream keys (YouTube,
 *     TikTok, Instagram, Twitter, Spotify, MediaFire, Google Drive, ...).
 *   • Anyone who FORKS the repo only pastes ONE value — the shared gateway
 *     key — in their .env (BOT_API_KEY). No signups, no per-user keys.
 *
 * This module is the only place the bot talks to the gateway, so if the
 * contract ever changes you edit it here. If no key is set, callers get an
 * honest "set BOT_API_KEY" reply — nothing is ever faked.
 */
import { secrets } from '../lib/secrets.js'
import { logger } from '../lib/logger.js'

/** Base URL of the gateway. Defaults to the owner's, overridable in .env. */
export const GATEWAY_BASE =
  (process.env.GATEWAY_URL || secrets.gatewayUrl || '').replace(/\/$/, '')

/** The single shared key every fork/user pastes once. */
export const gatewayKey = () => process.env.BOT_API_KEY || secrets.botApiKey || ''

/** True if the gateway is configured (base + key). */
export function gatewayReady() {
  return Boolean(GATEWAY_BASE && gatewayKey())
}

export function missingGatewayMessage() {
  return '⚠️ This feature needs the BEMPSX gateway.\nAdd `BOT_API_KEY=<your key>` (and `GATEWAY_URL` if not default) to .env — the key the repo owner gives you. One key unlocks every downloader.'
}

/**
 * Ask the gateway to fetch a media item for a service.
 *
 * @param {string} service  e.g. 'youtube', 'tiktok', 'instagram', 'twitter',
 *                          'spotify', 'facebook', 'mediafire', 'gdrive', 'shazam'
 * @param {object} opts     { url, query, type } — forwarded verbatim.
 * @returns {Promise<object>}
 *    On success: { ok:true, kind:'media', data:{ type, url, mimetype, fileName, caption?, buffer? } }
 *    On upstream error: { ok:false, msg }
 */
export async function gatewayFetch(service, opts = {}) {
  if (!gatewayReady()) return { ok: false, msg: missingGatewayMessage(), code: 'NO_KEY' }
  try {
    const target = new URL(`${GATEWAY_BASE}/api/${encodeURIComponent(service)}`)
    if (opts.url) target.searchParams.set('url', opts.url)
    if (opts.query) target.searchParams.set('q', opts.query)
    for (const [k, v] of Object.entries(opts.params || {})) target.searchParams.set(k, v)

    const res = await fetch(target, {
      headers: { 'x-gateway-key': gatewayKey(), Accept: 'application/json' },
      signal: AbortSignal.timeout(120_000),
    })

    // The gateway returns JSON { ok, ... } contract.
    const body = await res.json().catch(() => null)
    const decodeBuffers = (value) => {
      if (!value || typeof value !== 'object') return value
      if (value.__buffer === true && typeof value.base64 === 'string') return Buffer.from(value.base64, 'base64')
      if (value.type === 'Buffer' && Array.isArray(value.data)) return Buffer.from(value.data)
      if (Array.isArray(value)) return value.map(decodeBuffers)
      for (const [k, v] of Object.entries(value)) value[k] = decodeBuffers(v)
      return value
    }
    if (body && typeof body.ok === 'boolean') {
      if (body.ok) return decodeBuffers(body)
      return { ok: false, msg: body.msg || `Gateway refused (${res.status}).` }
    }

    // Non-JSON (raw media passed through) — treat as an image/file.
    if (res.ok && !body) {
      const buf = Buffer.from(await res.arrayBuffer())
      return { ok: true, kind: 'media', data: { type: opts.type || 'image', buffer: buf, mimetype: res.headers.get('content-type') || '' } }
    }

    if (!res.ok) return { ok: false, msg: `Gateway error ${res.status}.` }
    return { ok: true, kind: 'media', data: body.data || body }
  } catch (e) {
    logger.warn(`[gateway] ${service} failed: ${e.message}`)
    return { ok: false, msg: `Gateway unreachable (${e.message}).` }
  }
}

/** Convenience: expect a media result on success. */
export async function gatewayMedia(service, opts = {}) {
  const r = await gatewayFetch(service, opts)
  if (r.ok && r.data?.url) {
    // Some providers hand back a URL rather than raw bytes — fetch it.
    try {
      const m = await fetch(r.data.url)
      if (m.ok) return { ok: true, data: { ...r.data, buffer: Buffer.from(await m.arrayBuffer()) } }
    } catch {}
  }
  return r
}
