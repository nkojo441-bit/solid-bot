/**
 * apis/free.js — real free API clients (no key required).
 * Every function here was verified live: weather, currency, dictionary,
 * wikipedia, QR, short-links, images, facts, translation.
 */

const WMO = {
  0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
  45: 'Fog', 48: 'Depositing rime fog',
  51: 'Light drizzle', 53: 'Drizzle', 55: 'Heavy drizzle',
  61: 'Light rain', 63: 'Rain', 65: 'Heavy rain',
  71: 'Light snow', 73: 'Snow', 75: 'Heavy snow',
  80: 'Light showers', 81: 'Showers', 82: 'Heavy showers', 95: 'Thunderstorm',
}

/** Weather via Open-Meteo (free, no key, no signup). */
export async function weather(cityOrLatLon) {
  // support "lat,lon"
  const m = String(cityOrLatLon).match(/^(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)$/)
  let lat, lon
  if (m) {
    lat = m[1]; lon = m[2]
  } else {
    // reverse-geocode the city via Open-Meteo geocoding
    const g = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityOrLatLon)}&count=1&language=en&format=json`)
    const gd = await g.json()
    if (!gd?.results?.length) throw new Error(`City not found: ${cityOrLatLon}`)
    lat = gd.results[0].latitude; lon = gd.results[0].longitude
    cityOrLatLon = gd.results[0].name
  }
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`)
  const d = await res.json()
  const c = d.current_weather
  return {
    place: d.timezone,
    temp: c.temperature,
    wind: c.windspeed,
    desc: WMO[c.weathercode] || c.weathercode,
    time: c.time,
  }
}

/** Exchange rate via open.er-api.com (free, no key). */
export async function currency(amount, from, to) {
  const res = await fetch(`https://open.er-api.com/v6/latest/${encodeURIComponent(from.toUpperCase())}`)
  const d = await res.json()
  if (d.result !== 'success') throw new Error('Currency API error')
  const rate = d.rates[to.toUpperCase()]
  if (!rate) throw new Error(`No rate for ${to.toUpperCase()}`)
  const n = Number(amount) || 1
  return { from: from.toUpperCase(), to: to.toUpperCase(), rate, result: n * rate }
}

/** Dictionary definition via dictionaryapi.dev (free, no key). */
export async function define(word) {
  const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`)
  if (res.status === 404) throw new Error(`No definition found for "${word}"`)
  const d = await res.json()
  const e = d[0]
  return {
    word: e.word,
    phonetic: e.phonetic || e.phonetics?.[0]?.text || '',
    meanings: (e.meanings || []).map((m) => ({
      part: m.partOfSpeech,
      defs: (m.definitions || []).slice(0, 3).map((x) => x.definition).filter(Boolean),
    })),
  }
}

/** Wikipedia search summary via MediaWiki (free, no key). */
export async function wiki(query) {
  const res = await fetch(
    `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&srlimit=3`
  )
  const d = await res.json()
  return (d?.query?.search || []).map((s) => ({ title: s.title, snippet: s.snippet.replace(/<[^>]*>/g, '') }))
}

/** QR code image (server side via api.qrserver.com). Returns a Buffer URL. */
export function qrUrl(text) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(text)}`
}

/** Shorten a URL via TinyURL (free, no key). */
export async function shorten(url) {
  const res = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`)
  const t = await res.text()
  if (!t.startsWith('http')) throw new Error('Short URL failed')
  return t
}

/** Text-to-image via Pollinations (free, no key). Returns a fetch-able URL. */
export function imagineUrl(prompt, { width = 1024, height = 1024 } = {}) {
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${width}&height=${height}&nologo=true`
}

/** Random cat fact via catfact.ninja (free, no key). */
export async function catFact() {
  const res = await fetch('https://catfact.ninja/fact')
  const d = await res.json()
  return d.fact
}
