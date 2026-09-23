import { store } from '../../lib/database.js'

const notes = store('notes')

const keyFor = (ctx) => `${ctx.sender}:${(ctx.args[0] || '').toLowerCase()}`

/** addnote — save a note (owner-scoped). */
export const addnote = {
  name: 'addnote', aliases: ['note'], category: 'utils', description: 'Save a note. Usage: .addnote <name> <text>',
  async run(ctx) {
    const name = (ctx.args[0] || '').toLowerCase()
    const text = ctx.args.slice(1).join(' ')
    if (!name || !text) return ctx.sock.sendMessage(ctx.jid, { text: 'Usage: .addnote <name> <note text>' })
    await notes.set(`${ctx.sender}:${name}`, text)
    await ctx.sock.sendMessage(ctx.jid, { text: `📝 Saved note *${name}*.` })
  },
}

/** getnote — read a note. */
export const getnote = {
  name: 'getnote', aliases: ['noteget'], category: 'utils', description: 'Read a note. Usage: .getnote <name>',
  async run(ctx) {
    const name = (ctx.args[0] || '').toLowerCase()
    if (!name) return ctx.sock.sendMessage(ctx.jid, { text: 'Usage: .getnote <name>' })
    const v = await notes.get(`${ctx.sender}:${name}`)
    if (!v) return ctx.sock.sendMessage(ctx.jid, { text: `No note named *${name}*.` })
    await ctx.sock.sendMessage(ctx.jid, { text: `📝 *${name}*\n${v}` })
  },
}

/** allnotes — list notes. */
export const allnotes = {
  name: 'allnotes', aliases: ['notes'], category: 'utils', description: 'List your notes.',
  async run(ctx) {
    const all = await notes.all()
    const mine = Object.keys(all).filter((k) => k.startsWith(ctx.sender + ':'))
    if (!mine.length) return ctx.sock.sendMessage(ctx.jid, { text: 'You have no notes. Use .addnote.' })
    const text = mine.map((k) => `• ${k.split(':')[1]}`).join('\n')
    await ctx.sock.sendMessage(ctx.jid, { text: `📒 *MY NOTES*\n${text}` })
  },
}

/** delnote — delete a note. */
export const delnote = {
  name: 'delnote', aliases: ['deln'], category: 'utils', description: 'Delete a note. Usage: .delnote <name>',
  async run(ctx) {
    const name = (ctx.args[0] || '').toLowerCase()
    if (!name) return ctx.sock.sendMessage(ctx.jid, { text: 'Usage: .delnote <name>' })
    await notes.delete(`${ctx.sender}:${name}`)
    await ctx.sock.sendMessage(ctx.jid, { text: `🗑️ Deleted note *${name}*.` })
  },
}
