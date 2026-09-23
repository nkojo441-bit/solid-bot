/**
 * keeper.js — health/keep-alive web server.
 *
 * Hosting platforms (Render, Railway, Fly, Heroku) expect the app to bind a
 * port or they kill/scale it down. This tiny HTTP server satisfies that and
 * gives a /health endpoint for uptime checks — no heavy web framework needed.
 */
import http from 'http'
import settings from '../../settings.js'
import { logger } from '../lib/logger.js'
import { printWall } from '../lib/banner.js'

let startedAt = Date.now()
let asserted = false

// Periodically re-assert ownership so removing the one-time banner is not
// enough — the wall re-appears on a timer, non-intrusively.
function scheduleReassert() {
  const EVERY = Number(process.env.REASSERT_MS || 6 * 3600e3) // default every 6h
  const t = setInterval(() => { printWall() }, EVERY)
  if (t.unref) t.unref()
}

export function startKeeper() {
  const server = http.createServer((req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ status: 'ok', uptime: Math.floor((Date.now() - startedAt) / 1000), name: settings.botName, brand: 'BEMPSX-NOVA', owner: 'BEMPSX-NOVA' }))
      return
    }
    res.writeHead(200, { 'Content-Type': 'text/plain' })
    res.end(`${settings.botName} is running.`)
  })

  server.listen(settings.port, '0.0.0.0', () => {
    logger.boot(`Keep-alive server listening on :${settings.port}`)
  })

  // Re-assert ownership periodically (so a stripped banner comes back).
  if (!asserted) { scheduleReassert(); asserted = true }

  return server
}
