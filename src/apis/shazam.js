/**
 * apis/shazam.js — song recognition.
 *
 * Primary: audd.io (free tier: ~100 req/month, no signup required for test calls).
 * Without an API key we use their "test" endpoint which only works for their
 * canned sample files — good enough to prove the pipeline works, but honest
 * about limits.
 *
 * Set AUDD_API_KEY in .env for real recognition.
 */
import fs from 'fs'

const AUDD_ENDPOINT = 'https://api.audd.io/'

/**
 * Recognize a song from an audio buffer.
 * @param {Buffer} buffer    raw audio bytes (mp3/m4a/wav)
 * @param {object} [opts]    { apiKey?: string }
 * @returns {Promise<{ok:boolean, result?:object, msg?:string}>}
 */
export async function recognize(buffer, opts = {}) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 200) {
    return { ok: false, msg: 'Audio too short to recognize.' }
  }

  const apiKey = opts.apiKey || process.env.AUDD_API_KEY || ''
  const form = new FormData()
  form.append('file', new Blob([buffer]), 'audio.mp3')
  form.append('return', 'apple_music,spotify')
  if (apiKey) form.append('api_token', apiKey)

  try {
    const res = await fetch(AUDD_ENDPOINT, {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(30_000),
    })
    if (!res.ok) return { ok: false, msg: `audd.io returned ${res.status}.` }
    const data = await res.json()

    // audd.io contract:
    //   { status: 'success', result: null }  → not recognized
    //   { status: 'success', result: { title, artist, album, release_date, ... } }
    //   { status: 'error', error: { ... } }
    if (data.status !== 'success') {
      const detail = data.error?.error_message || data.error?.error_code || 'unknown'
      return { ok: false, msg: `Recognition failed: ${detail}` }
    }
    if (!data.result) {
      return { ok: false, msg: 'Could not identify the song.' }
    }

    return {
      ok: true,
      result: {
        title: data.result.title,
        artist: data.result.artist,
        album: data.result.album || '',
        release: data.result.release_date || '',
        artwork: data.result.spotify?.album?.images?.[0]?.url || '',
        spotifyUrl: data.result.spotify?.external_urls?.spotify || '',
        previewUrl: data.result.spotify?.preview_url || '',
      },
    }
  } catch (e) {
    return { ok: false, msg: `Recognition service unreachable (${e.message}).` }
  }
}

/** True if an API key is configured (for command help text). */
export function hasShazamKey() {
  return Boolean(process.env.AUDD_API_KEY)
}