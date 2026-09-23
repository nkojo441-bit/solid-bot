import { randomAnimeImage } from '../../apis/anime.js'

async function jikan(path) {
  const r = await fetch(`https://api.jikan.moe/v4/${path}`)
  if (r.status === 429) throw new Error('Jikan rate limit — wait a moment and retry.')
  if (!r.ok) throw new Error(`Jikan error ${r.status}.`)
  return r.json()
}

/** airing — currently airing anime. */
export const airing = {
  name: 'airing', aliases: ['airinganime'], category: 'anime', description: 'Top anime currently airing.',
  async run(ctx) {
    try {
      const d = await jikan('seasons/now?limit=8')
      const lines = (d?.data || []).slice(0, 8).map((a, i) => `${i + 1}. ${a.title} (${a.rating || '?'})`)
      await ctx.sock.sendMessage(ctx.jid, { text: `📺 *NOW AIRING*\n${lines.join('\n')}` })
    } catch (e) { await ctx.sock.sendMessage(ctx.jid, { text: `⚠️ ${e.message}` }) }
  },
}

/** character — search a character. */
export const character = {
  name: 'character', aliases: ['char'], category: 'anime', description: 'Look up an anime character. Usage: .character <name>',
  async run(ctx) {
    const q = ctx.args.join(' ')
    if (!q) return ctx.sock.sendMessage(ctx.jid, { text: 'Usage: .character <name>' })
    try {
      const d = await jikan(`characters?q=${encodeURIComponent(q)}&limit=1`)
      const c = d?.data?.[0]
      if (!c) return ctx.sock.sendMessage(ctx.jid, { text: '❌ Character not found.' })
      await ctx.sock.sendMessage(ctx.jid, {
        image: { url: c.images?.jpg?.image_url },
        caption: `👤 *${c.name}*\n${c.about ? decode(c.about).slice(0, 400) : ''}`,
      })
    } catch (e) { await ctx.sock.sendMessage(ctx.jid, { text: `⚠️ ${e.message}` }) }
  },
}

const decode = (s) => s.replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')

/** animegif — a random anime gif (real, falls back to image). */
export const animegif = {
  name: 'animegif', aliases: ['animgif'], category: 'anime', description: 'A random anime GIF.',
  async run(ctx) {
    try {
      const { buf, source } = await randomAnimeImage(ctx.args[0] ? ctx.args[0].toLowerCase() : 'neko')
      await ctx.sock.sendMessage(ctx.jid, { video: buf, gifPlayback: true, caption: `🎬 Anime GIF · ${source}` })
    } catch (e) { await ctx.sock.sendMessage(ctx.jid, { text: `⚠️ ${e.message}` }) }
  },
}

/** animenews — latest news for a searched anime. */
export const animenews = {
  name: 'animenews', aliases: ['anews'], category: 'anime', description: 'News for an anime. Usage: .animenews <name>',
  async run(ctx) {
    const q = ctx.args.join(' ')
    if (!q) return ctx.sock.sendMessage(ctx.jid, { text: 'Usage: .animenews <name>' })
    try {
      const s = await jikan(`anime?q=${encodeURIComponent(q)}&limit=1`)
      const id = s?.data?.[0]?.mal_id
      if (!id) return ctx.sock.sendMessage(ctx.jid, { text: '❌ Anime not found.' })
      const n = await jikan(`anime/${id}/news`)
      const items = (n?.data || []).slice(0, 3)
      if (!items.length) return ctx.sock.sendMessage(ctx.jid, { text: 'No news found.' })
      await ctx.sock.sendMessage(ctx.jid, { text: `📰 *${s.data[0].title}* — News\n\n${items.map((x) => `• ${decode(x.title)}`).join('\n')}` })
    } catch (e) { await ctx.sock.sendMessage(ctx.jid, { text: `⚠️ ${e.message}` }) }
  },
}

/** animerec — recommendations for an anime. */
export const animerec = {
  name: 'animerec', aliases: ['reco'], category: 'anime', description: 'Recommendations for an anime. Usage: .animerec <name>',
  async run(ctx) {
    const q = ctx.args.join(' ')
    if (!q) return ctx.sock.sendMessage(ctx.jid, { text: 'Usage: .animerec <name>' })
    try {
      const s = await jikan(`anime?q=${encodeURIComponent(q)}&limit=1`)
      const id = s?.data?.[0]?.mal_id
      if (!id) return ctx.sock.sendMessage(ctx.jid, { text: '❌ Anime not found.' })
      const rec = await jikan(`anime/${id}/recommendations`)
      const items = (rec?.data || []).slice(0, 5)
      if (!items.length) return ctx.sock.sendMessage(ctx.jid, { text: 'No recommendations.' })
      await ctx.sock.sendMessage(ctx.jid, { text: `⭐ *Recommendations for ${s.data[0].title}*\n\n${items.map((x) => `• ${x.entry?.title} (${x.votes || 0} votes)`).join('\n')}` })
    } catch (e) { await ctx.sock.sendMessage(ctx.jid, { text: `⚠️ ${e.message}` }) }
  },
}
