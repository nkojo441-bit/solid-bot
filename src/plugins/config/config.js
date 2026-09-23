import { setVar, getVar, delVar, allVars, SCHEMA } from '../../lib/vars.js'
import { isOwner } from '../../lib/utils.js'

/** Owner-gate helper: returns true if allowed, else sends a notice. */
async function ensureOwner(ctx) {
  if (isOwner(ctx.sender)) return true
  await ctx.sock.sendMessage(ctx.jid, { text: '🔒 Owner only.' })
  return false
}

export const setvar = {
  name: 'setvar', aliases: ['set'], category: 'config', description: 'Change a setting at runtime. Usage: .setvar KEY value',
  async run(ctx) {
    if (!(await ensureOwner(ctx))) return
    if (ctx.args.length < 2) {
      return ctx.sock.sendMessage(ctx.jid, {
        text: '📝 *Usage:* .setvar KEY value\n\n*Keys:*\n' +
          Object.entries(SCHEMA).map(([k, v]) => `• ${k} (${v.type === 'enum' ? v.values.join('/') : v.type})`).join('\n'),
      })
    }
    const [key, ...rest] = ctx.args
    try { const value = await setVar(key, rest.join(' ')); await ctx.sock.sendMessage(ctx.jid, { text: `✅ *${key.toUpperCase()}* set to *${value}*` }) }
    catch (e) { await ctx.sock.sendMessage(ctx.jid, { text: `❌ ${e.message}` }) }
  },
}

export const getvar = {
  name: 'getvar', aliases: ['get'], category: 'config', description: 'Read one setting. Usage: .getvar KEY',
  async run(ctx) {
    if (!(await ensureOwner(ctx))) return
    if (!ctx.args[0]) return ctx.sock.sendMessage(ctx.jid, { text: '📝 Usage: .getvar KEY' })
    const value = await getVar(ctx.args[0])
    if (value === undefined) return ctx.sock.sendMessage(ctx.jid, { text: `❌ Unknown var: ${ctx.args[0].toUpperCase()}` })
    await ctx.sock.sendMessage(ctx.jid, { text: `🔧 *${ctx.args[0].toUpperCase()}* = *${value}*` })
  },
}

export const delvar = {
  name: 'delvar', aliases: ['unset'], category: 'config', description: 'Reset a setting to its default. Usage: .delvar KEY',
  async run(ctx) {
    if (!(await ensureOwner(ctx))) return
    if (!ctx.args[0]) return ctx.sock.sendMessage(ctx.jid, { text: '📝 Usage: .delvar KEY' })
    const def = await delVar(ctx.args[0])
    await ctx.sock.sendMessage(ctx.jid, { text: `♻️ *${ctx.args[0].toUpperCase()}* reset to default (*${def}*)` })
  },
}

export const allvar = {
  name: 'allvar', aliases: ['vars', 'settings'], category: 'config', description: 'Show every setting.',
  async run(ctx) {
    if (!(await ensureOwner(ctx))) return
    const rows = (await allVars()).map((v) => `│ ${v.source === 'db' ? '🔵' : '⚪'} ${v.key}: *${v.value}*`).join('\n')
    await ctx.sock.sendMessage(ctx.jid, { text: `╭─── *BOT SETTINGS* ───\n${rows}\n╰──────────────\n\n🔵 = runtime change  ⚪ = from .env\nChange with: .setvar KEY value` })
  },
}

export const mode = {
  name: 'mode', category: 'config', description: 'Switch public/private/group/inbox. Usage: .mode public',
  async run(ctx) {
    if (!(await ensureOwner(ctx))) return
    const m = (ctx.args[0] || '').toLowerCase()
    if (!['public', 'private', 'group', 'inbox'].includes(m)) return ctx.sock.sendMessage(ctx.jid, { text: 'Usage: .mode public|private|group|inbox' })
    await setVar('MODE', m)
    await ctx.sock.sendMessage(ctx.jid, { text: `🔁 Mode set to *${m}*` })
  },
}
