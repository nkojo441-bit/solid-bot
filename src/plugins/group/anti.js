import { store } from '../../lib/database.js'

/**
 * ANTI-* toggles. Each persists a per-group on/off. The actual enforcement
 * lives in the message handler (src/handlers/group.js) which reads these flags.
 */
const gset = store('groupset')

const TOGGLES = {
  antibot: 'ANTIBOT',     // kick accounts that look like a bot
  antispam: 'ANTISPAM',   // mute repeat-spammers
  antitag: 'ANTITAG',     // block mass-tagging (tagall) by non-admins
}

const build = (name) => ({
  name, category: 'group', description: `Toggle ${name} for this group (on/off).`,
  async run(ctx) {
    if (!ctx.isGroup) return ctx.sock.sendMessage(ctx.jid, { text: 'Groups only.' })
    const key = `${ctx.jid}:${name}`
    // If a value arg was given use it, otherwise flip.
    let value
    const arg = (ctx.args[0] || '').toLowerCase()
    if (arg === 'on') value = true
    else if (arg === 'off') value = false
    else value = !( await gset.get(`${ctx.jid}:${name}`) )
    await gset.set(key, value)
    await ctx.sock.sendMessage(ctx.jid, { text: `🚦 ${name.toUpperCase()} is now ${value ? 'ON (enforced)' : 'OFF'}.` })
  },
})

export const antiCommands = Object.fromEntries(
  Object.keys(TOGGLES).map((name) => [name, build(name)])
)

/** Read an anti flag (helper for the handler). */
export async function isAntiOn(groupJid, name) {
  return Boolean(await gset.get(`${groupJid}:${name}`))
}

/** Antiword: get/set the blocked words for a group. */
export const antiword = {
  ...build('antiword'),
  async run(ctx) {
    if (!ctx.isGroup) return ctx.sock.sendMessage(ctx.jid, { text: 'Groups only.' })
    const key = `${ctx.jid}:antiword`
    if (ctx.args[0] && ctx.args[0] !== 'on' && ctx.args[0] !== 'off') {
      // .antiword set word1,word2
      if (ctx.args[0].toLowerCase() === 'set') {
        const words = ctx.args.slice(1).join(' ').split(',').map((w) => w.trim().toLowerCase()).filter(Boolean)
        await gset.set(`${key}:words`, words)
        await gset.set(key, true)
        return ctx.sock.sendMessage(ctx.jid, { text: `📝 Anti-word list set (${words.length}): ${words.join(', ')}` })
      }
    }
    const on = !( await gset.get(key) )
    await gset.set(key, on)
    const words = await gset.get(`${key}:words`) || []
    await ctx.sock.sendMessage(ctx.jid, { text: `🚦 ANTIWORD ${on ? 'ON' : 'OFF'}\nBlocked: ${words.length ? words.join(', ') : '(none yet — set with .antiword set word1,word2)'}` })
  },
}
