import { store } from '../../lib/database.js'
import { numOf } from '../../lib/utils.js'

const gset = store('groupset')
const num = numOf

const needsGroup = async (ctx) => {
  if (!ctx.isGroup) { await ctx.sock.sendMessage(ctx.jid, { text: 'Groups only.' }); return false }
  return true
}
const resolveTarget = async (ctx) => {
  const m = ctx.message?.message
  const mention = m?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
  const quoted = m?.extendedTextMessage?.contextInfo?.quotedMessage ? (m.extendedTextMessage.contextInfo.participant || null) : null
  const numArg = ctx.args[0] ? `@${ctx.args[0].replace(/\D/g, '')}@s.whatsapp.net` : null
  const argMatch = ctx.args[0] && /\d{7,}/.test(ctx.args[0]) ? numArg : null
  return mention || quoted || argMatch
}

/** creategc — create a group. */
export const creategc = {
  name: 'creategc', aliases: ['creategroup'], category: 'group', description: 'Create a group. Usage: .creategc <name> | <jids...>',
  async run(ctx) {
    const [title, ...part] = ctx.args.join(' ').split('|').map((s) => s.trim())
    const targets = part.join(' ').split(',').map((s) => `@${s.replace(/\D/g, '')}@s.whatsapp.net`).filter((s) => /\d{7,}/.test(s))
    if (!title) return ctx.sock.sendMessage(ctx.jid, { text: 'Usage: .creategc <name> | <partJids>  (or .creategc <name>)' })
    try {
      const res = await ctx.sock.groupCreate(title, targets)
      await ctx.sock.sendMessage(ctx.jid, { text: `✅ Group created: *${res?.gid || title}* with ${targets.length} member(s).` })
    } catch (e) { await ctx.sock.sendMessage(ctx.jid, { text: `❌ ${e.message}` }) }
  },
}

/** gcstatus — group info. */
export const gcstatus = {
  name: 'gcstatus', aliases: ['gc'], category: 'group', description: 'Show group info.',
  async run(ctx) {
    if (!(await needsGroup(ctx))) return
    try {
      const meta = await ctx.sock.groupMetadata(ctx.jid)
      const admins = meta.participants.filter((p) => p.admin).length
      await ctx.sock.sendMessage(ctx.jid, { text: `👥 *${meta.subject}*\n• ID: ${ctx.jid}\n• Members: ${meta.participants.length}\n• Admins: ${admins}\n• Created: ${meta.creation ? new Date(meta.creation * 1000).toLocaleDateString() : '—'}` })
    } catch (e) { await ctx.sock.sendMessage(ctx.jid, { text: `❌ ${e.message}` }) }
  },
}

/** gname — set group name. */
export const gname = {
  name: 'gname', aliases: ['setnameg'], category: 'group', description: 'Set the group name. Usage: .gname <name>',
  async run(ctx) {
    if (!(await needsGroup(ctx))) return
    const name = ctx.args.join(' ')
    if (!name) return ctx.sock.sendMessage(ctx.jid, { text: 'Usage: .gname <name>' })
    try { await ctx.sock.groupUpdateSubject(ctx.jid, name); await ctx.sock.sendMessage(ctx.jid, { text: `✅ Group name set: *${name}*` }) }
    catch (e) { await ctx.sock.sendMessage(ctx.jid, { text: `❌ ${e.message}` }) }
  },
}

/** gdesc — set group description. */
export const gdesc = {
  name: 'gdesc', aliases: ['setdesc'], category: 'group', description: 'Set the group description. Usage: .gdesc <text>',
  async run(ctx) {
    if (!(await needsGroup(ctx))) return
    const d = ctx.args.join(' ')
    if (!d) return ctx.sock.sendMessage(ctx.jid, { text: 'Usage: .gdesc <text>' })
    try { await ctx.sock.groupUpdateDescription(ctx.jid, d); await ctx.sock.sendMessage(ctx.jid, { text: '✅ Group description updated.' }) }
    catch (e) { await ctx.sock.sendMessage(ctx.jid, { text: `❌ ${e.message}` }) }
  },
}

/** gpp — set group picture. */
export const gpp = {
  name: 'gpp', aliases: ['setgpp'], category: 'group', description: 'Set group picture (reply to an image with .gpp).',
  async run(ctx) {
    if (!(await needsGroup(ctx))) return
    try {
      const { downloadMedia } = await import('../../lib/media.js')
      const file = await downloadMedia(ctx.sock, ctx.message, 'imageMessage')
      const fs = await import('fs')
      const buf = fs.default.readFileSync(file)
      try { fs.default.unlinkSync(file) } catch {}
      await ctx.sock.updateProfilePicture(ctx.jid, { url: 'data:image/jpeg;base64,' + buf.toString('base64') })
      await ctx.sock.sendMessage(ctx.jid, { text: '🖼️ Group picture updated.' })
    } catch (e) { await ctx.sock.sendMessage(ctx.jid, { text: `❌ ${e.message}` }) }
  },
}

/** removepp — remove group picture. */
export const removepp = {
  name: 'removepp', aliases: ['delpp'], category: 'group', description: 'Remove the group picture.',
  async run(ctx) {
    if (!(await needsGroup(ctx))) return
    try { await ctx.sock.removeProfilePicture?.(ctx.jid); await ctx.sock.sendMessage(ctx.jid, { text: '🗑️ Group picture removed.' }) }
    catch (e) { await ctx.sock.sendMessage(ctx.jid, { text: `❌ ${e.message}` }) }
  },
}

/** revoke — reset the group invite link. */
export const revoke = {
  name: 'revoke', aliases: ['revokeinvite'], category: 'group', description: 'Reset the group invite link.',
  async run(ctx) {
    if (!(await needsGroup(ctx))) return
    try { await ctx.sock.groupRevokeInvite(ctx.jid); await ctx.sock.sendMessage(ctx.jid, { text: '🔗 Invite link reset.' }) }
    catch (e) { await ctx.sock.sendMessage(ctx.jid, { text: `❌ ${e.message}` }) }
  },
}

/** tkick — kick the target (mention/reply/number arg). */
export const tkick = {
  name: 'tkick', aliases: ['kicksomeone'], category: 'group', description: 'Kick a user. Usage: .tkick @user',
  async run(ctx) {
    if (!(await needsGroup(ctx))) return
    const target = await resolveTarget(ctx)
    if (!target) return ctx.sock.sendMessage(ctx.jid, { text: 'Mention, reply to, or pass a number with .tkick' })
    try { await ctx.sock.groupParticipantsUpdate(ctx.jid, [target], 'remove'); await ctx.sock.sendMessage(ctx.jid, { text: `👢 Removed @${num(target)}` }) }
    catch (e) { await ctx.sock.sendMessage(ctx.jid, { text: `❌ ${e.message}` }) }
  },
}

/** listadmin — list group admins. */
export const listadmin = {
  name: 'listadmin', aliases: ['admins'], category: 'group', description: 'List group admins.',
  async run(ctx) {
    if (!(await needsGroup(ctx))) return
    try {
      const meta = await ctx.sock.groupMetadata(ctx.jid)
      const admins = meta.participants.filter((p) => p.admin).map((p) => `• @${num(p.id)}`)
      await ctx.sock.sendMessage(ctx.jid, { text: `👑 *ADMINS (${admins.length})*\n${admins.join('\n')}`, mentions: meta.participants.filter((p) => p.admin).map((p) => p.id) })
    } catch (e) { await ctx.sock.sendMessage(ctx.jid, { text: `❌ ${e.message}` }) }
  },
}

/** listonline — cannot know live online state; be honest but list members. */
export const listonline = {
  name: 'listonline', aliases: ['onlinegroup'], category: 'group', description: 'Group member presence.',
  async run(ctx) {
    if (!(await needsGroup(ctx))) return
    try {
      const meta = await ctx.sock.groupMetadata(ctx.jid)
      await ctx.sock.sendMessage(ctx.jid, { text: `👥 *${meta.subject}* has ${meta.participants.length} members.\n\nℹ️ WhatsApp doesn't expose live online state to bots, so I can't list who is currently online. But here are the members:\n${meta.participants.slice(0, 40).map((p) => `• @${num(p.id)}`).join('\n')}`, mentions: meta.participants.map((p) => p.id) })
    } catch (e) { await ctx.sock.sendMessage(ctx.jid, { text: `❌ ${e.message}` }) }
  },
}

/** listoffline — honest (no offline data). */
export const listoffline = {
  name: 'listoffline', aliases: ['offlinegroup'], category: 'group', description: 'Group members offline.',
  async run(ctx) {
    if (!(await needsGroup(ctx))) return
    await ctx.sock.sendMessage(ctx.jid, { text: 'ℹ️ WhatsApp doesn\'t expose offline/last-seen state to bots, so I can\'t list offline members.' })
  },
}

/** mute-user / unmute-user — no per-user mute in the bot API; honest. */
export const muteuser = {
  name: 'mute-user', aliases: ['muteuser'], category: 'group', description: 'Mute a user (per-group store).',
  async run(ctx) {
    if (!(await needsGroup(ctx))) return
    const target = await resolveTarget(ctx)
    if (!target) return ctx.sock.sendMessage(ctx.jid, { text: 'Mention or reply with .mute-user' })
    const muted = (await gset.get(`${ctx.jid}:muted`)) || []
    await gset.set(`${ctx.jid}:muted`, [...new Set([...muted, target])])
    await ctx.sock.sendMessage(ctx.jid, { text: `🔕 @${num(target)} muted in this group.` })
  },
}
export const unmuteuser = {
  name: 'unmute-user', aliases: ['unmuteuser'], category: 'group', description: 'Unmute a user.',
  async run(ctx) {
    if (!(await needsGroup(ctx))) return
    const target = await resolveTarget(ctx)
    if (!target) return ctx.sock.sendMessage(ctx.jid, { text: 'Mention or reply with .unmute-user' })
    const muted = (await gset.get(`${ctx.jid}:muted`)) || []
    await gset.set(`${ctx.jid}:muted`, muted.filter((m) => m !== target))
    await ctx.sock.sendMessage(ctx.jid, { text: `🔊 @${num(target)} unmuted.` })
  },
}

/** groupguard — extra protection toggle. */
const guardMake = (name, desc) => ({
  name, category: 'group', description: desc || `Toggle ${name} for this group.`,
  async run(ctx) {
    if (!(await needsGroup(ctx))) return
    const k = `${ctx.jid}:${name}`
    const cur = Boolean(await gset.get(k))
    await gset.set(k, !cur)
    await ctx.sock.sendMessage(ctx.jid, { text: `🛡️ *${name.toUpperCase()}* is now ${!cur ? 'ON' : 'OFF'}.` })
  },
})
export const groupguard = guardMake('groupguard')
export const antigm = guardMake('antigm')
export const antigcstatus = guardMake('antigcstatus')
export const antiedit = guardMake('antiedit')
export const antieditchat = guardMake('antieditchat')
