import { store } from '../../lib/database.js'
import { isOwner, numOf } from '../../lib/utils.js'

const cfg = store('botcfg')
const gset = store('groupset')
const banStore = store('banlist')
const modStore = store('mods')

const ownerOnly = async (ctx, msg = '🔒 Owner only.') => {
  if (isOwner(ctx.sender)) return true
  await ctx.sock.sendMessage(ctx.jid, { text: msg })
  return false
}
const target = (ctx) => ctx.message?.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]

/** setsudo — add a sudo user (owner). */
export const setsudo = {
  name: 'setsudo', category: 'bot', description: 'Add a sudo user (owner). Usage: .setsudo @user',
  async run(ctx) {
    if (!(await ownerOnly(ctx))) return
    const t = target(ctx)
    if (!t) return ctx.sock.sendMessage(ctx.jid, { text: 'Mention a user with .setsudo' })
    const list = (await cfg.get('sudo')) || []
    if (list.includes(t)) return ctx.sock.sendMessage(ctx.jid, { text: 'Already sudo.' })
    await cfg.set('sudo', [...list, t])
    await ctx.sock.sendMessage(ctx.jid, { text: `✅ @${numOf(t)} is now sudo.` })
  },
}

export const delsudo = {
  name: 'delsudo', category: 'bot', description: 'Remove a sudo user. Usage: .delsudo @user',
  async run(ctx) {
    if (!(await ownerOnly(ctx))) return
    const t = target(ctx)
    if (!t) return ctx.sock.sendMessage(ctx.jid, { text: 'Mention a user with .delsudo' })
    await cfg.set('sudo', ((await cfg.get('sudo')) || []).filter((s) => s !== t))
    await ctx.sock.sendMessage(ctx.jid, { text: `♻️ @${numOf(t)} removed from sudo.` })
  },
}

export const getsudo = {
  name: 'getsudo', aliases: ['sudolist'], category: 'bot', description: 'List sudo users.',
  async run(ctx) {
    const list = (await cfg.get('sudo')) || []
    await ctx.sock.sendMessage(ctx.jid, { text: `🔑 *SUDO* (${list.length})\n${list.map((s) => `• @${numOf(s)}`).join('\n') || '(none)'}` })
  },
}

/** banlist — permanently banned users. */
export const banlist = {
  name: 'banlist', aliases: ['listban'], category: 'bot', description: 'List banned users.',
  async run(ctx) {
    const list = await banStore.all()
    const users = Object.keys(list).filter((k) => list[k])
    await ctx.sock.sendMessage(ctx.jid, { text: `🚫 *BANNED* (${users.length})\n${users.map((u) => `• @${numOf(u)}`).join('\n') || '(none)'}` })
  },
}

/** setmod/delmod/getmods — group moderators (per-group). */
export const setmod = {
  name: 'setmod', category: 'bot', description: 'Add a group moderator. Usage: .setmod @user',
  async run(ctx) {
    if (!(await ownerOnly(ctx))) return
    const t = target(ctx)
    if (!t) return ctx.sock.sendMessage(ctx.jid, { text: 'Mention a user with .setmod' })
    const list = (await cfg.get('mods')) || []
    if (list.includes(t)) return ctx.sock.sendMessage(ctx.jid, { text: 'Already a mod.' })
    await cfg.set('mods', [...list, t])
    await ctx.sock.sendMessage(ctx.jid, { text: `✅ @${numOf(t)} added as mod.` })
  },
}
export const delmod = {
  name: 'delmod', category: 'bot', description: 'Remove a moderator. Usage: .delmod @user',
  async run(ctx) {
    if (!(await ownerOnly(ctx))) return
    const t = target(ctx)
    if (!t) return ctx.sock.sendMessage(ctx.jid, { text: 'Mention a user with .delmod' })
    await cfg.set('mods', ((await cfg.get('mods')) || []).filter((s) => s !== t))
    await ctx.sock.sendMessage(ctx.jid, { text: `♻️ Mod removed.` })
  },
}
export const getmods = {
  name: 'getmods', aliases: ['modlist'], category: 'bot', description: 'List moderators.',
  async run(ctx) {
    const list = (await cfg.get('mods')) || []
    await ctx.sock.sendMessage(ctx.jid, { text: `🛡️ *MODS* (${list.length})\n${list.map((s) => `• @${numOf(s)}`).join('\n') || '(none)'}` })
  },
}

/** akick — auto-kick/allowlist helper toggles (per group). */
const toggle = async (ctx, name) => {
  if (!ctx.isGroup) return ctx.sock.sendMessage(ctx.jid, { text: 'Groups only.' })
  const k = `${ctx.jid}:${name}`
  const cur = Boolean(await gset.get(k))
  await gset.set(k, !cur)
  await ctx.sock.sendMessage(ctx.jid, { text: `🛡️ ${name} ${!cur ? 'ON' : 'OFF'}` })
}
export const allow = { name: 'allow', category: 'bot', description: 'Toggle allowlist mode for this group.', run: (ctx) => toggle(ctx, 'allow') }
export const allowgcadd = { name: 'allow-gcadd', aliases: ['allowgcadd'], category: 'bot', description: 'Toggle allow-list group-add.', run: (ctx) => toggle(ctx, 'allow-gcadd') }
export const antieditinfo = { name: 'antieditinfo', category: 'bot', description: 'Toggle edit-info logging.', run: (ctx) => toggle(ctx, 'antieditinfo') }
export const akick = { name: 'akick', category: 'bot', description: 'Toggle auto-kick for non-allowlisted.', run: (ctx) => toggle(ctx, 'akick') }
export const events = { name: 'events', category: 'bot', description: 'Toggle group event logging.', run: (ctx) => toggle(ctx, 'events') }
export const permit = { name: 'permit', category: 'bot', description: 'Toggle permit mode.', run: (ctx) => toggle(ctx, 'permit') }

/** gfilter — per-group filter words. */
export const gfilter = {
  name: 'gfilter', category: 'bot', description: 'Toggle per-group word filter.',
  run: (ctx) => toggle(ctx, 'gfilter'),
}
export const listfilters = {
  name: 'listfilters', aliases: ['filters'], category: 'bot', description: 'List filtered words for this group.',
  async run(ctx) {
    const words = (await gset.get(`${ctx.jid}:gfilter:words`)) || []
    await ctx.sock.sendMessage(ctx.jid, { text: `📝 *FILTER* (${words.length})\n${words.join(', ') || '(none — add with .gfilter set word1,word2)'}` })
  },
}

/** reset — clear this group's bot state. */
export const reset = {
  name: 'reset', aliases: ['freshen'], category: 'bot', description: 'Reset this group\'s settings (owner).',
  async run(ctx) {
    if (!(await ownerOnly(ctx))) return
    const keys = await gset.all()
    for (const k of Object.keys(keys)) if (k.startsWith(ctx.jid + ':')) await gset.set(k, '')
    await ctx.sock.sendMessage(ctx.jid, { text: '♻️ This group\'s settings were reset.' })
  },
}
