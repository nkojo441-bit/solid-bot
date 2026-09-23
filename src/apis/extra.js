/**
 * apis/extra.js — additional real free API clients (no key, no signup).
 * All were verified live. Some (Jikan) are rate-limited → callers should
 * catch and reply honestly rather than fake.
 */

/** Random piece of advice. */
export async function advice() {
  const r = await fetch('https://api.adviceslip.com/advice')
  const d = await r.json()
  return d?.slip?.advice || ''
}

/** Random "useless fact". */
export async function fact() {
  const r = await fetch('https://uselessfacts.jsph.pl/api/v2/facts/random')
  const d = await r.json()
  return d?.text || ''
}

/** Book search (Open Library, free). */
export async function book(q) {
  const r = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=3`)
  const d = await r.json()
  return (d?.docs || []).slice(0, 3).map((b) => ({
    title: b.title,
    author: b.author_name?.[0] || 'Unknown',
    year: b.first_publish_year || '?',
    pages: b.number_of_pages_median || '?',
  }))
}

/** GitHub user/repo lookup (free). */
export async function github(q) {
  const r = await fetch(`https://api.github.com/users/${encodeURIComponent(q)}`)
  if (r.status === 404) throw new Error(`GitHub user "${q}" not found.`)
  const d = await r.json()
  return {
    login: d.login, name: d.name, bio: d.bio, repos: d.public_repos,
    followers: d.followers, avatar: d.avatar_url, url: d.html_url,
  }
}

/** npm package lookup (free). */
export async function npm(q) {
  const r = await fetch(`https://registry.npmjs.org/${encodeURIComponent(q)}`)
  if (r.status === 404) throw new Error(`npm package "${q}" not found.`)
  const d = await r.json()
  return { name: d.name, latest: d['dist-tags']?.latest, description: d.description, version: d['dist-tags']?.latest }
}

/** Anime quote (animechan.io, free, no key). */
export async function animeQuote() {
  const r = await fetch('https://api.animechan.io/v1/quotes/random')
  const d = await r.json()
  return d?.data || null
}

/* --- Jikan (MyAnimeList) — free, rate-limited. --- */
async function jikan(path) {
  const r = await fetch(`https://api.jikan.moe/v4/${path}`)
  if (r.status === 429) throw new Error('Jikan rate limit hit — wait a moment and retry.')
  if (!r.ok) throw new Error(`Jikan API error ${r.status}.`)
  return r.json()
}

export async function animeSearch(q) {
  const d = await jikan(`anime?q=${encodeURIComponent(q)}&limit=5`)
  return (d?.data || []).map((a) => ({
    title: a.title, english: a.title_english, type: a.type,
    episodes: a.episodes, score: a.score, year: a.year, image: a.images?.jpg?.image_url,
    status: a.status,
  }))
}

export async function topAnime() {
  const d = await jikan('top/anime?limit=5')
  return (d?.data || []).map((a) => ({ title: a.title, score: a.score, rank: a.rank, url: a.url }))
}

export async function characterOf(animeId) {
  const d = await jikan(`anime/${animeId}/characters`)
  return (d?.data || []).slice(0, 5).map((c) => ({ name: c.character?.name, role: c.role, jp: c.character?.name_japanese }))
}

export async function mangaSearch(q) {
  const d = await jikan(`manga?q=${encodeURIComponent(q)}&limit=5`)
  return (d?.data || []).map((m) => ({ title: m.title, chapters: m.chapters, score: m.score, type: m.type }))
}
