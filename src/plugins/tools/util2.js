/**
 * util2.js — real local utility commands (no API, genuine computation).
 */

/** calc — evaluate a math expression. */
export const calc = {
  name: 'calc', aliases: ['math', 'calculator'], category: 'utils', description: 'Calculate. Usage: .calc 2+2*5',
  run(ctx) {
    const expr = (ctx.args.join(' ') || ctx.body.replace(/^calc\s+/i, '')).replace(/[^0-9+\-*/.()%\s]/g, '')
    if (!expr) return ctx.sock.sendMessage(ctx.jid, { text: 'Usage: .calc 2+2*5' })
    try {
      // safe eval via Function with only the whitelisted expression
      const result = Function(`"use strict";return (${expr})`)()
      return ctx.sock.sendMessage(ctx.jid, { text: `🧮 ${expr} = *${result}*` })
    } catch { return ctx.sock.sendMessage(ctx.jid, { text: '⚠️ Invalid expression.' }) }
  },
}

/** ip — your IP (free api.ipify). */
export const ip = {
  name: 'ip', aliases: ['myip'], category: 'utils', description: 'Your public IP.',
  async run(ctx) {
    try { const r = await fetch('https://api.ipify.org?format=json'); const d = await r.json(); await ctx.sock.sendMessage(ctx.jid, { text: `🌐 Your IP: *${d.ip}*` }) }
    catch (e) { await ctx.sock.sendMessage(ctx.jid, { text: `⚠️ ${e.message}` }) }
  },
}

/** jid — your chat id. */
export const jid = {
  name: 'jid', aliases: ['id'], category: 'utils', description: 'Show your chat ID.',
  run(ctx) { return ctx.sock.sendMessage(ctx.jid, { text: `🆔 Your ID: ${ctx.sender}` }) },
}

/** time — current time. */
export const time = {
  name: 'time', aliases: ['datetime'], category: 'utils', description: 'Show the current time.',
  run(ctx) {
    const now = new Date()
    return ctx.sock.sendMessage(ctx.jid, { text: `🕐 *${now.toLocaleString()}*\nTimezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}` })
  },
}

/** biner — text to binary. */
export const biner = {
  name: 'biner', aliases: ['tobin'], category: 'utils', description: 'Text → binary.',
  run(ctx) {
    const t = ctx.args.join(' ') || ctx.body.replace(/^biner\s+/i, '')
    if (!t) return ctx.sock.sendMessage(ctx.jid, { text: 'Usage: .biner <text>' })
    const b = [...t].map((c) => c.charCodeAt(0).toString(2).padStart(8, '0')).join(' ')
    return ctx.sock.sendMessage(ctx.jid, { text: `🔢 Binary:\n${b}` })
  },
}

/** unbiner — binary to text. */
export const unbiner = {
  name: 'unbiner', aliases: ['bintotext'], category: 'utils', description: 'Binary → text.',
  run(ctx) {
    const t = ctx.args.join(' ') || ctx.body.replace(/^[a-z]+\s+/i, '')
    if (!t) return ctx.sock.sendMessage(ctx.jid, { text: 'Usage: .unbiner <binary>' })
    try {
      const s = t.split(/\s+/).map((b) => String.fromCharCode(parseInt(b, 2))).join('')
      return ctx.sock.sendMessage(ctx.jid, { text: `🔤 Decoded:\n${s}` })
    } catch { return ctx.sock.sendMessage(ctx.jid, { text: '⚠️ Invalid binary.' }) }
  },
}

/** random — random number between a and b. */
export const random = {
  name: 'random', aliases: ['rand'], category: 'utils', description: 'Random number. Usage: .random 1 100',
  run(ctx) {
    const a = Number(ctx.args[0]) || 1
    const b = Number(ctx.args[1]) || 100
    const v = Math.floor(Math.random() * (b - a + 1)) + a
    return ctx.sock.sendMessage(ctx.jid, { text: `🎲 Random: *${v}* (${a}-${b})` })
  },
}
