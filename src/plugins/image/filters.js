import { downloadMedia, imageToSticker, runFfmpeg } from '../../lib/media.js'
import fs from 'fs'

const typeFrom = (m) => m?.message?.imageMessage ? 'imageMessage' : m?.message?.videoMessage ? 'videoMessage' : null
const sharpMod = () => import('sharp')


async function imageCtx(ctx, prompt) {
  const t = typeFrom(ctx.message)
  if (t !== 'imageMessage') return { err: 'Reply to an image first.' }
  const file = await downloadMedia(ctx.sock, ctx.message, t)
  return { file, sharp: (await sharpMod()).default }
}

/** black — black & white. */
export const blackw = {
  name: 'black', aliases: ['bw'], category: 'image', description: 'Black & white filter.',
  async run(ctx) {
    try {
      const c = await imageCtx(ctx); if (c.err) return ctx.sock.sendMessage(ctx.jid, { text: c.err })
      const out = c.file.replace(/\.[^.]+$/, '.bw.jpg')
      await c.sharp(c.file).grayscale().toFile(out)
      const buf = fs.readFileSync(out); try { fs.unlinkSync(c.file) } catch {}; try { fs.unlinkSync(out) } catch {}
      await ctx.sock.sendMessage(ctx.jid, { image: buf })
    } catch (e) { await ctx.sock.sendMessage(ctx.jid, { text: `❌ ${e.message}` }) }
  },
}

/** white — brighten to white. */
export const whitef = {
  name: 'white', category: 'image', description: 'Brighten/whiten an image.',
  async run(ctx) {
    try {
      const c = await imageCtx(ctx); if (c.err) return ctx.sock.sendMessage(ctx.jid, { text: c.err })
      const out = c.file.replace(/\.[^.]+$/, '.white.jpg')
      await c.sharp(c.file).modulate({ brightness: 1.35 }).toFile(out)
      const buf = fs.readFileSync(out); try { fs.unlinkSync(c.file) } catch {}; try { fs.unlinkSync(out) } catch {}
      await ctx.sock.sendMessage(ctx.jid, { image: buf })
    } catch (e) { await ctx.sock.sendMessage(ctx.jid, { text: `❌ ${e.message}` }) }
  },
}

/** compress — recompress an image. */
export const compress = {
  name: 'compress', aliases: ['zif'], category: 'image', description: 'Compress an image.',
  async run(ctx) {
    try {
      const c = await imageCtx(ctx); if (c.err) return ctx.sock.sendMessage(ctx.jid, { text: c.err })
      const out = c.file.replace(/\.[^.]+$/, '.c.jpg')
      await c.sharp(c.file).jpeg({ quality: 40, mozjpeg: true }).toFile(out)
      const buf = fs.readFileSync(out); try { fs.unlinkSync(c.file) } catch {}; try { fs.unlinkSync(out) } catch {}
      await ctx.sock.sendMessage(ctx.jid, { image: buf, caption: '🗜️ Compressed' })
    } catch (e) { await ctx.sock.sendMessage(ctx.jid, { text: `❌ ${e.message}` }) }
  },
}

/** exif — image metadata. */
export const exif = {
  name: 'exif', aliases: ['metadata'], category: 'image', description: 'Show image metadata.',
  async run(ctx) {
    try {
      const c = await imageCtx(ctx); if (c.err) return ctx.sock.sendMessage(ctx.jid, { text: c.err })
      const meta = await c.sharp(c.file).metadata()
      try { fs.unlinkSync(c.file) } catch {}
      await ctx.sock.sendMessage(ctx.jid, { text: `🖼️ *Metadata*\n• Format: ${meta.format}\n• Size: ${meta.width}x${meta.height}\n• Channels: ${meta.channels}\n• Space: ${meta.space || '—'}` })
    } catch (e) { await ctx.sock.sendMessage(ctx.jid, { text: `❌ ${e.message}` }) }
  },
}

/** photo — add a frame to an image. */
export const photof = {
  name: 'photo', aliases: ['frame'], category: 'image', description: 'Add a white frame to an image.',
  async run(ctx) {
    try {
      const c = await imageCtx(ctx); if (c.err) return ctx.sock.sendMessage(ctx.jid, { text: c.err })
      const out = c.file.replace(/\.[^.]+$/, '.ph.jpg')
      await c.sharp(c.file).extend({ top: 30, bottom: 30, left: 30, right: 30, background: '#ffffff' }).toFile(out)
      const buf = fs.readFileSync(out); try { fs.unlinkSync(c.file) } catch {}; try { fs.unlinkSync(out) } catch {}
      await ctx.sock.sendMessage(ctx.jid, { image: buf })
    } catch (e) { await ctx.sock.sendMessage(ctx.jid, { text: `❌ ${e.message}` }) }
  },
}

/** wm — watermark an image. */
export const wm = {
  name: 'wm', aliases: ['watermark'], category: 'image', description: 'Add a text watermark. Usage: .wm <text> (reply to an image)',
  async run(ctx) {
    const text = ctx.args.join(' ') || 'BempsX-Nova'
    try {
      const c = await imageCtx(ctx); if (c.err) return ctx.sock.sendMessage(ctx.jid, { text: c.err })
      const out = c.file.replace(/\.[^.]+$/, '.wm.png')
      const svg = Buffer.from(`<svg width="1200" height="800"><rect width="100%" height="100%" fill="rgba(0,0,0,0)"/><text x="50%" y="92%" font-size="60" font-family="Arial" fill="rgba(255,255,255,0.6)" text-anchor="middle">${text.replace(/</g, '&lt;')}</text></svg>`)
      await c.sharp(c.file).composite([{ input: svg }]).toFile(out)
      const buf = fs.readFileSync(out); try { fs.unlinkSync(c.file) } catch {}; try { fs.unlinkSync(out) } catch {}
      await ctx.sock.sendMessage(ctx.jid, { image: buf })
    } catch (e) { await ctx.sock.sendMessage(ctx.jid, { text: `❌ ${e.message}` }) }
  },
}

/** circlestk / roundstk — round sticker. */
const roundStk = (name) => ({
  name, category: 'image', description: 'Create a round sticker from an image.',
  async run(ctx) {
    try {
      const c = await imageCtx(ctx); if (c.err) return ctx.sock.sendMessage(ctx.jid, { text: c.err })
      const buf = await imageToSticker(c.file, { type: 'circle' })
      try { fs.unlinkSync(c.file) } catch {}
      await ctx.sock.sendMessage(ctx.jid, { sticker: buf })
    } catch (e) { await ctx.sock.sendMessage(ctx.jid, { text: `❌ ${e.message}` }) }
  },
})
export const circlestk = roundStk('circlestk')
export const roundstk = roundStk('roundstk')

/** gif — convert a video to a GIF. */
export const gif = {
  name: 'gif', category: 'image', description: 'Convert a reply video to a GIF.',
  async run(ctx) {
    const t = typeFrom(ctx.message)
    if (t !== 'videoMessage') return ctx.sock.sendMessage(ctx.jid, { text: 'Reply to a video with .gif' })
    try {
      const file = await downloadMedia(ctx.sock, ctx.message, t)
      const out = file.replace(/\.[^.]+$/, '.gif')
      await runFfmpeg(file, out, ['-vf', 'fps=12,scale=320:-1', '-loop', '0', '-f', 'gif'])
      const buf = fs.readFileSync(out); try { fs.unlinkSync(file) } catch {}; try { fs.unlinkSync(out) } catch {}
      await ctx.sock.sendMessage(ctx.jid, { video: buf, gifPlayback: true })
    } catch (e) { await ctx.sock.sendMessage(ctx.jid, { text: `❌ ${e.message}` }) }
  },
}

/** mp4 — convert an image/sticker to a short video. */
export const mp4 = {
  name: 'mp4', category: 'image', description: 'Convert an image to a short video.',
  async run(ctx) {
    const t = typeFrom(ctx.message)
    if (t !== 'imageMessage') return ctx.sock.sendMessage(ctx.jid, { text: 'Reply to an image with .mp4' })
    try {
      const file = await downloadMedia(ctx.sock, ctx.message, t)
      const out = file.replace(/\.[^.]+$/, '.mp4')
      await runFfmpeg(file, out, ['-loop', '1', '-t', '3', '-vf', 'scale=640:640:force_original_aspect_ratio=decrease', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-f', 'mp4'])
      const buf = fs.readFileSync(out); try { fs.unlinkSync(file) } catch {}; try { fs.unlinkSync(out) } catch {}
      await ctx.sock.sendMessage(ctx.jid, { video: buf })
    } catch (e) { await ctx.sock.sendMessage(ctx.jid, { text: `❌ ${e.message}` }) }
  },
}
