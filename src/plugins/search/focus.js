import { downloadMedia } from '../../lib/media.js'
import fs from 'fs'

/** ytsearch — search YouTube (free no-key proxy). */
export const ytsearch = {
  name: 'ytsearch', aliases: ['ytq'], category: 'search',
  description: 'Search YouTube. Usage: .ytsearch <query>',
  async run(ctx) {
    const q = ctx.args.join(' ')
    if (!q) return ctx.sock.sendMessage(ctx.jid, { text: 'Usage: .ytsearch <query>' })
    try {
      const r = await fetch(`https://yt.lemnoslife.com/videos?part=snippet&type=video&q=${encodeURIComponent(q)}&maxResults=5`)
      const d = await r.json()
      const items = d?.items || []
      if (!items.length) return ctx.sock.sendMessage(ctx.jid, { text: `❌ No results for "${q}".` })
      await ctx.sock.sendMessage(ctx.jid, {
        text: `▶️ *YouTube results for "${q}"*\n\n${items.map((it, i) =>
          `${i + 1}. ${it.snippet?.title || it.title}\n    ↳ ${it.id?.videoId ? `https://youtu.be/${it.id.videoId}` : ''}`
        ).join('\n')}`,
      })
    } catch {
      await ctx.sock.sendMessage(ctx.jid, { text: '❌ YouTube search unavailable right now.' })
    }
  },
}

/** ytinfo — info about a YouTube video. */
export const ytinfo = {
  name: 'ytinfo', aliases: ['ytv'], category: 'search',
  description: 'YouTube video info. Usage: .ytinfo <url or id>',
  async run(ctx) {
    const q = ctx.args.join(' ')
    if (!q) return ctx.sock.sendMessage(ctx.jid, { text: 'Usage: .ytinfo <url or id>' })
    const id = (q.match(/[?&]v=([\w-]{11})/) || q.match(/(?:youtu\.be\/|shorts\/)([\w-]{11})/) || [null, q])[1]
    try {
      const r = await fetch(`https://yt.lemnoslife.com/videos?part=snippet,statistics&id=${encodeURIComponent(id)}`)
      const d = await r.json()
      const v = d?.items?.[0]
      if (!v) return ctx.sock.sendMessage(ctx.jid, { text: '❌ Video not found.' })
      await ctx.sock.sendMessage(ctx.jid, {
        image: { url: v.snippet?.thumbnails?.default?.url },
        caption: `▶️ *${v.snippet?.title}*\n👁 Views: ${Number(v.statistics?.viewCount || 0).toLocaleString()}\n👍 Likes: ${Number(v.statistics?.likeCount || 0).toLocaleString()}`,
      })
    } catch {
      await ctx.sock.sendMessage(ctx.jid, { text: '❌ YouTube info unavailable right now.' })
    }
  },
}

/** imageinfo — inspect a reply image. */
export const imageinfo = {
  name: 'imageinfo', category: 'search', description: 'Inspect a reply image.',
  async run(ctx) {
    try {
      const t = ctx.message?.message?.imageMessage ? 'imageMessage' : null
      if (!t) return ctx.sock.sendMessage(ctx.jid, { text: 'Reply to an image with .imageinfo' })
      const file = await downloadMedia(ctx.sock, ctx.message, t)
      const size = fs.statSync(file).size
      const { fileTypeFromBuffer } = await import('file-type')
      const ft = await fileTypeFromBuffer(fs.readFileSync(file))
      try { fs.unlinkSync(file) } catch {}
      await ctx.sock.sendMessage(ctx.jid, {
        text: `🖼️ *Image info*\n• MIME: ${ft?.mime || 'unknown'}\n• Ext: ${ft?.ext || 'unknown'}\n• Size: ${size} bytes`,
      })
    } catch (e) {
      await ctx.sock.sendMessage(ctx.jid, { text: `❌ ${e.message}` })
    }
  },
}