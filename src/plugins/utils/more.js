import { shorten } from '../../apis/free.js'
import { numOf } from '../../lib/utils.js'

/** tinyurl / url — shorten a link. */
export const tinyurl = {
  name: 'tinyurl', aliases: ['shorturl', 'url'], category: 'utils', description: 'Shorten a URL. Usage: .tinyurl <url>',
  async run(ctx) {
    const u = ctx.args.join(' ')
    if (!/(https?:\/\/|www\.)/i.test(u)) return ctx.sock.sendMessage(ctx.jid, { text: 'Usage: .tinyurl <url>' })
    try { const s = await shorten(u); return ctx.sock.sendMessage(ctx.jid, { text: `🔗 ${s}` }) }
    catch { return ctx.sock.sendMessage(ctx.jid, { text: '❌ Could not shorten URL.' }) }
  },
}

/** rolldice — roll a die. */
export const rolldice = {
  name: 'rolldice', category: 'utils', description: 'Roll a die (1-6).',
  run: async (ctx) => { await ctx.sock.sendMessage(ctx.jid, { text: `🎲 *${1 + Math.floor(Math.random() * 6)}*` }) },
}

/** reaction / areact — react to a message. */
export const areact = {
  name: 'areact', aliases: ['react'], category: 'utils', description: 'React to a message. Usage: .areact <emoji> (reply to a message)',
  async run(ctx) {
    const emoji = ctx.args[0] || '👍'
    const quoted = ctx.message?.message?.extendedTextMessage?.contextInfo
    const key = quoted?.quotedMessage?.key
    try {
      if (key) await ctx.sock.sendMessage(ctx.jid, { react: { text: emoji, key } })
      else {
        const myKey = ctx.message?.key
        await ctx.sock.sendMessage(ctx.jid, { react: { text: emoji, key: myKey } })
      }
    } catch { await ctx.sock.sendMessage(ctx.jid, { text: '❌ Could not react.' }) }
  },
}

/** quotedinfo — info about the quoted/replied message. */
export const quotedinfo = {
  name: 'quotedinfo', aliases: ['qinfo'], category: 'utils', description: 'Info about the replied message.',
  async run(ctx) {
    const q = ctx.message?.message?.extendedTextMessage?.contextInfo
    if (!q?.quotedMessage) return ctx.sock.sendMessage(ctx.jid, { text: 'Reply to a message with .quotedinfo' })
    const sender = q.participant || q.remoteJid || 'unknown'
    const ts = q.quotedMessage?.messageTimestamp || (q.stanzaId ? '?' : '?')
    await ctx.sock.sendMessage(ctx.jid, { text: `📩 *Replied message*\n• From: @${numOf(sender)}\n• Type: ${Object.keys(q.quotedMessage)[0] || 'text'}\n• Timestamp: ${typeof ts === 'number' ? new Date(ts * 1000).toLocaleString() : ts}`, mentions: sender.includes('@') ? [sender] : undefined })
  },
}

/** element — periodic table lookup (built-in reference table). */
const ELEMENTS = {
  h: { n: 'Hydrogen', s: 'H', a: 1.008 }, he: { n: 'Helium', s: 'He', a: 4.003 },
  li: { n: 'Lithium', s: 'Li', a: 6.94 }, be: { n: 'Beryllium', s: 'Be', a: 9.012 },
  b: { n: 'Boron', s: 'B', a: 10.81 }, c: { n: 'Carbon', s: 'C', a: 12.011 },
  n: { n: 'Nitrogen', s: 'N', a: 14.007 }, o: { n: 'Oxygen', s: 'O', a: 15.999 },
  f: { n: 'Fluorine', s: 'F', a: 18.998 }, ne: { n: 'Neon', s: 'Ne', a: 20.18 },
  na: { n: 'Sodium', s: 'Na', a: 22.99 }, mg: { n: 'Magnesium', s: 'Mg', a: 24.305 },
  al: { n: 'Aluminium', s: 'Al', a: 26.982 }, si: { n: 'Silicon', s: 'Si', a: 28.085 },
  p: { n: 'Phosphorus', s: 'P', a: 30.974 }, s: { n: 'Sulfur', s: 'S', a: 32.06 },
  cl: { n: 'Chlorine', s: 'Cl', a: 35.45 }, k: { n: 'Potassium', s: 'K', a: 39.098 },
  ca: { n: 'Calcium', s: 'Ca', a: 40.078 }, fe: { n: 'Iron', s: 'Fe', a: 55.845 },
  cu: { n: 'Copper', s: 'Cu', a: 63.546 }, zn: { n: 'Zinc', s: 'Zn', a: 65.38 },
  ag: { n: 'Silver', s: 'Ag', a: 107.87 }, au: { n: 'Gold', s: 'Au', a: 196.97 },
}
export const element = {
  name: 'element', aliases: ['periodic'], category: 'utils', description: 'Periodic element lookup. Usage: .element <symbol or name>',
  async run(ctx) {
    const q = (ctx.args[0] || '').toLowerCase().trim()
    const el = ELEMENTS[q] || Object.values(ELEMENTS).find((e) => e.n.toLowerCase().startsWith(q))
    if (!el) return ctx.sock.sendMessage(ctx.jid, { text: 'Unknown element. Try a symbol like fe, au, h.' })
    await ctx.sock.sendMessage(ctx.jid, { text: `⚗️ *${el.n}* (${el.s})\nAtomic mass: ${el.a}` })
  },
}
