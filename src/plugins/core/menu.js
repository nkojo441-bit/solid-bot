import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import settings from '../../../settings.js'
import { byCategory } from '../index.js'
import { systemInfo, fmtUptime, fmtMem } from '../../lib/system.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * The main menu — sends a branded header image, then the command list grouped
 * by category, with the REAL user name and REAL system metrics.
 */
export default {
  name: 'menu',
  aliases: ['help', 'start', 'list', 'cmd', 'menu'],
  category: 'core',
  description: 'Show the bot menu / available commands.',
  async run(ctx) {
    const { sock, jid } = ctx
    const { prefix, botName, botOwner } = settings
    const groups = await byCategory()
    const userName = ctx.name || `@${String(ctx.sender || '').replace(/\D/g, '')}`
    const count = Object.values(groups).flat().length
    const sys = systemInfo()

    const body = Object.keys(groups)
      .map((cat) => {
        const items = groups[cat]
          .map((p) => `│ ${p.name}`)
          .join('\n')
        return `\n┏ *${cat.toUpperCase()}* ┓\n${items}`
      })
      .join('\n')

    const header =
      `┌────═━┈ ${botName} ┈━═────┐\n` +
      `✇ Creator: ${botOwner}\n` +
      `✇ User: ${userName}\n` +
      `✇ Prefix: ${prefix}\n` +
      `✇ Plugins: ${count}\n` +
      `✇ Uptime: ${fmtUptime(sys.botUptimeSec)}\n` +
      `✇ Memory: ${fmtMem(sys.processMemMB)}\n` +
      `✇ Platform: nodejs ${sys.node}\n` +
      `└───────═━┈┈━═──────┘\n` +
      body +
      `\n\n_Send ${prefix}menu anytime._`

    // Send the branded banner image first, then the text menu.
    const banner = path.join(__dirname, '..', '..', '..', 'assets', 'bempsx-md.png')
    try {
      if (fs.existsSync(banner)) {
        await sock.sendMessage(jid, {
          image: fs.readFileSync(banner),
          caption: header,
        })
        return
      }
    } catch (e) {
      console.error('[menu] banner failed:', e.message)
    }
    // Fallback: plain text if the banner is missing/unsendable.
    await sock.sendMessage(jid, { text: header })
  },
}
