import settings from '../../../settings.js'
import { systemInfo, fmtUptime, fmtMem } from '../../lib/system.js'

/**
 * info — bot/system info with REAL host metrics (no fake device/battery).
 */
export default {
  name: 'info',
  aliases: ['status', 'botinfo'],
  category: 'core',
  description: 'Show bot and system info.',
  run({ sock, jid, sender, name }) {
    const { botName, botOwner, author, ownerNumber, prefix } = settings
    const sys = systemInfo()
    const you = name || `@${sender.split('@')[0]}`
    const text =
      `📊 *${botName}* — Information\n\n` +
      `• Bot name: ${botName}\n` +
      `• Creator: ${botOwner}\n` +
      `• Author: ${author}\n` +
      `• Owner: ${ownerNumber}\n` +
      `• Prefix: ${prefix}\n` +
      `• You: ${you}\n\n` +
      `🔧 *System*\n` +
      `• Node: ${sys.node} (${sys.platform})\n` +
      `• Uptime: ${fmtUptime(sys.botUptimeSec)}\n` +
      `• Memory: ${fmtMem(sys.processMemMB)} (host ${sys.memPct}% used)\n` +
      `• CPU cores: ${sys.cpuCount}`
    sock.sendMessage(jid, { text, mentions: sender.startsWith('@') ? [] : [sender] })
  },
}
