import {
  book as bookApi,
  github as githubApi,
  npm as npmApi,
  advice as adviceApi,
  fact as factApi,
} from '../../apis/extra.js'
import { bold } from '../../lib/utils.js'

/** book — real Open Library search. */
export const book = {
  name: 'book', aliases: ['searchbook'], category: 'search', description: 'Search a book. Usage: .book <title>',
  async run(ctx) {
    const q = ctx.args.join(' ') || ctx.body.replace(/^book\s+/i, '')
    if (!q) return ctx.sock.sendMessage(ctx.jid, { text: 'Usage: .book <title>' })
    try {
      const r = await bookApi(q)
      if (!r.length) return ctx.sock.sendMessage(ctx.jid, { text: `No books found for "${q}".` })
      const text = r.map((b, i) => `${i + 1}. *${b.title}*\n    ✍ ${b.author} · ${b.year} · ${b.pages}p`).join('\n\n')
      await ctx.sock.sendMessage(ctx.jid, { text: `📚 *"${q}"*\n\n${text}` })
    } catch (e) { await ctx.sock.sendMessage(ctx.jid, { text: `⚠️ ${e.message}` }) }
  },
}

/** github — real GitHub user lookup. */
export const github = {
  name: 'github', aliases: ['gh'], category: 'search', description: 'GitHub user info. Usage: .github <username>',
  async run(ctx) {
    const q = ctx.args[0]
    if (!q) return ctx.sock.sendMessage(ctx.jid, { text: 'Usage: .github <username>' })
    try {
      const u = await githubApi(q)
      await ctx.sock.sendMessage(ctx.jid, { text: `🐙 *${u.login}*\nName: ${u.name || '—'}\nBio: ${u.bio || '—'}\nRepos: ${u.repos}\nFollowers: ${u.followers}\n${u.url}` })
    } catch (e) { await ctx.sock.sendMessage(ctx.jid, { text: `⚠️ ${e.message}` }) }
  },
}

/** npm — real npm registry lookup. */
export const npmpkg = {
  name: 'npm', aliases: ['npmpkg'], category: 'search', description: 'npm package info. Usage: .npm <package>',
  async run(ctx) {
    const q = ctx.args[0]
    if (!q) return ctx.sock.sendMessage(ctx.jid, { text: 'Usage: .npm <package>' })
    try {
      const p = await npmApi(q)
      await ctx.sock.sendMessage(ctx.jid, { text: `📦 *${p.name}*\nVersion: ${p.latest}\n${p.description || ''}` })
    } catch (e) { await ctx.sock.sendMessage(ctx.jid, { text: `⚠️ ${e.message}` }) }
  },
}

/** advice — real adviceslip. */
export const advice = {
  name: 'advice', aliases: ['tip'], category: 'misc', description: 'Random piece of advice.',
  async run(ctx) {
    try { const a = await adviceApi(); await ctx.sock.sendMessage(ctx.jid, { text: `💡 ${a}` }) }
    catch (e) { await ctx.sock.sendMessage(ctx.jid, { text: `⚠️ ${e.message}` }) }
  },
}

/** fact — real uselessfacts. */
export const factc = {
  name: 'fact', aliases: ['uselessfact'], category: 'misc', description: 'Random fact.',
  async run(ctx) {
    try { const f = await factApi(); await ctx.sock.sendMessage(ctx.jid, { text: `📌 ${f}` }) }
    catch (e) { await ctx.sock.sendMessage(ctx.jid, { text: `⚠️ ${e.message}` }) }
  },
}

