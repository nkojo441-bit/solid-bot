/**
 * scripts/test-session-flow.mjs — end-to-end session round-trip test.
 *
 * Start the server first:  npm run session:serve
 * Then run:                node scripts/test-session-flow.mjs
 *
 * Uses ADMIN_TOKEN and SESSION_API from your shell env.
 */
const BASE = process.env.SESSION_API || 'http://127.0.0.1:8022'
const TOKEN = process.env.ADMIN_TOKEN

if (!TOKEN) {
  console.error('Set ADMIN_TOKEN in your shell (same value the server uses).')
  process.exit(1)
}

const FAKE_CREDS = JSON.stringify({ test: true, generatedAt: Date.now() })

async function main() {
  // 1. health
  const h = await fetch(`${BASE}/health`)
  console.log('health:', await h.json())

  // 2. save
  const save = await fetch(`${BASE}/api/save`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-admin-token': TOKEN },
    body: JSON.stringify({ creds: FAKE_CREDS }),
  })
  const saved = await save.json()
  console.log('save:', saved)
  if (!saved.ok || !saved.code) throw new Error('save failed')

  // 3. grab
  const grab = await fetch(`${BASE}/api/grab/${saved.code}`)
  const grabbed = await grab.json()
  console.log('grab:', { ok: grab.ok, hasCreds: Boolean(grabbed.creds) })
  if (!grabbed.creds) throw new Error('grab failed')
  if (grabbed.creds !== FAKE_CREDS) throw new Error('creds mismatch')

  // 4. list
  const list = await fetch(`${BASE}/api/list`, { headers: { 'x-admin-token': TOKEN } })
  const listed = await list.json()
  console.log('list:', listed)

  // 5. revoke
  const rev = await fetch(`${BASE}/api/revoke/${saved.code}`, {
    method: 'DELETE',
    headers: { 'x-admin-token': TOKEN },
  })
  console.log('revoke:', await rev.json())

  // 6. grab again should 404
  const gone = await fetch(`${BASE}/api/grab/${saved.code}`)
  console.log('grab-after-revoke:', gone.status, await gone.json())

  console.log('\n✅ All session server checks passed.')
}

main().catch((e) => { console.error('❌', e.message); process.exit(1) })