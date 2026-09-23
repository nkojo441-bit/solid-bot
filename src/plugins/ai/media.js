import { imagineUrl, qrUrl } from '../../apis/free.js'

/** imagine — real text-to-image via Pollinations (no key). */
export const imagine = {
  name: 'imagine', aliases: ['draw', 'img'], category: 'ai', description: 'Generate an image from text. Usage: .imagine a futuristic city',
  async run(ctx) {
    const prompt = ctx.args.join(' ')
    if (!prompt) return ctx.sock.sendMessage(ctx.jid, { text: 'Usage: .imagine <prompt>' })
    const url = imagineUrl(prompt)
    try {
      const res = await fetch(url)
      const buf = Buffer.from(await res.arrayBuffer())
      await ctx.sock.sendMessage(ctx.jid, { image: buf, caption: `🎨 ${prompt}` })
    } catch (e) {
      await ctx.sock.sendMessage(ctx.jid, { text: `⚠️ Image generation failed: ${e.message}` })
    }
  },
}

/** qr — generate a QR code (free, no key). */
export const qr = {
  name: 'qr', aliases: ['qrgen'], category: 'tools', description: 'Generate a QR code from text/URL.',
  async run(ctx) {
    const text = ctx.args.join(' ') || ctx.body
    if (!text) return ctx.sock.sendMessage(ctx.jid, { text: 'Usage: .qr <text or url>' })
    const url = qrUrl(text)
    try {
      const res = await fetch(url)
      const buf = Buffer.from(await res.arrayBuffer())
      await ctx.sock.sendMessage(ctx.jid, { image: buf, caption: `🔳 QR: ${text}` })
    } catch (e) {
      await ctx.sock.sendMessage(ctx.jid, { text: `⚠️ QR failed: ${e.message}` })
    }
  },
}
