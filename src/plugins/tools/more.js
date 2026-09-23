import { store } from '../../lib/database.js'
import { isOwner, numOf } from '../../lib/utils.js'

const custom = store('custom')
const ownerOnly = async (ctx, msg = '🔒 Owner only.') => {
  if (isOwner(ctx.sender)) return true
  await ctx.sock.sendMessage(ctx.jid, { text: msg })
  return false
}

/** setcmd — create a custom command. Usage: .setcmd <name>|<reply text> ($1, $2 = args) */
export const setcmd = {
  name: 'setcmd', category: 'tools', description: 'Create a custom command. Usage: .setcmd <name>|<text> ($1 = arg)',
  async run(ctx) {
    if (!(await ownerOnly(ctx))) return
    const [name, ...rest] = ctx.args.join(' ').split('|').map((s) => s.trim())
    if (!name || !rest.length) return ctx.sock.sendMessage(ctx.jid, { text: 'Usage: .setcmd bake|Welcome to my server $1' })
    await custom.set(name, rest.join('|').trim())
    await ctx.sock.sendMessage(ctx.jid, { text: `✅ Custom command *${name}* saved.` })
  },
}

/** delcmd — delete a custom command. */
export const delcmd = {
  name: 'delcmd', category: 'tools', description: 'Delete a custom command. Usage: .delcmd <name>',
  async run(ctx) {
    if (!(await ownerOnly(ctx))) return
    const n = ctx.args[0]
    if (!n) return ctx.sock.sendMessage(ctx.jid, { text: 'Usage: .delcmd <name>' })
    await custom.set(n, '')
    await ctx.sock.sendMessage(ctx.jid, { text: `🗑️ Custom command *${n}* deleted.` })
  },
}

export const delcmds = {
  name: 'delcmds', category: 'tools', description: 'Delete all custom commands.',
  async run(ctx) {
    if (!(await ownerOnly(ctx))) return
    for (const k of Object.keys(await custom.all())) await custom.set(k, '')
    await ctx.sock.sendMessage(ctx.jid, { text: '🗑️ All custom commands deleted.' })
  },
}

/** listcmd — list custom commands. */
export const listcmd = {
  name: 'listcmd', aliases: ['cmds'], category: 'tools', description: 'List custom commands.',
  async run(ctx) {
    const all = await custom.all()
    const keys = Object.keys(all).filter((k) => all[k])
    await ctx.sock.sendMessage(ctx.jid, { text: `📋 *CUSTOM COMMANDS (${keys.length})*\n${keys.map((k) => `• ${k}`).join('\n') || '(none yet — use .setcmd)'}` })
  },
}
