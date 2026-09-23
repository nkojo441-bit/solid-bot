/**
 * lib/media.js — media processing helpers.
 *
 * Wraps sharp + ffmpeg-static + file-type so the plugins stay
 * thin. Handles: download outgoing media, image→sticker, video/gif→sticker,
 * audio→mp3/vibrato/robot/echo, image filters, and to-image conversions.
 *
 * Note: ffmpeg-static bundles a binary, so no system ffmpeg is required.
 */
import fs from 'fs'
import os from 'os'
import path from 'path'
import { fileURLToPath } from 'url'
import { spawn } from 'child_process'
import ffmpegStatic from 'ffmpeg-static'
import sharp from 'sharp'
import { fileTypeFromBuffer } from 'file-type'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'bempsx-'))

const MAX_MEDIA_BYTES = Number(process.env.MAX_MEDIA_BYTES || 50 * 1024 * 1024)

export async function runFfmpeg(input, output, args = [], timeoutMs = 60_000) {
  if (!input || !output) throw new Error('Invalid media paths.')
  const child = spawn(ffmpegStatic, ['-hide_banner', '-loglevel', 'error', '-i', input, ...args, '-y', output], {
    stdio: ['ignore', 'ignore', 'pipe'],
    windowsHide: true,
  })
  let stderr = ''
  child.stderr.on('data', chunk => { stderr = (stderr + chunk.toString()).slice(-4000) })
  return await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      child.kill('SIGKILL')
      reject(new Error('Media conversion timed out.'))
    }, timeoutMs)
    child.once('error', err => { clearTimeout(timer); reject(err) })
    child.once('close', code => {
      clearTimeout(timer)
      if (code === 0) resolve(output)
      else reject(new Error(`Media conversion failed${stderr ? `: ${stderr.trim()}` : '.'}`))
    })
  })
}


/** Download a WhatsApp media message (image/video/audio) to a temp file. */
export async function downloadMedia(sock, message, type = 'imageMessage') {
  const msg = message?.message?.[type]
  if (!msg?.url) throw new Error('No media found in message.')
  const stream = await sock.downloadMediaMessage(message) // returns Buffer (6.x supports this)
  if (!Buffer.isBuffer(stream) || stream.length > MAX_MEDIA_BYTES) throw new Error(`Media exceeds the ${Math.floor(MAX_MEDIA_BYTES / 1024 / 1024)} MB limit.`)
  const ext = await detectExt(stream, type)
  const file = path.join(TMP, `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`)
  fs.writeFileSync(file, stream)
  return file
}

async function detectExt(buf, type) {
  try {
    const ft = await fileTypeFromBuffer(buf)
    if (ft?.ext) return ft.ext
  } catch {}
  if (type === 'audioMessage') return 'mp3'
  if (type === 'videoMessage') return 'mp4'
  return 'jpg'
}

/**
 * Convert an image file to a WhatsApp-compatible WebP sticker.
 * `type: 'circle'` applies a transparent circular crop.
 * Pack/author are intentionally not embedded: sticker metadata is optional
 * and avoiding a second sticker wrapper keeps the dependency tree smaller.
 */
export async function imageToSticker(file, { pack = '', author = '', type = 'full' } = {}) {
  void pack
  void author
  const base = sharp(file, { limitInputPixels: 40_000_000 })
    .rotate()
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })

  if (String(type).toLowerCase() === 'circle') {
    const mask = Buffer.from(
      '<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">' +
      '<circle cx="256" cy="256" r="256" fill="white"/></svg>'
    )
    return base
      .composite([{ input: mask, blend: 'dest-in' }])
      .webp({ quality: 82, effort: 4 })
      .toBuffer()
  }

  return base.webp({ quality: 82, effort: 4 }).toBuffer()
}

/** Convert a video/gif file to a sticker (WebP animation). */
export async function videoToSticker(file, { pack = '', author = '' } = {}) {
  const out = path.join(TMP, `${Date.now()}.webp`)
  await runFfmpeg(file, out, ['-t', '6', '-vf', 'scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2', '-loop', '0', '-an', '-f', 'webp'])
  const buf = fs.readFileSync(out)
  try { fs.unlinkSync(out) } catch {}
  return buf
}

/** Run a generic ffmpeg filter on an audio file. Returns new file path. */
export function audioEffect(file, effect) {
  const out = path.join(TMP, `${Date.now()}-${effect}.mp3`)
  const filters = {
    bass: 'asetrate=44100*0.9,aresample=44100,bass=g=15',
    vibrato: 'vibrato=f=10:d=1',
    robot: 'asetrate=44100*0.5,aresample=44100,atempo=2',
    echo: 'aecho=0.8:0.9:1000:0.3',
    chipmunk: 'asetrate=44100*1.5,aresample=44100',
    slow: 'atempo=0.5',
    fast: 'atempo=1.5',
    nightcore: 'asetrate=44100*1.3,aresample=44100,atempo=1.1',
    fat: 'asetrate=44100*0.7,aresample=44100',
    squirrel: 'asetrate=44100*1.6,aresample=44100',
    '8d': 'aecho=0.8:0.7:60|120:0.4|0.2',
  }
  const f = filters[effect]
  if (!f) throw new Error(`Unknown audio effect "${effect}".`)
  return runFfmpeg(file, out, ['-af', f, '-f', 'mp3'])
}

/** Apply an ffmpeg image filter. Returns new file path (mp4 or jpg). */
export function imageEffect(file, effect) {
  const out = path.join(TMP, `${Date.now()}-${effect}.jpg`)
  const filters = {
    greyscale: 'hue=s=0',
    sepia: 'colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131',
    negate: 'negate',
    pixelate: 'scale=iw/16:ih/16,scale=iw*16:ih*16',
    blur: 'boxblur=12:2',
    invert: 'negate',
    rotate: 'transpose=2',
    flop: 'hflip',
    enhance: 'eq=contrast=1.3:saturation=1.5',
    'low-quality': 'eq=contrast=0.9:saturation=0.8',
  }
  const f = filters[effect]
  if (!f) throw new Error(`Unknown image effect "${effect}".`)
  return runFfmpeg(file, out, ['-vf', f, '-frames:v', '1', '-f', 'image2'])
}

/** Convert an image/video to a single mp4 video file. */
export function toVideo(file, isVideo) {
  const out = path.join(TMP, `${Date.now()}.mp4`)
  const args = ['-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', '-pix_fmt', 'yuv420p', '-f', 'mp4']
  if (!isVideo) args.unshift('-t', '5', '-loop', '1')
  return runFfmpeg(file, out, args)
}

/** Reads a sticker/image back to a jpg (for "to-image"). */
export function stickerToImage(file) {
  const out = path.join(TMP, `${Date.now()}.jpg`)
  return runFfmpeg(file, out, ['-frames:v', '1', '-f', 'image2'])
}

/** Image size/dimensions via ffprobe (optional helper). */
export function ffmpegBinary() {
  return ffmpegStatic
}

/**
 * Unwrap Baileys message wrappers (view-once, ephemeral, caption doc).
 * Recursively unwraps, and accepts either a full message ({message:...}) or a
 * raw content object ({viewOnceMessage:...}). Returns the inner media message
 * (e.g. { imageMessage: ... }).
 */
export function unwrapContent(message) {
  let c = message?.message || message
  let guard = 0
  while (guard++ < 15) {
    if (c?.viewOnceMessage?.message) { c = c.viewOnceMessage.message; continue }
    if (c?.viewOnceMessageV2?.message) { c = c.viewOnceMessageV2.message; continue }
    if (c?.viewOnceMessageV2Extension?.message) { c = c.viewOnceMessageV2Extension.message; continue }
    if (c?.ephemeralMessage?.message) { c = c.ephemeralMessage.message; continue }
    if (c?.documentWithCaptionMessage?.message) { c = c.documentWithCaptionMessage.message; continue }
    break
  }
  return c
}

/**
 * Download the media inside a view-once message and return
 * { buffer, content, type }. `message` may be a full Baileys message or the
 * raw quoted-content object.
 */
export async function downloadViewOnce(sock, message, key) {
  const content = unwrapContent(message)
  const type = ['imageMessage', 'videoMessage', 'audioMessage', 'stickerMessage', 'documentMessage']
    .find((k) => content?.[k])
  if (!type) throw new Error('No view-once media found in this message.')
  // Baileys decrypts the media using the message object; hand it the inner content.
  const msg = { message: content, key: key || message?.key || {} }
  const buffer = await sock.downloadMediaMessage(msg)
  return { buffer, content, type }
}

export { TMP }
