import settings from '../../../settings.js'
import { systemInfo, fmtUptime, fmtMem } from '../../lib/system.js'
import { isOwner } from '../../lib/utils.js'
import { store } from '../../lib/database.js'

const cfg = store('botcfg')

const ownerOnly = async (ctx, msg = '🔒 Owner only.') => {
  if (isOwner(ctx.sender)) return true
  await ctx.sock.sendMessage(ctx.jid, { text: msg })
  return false
}

/** Bot process stats — real metrics, nothing faked. */
export const stats = {
  name: 'stats', aliases: ['botstats'], category: 'bot', description: 'Bot and host metrics.',
  async run(ctx) {
    const s = systemInfo()
    const txt =
      `🤖 *${settings.botName}* — live stats\n` +
      `• Process RAM: ${fmtMem(s.processMemMB)}\n` +
      `• Host RAM: ${fmtMem(s.hostUsedMB)} / ${fmtMem(s.hostMemMB)} (${s.memPct}%)\n` +
      `• CPU cores: ${s.cpuCount}\n` +
      `• Load avg: ${s.loadAvg.join(', ')}\n` +
      `• Bot uptime: ${fmtUptime(s.botUptimeSec)}\n` +
      `• Host uptime: ${fmtUptime(s.hostUptimeSec)}\n` +
      `• Node: ${s.node} · ${s.platform}`
    await ctx.sock.sendMessage(ctx.jid, { text: txt })
  },
}

/** Bot uptime. */
export const uptime = {
  name: 'uptime', aliases: ['runtime', 'alive'], category: 'bot', description: 'How long the bot has been running.',
  run: async (ctx) => {
    const up = fmtUptime(Math.floor(process.uptime()))
    await ctx.sock.sendMessage(ctx.jid, {
      text: `⏱️ Uptime: *${up}*\n🌐 Connected as ${ctx.sock?.user?.id || 'unknown'}`,
    })
  },
}

/** Runtime/info bundle. */
export const runtime = {
  name: 'runtime', aliases: ['run'], category: 'bot', description: 'Runtime details.',
  run: async (ctx) => {
    const s = systemInfo()
    await ctx.sock.sendMessage(ctx.jid, {
      text: `⚙️ *${settings.botName}* runtime\nNode: ${s.node}\nPlatform: ${s.platform}\nHostname: ${s.hostname}\nPID: ${process.pid}`,
    })
  },
}

/** Owner contact. */
export const owner = {
  name: 'owner', aliases: ['creator'], category: 'bot', description: 'Show who owns the bot.',
  run: async (ctx) => {
    const contact = `@${settings.ownerNumber}`
    await ctx.sock.sendMessage(ctx.jid, {
      text: `👑 *Owner*\n${settings.botOwner}\n📳 ${contact}`,
      mentions: [`${contact}@s.whatsapp.net`],
    })
  },
}

export const restart = {
  name: 'restart', category: 'bot', description: 'Restart the bot (owner).',
  run: async (ctx) => {
    if (!(await ownerOnly(ctx))) return
    await ctx.sock.sendMessage(ctx.jid, { text: '🔄 Restarting…' })
    setTimeout(() => process.exit(0), 800).unref?.()
  },
}

/** Shut down the bot. */
export const shutdown = {
  name: 'shutdown', category: 'bot', description: 'Shut down the bot (owner).',
  run: async (ctx) => {
    if (!(await ownerOnly(ctx))) return
    await ctx.sock.sendMessage(ctx.jid, { text: '🔴 Shutting down. Goodbye.' })
    setTimeout(() => process.exit(0), 800).unref?.()
  },
}

/** Always-online toggle. (alias "online" intentionally dropped — privacy.js owns it.) */
export const alwaysonline = {
  name: 'alwaysonline', aliases: ['alwayson'], category: 'bot', description: 'Toggle always-online presence.',
  run: async (ctx) => {
    if (!(await ownerOnly(ctx))) return
    const cur = (await cfg.get('alwaysonline')) || false
    const next = !cur
    await cfg.set('alwaysonline', next)
    try { await ctx.sock.sendPresenceUpdate?.(next ? 'available' : 'unavailable') } catch {}
    await ctx.sock.sendMessage(ctx.jid, { text: `🟢 Always-online: ${next ? 'ON' : 'OFF'}` })
  },
}