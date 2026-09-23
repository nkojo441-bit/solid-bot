/**
 * apis/apk.js — APK search.
 *
 * Scrapes APKPure's public search (no key). Returns metadata only — actual
 * APK download URLs are dynamic and rate-limited by APKPure, so this command
 * gives the user a direct link to the app page instead of proxying a
 * potentially-hostile APK through the bot.
 *
 * This is deliberate: proxying APK binaries through a chat bot is a security
 * anti-pattern. The user gets a link, they decide.
 */
const APKPURE_SEARCH = 'https://apkpure.com/api/v1/search?q='

/**
 * Search APKPure for an app.
 * @returns {Promise<{ok:boolean, results?:Array, msg?:string}>}
 */
export async function searchApk(query) {
  if (!query || query.length < 2) return { ok: false, msg: 'Query too short.' }

  try {
    const res = await fetch(APKPURE_SEARCH + encodeURIComponent(query), {
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; BempsX-Nova/1.0)',
        'accept': 'application/json',
      },
      signal: AbortSignal.timeout(15_000),
    })
    if (!res.ok) return { ok: false, msg: `APKPure returned ${res.status}.` }

    const data = await res.json().catch(() => null)
    if (!data) return { ok: false, msg: 'APKPure response was not JSON.' }

    // APKPure's API shape varies. Normalize defensively.
    const list = data?.data?.list || data?.list || data?.results || []
    if (!Array.isArray(list) || list.length === 0) {
      return { ok: false, msg: `No APKs found for "${query}".` }
    }

    const results = list.slice(0, 5).map((a) => ({
      name: a.title || a.name || a.appName || 'Unknown',
      package: a.package || a.package_name || '',
      icon: a.icon || a.icon_url || '',
      version: a.version || a.version_name || '',
      url: a.link || a.url || (a.package ? `https://apkpure.com/x/${a.package}` : ''),
    }))

    return { ok: true, results }
  } catch (e) {
    return { ok: false, msg: `APKPure unreachable (${e.message}).` }
  }
}