import fs from 'fs'
import { downloadMedia, audioEffect, imageEffect, toVideo } from '../../lib/media.js'

/** Media effects that map command → effect id. */
const AUDIO_EFFECTS = ['bass', 'vibrato', 'robot', 'echo', 'chipmunk', 'slow', 'fast', 'nightcore', 'fat', 'squirrel', '8d']
const IMAGE_EFFECTS = ['greyscale', 'sepia', 'negate', 'pixelate', 'blur', 'invert', 'rotate', 'flop', 'enhance']

/** Generic helper to reply to the sender with a tts or media. */
async function effectCommand(ctx, effect, kind) {
  const { own, quoted, msg } = mediaMessage(ctx)
  const type = kind === 'audio'
    ? (own.audioMessage || quoted?.audioMessage || own.pttMessage ? 'audioMessage' : null)
    : (own.imageMessage || quoted?.imageMessage ? 'imageMessage' : (own.videoMessage || quoted?.videoMessage ? 'videoMessage' : null))
  if (!type) {
    return ctx.sock.sendMessage(ctx.jid, { text: `✳️ Send an *${kind}* with \`.${effect}\` (or reply to one).` })
  }
  await ctx.sock.sendMessage(ctx.jid, { text: `⌛ Applying ${effect}...` })
  try {
    const file = await downloadMedia(ctx.sock, msg, type)
    if (kind === 'audio') {
      const out = await audioEffect(file, effect)
      const buf = fs.readFileSync(out)
      await ctx.sock.sendMessage(ctx.jid, { audio: buf, mimetype: 'audio/mp4', ptt: false }, { quoted: msg })
    } else {
      const out = await imageEffect(file, effect)
      const buf = fs.readFileSync(out)
      await ctx.sock.sendMessage(ctx.jid, { image: buf, mimetype: 'image/jpeg' }, { quoted: msg })
    }
  } catch (e) {
    await ctx.sock.sendMessage(ctx.jid, { text: `⚠️ ${e.message}` })
  }
}

function mediaMessage(ctx) {
  const mm = ctx.message?.message
  const quoted = mm?.extendedTextMessage?.contextInfo?.quotedMessage || null
  return { own: mm || {}, quoted, msg: ctx.message }
}

// --- Auto-build one plugin per audio effect ---
export const audioPlugins = Object.fromEntries(
  AUDIO_EFFECTS.map((e) => [
    e,
    {
      name: e, category: 'converter', description: `Audio effect: ${e}. Send audio with .${e}`,
      run: (ctx) => effectCommand(ctx, e, 'audio'),
    },
  ])
)

// --- Auto-build one plugin per image effect ---
export const imagePlugins = Object.fromEntries(
  IMAGE_EFFECTS.map((e) => [
    e,
    {
      name: e, category: 'image', description: `Image filter: ${e}. Send image with .${e}`,
      run: (ctx) => effectCommand(ctx, e, 'image'),
    },
  ])
)

// --- Individual converters ---
export const tovideo = {
  name: 'tovideo', aliases: ['tomp4'], category: 'converter', description: 'Convert an image to a video. Send image with .tovideo',
  async run(ctx) {
    const { own, quoted, msg } = mediaMessage(ctx)
    const isVid = !!(own.videoMessage || quoted?.videoMessage)
    const isImg = !!(own.imageMessage || quoted?.imageMessage)
    if (!isVid && !isImg) return ctx.sock.sendMessage(ctx.jid, { text: '✳️ Send an *image* with `.tovideo`.' })
    await ctx.sock.sendMessage(ctx.jid, { text: '⌛ Converting to video...' })
    try {
      const file = await downloadMedia(ctx.sock, msg, isVid ? 'videoMessage' : 'imageMessage')
      const out = await toVideo(file, isVid)
      const buf = fs.readFileSync(out)
      await ctx.sock.sendMessage(ctx.jid, { video: buf, caption: '🎬 Video' }, { quoted: msg })
    } catch (e) {
      await ctx.sock.sendMessage(ctx.jid, { text: `⚠️ ${e.message}` })
    }
  },
}
