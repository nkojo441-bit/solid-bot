/**
 * socket.js — the Baileys engine.
 *
 * Owns the connection: builds the socket, persists session auth, and
 * handles the full lifecycle (QR, pairing code, reconnect on drop,
 * logged-out). Handlers for actual messages live in src/handlers and are
 * wired in by index.js.
 */
import fs from 'fs'
import path from 'path'
import qrcode from 'qrcode-terminal'
import { fileURLToPath } from 'url'
import {
  makeWASocket,
  useMultiFileAuthState,
  makeCacheableSignalKeyStore,
  DisconnectReason,
  Browsers,
  jidNormalizedUser,
} from 'baileys'
import { Boom } from '@hapi/boom'
import settings from '../../settings.js'
import { logger } from '../lib/logger.js'
import {
  decodeBempsXSession,
  grabBempsXSession,
  isShortBempsXId,
  describeSessionId,
} from '../lib/sessionId.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const SESSION_DIR = path.join(__dirname, '..', '..', 'session')

/**
 * Resolve SESSION_ID into session/creds.json (once).
 *
 * Resolution order:
 *   1. If session/creds.json already exists → leave it alone.
 *   2. If SESSION_ID is short (BEMPSX-XXXX-XXXX) → fetch from SESSION_API.
 *   3. Otherwise → decode locally (legacy long/raw format).
 *
 * Failures are logged but never fatal: pairing can still run without SESSION_ID.
 */
async function hydrateSession() {
  fs.mkdirSync(SESSION_DIR, { recursive: true })
  const credsPath = path.join(SESSION_DIR, 'creds.json')

  if (fs.existsSync(credsPath)) {
    logger.debug('Existing session/creds.json found — skipping hydration.')
    return
  }
  if (!settings.sessionId) {
    logger.info('No SESSION_ID set — will fall back to interactive pairing/QR.')
    return
  }

  logger.info(`Hydrating SESSION_ID (${describeSessionId(settings.sessionId)})…`)

  try {
    let raw
    if (isShortBempsXId(settings.sessionId)) {
      if (!settings.sessionApi) {
        throw new Error(
          'SESSION_ID is a short BEMPSX-ID but SESSION_API is not set. ' +
          'Add SESSION_API=https://your-session-server.example.com to .env.'
        )
      }
      raw = await grabBempsXSession(settings.sessionId, settings.sessionApi)
      logger.info('Grabbed short BEMPSX-ID from session server ✓')
    } else {
      raw = decodeBempsXSession(settings.sessionId)
      logger.info('Decoded legacy SESSION_ID locally ✓')
    }

    // Atomic write so a crash mid-write can't leave a half-file behind.
    const tmp = `${credsPath}.${process.pid}.${Date.now()}.tmp`
    fs.writeFileSync(tmp, raw, 'utf-8')
    fs.renameSync(tmp, credsPath)
    logger.ok('Session credentials written to session/creds.json')
  } catch (e) {
    logger.warn(`Could not hydrate SESSION_ID: ${e.message}`)
    logger.warn('Continuing without a saved session — pairing/QR will run instead.')
  }
}

/** Connect once and return the socket. Reconnection is handled by callers. */
export async function createSocket() {
  await hydrateSession()

  const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR)
  const usePairing = Boolean(settings.pairingNumber)
  logger.info(`Creating WhatsApp socket${usePairing ? ' for phone-number pairing' : ''}…`)
  const sock = makeWASocket({
    logger,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    browser: Browsers.ubuntu('Chrome'),
    markOnlineOnConnect: false,
    syncFullHistory: false,
    printQRInTerminal: false,
    connectTimeoutMs: 60000,
  })

  sock.ev.on('creds.update', async () => { await saveCreds() })

  sock.ev.on('connection.update', (update) => {
    const { connection, qr } = update
    if (qr && !usePairing) {
      logger.info('Scan the QR below with WhatsApp → Linked devices:')
      qrcode.generate(qr, { small: true })
    }
    if (connection === 'open') {
      logger.boot(`Connected as ${jidNormalizedUser(sock.user?.id || '')}`)
    }
  })

  // ── phone-number pairing path ─────────────────────────────────
  if (usePairing && !state.creds.registered) {
    let pairingRequested = false
    let pairingTimer = null
    let attempts = 0

    const requestPairingCode = async () => {
      if (pairingRequested || state.creds.registered) return
      attempts += 1
      try {
        logger.info(`Requesting WhatsApp pairing code (attempt ${attempts}) for ${settings.pairingNumber}…`)
        const code = await sock.requestPairingCode(settings.pairingNumber)
        if (!code) throw new Error('WhatsApp returned an empty pairing code.')
        pairingRequested = true
        const clean = String(code).replace(/[^A-Z0-9]/gi, '')
        const pretty = clean.match(/.{1,4}/g)?.join('-') || clean
        logger.boot(`🔗 WhatsApp pairing code: ${pretty}`)
        logger.info('Open WhatsApp → Settings → Linked devices → Link a device → Link with phone number.')
      } catch (e) {
        logger.warn(`Pairing code request failed: ${e.message}`)
        if (!pairingRequested && !state.creds.registered && attempts < 5) {
          const delay = Math.min(2000 * attempts, 10000)
          pairingTimer = setTimeout(() => { pairingTimer = null; requestPairingCode().catch(() => {}) }, delay)
        } else if (!pairingRequested) {
          logger.error('Unable to obtain a pairing code after 5 attempts.')
        }
      }
    }

    const onPairingUpdate = (update) => {
      if (update.connection === 'connecting' && !pairingRequested && !pairingTimer) {
        pairingTimer = setTimeout(() => { pairingTimer = null; requestPairingCode().catch(() => {}) }, 300)
      }
      if (update.connection === 'open' && pairingTimer) { clearTimeout(pairingTimer); pairingTimer = null }
      if (update.connection === 'close' && pairingTimer) { clearTimeout(pairingTimer); pairingTimer = null }
    }

    sock.ev.on('connection.update', onPairingUpdate)
    pairingTimer = setTimeout(() => { pairingTimer = null; requestPairingCode().catch(() => {}) }, 1200)
  }

  return sock
}

export function shouldReconnect(lastDisconnect) {
  const code = new Boom(lastDisconnect?.error)?.output?.statusCode
  const recoverable = new Set([
    DisconnectReason.restartConnection,
    DisconnectReason.connectionClosed,
    DisconnectReason.connectionLost,
    DisconnectReason.timedOut,
  ])
  if (code === DisconnectReason.loggedOut) return { reconnect: false, reason: 'loggedOut' }
  if (code === DisconnectReason.badSession) return { reconnect: false, reason: 'badSession' }
  if (recoverable.has(code) || code === undefined) return { reconnect: true, reason: 'recoverable' }
  return { reconnect: true, reason: 'unknown' }
}

export function clearSession() {
  try { fs.rmSync(SESSION_DIR, { recursive: true, force: true }) } catch {}
  logger.warn('Session cleared — a fresh QR will be needed on next boot.')
}