/**
 * plugins/experimental/index.js — marker for experimental plugins.
 *
 * Any plugin file in this folder should set `experimental: true` on its
 * export. The loader picks it up normally, but the menu and .plugin command
 * group these separately so the "real commands" count stays honest.
 */
export const EXPERIMENTAL_CATEGORY = 'experimental'

/** Helper for files inside this folder. */
export function experimental(plugin) {
  return { ...plugin, experimental: true, category: plugin.category || EXPERIMENTAL_CATEGORY }
}