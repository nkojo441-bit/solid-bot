import {
  weather as weatherApi,
  currency as currencyApi,
  define as defineApi,
  wiki as wikiApi,
  shorten as shortenApi,
  catFact as catFactApi,
} from '../../apis/free.js'
import { bold } from '../../lib/utils.js'

/** weather — real Open-Meteo, no key. */
export const weather = {
  name: 'weather', aliases: ['cuaca', 'wttr'], category: 'tools', description: 'Weather for a city. Usage: .weather Lagos',
  async run(ctx) {
    const q = ctx.args.join(' ')
    if (!q) return ctx.sock.sendMessage(ctx.jid, { text: 'Usage: .weather <city>' })
    try {
      const w = await weatherApi(q)
      await ctx.sock.sendMessage(ctx.jid, {
        text: `🌤️ *Weather* (${w.place})\nTemp: ${w.temp}°C\nWind: ${w.wind} km/h\nDesc: ${w.desc}`,
      })
    } catch (e) {
      await ctx.sock.sendMessage(ctx.jid, { text: `⚠️ ${e.message}` })
    }
  },
}

/** currency — real open.er-api, no key. */
export const currency = {
  name: 'currency', aliases: ['fx', 'exchangerate'], category: 'tools', description: 'Convert currency. Usage: .currency 100 USD NGN',
  async run(ctx) {
    const [amt, from, to] = ctx.args
    if (!from || !to) return ctx.sock.sendMessage(ctx.jid, { text: 'Usage: .currency <amount> <from> <to>  e.g. .currency 100 USD NGN' })
    try {
      const r = await currencyApi(amt, from, to)
      await ctx.sock.sendMessage(ctx.jid, {
        text: `💱 ${bold(String(r.result.toFixed(2)))} ${r.to}\n(${r.from} → ${r.to} @ ${r.rate.toFixed(4)})`,
      })
    } catch (e) {
      await ctx.sock.sendMessage(ctx.jid, { text: `⚠️ ${e.message}` })
    }
  },
}

/** define — real dictionary API, no key. */
export const define = {
  name: 'define', aliases: ['word', 'dictionary'], category: 'tools', description: 'Define a word. Usage: .define hello',
  async run(ctx) {
    const w = ctx.args[0]
    if (!w) return ctx.sock.sendMessage(ctx.jid, { text: 'Usage: .define <word>' })
    try {
      const d = await defineApi(w)
      const lines = d.meanings.map((m) => `• *${m.part}*: ${m.defs[0] || '—'}`).join('\n')
      await ctx.sock.sendMessage(ctx.jid, { text: `📖 *${d.word}*${d.phonetic ? ' ' + d.phonetic : ''}\n${lines}` })
    } catch (e) {
      await ctx.sock.sendMessage(ctx.jid, { text: `⚠️ ${e.message}` })
    }
  },
}

/** wiki — real MediaWiki API, no key. */
export const wiki = {
  name: 'wiki', aliases: ['wikipedia'], category: 'tools', description: 'Search Wikipedia. Usage: .wiki baileys',
  async run(ctx) {
    const q = ctx.args.join(' ')
    if (!q) return ctx.sock.sendMessage(ctx.jid, { text: 'Usage: .wiki <topic>' })
    try {
      const results = await wikiApi(q)
      if (!results.length) return ctx.sock.sendMessage(ctx.jid, { text: `No results for "${q}".` })
      const text = results.map((r, i) => `${i + 1}. ${bold(r.title)}\n   ${r.snippet}`).join('\n\n')
      await ctx.sock.sendMessage(ctx.jid, { text: `📚 *Wikipedia* — "${q}"\n\n${text}` })
    } catch (e) {
      await ctx.sock.sendMessage(ctx.jid, { text: `⚠️ ${e.message}` })
    }
  },
}

/** shorten — real TinyURL, no key. */
export const shorten = {
  name: 'shorten', aliases: ['short', 'tinyurl'], category: 'tools', description: 'Shorten a URL. Usage: .shorten <url>',
  async run(ctx) {
    const url = ctx.args[0]
    if (!url) return ctx.sock.sendMessage(ctx.jid, { text: 'Usage: .shorten <url>' })
    try {
      const s = await shortenApi(url)
      await ctx.sock.sendMessage(ctx.jid, { text: `🔗 Shortened: ${bold(s)}` })
    } catch (e) {
      await ctx.sock.sendMessage(ctx.jid, { text: `⚠️ ${e.message}` })
    }
  },
}

/** catfact — fun fact (free). */
export const catfact = {
  name: 'catfact', category: 'tools', description: 'Random cat fact.',
  async run(ctx) {
    const f = await catFactApi()
    await ctx.sock.sendMessage(ctx.jid, { text: `🐱 ${f}` })
  },
}
