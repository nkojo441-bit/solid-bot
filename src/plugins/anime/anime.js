import { animeSearch, topAnime, mangaSearch, animeQuote } from '../../apis/extra.js'
import { bold } from '../../lib/utils.js'

/** anime — real MyAnimeList (Jikan) search. */
export const anime = {
  name: 'anime', aliases: ['searchanime'], category: 'anime', description: 'Search an anime. Usage: .anime <title>',
  async run(ctx) {
    const q = ctx.args.join(' ') || ctx.body.replace(/^anime\s+/i, '')
    if (!q) return ctx.sock.sendMessage(ctx.jid, { text: 'Usage: .anime <title>' })
    try {
      const r = await animeSearch(q)
      if (!r.length) return ctx.sock.sendMessage(ctx.jid, { text: `No anime found for "${q}".` })
      const text = r.map((a, i) => `${i + 1}. *${a.title}*\n    ${a.type || 'Anime'} · ⭐ ${a.score || '?'} · ${a.year || '?'} · ${a.episodes || '?'} eps`).join('\n\n')
      await ctx.sock.sendMessage(ctx.jid, { text: `🎬 *"${q}"*\n\n${text}` })
    } catch (e) { await ctx.sock.sendMessage(ctx.jid, { text: `⚠️ ${e.message}` }) }
  },
}

/** animequote — real animechan quote (no key). */
export const animequote = {
  name: 'animequote', aliases: ['aquote'], category: 'anime', description: 'Random anime quote.',
  async run(ctx) {
    try {
      const q = await animeQuote()
      if (!q) return ctx.sock.sendMessage(ctx.jid, { text: 'Could not fetch a quote right now.' })
      await ctx.sock.sendMessage(ctx.jid, { text: `"${q.content}"\n— ${q.character} (${q.anime})` })
    } catch (e) { await ctx.sock.sendMessage(ctx.jid, { text: `⚠️ ${e.message}` }) }
  },
}

/** topanime — real Jikan top anime. */
export const topanime = {
  name: 'topanime', aliases: ['top10anime'], category: 'anime', description: 'Top anime right now.',
  async run(ctx) {
    try {
      const r = await topAnime()
      if (!r.length) return ctx.sock.sendMessage(ctx.jid, { text: 'Could not fetch top anime.' })
      const text = r.map((a, i) => `${i + 1}. *${a.title}* — ⭐ ${a.score}`).join('\n')
      await ctx.sock.sendMessage(ctx.jid, { text: `🏆 *TOP ANIME*\n${text}` })
    } catch (e) { await ctx.sock.sendMessage(ctx.jid, { text: `⚠️ ${e.message}` }) }
  },
}

/** manga — real Jikan manga search. */
export const manga = {
  name: 'manga', aliases: ['searchmanga'], category: 'anime', description: 'Search a manga. Usage: .manga <title>',
  async run(ctx) {
    const q = ctx.args.join(' ')
    if (!q) return ctx.sock.sendMessage(ctx.jid, { text: 'Usage: .manga <title>' })
    try {
      const r = await mangaSearch(q)
      if (!r.length) return ctx.sock.sendMessage(ctx.jid, { text: `No manga found for "${q}".` })
      const text = r.map((a, i) => `${i + 1}. *${a.title}*\n    ${a.type || 'Manga'} · ⭐ ${a.score || '?'} · ${a.chapters || '?'} ch`).join('\n\n')
      await ctx.sock.sendMessage(ctx.jid, { text: `📖 *"${q}"*\n\n${text}` })
    } catch (e) { await ctx.sock.sendMessage(ctx.jid, { text: `⚠️ ${e.message}` }) }
  },
}
