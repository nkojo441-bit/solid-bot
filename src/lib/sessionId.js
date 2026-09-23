/**
 * lib/sessionId.js — session ID handling.
 *
 * Two formats are supported:
 *
 *   SHORT:  BEMPSX-K7M2-9XPQ     (preferred; grabbed from the session server)
 *   LONG:   BEMPSX~<gzip+base64url>   (legacy; self-contained, no server)
 *   RAW:    <plain base64 JSON>       (legacy, oldest format)
 *
 * Short IDs are looked up once at boot via SESSION_API (see settings.js) and
 * the resulting creds are cached to session/creds.json. Long and raw IDs are
 * decoded locally, no network needed.
 */
import zlib from 'zlib'

export const BEMPSX_SHORT = /^BEMPSX-[A-Z0-9]{4}-[A-Z0-9]{4}$/i
export const BEMPSX_LONG = /^BEMPSX~/

/** Normalize any user-entered variant into the canonical BEMPSX-XXXX-XXXX form. */
export function normalizeBempsXId(raw) {
  const s = String(raw || '').trim()
  const compact = s.toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (compact.startsWith('BEMPSX') && compact.length === 14) {
    const body = compact.slice(6)
    return `BEMPSX-${body.slice(0, 4)}-${body.slice(4, 8)}`
  }
  return s
}

export function isShortBempsXId(raw) {
  return BEMPSX_SHORT.test(normalizeBempsXId(raw))
}

/** Decode a self-contained legacy SESSION_ID (BEMPSX~… or raw base64). */
export function decodeBempsXSession(sessionId) {
  const s = String(sessionId || '').trim().replace(/\s+/g, '')
  if (!s) throw new Error('empty SESSION_ID')
  if (isShortBempsXId(s)) {
    throw new Error('short BEMPSX-ID must be grabbed from the session server, not decoded locally')
  }

  let json
  if (s.startsWith('BEMPSX~')) {
    const payload = s.slice('BEMPSX~'.length)
    try {
      json = zlib.gunzipSync(Buffer.from(payload, 'base64url')).toString('utf8')
    } catch {
      json = Buffer.from(payload, 'base64').toString('utf8')
    }
  } else {
    json = Buffer.from(s, 'base64').toString('utf8')
  }

  const parsed = JSON.parse(json)
  if (!parsed || typeof parsed !== 'object') throw new Error('session is not JSON')
  return JSON.stringify(parsed)
}

/**
 * Fetch creds for a short ID from the session server.
 * Retries a couple of times on network errors (but NOT on 4xx).
 */
export async function grabBempsXSession(sessionId, apiBase, { retries = 2, timeoutMs = 15000 } = {}) {
  const code = normalizeBempsXId(sessionId)
  const base = String(apiBase || '').replace(/\/+$/, '')
  if (!base) {
    throw new Error(
      'SESSION_API is not set. Add it to .env (e.g. https://your-session-server.example.com) ' +
      'so the bot can retrieve short BEMPSX-IDs.'
    )
  }

  const url = `${base}/api/grab/${encodeURIComponent(code)}`
  let lastErr

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(timeoutMs),
      })

      // Server reachable — this is a real answer, don't retry.
      if (res.status === 404) throw new Error(`Session code "${code}" not found on the session server.`)
      if (res.status === 410) throw new Error(`Session code "${code}" has expired. Create a new one.`)
      if (res.status === 400) throw new Error(`Session code "${code}" is malformed.`)

      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`Session server returned ${res.status}${text ? `: ${text.slice(0, 200)}` : ''}`)
      }

      const data = await res.json().catch(() => ({}))
      if (!data?.creds) throw new Error('Session server response was missing "creds".')

      // Server responses are already JSON strings — verify, then return.
      const parsed = JSON.parse(data.creds)
      if (!parsed || typeof parsed !== 'object') throw new Error('Grabbed session is not a JSON object.')
      return JSON.stringify(parsed)
    } catch (e) {
      lastErr = e
      // Only retry on timeouts / network errors, never on server-rejected codes.
      const retriable = /timeout|abort|network|fetch|ENOTFOUND|ECONN/i.test(e.message)
      if (!retriable || attempt === retries) break
      const backoff = 500 * Math.pow(2, attempt)
      await new Promise((r) => setTimeout(r, backoff))
    }
  }

  throw lastErr
}

/** Human-readable description of a session ID format (for diagnostics). */
export function describeSessionId(raw) {
  const s = String(raw || '').trim()
  if (!s) return 'empty'
  if (isShortBempsXId(s)) return 'short (BEMPSX-XXXX-XXXX, requires SESSION_API)'
  if (s.startsWith('BEMPSX~')) return 'long (BEMPSX~gzip, self-contained)'
  return 'legacy (raw base64 JSON, self-contained)'
}