import { store } from '../../lib/database.js'

const warns = store('warns')
const banned = store('banned')


function mention(jid) { return jid.replace(/@s\.whatsapp\.net|@g\.us/g, '') }

/** warn — warn a member (auto-kick after 3). */
export const warn = {
  name: 'warn', category: 'group', description: 'Warn a member. Usage: .warn @user reason',
  async run(ctx) {
    if (!ctx.isGroup) return ctx.sock.sendMessage(ctx.jid, { text: 'Groups only.' })
    let target = ctx.message?.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || ctx.args[0]
    if (target && !/@/.test(target)) target = `@${target}@s.whatsapp.net`
    if (!target) return ctx.sock.sendMessage(ctx.jid, { text: 'Usage: .warn @user reason' })
    const reason = ctx.args.slice(ctx.message?.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length || 1).join(' ') || 'No reason'
    const key = `${ctx.jid}:${mention(target)}`
    const count = (await warns.get(key)) || 0
    const next = count + 1
    await warns.set(key, next)
    if (next >= 3) {
      await ctx.sock.groupParticipantsUpdate(ctx.jid, [target], 'remove')
      await warns.delete(key)
      return ctx.sock.sendMessage(ctx.jid, { text: `⛔ @${mention(target)} kicked — 3 warnings.`, mentions: [target] })
    }
    await ctx.sock.sendMessage(ctx.jid, { text: `⚠️ Warn @${mention(target)} (${next}/3)\nReason: ${reason}`, mentions: [target] })
  },
}

/** unwarn — remove a warning. */
export const unwarn = {
  name: 'unwarn', category: 'group', description: 'Remove a warning. Usage: .unwarn @user',
  async run(ctx) {
    if (!ctx.isGroup) return ctx.sock.sendMessage(ctx.jid, { text: 'Groups only.' })
    let target = ctx.message?.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || ctx.args[0]
    if (target && !/@/.test(target)) target = `@${target}@s.whatsapp.net`
    if (!target) return ctx.sock.sendMessage(ctx.jid, { text: 'Usage: .unwarn @user' })
    const key = `${ctx.jid}:${mention(target)}`
    await warns.delete(key)
    await ctx.sock.sendMessage(ctx.jid, { text: `✅ Warnings cleared for @${mention(target)}`, mentions: [target] })
  },
}

/** warnlist — view warning count. */
export const warnlist = {
  name: 'warnlist', category: 'group', description: 'List users with warnings.',
  async run(ctx) {
    const all = await warns.all()
    const rows = Object.entries(all).filter(([k]) => k.startsWith(ctx.jid + ':')).map(([k, v]) => `• @${k.split(':')[1]}: ${v}/3`)
    await ctx.sock.sendMessage(ctx.jid, { text: rows.length ? `🚨 *WARNINGS*\n${rows.join('\n')}` : 'No warnings.' })
  },
}

/** ban — ban a user from the group. */
export const banuser = {
  name: 'ban', category: 'group', description: 'Ban a user. Usage: .ban @user',
  async run(ctx) {
    if (!ctx.isGroup) return
    let target = ctx.message?.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || ctx.args[0]
    if (!target) return ctx.sock.sendMessage(ctx.jid, { text: 'Usage: .ban @user' })
    await banned.set(`${ctx.jid}:${mention(target)}`, true)
    await ctx.sock.groupParticipantsUpdate(ctx.jid, [target], 'remove')
    await ctx.sock.sendMessage(ctx.jid, { text: `🔨 Banned @${mention(target)}`, mentions: [target] })
  },
}

/** unban — unban a user. */
export const unban = {
  name: 'unban', category: 'group', description: 'Unban a user. Usage: .unban @user',
  async run(ctx) {
    if (!ctx.isGroup) return
    let target = ctx.message?.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || ctx.args[0]
    if (!target) return ctx.sock.sendMessage(ctx.jid, { text: 'Usage: .unban @user' })
    await banned.delete(`${ctx.jid}:${mention(target)}`)
    await ctx.sock.sendMessage(ctx.jid, { text: `♻️ Unbanned @${mention(target)}`, mentions: [target] })
  },
}

/* Anti-link config is in settings.ANTI_LINK. */
import settings from '../../../settings.js'
export const antilink = {
  name: 'antilink', category: 'group', description: 'Toggle anti-link for this group (on/off).',
  async run(ctx) {
    const val = (ctx.args[0] || '').toLowerCase()
    if (!['on', 'off'].includes(val)) return ctx.sock.sendMessage(ctx.jid, { text: 'Usage: .antilink on | off (owner only)' })
    const toggles = store('antilink')
    await toggles.set(ctx.jid, val === 'on')
    await ctx.sock.sendMessage(ctx.jid, { text: `🛡️ Anti-link is now ${val.toUpperCase()} for this group.` })
  },
}
