import settings from '../../../settings.js'
import { isOwner } from '../../lib/utils.js'

const isGroup = (ctx) => ctx.isGroup
const needsGroup = (ctx, sock, jid) => {
  if (isGroup(ctx)) return true
  sock.sendMessage(jid, { text: '⚠️ This command works in groups only.' })
  return false
}

function mention(jid) {
  return jid.replace(/@s\.whatsapp\.net|@g\.us/g, '')
}

/** promote — make a member admin (uses the real Baileys group action). */
export const promote = {
  name: 'promote', category: 'group', description: 'Promote a member to admin. Usage: .promote @user',
  async run(ctx) {
    if (!needsGroup(ctx, ctx.sock, ctx.jid)) return
    const target = ctx.message?.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || ctx.args[0]
    if (!target) return ctx.sock.sendMessage(ctx.jid, { text: 'Usage: .promote @user' })
    await ctx.sock.groupParticipantsUpdate(ctx.jid, [target], 'promote')
    await ctx.sock.sendMessage(ctx.jid, { text: `⭐ Promoted @${mention(target)}`, mentions: [target] })
  },
}

/** demote — remove admin. */
export const demote = {
  name: 'demote', category: 'group', description: 'Remove a member from admin. Usage: .demote @user',
  async run(ctx) {
    if (!needsGroup(ctx, ctx.sock, ctx.jid)) return
    const target = ctx.message?.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || ctx.args[0]
    if (!target) return ctx.sock.sendMessage(ctx.jid, { text: 'Usage: .demote @user' })
    await ctx.sock.groupParticipantsUpdate(ctx.jid, [target], 'demote')
    await ctx.sock.sendMessage(ctx.jid, { text: `⬇️ Demoted @${mention(target)}`, mentions: [target] })
  },
}

/** kick — remove a member. */
export const kick = {
  name: 'kick', category: 'group', description: 'Kick a member. Usage: .kick @user',
  async run(ctx) {
    if (!needsGroup(ctx, ctx.sock, ctx.jid)) return
    const target = ctx.message?.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || ctx.args[0]
    if (!target) return ctx.sock.sendMessage(ctx.jid, { text: 'Usage: .kick @user' })
    await ctx.sock.groupParticipantsUpdate(ctx.jid, [target], 'remove')
    await ctx.sock.sendMessage(ctx.jid, { text: `👢 Kicked @${mention(target)}`, mentions: [target] })
  },
}

/** add — invite a number to the group. */
export const add = {
  name: 'add', category: 'group', description: 'Add a number to the group. Usage: .add 2348x xxxx',
  async run(ctx) {
    if (!needsGroup(ctx, ctx.sock, ctx.jid)) return
    const n = (ctx.args[0] || '').replace(/\D/g, '').replace(/^0/, '')
    if (!n) return ctx.sock.sendMessage(ctx.jid, { text: 'Usage: .add 2348012345678' })
    const jid = `@${n}@s.whatsapp.net`
    const r = await ctx.sock.groupAdd(ctx.jid, [jid])
    if (r?.[0]?.status === 409 || r?.[0]?.status === 403)
      return ctx.sock.sendMessage(ctx.jid, { text: '⚠️ Could not add — the number may need to invite you instead.' })
    await ctx.sock.sendMessage(ctx.jid, { text: `✅ Added @${n}`, mentions: [jid] })
  },
}

/** tagall — mention everyone in the group. */
export const tagall = {
  name: 'tagall', aliases: ['all'], category: 'group', description: 'Mention all members.',
  async run(ctx) {
    if (!needsGroup(ctx, ctx.sock, ctx.jid)) return
    const meta = await ctx.sock.groupMetadata(ctx.jid)
    const mentions = (meta.participants || []).map((p) => p.id)
    const msg = ctx.args.join(' ') || '📢 Attention everyone!'
    await ctx.sock.sendMessage(ctx.jid, { text: `${msg}\n\n${mentions.map((m) => '@' + mention(m)).join(' ')}`, mentions })
  },
}

/** ginfo — group metadata. */
export const ginfo = {
  name: 'ginfo', aliases: ['groupinfo'], category: 'group', description: 'Show group info.',
  async run(ctx) {
    if (!needsGroup(ctx, ctx.sock, ctx.jid)) return
    const meta = await ctx.sock.groupMetadata(ctx.jid)
    const text =
      `📋 *${meta.subject}*\n` +
      `• Owner: @${mention(meta.owner || '')}\n` +
      `• Members: ${meta.participants.length}\n` +
      `• Admins: ${meta.participants.filter((p) => p.admin).length}\n` +
      `• Restrict: ${meta.restrict ? 'Yes' : 'No'}\n` +
      `• Announce: ${meta.announce ? 'Yes' : 'No'}`
    await ctx.sock.sendMessage(ctx.jid, { text, mentions: meta.owner ? [meta.owner] : [] })
  },
}

/** poll — create a poll. */
export const poll = {
  name: 'poll', aliases: ['vote'], category: 'group', description: 'Create a poll. Usage: .poll Question | opt1 | opt2',
  async run(ctx) {
    const parts = ctx.body.split('|').map((s) => s.trim()).filter(Boolean)
    if (parts.length < 2) return ctx.sock.sendMessage(ctx.jid, { text: 'Usage: .poll Question | option1 | option2' })
    const [name, ...options] = parts
    await ctx.sock.sendMessage(ctx.jid, { poll: { name, values: options.slice(0, 12) } })
  },
}
