/**
 * lib/system.js — REAL system/bot metrics (nothing faked).
 *
 * Reports genuine info about the host running the bot: process memory, uptime,
 * Node version, and (when available on Linux) CPU/RAM load & platform. This is
 * the honest substitute for a "device %" — a bot cannot read someone's phone
 * battery or GPS, but it can truthfully report its own environment.
 */
import os from 'os'

/** Process + host metrics, all measured at call time. */
export function systemInfo() {
  const totalMem = os.totalmem()
  const freeMem = os.freemem()
  const usedMem = totalMem - freeMem
  return {
    // Node runtime
    node: process.version,
    platform: `${os.platform()}/${os.arch()}`,
    // Process (the bot itself, in MB)
    processMemMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
    // Host memory
    hostMemMB: Math.round(totalMem / 1024 / 1024),
    hostUsedMB: Math.round(usedMem / 1024 / 1024),
    memPct: Math.round((usedMem / totalMem) * 100),
    // Uptime
    botUptimeSec: Math.floor(process.uptime()),
    hostUptimeSec: Math.floor(os.uptime()),
    cpuCount: os.cpus().length,
    loadAvg: os.loadavg().map((x) => x.toFixed(2)),
    hostname: os.hostname(),
  }
}

/** Format seconds as "3h 19m 57s". */
export function fmtUptime(sec) {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = Math.floor(sec % 60)
  const parts = []
  if (h) parts.push(`${h}h`)
  if (m || h) parts.push(`${m}m`)
  parts.push(`${s}s`)
  return parts.join(' ')
}

/** Human-readable memory. */
export function fmtMem(mb) {
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`
  return `${mb} MB`
}
