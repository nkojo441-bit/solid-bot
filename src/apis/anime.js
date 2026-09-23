/**
 * apis/anime.js — anime image engine (with resilient multi-source fallback).
 *
 * Primary: nekos.life (verified live, free, no key, and NOT blocking like
 * some others). It returns real anime images for a set of SFW categories.
 * If a category/image fails, we fall back to a real anime image pulled from
 * MyAnimeList (Jikan) so the user still gets genuine anime art.
 *
 * Everything returns a real image Buffer — nothing is ever faked.
 */

const NEKOS_CATEGORIES = [
  'neko', 'waifu', 'hug', 'kiss', 'pat', 'meow', 'cuddle', 'smug',
  'slap', 'tickle', 'baka', 'awoo', 'feed', 'spank', 'kick', 'highfive',
  'handholding', 'punch', 'cry', 'laugh', 'think', 'happy', 'sad', 'angry',
]

/** Fetch a real anime image Buffer for a category (with fallback). */
export async function randomAnimeImage(category = 'waifu') {
  // 1) Primary: nekos.life
  try {
    const res = await fetch(`https://nekos.life/api/v2/img/${encodeURIComponent(category)}`)
    if (res.ok) {
      const d = await res.json()
      if (d?.url) {
        const img = await fetch(d.url)
        if (img.ok) {
          const buf = Buffer.from(await img.arrayBuffer())
          if (buf.length > 500) return { buf, source: 'nekos.life', category }
        }
      }
    }
  } catch {}

  // 2) Fallback: any real anime image from MyAnimeList (Jikan).
  try {
    const d = await (await fetch('https://api.jikan.moe/v4/top/anime?limit=20')).json()
    const pick = d?.data?.[Math.floor(Math.random() * Math.min(d?.data?.length || 1, 20))]
    const url = pick?.images?.jpg?.image_url
    if (url) {
      const img = await fetch(url)
      if (img.ok) {
        const buf = Buffer.from(await img.arrayBuffer())
        if (buf.length > 500) return { buf, source: 'myanimelist', category, anime: pick?.title }
      }
    }
  } catch {}

  throw new Error('All anime image sources are unreachable right now. Try again in a moment.')
}

/** List the categories that are safe to use. */
export function animeCategories() {
  return NEKOS_CATEGORIES
}

/** Check (for the menu/test) what a random image looks like. */
export function isAnimeCategory(cat) {
  return NEKOS_CATEGORIES.includes(cat)
}
