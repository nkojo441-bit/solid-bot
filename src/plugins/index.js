/**
 * plugins/index.js — the plugin registry (async, category-aware).
 *
 * Every .js file under src/plugins (including subfolders like core/, ai/,
 * economy/, group/, tools/) that exports a default is a "plugin". Drop a
 * file anywhere in that tree and it auto-loads on next boot — no wiring.
 *
 * A plugin module exports default:
 *   {
 *     name: 'ping',
 *     aliases: ['p'],
 *     category: 'core',
 *     description: 'Check bot latency.',
 *     run: async (ctx) => { ... }
 *   }
 *
 * `category` comes from the export (or defaults to the folder name). The
 * menu groups everything by category.
 *
 * run(ctx) receives:
 *   ctx = { sock, message, jid, sender, from, isGroup, args, body, prefix }
 *
 * ── Duplicate handling ──────────────────────────────────────────
 * The registry now detects BOTH duplicate names and duplicate aliases.
 * - Duplicate NAME  → second occurrence is skipped (hard conflict).
 * - Duplicate ALIAS → the later plugin LOSES the alias but keeps its name.
 * Every conflict is logged so you can fix it in source. `getRegistryReport()`
 * returns the full picture for tests/CI.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import { logger } from '../lib/logger.js'
import settings from '../../settings.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** Recursively collect all plugin files under a directory. */
function walk(dir) {
  let out = []
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    if (f.name === 'index.js') continue
    const full = path.join(dir, f.name)
    if (f.isDirectory()) out = out.concat(walk(full))
    else if (f.name.endsWith('.js')) out.push(full)
  }
  return out
}

let plugins = null
let lastReport = null

/** Flatten a namespace/module into an array of plugin candidates. */
function flattenPlugins(value, out = []) {
  const isPlugin = (v) => v && typeof v === 'object' && typeof v.name === 'string' && typeof v.run === 'function'
  if (isPlugin(value)) { out.push(value); return out }
  if (Array.isArray(value)) { for (const i of value) flattenPlugins(i, out); return out }
  if (value && typeof value === 'object') { for (const i of Object.values(value)) flattenPlugins(i, out); return out }
  return out
}

export async function loadPlugins() {
  const files = walk(__dirname)
  const loaded = []
  const seenNames = new Map()   // name → source file
  const seenAliases = new Map() // alias → { name, file }
  const conflicts = { names: [], aliases: [] }

  for (const file of files) {
    const rel = path.relative(__dirname, file).replace(/\\/g, '/')
    try {
      const ns = await import(pathToFileURL(file).href)
      const candidates = []
      candidates.push(...flattenPlugins(ns.default))
      for (const [key, val] of Object.entries(ns || {})) {
        if (key === 'default') continue
        candidates.push(...flattenPlugins(val))
      }

      for (const plugin of candidates) {
        if (!plugin?.name) continue

        // ── duplicate NAME → skip entirely ──
        if (seenNames.has(plugin.name)) {
          const prev = seenNames.get(plugin.name)
          conflicts.names.push({ name: plugin.name, kept: prev, dropped: rel })
          logger.warn(`[plugin] duplicate name "${plugin.name}" in ${rel} (already in ${prev}) — skipped.`)
          continue
        }

        plugin.category = plugin.category || path.basename(path.dirname(file))
        plugin.__source = rel

        // ── duplicate ALIAS → drop the alias, keep the plugin ──
        const ownAliases = Array.isArray(plugin.aliases) ? [...plugin.aliases] : []
        const keptAliases = []
        for (const a of ownAliases) {
          const aliasKey = String(a).toLowerCase()
          if (seenAliases.has(aliasKey)) {
            const prev = seenAliases.get(aliasKey)
            conflicts.aliases.push({ alias: aliasKey, kept: prev, dropped: rel })
            logger.warn(`[plugin] duplicate alias "${aliasKey}" in ${rel} (already used by "${prev.name}" in ${prev.file}) — alias dropped from "${plugin.name}".`)
            continue
          }
          // An alias that matches another plugin's NAME is also a conflict.
          if (seenNames.has(aliasKey) && seenNames.get(aliasKey) !== rel) {
            conflicts.aliases.push({ alias: aliasKey, kept: { name: aliasKey, file: seenNames.get(aliasKey) }, dropped: rel })
            logger.warn(`[plugin] alias "${aliasKey}" in ${rel} shadows plugin "${aliasKey}" from ${seenNames.get(aliasKey)} — alias dropped from "${plugin.name}".`)
            continue
          }
          keptAliases.push(a)
          seenAliases.set(aliasKey, { name: plugin.name, file: rel })
        }
        plugin.aliases = keptAliases

        seenNames.set(plugin.name, rel)
        loaded.push(plugin)
        logger.debug(`[plugin] + ${plugin.category}/${plugin.name}`)
      }
    } catch (e) {
      logger.error(`[plugin] Failed to load ${rel}: ${e.message}`)
    }
  }

  plugins = loaded
  lastReport = {
    total: loaded.length,
    categories: new Set(loaded.map((p) => p.category)).size,
    files: files.length,
    conflicts,
  }
  logger.info(`[plugin] Loaded ${lastReport.total} plugin(s) across ${lastReport.categories} categories from ${files.length} file(s)`)
  if (conflicts.names.length || conflicts.aliases.length) {
    logger.warn(`[plugin] ${conflicts.names.length} name conflict(s), ${conflicts.aliases.length} alias conflict(s) — see logs above.`)
  }
  return plugins
}

export async function getPlugins() {
  if (!plugins) plugins = await loadPlugins()
  return plugins
}

/** Find a plugin by name or alias. */
export async function findPlugin(name) {
  const needle = String(name || '').toLowerCase()
  const list = await getPlugins()
  return list.find((p) =>
    p.name === needle || (p.aliases || []).some((a) => String(a).toLowerCase() === needle)
  ) || null
}

/** Group plugins by category for the menu. */
export async function byCategory() {
  const list = await getPlugins()
  const groups = {}
  for (const p of list) {
    (groups[p.category] = groups[p.category] || []).push(p)
  }
  return groups
}

export async function refreshPlugins() {
  plugins = null
  lastReport = null
  return loadPlugins()
}

/** Full registry health report (used by tests/CI). */
export function getRegistryReport() {
  if (!lastReport) return null
  return {
    total: lastReport.total,
    categories: lastReport.categories,
    files: lastReport.files,
    duplicateNames: [...lastReport.conflicts.names],
    duplicateAliases: [...lastReport.conflicts.aliases],
  }
}

export { settings }