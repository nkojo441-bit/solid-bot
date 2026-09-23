import { downloadMedia } from '../../lib/media.js'

/** websearch — DuckDuckGo Instant Answer (free, no key). */
export const websearch = {
  name: 'websearch', aliases: ['search', 'googlesearch'], category: 'search', description: 'Search the web. Usage: .websearch <query>',
  async run(ctx) {
    const q = ctx.args.join(' ')
    if (!q) return ctx.sock.sendMessage(ctx.jid, { text: 'Usage: .websearch <query>' })
    try {
      const r = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_html=1`)
      const j = await r.json()
      const abstract = j.AbstractText
      const heading = j.Heading
      const url = j.AbstractURL
      const answer = j.Answer
      if (abstract || answer) {
        await ctx.sock.sendMessage(ctx.jid, { text: `🔎 *${heading || q}*\n\n${abstract || answer}\n\n${url || ''}` })
      } else {
        await ctx.sock.sendMessage(ctx.jid, { text: `🔎 No instant answer for "${q}". Try a more specific query.` })
      }
    } catch { await ctx.sock.sendMessage(ctx.jid, { text: '❌ Search API unavailable right now.' }) }
  },
}

/** img — keyword image (LoremFlickr, free no key). */
export const img = {
  name: 'img', aliases: ['image'], category: 'search', description: 'Fetch an image for a keyword. Usage: .img <query>',
  async run(ctx) {
    const q = ctx.args.join(' ')
    if (!q) return ctx.sock.sendMessage(ctx.jid, { text: 'Usage: .img <query>' })
    try {
      const url = `https://loremflickr.com/640/480/${encodeURIComponent(q)}`
      await ctx.sock.sendMessage(ctx.jid, { image: { url }, caption: `🖼️ ${q}` })
    } catch { await ctx.sock.sendMessage(ctx.jid, { text: '❌ Image fetch failed.' }) }
  },
}

/** wallpaper. */
export const wallpaper = {
  name: 'wallpaper', aliases: ['wp'], category: 'search', description: 'Fetch a wallpaper. Usage: .wallpaper <query>',
  async run(ctx) {
    const q = ctx.args.join(' ')
    if (!q) return ctx.sock.sendMessage(ctx.jid, { text: 'Usage: .wallpaper <query>' })
    try {
      const url = `https://loremflickr.com/1080/1920/${encodeURIComponent(q)}`
      await ctx.sock.sendMessage(ctx.jid, { image: { url }, caption: `🖼️ Wallpaper: ${q}` })
    } catch { await ctx.sock.sendMessage(ctx.jid, { text: '❌ Wallpaper fetch failed.' }) }
  },
}

/** gitclone — download a GitHub repo as a zip. */
export const gitclone = {
  name: 'gitclone', aliases: ['gclone'], category: 'search', description: 'Download a GitHub repo zip. Usage: .gitclone <owner>/<repo>',
  async run(ctx) {
    const { numOf } = await import('../../lib/utils.js')
    const arg = (ctx.args[0] || '').replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '').trim()
    if (!/^[\w.-]+\/[\w.-]+$/.test(arg)) return ctx.sock.sendMessage(ctx.jid, { text: 'Usage: .gitclone <owner>/<repo>' })
    try {
      const url = `https://github.com/${arg}/archive/refs/heads/main.zip`
      const res = await fetch(url)
      if (!res.ok) {
        const u2 = `https://github.com/${arg}/archive/refs/heads/master.zip`
        const r2 = await fetch(u2)
        if (!r2.ok) throw new Error('branch not found')
        await ctx.sock.sendMessage(ctx.jid, { document: Buffer.from(await r2.arrayBuffer()), mimetype: 'application/zip', fileName: `${arg.split('/')[1]}.zip`, caption: `📦 ${arg}` })
        return
      }
      await ctx.sock.sendMessage(ctx.jid, { document: Buffer.from(await res.arrayBuffer()), mimetype: 'application/zip', fileName: `${arg.split('/')[1]}.zip`, caption: `📦 ${arg}` })
    } catch { await ctx.sock.sendMessage(ctx.jid, { text: '❌ Repo not found.' }) }
  },
}
