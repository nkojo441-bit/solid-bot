/**
 * BEMPSX-NOVA — clean WhatsApp phone-number pairing entrypoint.
 *
 * This file intentionally does NOT import index.js, plugins, database,
 * keep-alive servers, or bot handlers. Pairing must be isolated from the
 * rest of the application so terminal input and the Baileys handshake
 * cannot be blocked by application startup.
 */
import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import readline from 'readline'
import { fileURLToPath } from 'url'
import pino from 'pino'
import {
  makeWASocket,
  fetchLatestWaWebVersion,
  useMultiFileAuthState,
  makeCacheableSignalKeyStore,
  Browsers,
  DisconnectReason,
} from 'baileys-pairing'
import { Boom } from '@hapi/boom'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SESSION_DIR = path.join(ROOT, 'session')

const logger = pino({
  level: process.env.PAIR_LOG_LEVEL || 'info',
  base: { name: 'BempsX-Nova-Pairing' },
  timestamp: pino.stdTimeFunctions.isoTime,
})

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

function ask(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve, reject) => {
    const cleanup = () => rl.close()
    rl.once('error', (err) => {
      cleanup()
      reject(err)
    })
    rl.question(question, (answer) => {
      cleanup()
      resolve(answer)
    })
  })
}

function normalizePhone(input) {
  const value = String(input ?? '').trim()
  const digits = value.replace(/\D/g, '')

  if (!digits) {
    throw new Error('No phone number was entered.')
  }
  if (digits.length < 7 || digits.length > 15) {
    throw new Error('Phone number must contain 7–15 digits including the country code.')
  }

  return digits
}

function formatPairingCode(code) {
  const clean = String(code || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase()
  return clean.match(/.{1,4}/g)?.join('-') || clean
}

function statusText(error) {
  const code = new Boom(error)?.output?.statusCode
  const message = error?.message || String(error || 'unknown error')
  return code ? `${message} (status ${code})` : message
}

async function clearSession() {
  await fs.promises.rm(SESSION_DIR, { recursive: true, force: true })
  await fs.promises.mkdir(SESSION_DIR, { recursive: true })
}

async function createPairingSocket(state, saveCreds) {
  // Use the current WhatsApp Web revision when available. The bundled
  // revision in legacy Baileys releases can be rejected by WhatsApp during
  // a new companion login.
  let version
  try {
    const latest = await fetchLatestWaWebVersion({
      signal: AbortSignal.timeout(10_000),
    })
    if (latest?.version?.length === 3) {
      version = latest.version
      logger.info(`WhatsApp Web version: ${version.join('.')}`)
    } else {
      logger.warn('Could not obtain a current WhatsApp Web version; using the library default.')
    }
  } catch (error) {
    logger.warn(`WhatsApp Web version lookup failed; using library default: ${statusText(error)}`)
  }

  return makeWASocket({
    ...(version ? { version } : {}),
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    // Canonical browser tuple. Pairing-code platform display is validated
    // more strictly by WhatsApp than normal Web login.
    browser: Browsers.ubuntu('Chrome'),
    printQRInTerminal: false,
    markOnlineOnConnect: false,
    syncFullHistory: false,
    shouldSyncHistoryMessage: () => false,
    connectTimeoutMs: 90_000,
    defaultQueryTimeoutMs: 60_000,
    keepAliveIntervalMs: 15_000,
    logger,
  })
}

async function waitForSocketReady(sock, timeoutMs = 30_000) {
  return new Promise((resolve, reject) => {
    let settled = false

    const finish = (fn, value) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      sock.ev.off('connection.update', onUpdate)
      fn(value)
    }

    const onUpdate = (update) => {
      if (update.connection === 'connecting' || update.qr) {
        finish(resolve, update)
      }

      if (update.connection === 'close') {
        finish(reject, update.lastDisconnect?.error || new Error('WhatsApp socket closed before pairing.'))
      }
    }

    const timer = setTimeout(() => {
      finish(reject, new Error(
        'Timed out waiting for the WhatsApp socket to become ready. ' +
        'Check that this computer can reach WhatsApp over HTTPS/WebSocket.'
      ))
    }, timeoutMs)

    sock.ev.on('connection.update', onUpdate)
  })
}

async function requestCodeWhenReady(sock, number) {
  logger.info('Waiting for the WhatsApp WebSocket to open…')

  // waitForSocketOpen() is the important distinction here. `connection:
  // connecting` only means the socket object exists; it does NOT mean the
  // underlying WebSocket can accept the pairing IQ.
  if (typeof sock.waitForSocketOpen === 'function') {
    await Promise.race([
      sock.waitForSocketOpen(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timed out waiting for WhatsApp WebSocket to open.')), 45_000)
      ),
    ])
  } else {
    await waitForSocketReady(sock, 45_000)
  }

  logger.info('WhatsApp WebSocket is open; requesting exactly one pairing code…')

  const code = await Promise.race([
    sock.requestPairingCode(number),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Pairing-code request timed out after 30 seconds.')), 30_000)
    ),
  ])

  if (!code) throw new Error('WhatsApp returned an empty pairing code.')
  return formatPairingCode(code)
}

async function run() {
  logger.info('════════════════════════════════════════════════════')
  logger.info(' BEMPSX-NOVA — CLEAN WHATSAPP PAIRING')
  logger.info('════════════════════════════════════════════════════')
  logger.info(`Node ${process.version}`)
  logger.info(`Session directory: ${SESSION_DIR}`)

  // A pairing command always starts from a clean auth directory. This avoids
  // stale/half-created creds causing WhatsApp to reject a new link.
  await clearSession()
  logger.info('Old pairing session cleared.')

  const supplied = process.env.PAIRING_NUMBER || process.argv[2] || ''
  const answer = supplied || await ask(
    '\nEnter WhatsApp number (country code + number, no +, spaces or dashes): '
  )
  const number = normalizePhone(answer)

  logger.info(`Pairing phone: ${number}`)
  logger.info('Creating a dedicated WhatsApp pairing socket…')

  const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR)

  if (state.creds.registered) {
    throw new Error('The session is already registered. This should not happen after the clean reset.')
  }

  const sock = await createPairingSocket(state, saveCreds)
  sock.ev.on('creds.update', saveCreds)

  let codePrinted = false
  let opened = false

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update

    if (connection === 'connecting') {
      logger.info('WhatsApp connection: connecting…')
    }

    if (connection === 'open') {
      opened = true
      logger.info('✅ WhatsApp connection opened. Device is linked.')
      logger.info('Authentication was saved to the session directory.')
      logger.info('You can now stop this command with Ctrl+C and run: npm start')
    }

    if (connection === 'close') {
      const code = new Boom(lastDisconnect?.error)?.output?.statusCode
      const reason = code === DisconnectReason.loggedOut
        ? 'logged out'
        : code === DisconnectReason.restartRequired
          ? 'restart required'
          : `closed${code ? ` (status ${code})` : ''}`

      if (!opened) {
        if (code === DisconnectReason.loggedOut || code === 401) {
          logger.error('❌ WhatsApp rejected the new companion login (401/logged out).')
          logger.error('This is a server-side login rejection, not a terminal prompt problem.')
          logger.error('The pairing implementation has completed its request; do not generate repeated codes.')
        } else {
          logger.error(`❌ WhatsApp closed before linking: ${reason}.`)
        }
      } else {
        logger.warn(`WhatsApp connection closed: ${reason}.`)
      }
    }
  })

  // One request only. No arbitrary timers, no polling loop, no competing
  // connection lifecycle. requestPairingCode() owns the handshake.
  const code = await requestCodeWhenReady(sock, number)

  codePrinted = true
  logger.info('')
  logger.info('┌──────────────────────────────────────────────┐')
  logger.info(`│  🔗 PAIRING CODE: ${code.padEnd(30)}│`)
  logger.info('└──────────────────────────────────────────────┘')
  logger.info('')
  logger.info('On your phone:')
  logger.info('1. Open WhatsApp')
  logger.info('2. Settings → Linked devices')
  logger.info('3. Link a device')
  logger.info('4. Choose “Link with phone number”')
  logger.info(`5. Enter: ${code}`)
  logger.info('')
  logger.info('Waiting for WhatsApp to finish linking…')

  if (!codePrinted) {
    throw new Error('Pairing code was not displayed.')
  }

  // Wait for either a successful login or a terminal close. Do not issue a
  // second pairing-code request: the pairing code is cryptographic state and
  // replacing it mid-flow can invalidate the first attempt.
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(
      'Timed out waiting for the phone to complete linking (120 seconds).'
    )), 120_000)

    const onUpdate = ({ connection, lastDisconnect }) => {
      if (connection === 'open') {
        clearTimeout(timer)
        sock.ev.off('connection.update', onUpdate)
        resolve()
      } else if (connection === 'close') {
        clearTimeout(timer)
        sock.ev.off('connection.update', onUpdate)
        reject(lastDisconnect?.error || new Error('WhatsApp closed the pairing connection.'))
      }
    }

    sock.ev.on('connection.update', onUpdate)
  })

  // Give creds.update a moment to flush to disk.
  await sleep(2000)
}

run().catch((error) => {
  logger.error(`❌ PAIRING FAILED: ${statusText(error)}`)
  logger.error('Try again with: npm run pair')
  process.exitCode = 1
})
