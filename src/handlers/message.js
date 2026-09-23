/**
 * message.js — inbound message pipeline.
 *
 * Every new WhatsApp message funnels through here. It normalises the event,
 * extracts text/sender/jid, runs moderation (anti-link, welcome), and hands
 * the message to the command dispatcher. Keep this thin — feature logic
 * belongs in plugins.
 */
import settings from '../../settings.js'
import { dispatchCommand } from './command.js'
import { handleGroupEvent } from './group.js'
import { findPlugin } from '../plugins/index.js'
import { resolveUserName, rememberOwnerJid } from '../lib/utils.js'
import { store } from '../lib/database.js'
import { runAgent, looksLikeAgentRequest } from '../agent/agent.js'

const statsStore = store('stats')

/** Convert a Baileys message object into a predictable shape. */
export function normalizeMessage(m) {
  if (!m) return null
  const text =
    m.message?.conversation ||
    m.message?.extendedTextMessage?.text ||
    m.message?.imageMessage?.caption ||
    m.message?.videoMessage?.caption ||
    m.message?.documentWithCaptionMessage?.message?.documentMessage?.caption ||
    ''
  const messageType = Object.keys(m.message || {})[0] || 'unknown'
  return { text, messageType }
}

/** Main entry: called on every messages.upsert. */
export async function onMessage(sock, m, jid, isGroup) {
  const sender = m.key?.participant || m.key?.remoteJid || ''
  // WhatsApp usernames/LIDs can hide the phone-number JID. When WhatsApp
  // supplies an alternate PN/LID on the message key, cache the relationship
  // so owner checks continue to work without trying to infer the phone number.
  rememberOwnerJid(sender, m.key?.participantAlt || m.key?.remoteJidAlt)
  const hasMedia = Boolean(
    m.message?.imageMessage || m.message?.videoMessage || m.message?.audioMessage ||
    m.message?.stickerMessage || m.message?.documentMessage
  )
  const isFromMe = m.key?.fromMe
  const normalized = normalizeMessage(m)
  const text = normalized.text

  // Attach the extracted text so the command dispatcher can parse it
  // (it reads `message.text`). This keeps a single source of truth.
  m.text = text
  m.messageType = normalized.messageType

  // Don't process the bot's own outgoing messages.
  if (isFromMe) return

  // Message counter (powers .msgs).
  try {
    const count = (await statsStore.get('count')) || 0
    await statsStore.set('count', count + 1)
  } catch {}

  // ── REAL location: if the user shares a live location pin, acknowledge it. ──
  // (The bot CANNOT read someone's phone GPS; this only reacts to a pin the
  // user deliberately shares, using its real lat/long — never made up.)
  const loc = normalized.messageType === 'locationMessage'
    ? m.message?.locationMessage
    : null
  if (loc && typeof loc.degreesLatitude === 'number') {
    try {
      const url = `https://www.google.com/maps?q=${loc.degreesLatitude},${loc.degreesLongitude}`
      await sock.sendMessage(jid, {
        text: `📍 *Location received*\nLat: ${loc.degreesLatitude}\nLong: ${loc.degreesLongitude}\n\n${url}`,
      })
      return
    } catch {}
  }

  /* First-run detection: if no session and this isn't a command, log it. */
  if (isGroup) {
    // group moderation (anti-link handled here, replies are fire-and-forget)
    handleGroupEvent(sock, m, jid, { text, isGroup })
  }

  // Route commands. Plugin lookup is handled inside dispatchCommand by name/alias.
  const pushName = m.pushName || ''
  if (settings.prefix && text.startsWith(settings.prefix)) {
    await dispatchCommand({ sock, message: m, jid, sender, from: isGroup ? jid : sender, isGroup, pushName })
  } else {
    const name = await resolveUserName(sock, isGroup ? jid : null, sender, pushName)
    const ctx = { sock, message: m, jid, sender, from: isGroup ? jid : sender, isGroup, args: [], body: text, prefix: settings.prefix, pushName, name }

    // Natural-language agent: in DMs it can handle requests without a prefix.
    // In groups it only activates when explicitly mentioned, preventing the AI
    // from processing every ordinary group conversation.
    const mentioned = Boolean(
      m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length ||
      m.message?.imageMessage?.contextInfo?.mentionedJid?.length
    )
    const agentAllowed = settings.aiAgent && (!isGroup || mentioned)
    if (agentAllowed && looksLikeAgentRequest(ctx)) {
      // Acknowledge immediately, then do the AI planning/API work in the
      // background so the WhatsApp event loop is not held up.
      await sock.sendMessage(jid, { text: '🧠 Working on it…' })
      runAgent(ctx).catch(async (e) => {
        try { await sock.sendMessage(jid, { text: `⚠️ AI agent: ${e.message}` }) } catch {}
      })
    } else if (!isGroup && !isFromMe) {
      // Existing DM fallback: respond with the menu when the message is not
      // an agent request.
      try {
        const menu = await findPlugin('menu')
        if (menu) await menu.run(ctx)
      } catch {}
    }
  }
}
