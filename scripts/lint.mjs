import { loadPlugins, getRegistryReport } from '../src/plugins/index.js'

const report = await loadPlugins()
const duplicateNames = getRegistryReport()?.duplicateNames || []
const duplicateAliases = getRegistryReport()?.duplicateAliases || []

if (!report || !Array.isArray(report)) {
  console.error('[lint] Failed to load plugins.')
  process.exit(1)
}

if (duplicateNames.length || duplicateAliases.length) {
  console.error('[lint] Registry has duplicate names or aliases.')
  if (duplicateNames.length) {
    console.error(JSON.stringify(duplicateNames, null, 2))
  }
  if (duplicateAliases.length) {
    console.error(JSON.stringify(duplicateAliases, null, 2))
  }
  process.exit(1)
}

console.log(`[lint] registry ok (${report.length} plugins loaded)`)