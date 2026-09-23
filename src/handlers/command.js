/**
 * command.js — command dispatcher.
 *
 * A message is parsed into { command, args, isCommand } and routed to the
 * matching plugin. Plugin lookup is async (the registry is loaded at boot).
 */
import settings from '../../settings.js'
import { logger } from '../lib/logger.js'
import { findPlugin } from '../plugins/index.js'
import { resolveUserName } from '../lib/utils.js'

export function parseMessage(text, prefix) {
  const t = (text || '').trim()
  if (!t || !t.startsWith(prefix)) return { isCommand: false }
  const body = t.slice(prefix.length).trim()
  if (!body) return { isCommand: false }
  const [rawCmd, ...rest] = body.split(/\s+/)
  const command = (rawCmd || '').toLowerCase()
  return { isCommand: true, command, args: rest, body }
}

export async function dispatchCommand({ sock, message, jid, sender, from, isGroup, pushName }) {
  const { command, args, body } = parseMessage(message.text, settings.prefix)
  if (!command) return

  const plugin = await findPlugin(command)

  // ── custom commands (created with .setcmd) ───────────────────
  if (!plugin) {
    try {
      const { store } = await import('../lib/database.js')
      const custom = await store('custom').get(command)
      if (custom) {
        const text = String(custom).replace(/\$[0-9]+/g, (m) => args[Number(m.slice(1)) - 1] || m)
        await sock.sendMessage(jid, { text })
        return
      }
    } catch {}
    return
  }

  logger.info(`Command: ${command} from ${sender} in ${isGroup ? jid : 'DM'}`)
  // Resolve the sender's real name once and hand it to every plugin (ctx.name).
  const name = await resolveUserName(sock, isGroup ? jid : null, sender, pushName)
  const ctx = { sock, message, jid, sender, from, isGroup, args, body, prefix: settings.prefix, pushName, name }
  try {
    await plugin.run(ctx)
  } catch (e) {
    logger.error(`Command "${command}" failed: ${e.message}`)
    try {
      await sock.sendMessage(jid, { text: `⚠️ Command error: ${e.message}` })
    } catch {}
  }
}
