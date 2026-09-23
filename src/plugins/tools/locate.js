import { systemInfo, fmtUptime, fmtMem } from '../../lib/system.js'

/**
 * locate — honest location / device information.
 *
 * A WhatsApp bot CANNOT read another person's phone battery or GPS. So instead
 * of faking numbers, this command:
 *   - `.locate <lat> <lon>` builds a real Google Maps link from REAL coordinates.
 *   - `.dev` reports REAL host metrics (not fake phone stats).
 */

/** locate — make a real map link from coordinates (or the bot's own info). */
export const locate = {
  name: 'locate', aliases: ['maps', 'where'], category: 'tools',
  description: 'Real map link. Usage: .locate <lat> <lon> (or .locate to get bot info)',
  async run(ctx) {
    const [a, b] = ctx.args
    if (a && b && !isNaN(a) && !isNaN(b)) {
      const url = `https://www.google.com/maps?q=${a},${b}`
      return ctx.sock.sendMessage(ctx.jid, { text: `🗺️ *Open in Maps*\n${url}` })
    }
    return ctx.sock.sendMessage(ctx.jid, {
      text: '🗺️ *Usage*\n.locate <latitude> <longitude>\n\nExample: .locate 6.5244 3.3792',
    })
  },
}

/** dev — REAL device/host info (the honest "device %"). */
export const dev = {
  name: 'dev', aliases: ['sysinfo', 'battery'], category: 'tools',
  description: 'Real system info (host, not fake phone stats).',
  run(ctx) {
    const s = systemInfo()
    const text =
      `🖥️ *BOT DEVICE (host)*\n` +
      `• Node: ${s.node} (${s.platform})\n` +
      `• Bot uptime: ${fmtUptime(s.botUptimeSec)}\n` +
      `• Process mem: ${fmtMem(s.processMemMB)}\n` +
      `• Host RAM: ${fmtMem(s.hostUsedMB)} / ${fmtMem(s.hostMemMB)} (${s.memPct}%)\n` +
      `• CPU cores: ${s.cpuCount} | load: ${s.loadAvg.join(', ')}\n` +
      `• Hostname: ${s.hostname}`
    return ctx.sock.sendMessage(ctx.jid, { text })
  },
}
