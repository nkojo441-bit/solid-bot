import { loadPlugins, getRegistryReport, getPlugins } from '../src/plugins/index.js'

await loadPlugins()
const report = getRegistryReport()
const plugins = await getPlugins()
const experimental = plugins.filter((plugin) => plugin.experimental)
const stable = plugins.length - experimental.length
const invalid = plugins.filter((plugin) => typeof plugin.run !== 'function' || !plugin.category)

console.log(`[registry] ${report.total} plugin(s) total`)
console.log(`[registry] ${stable} stable, ${experimental.length} experimental`)
console.log(`[registry] ${report.categories} categories from ${report.files} file(s)`)

if (report.duplicateAliases.length) {
  console.warn(`[registry] Warning: ${report.duplicateAliases.length} duplicate alias(es)`)
  for (const conflict of report.duplicateAliases) {
    console.warn(`   - ${conflict.alias}: ${conflict.kept.name} -> ${conflict.dropped}`)
  }
}

if (experimental.length) {
  console.log(`[registry] Experimental: ${experimental.map((plugin) => plugin.name).join(', ')}`)
}

if (report.duplicateNames.length) {
  console.error(`[registry] ${report.duplicateNames.length} duplicate name(s) found.`)
  process.exit(1)
}

if (invalid.length) {
  console.error(`[registry] ${invalid.length} plugin(s) missing run() or category.`)
  for (const plugin of invalid) console.error(`   - ${plugin.name || '(unnamed)'}`)
  process.exit(1)
}

console.log('✅ Registry OK.')
