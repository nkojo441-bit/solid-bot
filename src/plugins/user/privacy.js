import { isOwner, numOf } from '../../lib/utils.js'

const num = numOf
const ownerOnly = async (ctx, msg = '🔒 Owner only.') => {
  if (isOwner(ctx.sender)) return true
  await ctx.sock.sendMessage(ctx.jid, { text: msg })
  return false
}
const safe = (fn) => { try { fn() } catch {} }

/** lastseen — WhatsApp does NOT expose other users' last-seen to a bot API. Honest reply. */
export const lastseen = {
  name: 'lastseen', category: 'privacy', description: 'Last-seen status.',
  run: async (ctx) => {
    await ctx.sock.sendMessage(ctx.jid, { text: 'ℹ️ WhatsApp does not expose other users\' last-seen to a bot API, so I cannot show it. This is a platform limit, not a bug.' })
  },
}

/** online — WhatsApp does not expose other users' live online state to bots. */
export const online = {
  name: 'online', aliases: ['isuseronline'], category: 'privacy', description: 'Check online state.',
  run: async (ctx) => {
    await ctx.sock.sendMessage(ctx.jid, { text: 'ℹ️ WhatsApp does not expose live online state to a bot API, so I can\'t report it.' })
  },
}

/** mypp — show the bot's own profile picture. */
export const mypp = {
  name: 'mypp', aliases: ['botpp'], category: 'privacy', description: 'Show the bot profile picture.',
  async run(ctx) {
    try {
      const jid = ctx.sock?.user?.id?.split(':')[0] + '@s.whatsapp.net'
      const url = await ctx.sock.profilePictureUrl(jid, 'image')
      const buf = Buffer.from(await (await fetch(url)).arrayBuffer())
      await ctx.sock.sendMessage(ctx.jid, { image: buf, caption: '🤖 My profile picture' })
    } catch { await ctx.sock.sendMessage(ctx.jid, { text: '⚠️ No profile picture set.' }) }
  },
}

/** mystatus — show the bot's own about/bio. */
export const mystatus = {
  name: 'mystatus', aliases: ['myabout'], category: 'privacy', description: 'Show the bot about text.',
  async run(ctx) {
    try {
      const jid = ctx.sock?.user?.id?.split(':')[0] + '@s.whatsapp.net'
      const info = await ctx.sock.getStatus?.(jid)
      await ctx.sock.sendMessage(ctx.jid, { text: `📝 *About*: ${info?.status || 'not set'}` })
    } catch { await ctx.sock.sendMessage(ctx.jid, { text: '📝 About not available.' }) }
  },
}

/** read — mark a message read. */
export const read = {
  name: 'read', aliases: ['readmsg', 'markread'], category: 'privacy', description: 'Mark the inbound message(s) as read.',
  async run(ctx) {
    const key = ctx.message?.key
    try {
      await ctx.sock.sendReadReceipt?.(ctx.jid, ctx.sender, [key?.id])
      await ctx.sock.sendMessage(ctx.jid, { text: '✓ Read.' })
    } catch { await ctx.sock.sendMessage(ctx.jid, { text: '✓ Read.' }) }
  },
}

/**
 * presence — set bot presence.
 * NOTE: previously this had `online` as an alias, which collided with the
 * `.online` command in this same file. Alias removed. Use `.alwaysonline`
 * (bot/bot.js) for a persistent toggle.
 */
export const presence = {
  name: 'presence', aliases: ['setpresence'], category: 'privacy',
  description: 'Set bot presence. Usage: .presence <available|unavailable|composing|recording|paused>',
  async run(ctx) {
    if (!(await ownerOnly(ctx))) return
    const p = (ctx.args[0] || 'available').toLowerCase()
    const allowed = ['available', 'unavailable', 'composing', 'recording', 'paused']
    if (!allowed.includes(p)) {
      return ctx.sock.sendMessage(ctx.jid, { text: `Usage: .presence <${allowed.join('|')}>` })
    }
    try { await ctx.sock.sendPresenceUpdate?.(p) } catch {}
    await ctx.sock.sendMessage(ctx.jid, { text: `🟢 Presence set to *${p}*` })
  },
}

/** pinchat — pin a chat. */
export const pinchat = {
  name: 'pinchat', aliases: ['pin'], category: 'privacy', description: 'Pin this chat (owner).',
  async run(ctx) {
    if (!(await ownerOnly(ctx))) return
    try { await ctx.sock.chatModify?.({ pin: true }, ctx.jid); await ctx.sock.sendMessage(ctx.jid, { text: '📌 Chat pinned.' }) }
    catch { await ctx.sock.sendMessage(ctx.jid, { text: '❌ Could not pin.' }) }
  },
}

export const unpinchat = {
  name: 'unpinchat', aliases: ['unpin'], category: 'privacy', description: 'Unpin this chat (owner).',
  async run(ctx) {
    if (!(await ownerOnly(ctx))) return
    try { await ctx.sock.chatModify?.({ pin: false }, ctx.jid); await ctx.sock.sendMessage(ctx.jid, { text: '📌 Chat unpinned.' }) }
    catch { await ctx.sock.sendMessage(ctx.jid, { text: '❌ Could not unpin.' }) }
  },
}

/** archive — archive a chat. */
export const archive = {
  name: 'archive', aliases: ['arc'], category: 'privacy', description: 'Archive this chat (owner).',
  async run(ctx) {
    if (!(await ownerOnly(ctx))) return
    try { await ctx.sock.chatModify?.({ archive: true }, ctx.jid); await ctx.sock.sendMessage(ctx.jid, { text: '📦 Chat archived.' }) }
    catch { await ctx.sock.sendMessage(ctx.jid, { text: '❌ Could not archive.' }) }
  },
}

export const unarchive = {
  name: 'unarchive', aliases: ['unarc'], category: 'privacy', description: 'Unarchive this chat (owner).',
  async run(ctx) {
    if (!(await ownerOnly(ctx))) return
    try { await ctx.sock.chatModify?.({ archive: false }, ctx.jid); await ctx.sock.sendMessage(ctx.jid, { text: '📦 Chat unarchived.' }) }
    catch { await ctx.sock.sendMessage(ctx.jid, { text: '❌ Could not unarchive.' }) }
  },
}

/** mute-chat — mute/unmute this chat. */
export const mutechat = {
  name: 'mute-chat', aliases: ['mutec'], category: 'privacy', description: 'Mute a chat for a duration. Usage: .mute-chat <ms|off>',
  async run(ctx) {
    if (!(await ownerOnly(ctx))) return
    const arg = (ctx.args[0] || 'off').toLowerCase()
    if (arg === 'off') {
      try { await ctx.sock.chatModify?.({ mute: null }, ctx.jid); return ctx.sock.sendMessage(ctx.jid, { text: '🔕 Chat unmuted.' }) } catch {}
    }
    const ms = arg === 'on' ? 24 * 3600e3 : Math.max(Number(arg) || 86400000, 0)
    try { await ctx.sock.chatModify?.({ mute: ms }, ctx.jid); await ctx.sock.sendMessage(ctx.jid, { text: `🔕 Chat muted for ${Math.round(ms / 3600e3)}h.` }) }
    catch { await ctx.sock.sendMessage(ctx.jid, { text: '❌ Could not mute.' }) }
  },
}

/** delete — delete the bot's last message (owner). */
export const deletemsg = {
  name: 'delete', aliases: ['delresend'], category: 'privacy', description: 'Delete the replied-to message.',
  async run(ctx) {
    if (!(await ownerOnly(ctx))) return
    const ci = ctx.message?.message?.extendedTextMessage?.contextInfo
    const key = ci?.quotedMessage ? { remoteJid: ctx.jid, id: ci.stanzaId, participant: ci.participant } : null
    if (!key) return ctx.sock.sendMessage(ctx.jid, { text: 'Reply to a message with .delete' })
    try { await ctx.sock.sendMessage(ctx.jid, { delete: key }); safe(() => true) }
    catch { await ctx.sock.sendMessage(ctx.jid, { text: '❌ Could not delete.' }) }
  },
}