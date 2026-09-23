import { store } from '../../lib/database.js'
import { isOwner, numOf } from '../../lib/utils.js'
import { systemInfo, fmtUptime } from '../../lib/system.js'

const cfg = store('botcfg')
const ownerOnly = async (ctx, msg = '🔒 Owner only.') => {
  if (isOwner(ctx.sender)) return true
  await ctx.sock.sendMessage(ctx.jid, { text: msg })
  return false
}

/** ignore — toggle ignoring a user/bot. */
export const ignore = {
  name: 'ignore', aliases: ['ignoreuser'], category: 'bot', description: 'Ignore a user. Usage: .ignore @user',
  async run(ctx) {
    if (!(await ownerOnly(ctx))) return
    const target = ctx.message?.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
    if (!target) return ctx.sock.sendMessage(ctx.jid, { text: 'Mention a user with .ignore' })
    const list = (await cfg.get('ignore')) || []
    if (list.includes(target)) return ctx.sock.sendMessage(ctx.jid, { text: 'Already ignored.' })
    await cfg.set('ignore', [...list, target])
    await ctx.sock.sendMessage(ctx.jid, { text: `🚫 Ignoring @${numOf(target)}` })
  },
}

/** p-status — process status (PID/uptime/ram). */
export const pstatus = {
  name: 'p-status', aliases: ['pstatus', 'pid'], category: 'bot', description: 'Process status.',
  run: async (ctx) => {
    const s = systemInfo()
    await ctx.sock.sendMessage(ctx.jid, { text: `🧠 *Process*\nPID: ${process.pid}\nUptime: ${fmtUptime(s.botUptimeSec)}\nRAM: ${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB\nNode: ${process.version}` })
  },
}

/** startupmsg — set the startup announcement message (owner). */
export const startupmsg = {
  name: 'startupmsg', aliases: ['setstartup'], category: 'bot', description: 'Set the startup message. Usage: .startupmsg <text>',
  async run(ctx) {
    if (!(await ownerOnly(ctx))) return
    const t = ctx.args.join(' ')
    if (!t) return ctx.sock.sendMessage(ctx.jid, { text: 'Usage: .startupmsg <text>' })
    await cfg.set('startupmsg', t)
    await ctx.sock.sendMessage(ctx.jid, { text: '✅ Startup message saved.' })
  },
}

/** cmdreact — toggle bot reaction on commands. */
export const cmdreact = {
  name: 'cmdreact', aliases: ['cmdrx'], category: 'bot', description: 'Toggle reaction on command use.',
  async run(ctx) {
    if (!(await ownerOnly(ctx))) return
    const cur = Boolean(await cfg.get('cmdreact'))
    await cfg.set('cmdreact', !cur)
    await ctx.sock.sendMessage(ctx.jid, { text: `⚡ cmdreact ${!cur ? 'ON' : 'OFF'}` })
  },
}

/** autotyping — toggle typing/presence on commands. */
export const autotyping = {
  name: 'autotyping', aliases: ['autotype'], category: 'bot', description: 'Toggle auto-typing presence.',
  async run(ctx) {
    if (!(await ownerOnly(ctx))) return
    const cur = Boolean(await cfg.get('autotyping'))
    await cfg.set('autotyping', !cur)
    await ctx.sock.sendMessage(ctx.jid, { text: `⌨️ autotyping ${!cur ? 'ON' : 'OFF'}` })
  },
}

/** rejectcall — toggle auto-rejecting WhatsApp calls (owner, best-effort). */
const REJECT_MSG = 'ℹ️ The bot can\'t auto-reject calls without your device being the primary; on a linked session this is managed by WhatsApp. Toggling records the preference.'
export const rejectcall = {
  name: 'rejectcall', aliases: ['reject'], category: 'bot', description: 'Toggle call rejection preference.',
  async run(ctx) {
    if (!(await ownerOnly(ctx))) return
    const cur = Boolean(await cfg.get('rejectcall'))
    await cfg.set('rejectcall', !cur)
    await ctx.sock.sendMessage(ctx.jid, { text: `📵 rejectcall ${!cur ? 'ON' : 'OFF'}\n${REJECT_MSG}` })
  },
}

/** antidelete — toggle recording deleted messages. */
export const antidelete = {
  name: 'antidelete', aliases: ['antidel'], category: 'bot', description: 'Toggle deleted-message logging.',
  async run(ctx) {
    if (!(await ownerOnly(ctx))) return
    const cur = Boolean(await cfg.get('antidelete'))
    await cfg.set('antidelete', !cur)
    await ctx.sock.sendMessage(ctx.jid, { text: `🛡️ antidelete ${!cur ? 'ON' : 'OFF'}` })
  },
}

/** reload — reload all plugins. */
export const reload = {
  name: 'reload', aliases: ['reloadplugins'], category: 'bot', description: 'Reload plugins (owner).',
  async run(ctx) {
    if (!(await ownerOnly(ctx))) return
    try {
      const { refreshPlugins } = await import('../index.js')
      const n = await refreshPlugins?.()
      await ctx.sock.sendMessage(ctx.jid, { text: `🔄 Reloaded plugins (${n || 'done'}).` })
    } catch (e) { await ctx.sock.sendMessage(ctx.jid, { text: `❌ ${e.message}` }) }
  },
}

/** update — owner update placeholder (real pull requires git; honest). */
export const update = {
  name: 'update', category: 'bot', description: 'Check for updates.',
  async run(ctx) {
    if (!(await ownerOnly(ctx))) return
    await ctx.sock.sendMessage(ctx.jid, { text: 'ℹ️ Updates are deployment-specific. Redeploy the current project build when you have a new version.' })
  },
}
