import fs from 'fs'
import path from 'path'
import settings from '../settings.js'
import { SESSION_DIR } from '../src/core/socket.js'
import { describeSessionId, isShortBempsXId } from '../src/lib/sessionId.js'

console.log('BEMPSX-NOVA WhatsApp pairing diagnostic')
console.log('Node:', process.version)
console.log('Pairing number:', settings.pairingNumber || '(not set)')
console.log('Session directory:', SESSION_DIR)
console.log('Saved credentials:', fs.existsSync(path.join(SESSION_DIR, 'creds.json')) ? 'present' : 'none')
console.log('SESSION_ID format:', describeSessionId(settings.sessionId))
console.log('SESSION_API:', settings.sessionApi || '(not set)')

let exitCode = 0

if (settings.pairingNumber && !/^\d{7,15}$/.test(settings.pairingNumber)) {
  console.error('❌ Invalid PAIRING_NUMBER: use 7–15 digits including the country code, no +, spaces or dashes.')
  exitCode = 1
}

if (settings.sessionId && isShortBempsXId(settings.sessionId) && !settings.sessionApi) {
  console.error('❌ SESSION_ID is a short BEMPSX-ID, but SESSION_API is empty.')
  console.error('   Set SESSION_API=https://your-session-server.example.com in .env.')
  exitCode = 1
}

if (settings.sessionId && isShortBempsXId(settings.sessionId) && settings.sessionApi) {
  // Quick reachability probe (does not consume a real code).
  try {
    const url = `${settings.sessionApi.replace(/\/+$/, '')}/health`
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
    console.log(`   Session server /health: ${res.ok ? '✅ reachable' : `⚠️ HTTP ${res.status}`}`)
  } catch (e) {
    console.warn(`   Session server /health: ⚠️ unreachable (${e.message})`)
  }
}

if (!settings.pairingNumber && !settings.sessionId) {
  console.log('ℹ️  No pairing number or SESSION_ID configured.')
  console.log('   Run `npm run pair` for interactive pairing, or set SESSION_ID.')
} else if (!exitCode) {
  console.log('✅ Configuration looks valid.')
}

process.exit(exitCode)