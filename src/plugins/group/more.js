import { store } from '../../lib/database.js'

/**
 * GROUP extra tools (mute, lock, kickall, leave, invite, goodbye, and the
 * anti-* auto-moderation toggles). Backed by a per-group settings store.
 */
const gset = store('groupset')

const needsGroup = (ctx) => {
  if (ctx.isGroup) return null
  ctx.sock.sendMessage(ctx.jid, { text: '⚠️ Groups only.' })
  return true
}

const num = (jid) => String(jid || '').replace(/@s\.whatsapp\.net|@g\.us/g, '')

/** Resolve a target: mention → reply → number arg. */
function resolveTarget(ctx) {
  const mention = ctx.message?.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
  if (mention) return mention
  const quoted = ctx.message?.message?.extendedTextMessage?.contextInfo?.quotedMessage
  if (quoted?.key?.participant) return quoted.key.participant
  if (ctx.args[0] && /\d{7,}/.test(ctx.args[0])) return `@${ctx.args[0].replace(/\D/g,'')}@s.whatsapp.net`
  return null
}

export const mute = {
  name: 'mute', aliases: ['muteall'], category: 'group', description: 'Lock who can send (owner/admin).',
  async run(ctx) {
    if (needsGroup(ctx)) return
    const on = !( await gset.get(`${ctx.jid}:mute`) )
    await gset.set(`${ctx.jid}:mute`, on)
    await ctx.sock.sendMessage(ctx.jid, { text: `🔇 Group is now ${on ? 'MUTED (admins only)' : 'UNMUTED'}.` })
  },
}

export const unmute = {
  name: 'unmute', category: 'group', description: 'Unlock the group for everyone.',
  async run(ctx) {
    if (needsGroup(ctx)) return
    await gset.set(`${ctx.jid}:mute`, false)
    await ctx.sock.groupSettingUpdate(ctx.jid, 'not_announcement')
    await ctx.sock.sendMessage(ctx.jid, { text: '🔊 Group is UNMUTED for everyone.' })
  },
}

export const lock = {
  name: 'lock', category: 'group', description: 'Restrict the group (announcement mode).',
  async run(ctx) {
    if (needsGroup(ctx)) return
    try { await ctx.sock.groupSettingUpdate(ctx.jid, 'announcement'); await ctx.sock.sendMessage(ctx.jid, { text: '🔒 Group locked — admins only.' }) }
    catch (e) { await ctx.sock.sendMessage(ctx.jid, { text: `❌ ${e.message}` }) }
  },
}

export const unlock = {
  name: 'unlock', category: 'group', description: 'Open the group to everyone.',
  async run(ctx) {
    if (needsGroup(ctx)) return
    try { await ctx.sock.groupSettingUpdate(ctx.jid, 'not_announcement'); await ctx.sock.sendMessage(ctx.jid, { text: '🔓 Group unlocked.' }) }
    catch (e) { await ctx.sock.sendMessage(ctx.jid, { text: `❌ ${e.message}` }) }
  },
}

export const kickall = {
  name: 'kickall', category: 'group', description: 'Kick every non-admin member.',
  async run(ctx) {
    if (needsGroup(ctx)) return
    try {
      const meta = await ctx.sock.groupMetadata(ctx.jid)
      const admins = new Set((meta.participants || []).filter((p) => p.admin).map((p) => p.id))
      const members = (meta.participants || []).map((p) => p.id)
        .filter((id) => !admins.has(id) && !id.includes(ctx.sock?.user?.id?.split(':')[0]))
      if (!members.length) return ctx.sock.sendMessage(ctx.jid, { text: 'No non-admin members to kick.' })
      await ctx.sock.groupParticipantsUpdate(ctx.jid, members, 'remove')
      await ctx.sock.sendMessage(ctx.jid, { text: `👢 Kicked ${members.length} member(s).` })
    } catch (e) { await ctx.sock.sendMessage(ctx.jid, { text: `❌ ${e.message}` }) }
  },
}

export const leave = {
  name: 'leave', aliases: ['out'], category: 'group', description: 'Make the bot leave the group.',
  async run(ctx) {
    if (needsGroup(ctx)) return
    await ctx.sock.sendMessage(ctx.jid, { text: '👋 Goodbye!' })
    await ctx.sock.groupLeave(ctx.jid)
  },
}

export const invite = {
  name: 'invite', aliases: ['link'], category: 'group', description: 'Get the group invite link.',
  async run(ctx) {
    if (needsGroup(ctx)) return
    try { const code = await ctx.sock.groupInviteCode(ctx.jid); await ctx.sock.sendMessage(ctx.jid, { text: `🔗 Invite: https://chat.whatsapp.com/${code}` }) }
    catch (e) { await ctx.sock.sendMessage(ctx.jid, { text: `❌ ${e.message}` }) }
  },
}

export const goodbye = {
  name: 'goodbye', category: 'group', description: 'Toggle goodbye message for this group.',
  async run(ctx) {
    if (needsGroup(ctx)) return
    const cur = !( await gset.get(`${ctx.jid}:goodbye`) )
    await gset.set(`${ctx.jid}:goodbye`, cur)
    await ctx.sock.sendMessage(ctx.jid, { text: `👋 Goodbye messages: ${cur ? 'ON' : 'OFF'}` })
  },
}

export const welcome = {
  name: 'welcome', category: 'group', description: 'Toggle welcome message for this group.',
  async run(ctx) {
    if (needsGroup(ctx)) return
    const cur = !( await gset.get(`${ctx.jid}:welcome`) )
    await gset.set(`${ctx.jid}:welcome`, cur)
    await ctx.sock.sendMessage(ctx.jid, { text: `👋 Welcome messages: ${cur ? 'ON' : 'OFF'}` })
  },
}

export const kickr = {
  name: 'kickr', aliases: ['kickreply'], category: 'group', description: 'Kick the person you replied to.',
  async run(ctx) {
    if (needsGroup(ctx)) return
    const target = resolveTarget(ctx)
    if (!target) return ctx.sock.sendMessage(ctx.jid, { text: '📝 Reply to the person to kick: .kickr' })
    await ctx.sock.groupParticipantsUpdate(ctx.jid, [target], 'remove')
    await ctx.sock.sendMessage(ctx.jid, { text: `👢 Kicked @${num(target)}`, mentions: [target] })
  },
}

export const tag = {
  name: 'tag', category: 'group', description: 'Mention a specific user. Usage: .tag @user message',
  async run(ctx) {
    if (needsGroup(ctx)) return
    const target = resolveTarget(ctx) || ctx.args[0]?.replace(/\D/g, '')
    if (!target) return ctx.sock.sendMessage(ctx.jid, { text: 'Usage: .tag @user message' })
    const jid = target.includes('@') ? target : `@${target}@s.whatsapp.net`
    const msg = ctx.args.slice(1).join(' ') || 'you are mentioned'
    await ctx.sock.sendMessage(ctx.jid, { text: `@${num(jid)} ${msg}`, mentions: [jid] })
  },
}
