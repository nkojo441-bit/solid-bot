import { downloadViewOnce } from '../../lib/media.js'

/** The raw quoted-message content (the object being replied to). */
function quotedContent(ctx) {
  return ctx.message?.message?.extendedTextMessage?.contextInfo?.quotedMessage || null
}

/** True if the (own or quoted) message is a view-once. */
function isViewOnce(ctx) {
  const own = ctx.message?.message
  if (own?.viewOnceMessage || own?.viewOnceMessageV2 || own?.viewOnceMessageV2Extension) return true
  const q = quotedContent(ctx)
  return Boolean(q?.viewOnceMessage || q?.viewOnceMessageV2 || q?.viewOnceMessageV2Extension)
}

/** Send a rescued view-once image/video/audio/sticker/doc to `target`. */
async function sendRescued(sock, targetJid, content, key) {
  try {
    const { buffer, type, content: inner } = await downloadViewOnce(sock, content, key)
    const map = { imageMessage: 'image', videoMessage: 'video', audioMessage: 'audio', stickerMessage: 'sticker', documentMessage: 'document' }
    const field = map[type] || 'document'
    // If it had a caption, preserve it.
    const opts = {}
    if (inner?.caption) opts.caption = inner.caption
    await sock.sendMessage(targetJid, { [field]: buffer, ...opts })
  } catch (e) {
    await sock.sendMessage(targetJid, { text: `⚠️ Could not read view-once media: ${e.message}` })
  }
}

/** vv — rescue a "view once" message and resend it in the same chat. */
export const vv = {
  name: 'vv', aliases: ['viewonce'], category: 'converter',
  description: 'Recover a "view once" message in this chat. Reply to it with .vv',
  async run(ctx) {
    if (!isViewOnce(ctx)) {
      return ctx.sock.sendMessage(ctx.jid, { text: '✳️ Reply to a *view once* message with `.vv` to recover it here.' })
    }
    const content = quotedContent(ctx) || ctx.message?.message
    await sendRescued(ctx.sock, ctx.jid, content, ctx.message?.key)
  },
}

/** vvpr — rescue a view-once and send it to the requester PRIVATELY. */
export const vvpr = {
  name: 'vvpr', aliases: ['viewoncepr', 'vvprivate'], category: 'converter',
  description: 'Recover a "view once" message and send it to you privately. Reply to it with .vvpr',
  async run(ctx) {
    if (!isViewOnce(ctx)) {
      return ctx.sock.sendMessage(ctx.jid, { text: '✳️ Reply to a *view once* message with `.vvpr` to get it privately.' })
    }
    const content = quotedContent(ctx) || ctx.message?.message
    await ctx.sock.sendMessage(ctx.jid, { text: '📩 Sending it to you privately...' })
    await sendRescued(ctx.sock, ctx.sender, content, ctx.message?.key)
  },
}
