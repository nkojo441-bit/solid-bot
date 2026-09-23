/**
 * lib/extractor.js — FREE media downloader (no API keys, no gateway).
 *
 * Uses the self-contained yt-dlp binary (fetched by scripts/setup.js) to pull
 * video/audio/thumbnails straight from YouTube/TikTok/Instagram/Twitter/
 * Facebook/Pinterest/MediaFire/Drive/GitHub. yt-dlp is free and keyless.
 *
 * Nothing here is faked: if yt-dlp isn't available the caller gets an honest
 * message telling them to run `node scripts/setup.js`.
 */
import fs from 'fs'
import os from 'os'
import path from 'path'
import { fileURLToPath } from 'url'
import { execFile } from 'child_process'
import { promisify } from 'util'

const run = promisify(execFile)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const BIN_DIR = path.join(__dirname, '..', '..', 'bin')
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'bempsx-dl-'))

/** Locate the yt-dlp binary (env override → bundled → PATH). */
export function findBinary() {
  if (process.env.YTDLP_PATH && fs.existsSync(process.env.YTDLP_PATH)) return process.env.YTDLP_PATH
  for (const name of ['yt-dlp_linux', 'yt-dlp_linux_aarch64', 'yt-dlp_macos', 'yt-dlp.exe', 'yt-dlp']) {
    const p = path.join(BIN_DIR, name)
    if (fs.existsSync(p)) return p
  }
  // Fall back to PATH — isAvailable() reports honestly if it's missing.
  return 'yt-dlp'
}

function bin() { return findBinary() }

/** Test if yt-dlp can run. */
export async function isAvailable() {
  try {
    const b = bin()
    const out = await run(b, ['--version'], { encoding: 'utf8' })
    return String(out.stdout || '').trim().length > 0
  } catch { return false }
}

export function missingMessage() {
  return `⚠️ Media download needs the free yt-dlp tool.\nRun \`node scripts/setup.js\` once on your host (no API key — it's free), or install yt-dlp.`
}

/** Download a media item to a temp Buffer. */
export async function extractMedia(url, { audio = false } = {}) {
  if (!(await isAvailable())) return { ok: false, msg: missingMessage() }
  try {
    const args = ['--no-playlist', '--no-warnings', '--no-cache-dir', '-o', '-']
    if (audio) args.push('-x', '--audio-format', 'mp3', '--audio-quality', '0')
    else args.push('-f', 'best[height<=1080]/best')
    args.push(url)
    const { stdout } = await run(bin(), args, { maxBuffer: 256 * 1024 * 1024 })
    const buffer = Buffer.from(stdout)
    if (!buffer.length) return { ok: false, msg: 'yt-dlp returned no media.' }
    return { ok: true, data: { type: audio ? 'audio' : 'video', buffer, mimetype: audio ? 'audio/mp4' : 'video/mp4', fileName: audio ? 'media.mp3' : 'media.mp4' } }
  } catch (e) {
    return { ok: false, msg: `Download failed: ${e.message}` }
  }
}

/** Fetch JSON metadata for a URL (titles, thumbnails, etc). */
export async function extractMeta(url) {
  try {
    const { stdout } = await run(bin(), ['--no-playlist', '--no-warnings', '-J', url], { maxBuffer: 16 * 1024 * 1024 })
    return JSON.parse(stdout || '{}')
  } catch { return null }
}

/** Get a thumbnail URL for a given URL (no download). */
export async function extractThumb(url) {
  const m = await extractMeta(url)
  return m?.thumbnail || null
}

export { TMP }
