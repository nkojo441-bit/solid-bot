import { downloadMedia, imageToSticker, runFfmpeg } from '../../lib/media.js'
import fs from 'fs'

const typeFrom = (m) =>
  m?.message?.videoMessage ? 'videoMessage' :
  m?.message?.imageMessage ? 'imageMessage' :
  m?.message?.audioMessage ? 'audioMessage' : null

/** tomp3 — convert audio/video to mp3. */
export const tomp3 = {
  name: 'tomp3', aliases: ['mp3'], category: 'converter', description: 'Convert a reply audio/video to MP3.',
  async run(ctx) {
    const t = typeFrom(ctx.message)
    if (!['audioMessage', 'videoMessage'].includes(t)) return ctx.sock.sendMessage(ctx.jid, { text: 'Reply to an audio/video message with .tomp3' })
    try {
      const file = await downloadMedia(ctx.sock, ctx.message, t)
      const out = file.replace(/\.[^.]+$/, '.mp3')
      await runFfmpeg(file, out, ['-vn', '-b:a', '128k', '-f', 'mp3'])
      const buf = fs.readFileSync(out); try { fs.unlinkSync(out) } catch {}
      await ctx.sock.sendMessage(ctx.jid, { audio: buf, mimetype: 'audio/mp4', fileName: 'audio.mp3' })
    } catch (e) { await ctx.sock.sendMessage(ctx.jid, { text: `❌ ${e.message}` }) }
  },
}

/** ptv — convert a video/image/sticker to a ptv (video note). */
export const ptv = {
  name: 'ptv', aliases: ['vp'], category: 'converter', description: 'Convert a reply video to a video-note (PTV).',
  async run(ctx) {
    const t = typeFrom(ctx.message)
    if (t !== 'videoMessage') return ctx.sock.sendMessage(ctx.jid, { text: 'Reply to a video with .ptv' })
    try {
      const file = await downloadMedia(ctx.sock, ctx.message, t)
      const out = file.replace(/\.[^.]+$/, '.ptv.mp4')
      await runFfmpeg(file, out, ['-vf', 'scale=960:960:force_original_aspect_ratio=decrease', '-c:v', 'libx264', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', '-f', 'mp4'])
      const buf = fs.readFileSync(out); try { fs.unlinkSync(out) } catch {}
      await ctx.sock.sendMessage(ctx.jid, { video: buf, gifPlayback: false, ptt: true, mimetype: 'video/mp4' })
    } catch (e) { await ctx.sock.sendMessage(ctx.jid, { text: `❌ ${e.message}` }) }
  },
}

/** doc — send the reply media as a document. */
export const doc = {
  name: 'doc', aliases: ['document'], category: 'converter', description: 'Send a reply media as a document.',
  async run(ctx) {
    const t = typeFrom(ctx.message)
    if (!t) return ctx.sock.sendMessage(ctx.jid, { text: 'Reply to a media message with .doc' })
    try {
      const file = await downloadMedia(ctx.sock, ctx.message, t)
      const buf = fs.readFileSync(file); try { fs.unlinkSync(file) } catch {}
      await ctx.sock.sendMessage(ctx.jid, { document: buf, caption: '📄 ' + ctx.args.join(' ') || 'document' })
    } catch (e) { await ctx.sock.sendMessage(ctx.jid, { text: `❌ ${e.message}` }) }
  },
}

/** take/crop — crop an image to a given size. */
export const take = {
  name: 'take', aliases: ['crop', 'resize'], category: 'converter', description: 'Resize an image. Usage: .take <width>x<height> (reply to image)',
  async run(ctx) {
    const t = typeFrom(ctx.message)
    if (t !== 'imageMessage') return ctx.sock.sendMessage(ctx.jid, { text: 'Reply to an image with .take <w>x<h>' })
    const [w, h] = (ctx.args[0] || '').split('x').map(Number)
    if (!w || !h) return ctx.sock.sendMessage(ctx.jid, { text: 'Usage: .take 300x300' })
    try {
      const file = await downloadMedia(ctx.sock, ctx.message, t)
      const sharp = (await import('sharp')).default
      const out = file.replace(/\.[^.]+$/, '.resized.jpg')
      await sharp(file).resize(w, h, { fit: 'cover' }).toFile(out)
      const buf = fs.readFileSync(out); try { fs.unlinkSync(file) } catch {}; try { fs.unlinkSync(out) } catch {}
      await ctx.sock.sendMessage(ctx.jid, { image: buf, caption: `✅ ${w}x${h}` })
    } catch (e) { await ctx.sock.sendMessage(ctx.jid, { text: `❌ ${e.message}` }) }
  },
}

/** tovv — convert sticker/image into a video note or video. Simplest: sticker → image. */
export const tovn = {
  name: 'tovn', category: 'converter', description: 'Convert a reply image/sticker to a video-note.',
  async run(ctx) {
    const t = typeFrom(ctx.message)
    if (t !== 'imageMessage' && !ctx.message?.message?.stickerMessage) return ctx.sock.sendMessage(ctx.jid, { text: 'Reply to an image/sticker with .tovn' })
    try {
      const file = t ? await downloadMedia(ctx.sock, ctx.message, t) : null
      // Read raw buffer from sticker
      const buf = file ? fs.readFileSync(file) : (await import('baileys')).downloadMediaMessage(ctx.message)
      const tmpImg = `/tmp/vn-${Date.now()}.jpg`
      fs.writeFileSync(tmpImg, buf)
      const out = `/tmp/vn-${Date.now()}.mp4`
      await runFfmpeg(tmpImg, out, ['-loop', '1', '-t', '3', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-f', 'mp4'])
      const v = fs.readFileSync(out)
      try { fs.unlinkSync(tmpImg) } catch {}; try { fs.unlinkSync(out) } catch {}; if (file) try { fs.unlinkSync(file) } catch {}
      await ctx.sock.sendMessage(ctx.jid, { video: v, gifPlayback: false, ptt: true })
    } catch (e) { await ctx.sock.sendMessage(ctx.jid, { text: `❌ ${e.message}` }) }
  },
}
