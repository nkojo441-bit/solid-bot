import { downloadMedia, imageToSticker, videoToSticker, stickerToImage } from '../../lib/media.js'
import settings from '../../../settings.js'

/** Resolve the actual media message (own or the one being quoted). */
function mediaMessage(ctx) {
  const mm = ctx.message?.message
  const quoted = mm?.extendedTextMessage?.contextInfo?.quotedMessage || null
  return { own: mm || {}, quoted, msg: ctx.message }
}

/** sticker — real image/video→sticker using sharp + ffmpeg. */
export const sticker = {
  name: 'sticker', aliases: ['st', 's'], category: 'converter', description: 'Make a sticker from an image/video. Send media with .sticker',
  async run(ctx) {
    const { own, quoted, msg } = mediaMessage(ctx)
    const isImg = !!(own.imageMessage || quoted?.imageMessage)
    const isVid = !!(own.videoMessage || quoted?.videoMessage)
    if (!isImg && !isVid) {
      return ctx.sock.sendMessage(ctx.jid, { text: '✳️ Send an *image* or *video* with `.sticker` (or reply to one).' })
    }
    if (!ctx.isGroup) {
      return ctx.sock.sendMessage(ctx.jid, { text: '✳️ `.sticker` works in groups.' })
    }
    await ctx.sock.sendMessage(ctx.jid, { text: '⌛ Making your sticker...' })
    try {
      const type = isImg && !isVid ? 'imageMessage' : 'videoMessage'
      const file = await downloadMedia(ctx.sock, msg, type)
      const buf = isImg
        ? await imageToSticker(file, { pack: settings.packname, author: settings.botOwner })
        : await videoToSticker(file, { pack: settings.packname, author: settings.botOwner })
      await ctx.sock.sendMessage(ctx.jid, { sticker: buf }, { quoted: msg })
    } catch (e) {
      await ctx.sock.sendMessage(ctx.jid, { text: `⚠️ Sticker failed: ${e.message}` })
    }
  },
}

/** toimage — convert a sticker to a full image. */
export const toimage = {
  name: 'toimage', aliases: ['toimg'], category: 'converter', description: 'Convert a sticker to an image. Reply to a sticker with .toimage',
  async run(ctx) {
    const { own, quoted, msg } = mediaMessage(ctx)
    const isSt = !!(own.stickerMessage || quoted?.stickerMessage)
    if (!isSt) {
      return ctx.sock.sendMessage(ctx.jid, { text: '✳️ Reply to a *sticker* with `.toimage`.' })
    }
    await ctx.sock.sendMessage(ctx.jid, { text: '⌛ Converting...' })
    try {
      const file = await downloadMedia(ctx.sock, msg, 'stickerMessage')
      const buf = await stickerToImage(file)
      await ctx.sock.sendMessage(ctx.jid, { image: buf }, { quoted: msg })
    } catch (e) {
      await ctx.sock.sendMessage(ctx.jid, { text: `⚠️ ${e.message}` })
    }
  },
}
