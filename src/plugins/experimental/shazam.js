import { recognize, hasShazamKey } from '../../apis/shazam.js'
import { downloadMedia } from '../../lib/media.js'
import fs from 'fs'
import { experimental } from './index.js'

export const shazam = experimental({
  name: 'shazam', aliases: ['sz', 'recognize'], category: 'experimental',
  description: 'Identify a song from a reply audio. Usage: reply to audio with .shazam',
  async run(ctx) {
    if (!hasShazamKey()) {
      return ctx.sock.sendMessage(ctx.jid, {
        text: '🧪 *Shazam is experimental.*\n\nAdd `AUDD_API_KEY=<your-key>` to .env to enable.\nGet a free key at https://dashboard.audd.io (100 req/month).',
      })
    }

    const msg = ctx.message?.message
    const quoted = msg?.extendedTextMessage?.contextInfo?.quotedMessage
    const audioType =
      msg?.audioMessage ? 'audioMessage'
      : quoted?.audioMessage ? 'audioMessage'
      : null

    if (!audioType) {
      return ctx.sock.sendMessage(ctx.jid, { text: 'Reply to an audio message with `.shazam`.' })
    }

    await ctx.sock.sendMessage(ctx.jid, { text: '🎧 Listening…' })

    try {
      const target = quoted ? { message: quoted, key: ctx.message?.key } : ctx.message
      const file = await downloadMedia(ctx.sock, target, 'audioMessage')
      const buf = fs.readFileSync(file)
      try { fs.unlinkSync(file) } catch {}

      const r = await recognize(buf)
      if (!r.ok) return ctx.sock.sendMessage(ctx.jid, { text: `❌ ${r.msg}` })

      const s = r.result
      const lines = [
        `🎵 *${s.title}*`,
        `👤 ${s.artist}`,
        s.album ? `💿 ${s.album}` : '',
        s.release ? `📅 ${s.release}` : '',
        s.spotifyUrl ? `\n🔗 ${s.spotifyUrl}` : '',
      ].filter(Boolean)

      if (s.artwork) {
        try {
          const img = await fetch(s.artwork)
          if (img.ok) {
            const artBuf = Buffer.from(await img.arrayBuffer())
            return ctx.sock.sendMessage(ctx.jid, { image: artBuf, caption: lines.join('\n') })
          }
        } catch {}
      }

      await ctx.sock.sendMessage(ctx.jid, { text: lines.join('\n') })
    } catch (e) {
      await ctx.sock.sendMessage(ctx.jid, { text: `❌ ${e.message}` })
    }
  },
})