import { numOf } from '../../lib/utils.js'

/** joke — real joke from the free Official Joke API. */
export const joke = {
  name: 'joke', category: 'fun', description: 'Get a random joke.',
  async run(ctx) {
    try {
      const r = await fetch('https://official-joke-api.appspot.com/random_joke')
      const j = await r.json()
      const txt = j.question ? `${j.setup}\n\n${j.punchline}` : j.joke || 'no joke'
      await ctx.sock.sendMessage(ctx.jid, { text: txt })
    } catch { await ctx.sock.sendMessage(ctx.jid, { text: '❌ Could not fetch a joke right now.' }) }
  },
}

const PICKUPS = [
  'Are you a parking ticket? Because you have FINE written all over you.',
  'Do you have a map? I keep getting lost in your eyes.',
  'Is your name Google? Because you are everything I\'m searching for.',
  'If you were a vegetable, you\'d be a cute-cumber.',
  'Are you a magician? Because whenever I look at you, everyone else disappears.',
  'You must be made of chocolate, because I can\'t take my eyes off you.',
  'Do you have a Band-Aid? I just scraped my knee falling for you.',
  'Is it hot in here, or is it just you?',
  'Are you Wi-Fi? Because I\'m feeling a connection.',
]
export const pickupline = {
  name: 'pickupline', aliases: ['pickup'], category: 'fun', description: 'Get a cheesy pick-up line.',
  run: async (ctx) => { await ctx.sock.sendMessage(ctx.jid, { text: PICKUPS[Math.floor(Math.random() * PICKUPS.length)] }) },
}

/** ship — compatibility "score" between two people. */
export const ship = {
  name: 'ship', category: 'fun', description: 'Measure compatibility. Usage: .ship <a> <b> (or two @mentions)',
  async run(ctx) {
    const mentions = ctx.message?.message?.extendedTextMessage?.contextInfo?.mentionedJid || []
    const [a, b] = mentions.length ? [numOf(mentions[0]), numOf(mentions[1] || ctx.sender)] : ctx.args.slice(0, 2)
    if (!a || !b) return ctx.sock.sendMessage(ctx.jid, { text: 'Usage: .ship @alice @bob  (or .ship <name1> <name2>)' })
    const pct = Math.floor(Math.random() * 101)
    const emoji = pct >= 85 ? '💖' : pct >= 60 ? '💗' : pct >= 40 ? '💕' : '💔'
    await ctx.sock.sendMessage(ctx.jid, { text: `💞 *Ship Check*\n${a} + ${b}\n\nCompatibility: *${pct}%* ${emoji}` })
  },
}

const INSULTS = [
  'You\'re proof that evolution can go in reverse.',
  'I\'d agree with you, but then we\'d both be wrong.',
  'You bring joy to everyone... by leaving the room.',
  'Your secrets are safe with me. I never listen anyway.',
  'You\'re not stupid, you just have bad luck thinking.',
  'You\'re the reason shampoo has instructions.',
]
export const insult = {
  name: 'insult', aliases: ['roast'], category: 'fun', description: 'Roast someone. Usage: .insult @user',
  async run(ctx) {
    const mention = ctx.message?.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
    const line = INSULTS[Math.floor(Math.random() * INSULTS.length)]
    await ctx.sock.sendMessage(ctx.jid, { text: `${mention ? `@${numOf(mention)} ` : ''}${line}`, mentions: mention ? [mention] : undefined })
  },
}

/** emojimix — combine two emoji (visual approximation). */
export const emojimix = {
  name: 'emojimix', category: 'fun', description: 'Combine two emoji. Usage: .emojimix 🤣 😍',
  async run(ctx) {
    const [a, b] = ctx.args
    if (!a || !b) return ctx.sock.sendMessage(ctx.jid, { text: 'Usage: .emojimix <emoji1> <emoji2>' })
    await ctx.sock.sendMessage(ctx.jid, { text: `${a} + ${b} = ${a}\u200b${b}` })
  },
}

/** country — info on a country (real free API). */
export const country = {
  name: 'country', aliases: ['countryinfo'], category: 'fun', description: 'Country info. Usage: .country <name>',
  async run(ctx) {
    const name = ctx.args.join(' ')
    if (!name) return ctx.sock.sendMessage(ctx.jid, { text: 'Usage: .country <name>' })
    try {
      const r = await fetch(`https://restcountries.com/v3.1/name/${encodeURIComponent(name)}`)
      if (!r.ok) throw new Error('not found')
      const [c] = await r.json()
      await ctx.sock.sendMessage(ctx.jid, {
        text: `🌍 *${c.name?.common}*\n• Capital: ${c.capital?.[0] || '—'}\n• Region: ${c.region}\n• Population: ${c.population?.toLocaleString()}\n• Currency: ${Object.values(c.currencies || {}).map((x) => x.name).join(', ')}\n• Flag: ${c.flag || ''}`,
      })
    } catch { await ctx.sock.sendMessage(ctx.jid, { text: '❌ Country not found.' }) }
  },
}

/** crypto — live price from CoinGecko (free, no key). */
export const crypto = {
  name: 'crypto', aliases: ['price'], category: 'fun', description: 'Live crypto price. Usage: .crypto bitcoin',
  async run(ctx) {
    const coin = (ctx.args[0] || 'bitcoin').toLowerCase()
    try {
      const r = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(coin)}&vs_currencies=usd`)
      const j = await r.json()
      const val = j[coin]
      if (!val) return ctx.sock.sendMessage(ctx.jid, { text: `❌ Could not find "${coin}". Try bitcoin, ethereum, dogecoin…` })
      await ctx.sock.sendMessage(ctx.jid, { text: `🪙 *${coin.toUpperCase()}*\n$${val.usd.toLocaleString()}` })
    } catch { await ctx.sock.sendMessage(ctx.jid, { text: '❌ Price API not available right now.' }) }
  },
}
