import { download, sendMedia, backends } from '../../apis/downloader.js'

/** play — YouTube audio (gateway first, local yt-dlp fallback). */
export const play = {
  name: 'play', aliases: ['ytmp3', 'song', 'ytmusic'], category: 'downloader',
  description: 'Download YouTube audio. Usage: .play <song or url>',
  async run(ctx) {
    const q = ctx.args.join(' ')
    if (!q) return ctx.sock.sendMessage(ctx.jid, { text: 'Usage: .play <song or url>' })
    await ctx.sock.sendMessage(ctx.jid, { text: `🎵 Searching *${q}*…` })
    const r = await download('youtube', ctx, { audio: true })
    if (!r.ok) return ctx.sock.sendMessage(ctx.jid, { text: r.msg })
    await sendMedia(ctx.sock, ctx.jid, { ...r.data, type: 'audio' })
  },
}

/** video — YouTube video (gateway first, local yt-dlp fallback). */
export const video = {
  name: 'video', aliases: ['ym'], category: 'downloader',
  description: 'Download YouTube video. Usage: .video <url>',
  async run(ctx) {
    const q = ctx.args.join(' ')
    if (!q) return ctx.sock.sendMessage(ctx.jid, { text: 'Usage: .video <url>' })
    await ctx.sock.sendMessage(ctx.jid, { text: `🎬 Fetching *${q}*…` })
    const r = await download('youtube', ctx, { audio: false })
    if (!r.ok) return ctx.sock.sendMessage(ctx.jid, { text: r.msg })
    await sendMedia(ctx.sock, ctx.jid, { ...r.data, type: 'video' })
  },
}

/** lyrics — free lyrics from lyrics.ovh (no key, unchanged). */
export const lyrics = {
  name: 'lyrics', aliases: ['islyrics'], category: 'downloader',
  description: 'Get lyrics. Usage: .lyrics <artist - title>',
  async run(ctx) {
    let q = ctx.args.join(' ')
    if (!q) return ctx.sock.sendMessage(ctx.jid, { text: 'Usage: .lyrics <artist - title>' })
    let [artist, title] = q.split(' - ').map((s) => s.trim())
    if (!title) { title = artist; artist = '' }
    try {
      const r = await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`)
      if (!r.ok) throw new Error('not found')
      const d = await r.json()
      const lyr = (d.lyrics || '').slice(0, 3000)
      await ctx.sock.sendMessage(ctx.jid, { text: `🎤 *${(artist + ' ' + title).trim()}*\n\n${lyr}` })
    } catch {
      await ctx.sock.sendMessage(ctx.jid, { text: '❌ Lyrics not found for that song.' })
    }
  },
}

/** dlstatus — show which downloader backends are live (handy for owners). */
export const dlstatus = {
  name: 'dlstatus', aliases: ['dl-info', 'dlbackends'], category: 'downloader',
  description: 'Show which downloader backends are available (gateway vs local yt-dlp).',
  async run(ctx) {
    const b = await backends()
    const lines = [
      `🔌 *Downloader backends*`,
      `• BEMPSX gateway: ${b.gateway ? '✅ ready' : '— not configured'}`,
      `• Local yt-dlp:   ${b.local ? '✅ ready' : '— missing (run scripts/setup.js)'}`,
      '',
      b.gateway
        ? 'Gateway-first mode: all downloads try the gateway first, then fall back to yt-dlp.'
        : 'Local-only mode: set GATEWAY_URL + BOT_API_KEY in .env to enable the shared gateway.',
    ]
    await ctx.sock.sendMessage(ctx.jid, { text: lines.join('\n') })
  },
}