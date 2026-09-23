/**
 * apis/downloader.js — unified media downloader.
 *
 * Two backends, one API:
 *   1. BEMPSX GATEWAY — used first when GATEWAY_URL + BOT_API_KEY are set.
 *      The owner hosts it once; every fork pastes ONE key and gets every
 *      service. Cheaper on the bot's CPU and works for services yt-dlp can't
 *      (e.g. Spotify metadata, future paid extras).
 *   2. LOCAL yt-dlp  — used as a fallback (and by default when no gateway is
 *      configured). Free, keyless, already bundled via scripts/setup.js.
 *
 * Nothing is faked. If both paths fail, the caller gets a message that says
 * exactly why (and what to install/configure to fix it).
 */
import { extractMedia, isAvailable, missingMessage } from '../lib/extractor.js'
import { gatewayFetch, gatewayReady, missingGatewayMessage } from './gateway.js'
import { logger } from '../lib/logger.js'

/**
 * Service registry.
 *   gatewayId : name used when calling the gateway (may differ from the
 *               command name; e.g. the .pint command hits /api/pint)
 *   localId   : how to interpret the input when falling back to yt-dlp
 *               ('url' = pass through, null = cannot be done locally)
 *   audio     : prefer audio output by default
 *   kind      : hint to sendMedia() when the gateway returns a URL only
 */
const SERVICES = {
  youtube:   { gatewayId: 'youtube',   localId: 'url', audio: false, kind: 'video' },
  ytaudio:   { gatewayId: 'youtube',   localId: 'url', audio: true,  kind: 'audio' },
  tiktok:    { gatewayId: 'tiktok',    localId: 'url', audio: false, kind: 'video' },
  instagram: { gatewayId: 'instagram', localId: 'url', audio: false, kind: 'video' },
  twitter:   { gatewayId: 'twitter',   localId: 'url', audio: false, kind: 'video' },
  facebook:  { gatewayId: 'facebook',  localId: 'url', audio: false, kind: 'video' },
  pint:      { gatewayId: 'pint',      localId: 'url', audio: false, kind: 'image' },
  mediafire: { gatewayId: 'mediafire', localId: 'url', audio: false, kind: 'file'  },
  gdrive:    { gatewayId: 'gdrive',    localId: 'url', audio: false, kind: 'file'  },
  spotify:   { gatewayId: 'spotify',   localId: null,  audio: true,  kind: 'audio' },
  apk:       { gatewayId: 'apk',       localId: null,  audio: false, kind: 'file'  },
  shazam:    { gatewayId: 'shazam',    localId: null,  audio: true,  kind: 'audio' },
}

/** True if this service is known to the downloader. */
export function downloaderEnabled(service) {
  return Boolean(SERVICES[service])
}

/** Which backends are available right now (for diagnostics). */
export async function backends() {
  return {
    gateway: gatewayReady(),
    local: await isAvailable(),
  }
}

/**
 * Honest message when nothing can service the request.
 * Explains BOTH options so the user knows what to fix.
 */
export function missingKeyMessage(service) {
  const s = SERVICES[service]
  const lines = []
  if (!gatewayReady()) lines.push('• Gateway: add `GATEWAY_URL` + `BOT_API_KEY` to .env (one key, all services).')
  if (!s || s.localId !== null) lines.push('• Local: run `node scripts/setup.js` once to fetch yt-dlp (free, no key).')
  else lines.push(`• \`${service}\` needs the gateway — yt-dlp cannot do this service.`)
  return `⚠️ *${service}* is not available right now.\n\nTo enable it:\n${lines.join('\n')}`
}

/* ────────────────────────────────────────────────────────────────
 * Gateway result → downloader result
 * ──────────────────────────────────────────────────────────────── */

/** Normalize a gateway response into the { type, buffer|url, mimetype, ... } shape. */
function normalizeGatewayData(raw, fallbackKind) {
  if (!raw) return null
  const type = raw.type || fallbackKind || 'video'
  const out = {
    type,
    mimetype: raw.mimetype || defaultMime(type),
    fileName: raw.fileName || defaultFileName(type),
    caption: raw.caption || '',
  }
  if (raw.buffer) out.buffer = raw.buffer
  else if (raw.url) out.url = raw.url
  else return null
  return out
}

function defaultMime(type) {
  return {
    video: 'video/mp4',
    audio: 'audio/mp4',
    image: 'image/jpeg',
    file: 'application/octet-stream',
    text: 'text/plain',
  }[type] || 'application/octet-stream'
}

function defaultFileName(type) {
  return {
    video: 'video.mp4',
    audio: 'audio.mp3',
    image: 'image.jpg',
    file: 'download.bin',
  }[type] || 'download.bin'
}

/* ────────────────────────────────────────────────────────────────
 * Public API
 * ──────────────────────────────────────────────────────────────── */

/**
 * Download via the best available backend.
 *
 * @param {string} service   key from SERVICES
 * @param {object} ctx       the plugin ctx (must have ctx.args)
 * @param {object} [opts]    { audio?: boolean, forceBackend?: 'gateway'|'local' }
 * @returns {Promise<{ok:boolean, data?:object, msg?:string, via?:string}>}
 */
export async function download(service, ctx, opts = {}) {
  const svc = SERVICES[service]
  if (!svc) return { ok: false, msg: `Unknown service: ${service}` }

  const q = (ctx?.args || []).join(' ').trim()
  if (!q) return { ok: false, msg: `Give me a ${service} link or query.` }

  const wantAudio = opts.audio ?? svc.audio
  const useAudio = Boolean(wantAudio) || service === 'spotify' || service === 'ytaudio'

  // ── 1. Gateway (preferred when configured) ─────────────────────
  if (opts.forceBackend !== 'local' && gatewayReady()) {
    try {
      const r = await gatewayFetch(svc.gatewayId, {
        url: isProbablyUrl(q) ? q : undefined,
        query: isProbablyUrl(q) ? undefined : q,
        params: useAudio ? { type: 'audio' } : {},
      })
      if (r.ok) {
        const data = normalizeGatewayData(r.data, svc.kind)
        if (data) return { ok: true, data, via: 'gateway' }
        logger.warn(`[downloader] gateway returned ok:true but no usable data for ${service}`)
      } else {
        logger.warn(`[downloader] gateway refused ${service}: ${r.msg}`)
      }
    } catch (e) {
      logger.warn(`[downloader] gateway threw for ${service}: ${e.message}`)
    }
  }

  // ── 2. Local yt-dlp fallback (only if the service supports it) ──
  if (opts.forceBackend !== 'gateway' && svc.localId !== null) {
    try {
      const local = await extractMedia(q, { audio: useAudio })
      if (local.ok) {
        return { ok: true, data: { ...local.data, type: local.data.type || svc.kind }, via: 'local' }
      }
      logger.warn(`[downloader] yt-dlp failed for ${service}: ${local.msg}`)
    } catch (e) {
      logger.warn(`[downloader] yt-dlp threw for ${service}: ${e.message}`)
    }
  }

  // ── 3. Both failed ─────────────────────────────────────────────
  return { ok: false, msg: missingKeyMessage(service) }
}

/** Cheap URL check — avoids sending plain text as a "url" param. */
function isProbablyUrl(s) {
  return /^https?:\/\//i.test(String(s))
}

/* ────────────────────────────────────────────────────────────────
 * Sending
 * ──────────────────────────────────────────────────────────────── */

/** Send a resolved media payload to a WhatsApp chat. */
export async function sendMedia(sock, jid, data) {
  const type = data.type || 'video'
  const send = {}
  const buf = data.buffer

  if (type === 'text') {
    if (data.caption) {
      await sock.sendMessage(jid, { text: String(data.caption) })
      return { ok: true }
    }
    return { ok: false, msg: 'No text resolved.' }
  }

  // ── Buffer path ──
  if (buf) {
    if (type === 'audio') {
      send.audio = buf
      send.mimetype = data.mimetype || 'audio/mp4'
      send.fileName = data.fileName || 'media.mp3'
    } else if (type === 'image') {
      send.image = buf
      send.caption = data.caption || ''
    } else if (type === 'file' || type === 'document') {
      send.document = buf
      send.fileName = data.fileName || 'download.bin'
      send.mimetype = data.mimetype || 'application/octet-stream'
      send.caption = data.caption || ''
    } else {
      send.video = buf
      send.caption = data.caption || ''
      send.mimetype = data.mimetype || 'video/mp4'
    }
  // ── URL path (gateway returned a link) ──
  } else if (data.url) {
    if (type === 'file' || type === 'document') {
      send.document = { url: data.url }
      send.fileName = data.fileName || 'download.bin'
      send.mimetype = data.mimetype || 'application/octet-stream'
      send.caption = data.caption || ''
    } else {
      const field = type === 'audio' ? 'audio' : type === 'image' ? 'image' : 'video'
      send[field] = { url: data.url }
      if (type !== 'audio') send.caption = data.caption || ''
    }
  } else {
    return { ok: false, msg: 'No media resolved.' }
  }

  await sock.sendMessage(jid, send)
  return { ok: true }
}

export { isAvailable, gatewayReady }