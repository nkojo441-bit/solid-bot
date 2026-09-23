/*
  ────────────────────────────────────────────────────────────────
   BEMPSX-NOVA  —  WhatsApp bot
   Built on Baileys. Clean, modular, extensible.
   ────────────────────────────────────────────────────────────────
*/

import settings from './settings.js'
import { logger } from './src/lib/logger.js'
import { createSocket, shouldReconnect, clearSession } from './src/core/socket.js'
import { startKeeper } from './src/core/keeper.js'
import { initDatabase, closeDatabase } from './src/lib/database.js'
import { hydrateRuntimeKeys } from './src/lib/secrets.js'
import { hydrateRuntimeVars } from './src/lib/vars.js'
import { loadPlugins, getPlugins } from './src/plugins/index.js'
import { printWall, assertBrand } from './src/lib/banner.js'
import { onMessage } from './src/handlers/message.js'
import { onParticipantsUpdate } from './src/handlers/group.js'
import { jidNormalizedUser } from 'baileys'
import { Boom } from '@hapi/boom'
import readline from 'readline'

const BOOT = Date.now()
const PAIR_MODE = process.argv.includes('--pair')
let pairPrompted = false

async function promptPairingNumber() {
  if (!PAIR_MODE || pairPrompted || settings.pairingNumber) return

  // In pair mode, collect the number BEFORE loading plugins/database/HTTP.
  // Those subsystems can write to stdout/stderr and interfere with a Windows
  // readline prompt. Keeping this prompt first makes the pairing flow
  // deterministic.
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true
  })

  try {
    const answer = await new Promise((resolve, reject) => {
      rl.question(
        '\nEnter WhatsApp number to pair (country code + number, e.g. 233500835166): ',
        resolve
      )
      rl.once('error', reject)
    })

    const number = String(answer || '').replace(/\D/g, '')
    if (!number || number.length < 7 || number.length > 15) {
      throw new Error(
        'Invalid WhatsApp number. Use international format without spaces, e.g. +233500835166.'
      )
    }

    settings.pairingNumber = number
    pairPrompted = true
    logger.info(`Pairing target set to ${number}. Owner remains ${settings.ownerNumber}.`)
  } finally {
    rl.close()
  }
}



/** Central lifecycle: create socket, wire events, reconnect on drop. */
async function start() {
  if (PAIR_MODE && !settings.pairingNumber) {
    await promptPairingNumber()
  }
  logger.info(`Starting WhatsApp${settings.pairingNumber ? ` pairing for ${settings.pairingNumber}` : ''}…`)
  const sock = await createSocket()

  // ── inbound messages ──────────────────────────────────────────
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return
    for (const m of messages) {
      const jid = m.key?.remoteJid || ''
      const isGroup = jid.endsWith('@g.us')
      if (m.key?.fromMe) continue // ignore our own
      try {
        await onMessage(sock, m, jid, isGroup)
      } catch (e) {
        logger.error(`Message handler error: ${e.message}`)
      }
    }
  })

  // ── group member changes (welcome / goodbye) ───────────────────
  sock.ev.on('group-participants.update', (update) => {
    onParticipantsUpdate(sock, update).catch((e) => logger.error(e.message))
  })

  // ── connection lifecycle + reconnect ───────────────────────────
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update

    if (connection === 'open') {
      logger.boot(`★ Welcome back, ${settings.botName}! Connected as ${jidNormalizedUser(sock.user?.id || '')}`)
      logger.boot(`Owner: ${settings.ownerNumber} | Prefix: ${settings.prefix}`)
      if (settings.welcome) logger.info('Group welcome: ON')
      if (settings.antiLink) logger.info('Anti-link: ON')
    }

    if (connection === 'close') {
      const code = new Boom(lastDisconnect?.error)?.output?.statusCode
      const { reconnect, reason } = shouldReconnect(lastDisconnect)

      if (reason === 'loggedOut' || reason === 'badSession') {
        logger.warn(
          reason === 'loggedOut'
            ? 'WhatsApp rejected the current link/session. Clearing it and starting a fresh pairing session.'
            : 'The saved WhatsApp auth state is invalid. Clearing it and starting a fresh pairing session.'
        )
        clearSession()
        setTimeout(() => start().catch((e) => logger.error(`Fresh WhatsApp start failed: ${e.message}`)), 1000)
        return
      }

      if (reconnect) {
        logger.warn(`Disconnected (${code || reason}). Reconnecting in 3s...`)
        setTimeout(() => start().catch((e) => logger.error(`Restart failed: ${e.message}`)), 3000)
      }
    }
  })
}

/* ── boot ────────────────────────────────────────────────────── */
logger.boot(`Starting ${settings.botName} by ${settings.author}...`)
logger.info(`Node ${process.version} | uptime target db:${'json'}`)

// Pairing must own stdin before any plugin/database/keep-alive work starts.
// This fixes Windows terminals where readline can be starved/interleaved by
// startup logging and the socket never receives the entered phone number.
if (PAIR_MODE) {
  try {
    await promptPairingNumber()
  } catch (e) {
    logger.error(`Pairing input failed: ${e.message}`)
    process.exit(1)
  }
}

// ── BEMPSX-NOVA BRANDING WALL-TEXT ───────────────────────────────
printWall()
assertBrand(settings.botName, settings.botOwner)

const db = await initDatabase()
logger.info(`Database: ${db.type}`)

await loadPlugins()
await hydrateRuntimeKeys()
await hydrateRuntimeVars()

startKeeper()

// In pairing mode, await the lifecycle so a failure is visible and the
// process cannot silently continue after a rejected pairing startup.
if (PAIR_MODE) {
  try {
    await start()
  } catch (e) {
    logger.error(`Fatal pairing startup error: ${e.message}`)
    process.exit(1)
  }
} else {
  start().catch((e) => {
    logger.error(`Fatal on boot: ${e.message}`)
    process.exit(1)
  })
}

// Graceful shutdown: close DB pool on SIGINT/SIGTERM.
const shutdown = async (sig) => {
  logger.warn(`Received ${sig} — shutting down gracefully…`)
  try { await closeDatabase() } catch (e) { logger.warn(`DB close error: ${e.message}`) }
  process.exit(0)
}
process.once('SIGINT', () => shutdown('SIGINT'))
process.once('SIGTERM', () => shutdown('SIGTERM'))

// graceful-ish handlers
process.on('unhandledRejection', (e) => logger.error(`Unhandled rejection: ${e}`))
process.on('uncaughtException', (e) => logger.error(`Uncaught exception: ${e}`))
