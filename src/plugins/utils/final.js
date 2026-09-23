import { store } from '../../lib/database.js'
import { isOwner, numOf } from '../../lib/utils.js'
import { qrUrl } from '../../apis/free.js'
import { getUser, saveUser } from '../../lib/economy.js'

const notes = store('notes')
const cfg = store('botcfg')
const ownerOnly = async (ctx, msg = '🔒 Owner only.') => {
  if (isOwner(ctx.sender)) return true
  await ctx.sock.sendMessage(ctx.jid, { text: msg })
  return false
}

/** plugin/plugins — list all loaded plugins. */
export const plugin = {
  name: 'plugin', aliases: ['plugins'], category: 'utils', description: 'List loaded plugins.',
  async run(ctx) {
    const { getPlugins } = await import('../index.js')
    const list = await getPlugins()
    const byCat = {}
    for (const p of list) byCat[p.category] = (byCat[p.category] || 0) + 1
    await ctx.sock.sendMessage(ctx.jid, { text: `🔌 *LOADED PLUGINS* (${list.length})\n\n${Object.entries(byCat).map(([c, n]) => `• ${c}: ${n}`).join('\n')}` })
  },
}

/** qrcode — generate a QR code. */
export const qrcode = {
  name: 'qrcode', aliases: ['qrgen2'], category: 'utils', description: 'Generate a QR code. Usage: .qrcode <text>',
  async run(ctx) {
    const text = ctx.args.join(' ') || ctx.body
    if (!text) return ctx.sock.sendMessage(ctx.jid, { text: 'Usage: .qrcode <text>' })
    try { const buf = Buffer.from(await (await fetch(qrUrl(text))).arrayBuffer()); await ctx.sock.sendMessage(ctx.jid, { image: buf, caption: `🔳 ${text}` }) }
    catch { await ctx.sock.sendMessage(ctx.jid, { text: '❌ QR failed.' }) }
  },
}

/** quoted — info about a replied message (alias of quotedinfo). */
export const quoted = {
  name: 'quoted', category: 'utils', description: 'Info about the replied message.',
  run: async (ctx) => {
    const q = ctx.message?.message?.extendedTextMessage?.contextInfo
    if (!q?.quotedMessage) return ctx.sock.sendMessage(ctx.jid, { text: 'Reply to a message with .quoted' })
    await ctx.sock.sendMessage(ctx.jid, { text: `📩 Replied from @${numOf(q.participant || '')}\nType: ${Object.keys(q.quotedMessage)[0] || 'text'}` })
  },
}

/** reactions — react with an emoji (alias of areact). */
export const reactions = {
  name: 'reactions', category: 'utils', description: 'React to a message. Usage: .reactions <emoji>',
  run: async (ctx) => {
    const emoji = ctx.args[0] || '👍'
    const q = ctx.message?.message?.extendedTextMessage?.contextInfo
    const key = q?.quotedMessage?.key || ctx.message?.key
    try { await ctx.sock.sendMessage(ctx.jid, { react: { text: emoji, key } }) }
    catch { await ctx.sock.sendMessage(ctx.jid, { text: '❌ Could not react.' }) }
  },
}

/** forward — forward a replied message to another chat (owner). */
export const forward = {
  name: 'forward', category: 'utils', description: 'Forward a reply to a chat (owner). Usage: .forward <targetJid>',
  async run(ctx) {
    if (!(await ownerOnly(ctx))) return
    const targetArg = ctx.args[0] || ''
    const target = /@g\.us|@s\.whatsapp\.net/.test(targetArg) ? targetArg : (targetArg ? `@${targetArg.replace(/\D/g, '')}@s.whatsapp.net` : null)
    if (!target) return ctx.sock.sendMessage(ctx.jid, { text: 'Usage: .forward <targetJid or number>' })
    const q = ctx.message?.message?.extendedTextMessage?.contextInfo?.quotedMessage
    try { await ctx.sock.sendMessage(target, { text: q?.conversation || '' }) ; await ctx.sock.sendMessage(ctx.jid, { text: '↪️ Forwarded.' }) }
    catch (e) { await ctx.sock.sendMessage(ctx.jid, { text: `❌ ${e.message}` }) }
  },
}

/** gift — give coins to someone (with a message). */
export const gift = {
  name: 'gift', aliases: ['donate'], category: 'utils', description: 'Give coins to someone. Usage: .gift <@user> <amount>',
  async run(ctx) {
    const target = ctx.message?.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
    const amt = Math.round(Number(ctx.args[0]) || Number(ctx.args[ctx.args.length - 1]))
    if (!target || !amt || amt < 1) return ctx.sock.sendMessage(ctx.jid, { text: 'Usage: .gift <@user> <amount>' })
    const me = await getUser(ctx.sender)
    if (me.money < amt) return ctx.sock.sendMessage(ctx.jid, { text: `Not enough money (💰 ${me.money}).` })
    const them = await getUser(target)
    me.money -= amt; them.money += amt
    await saveUser(me); await saveUser(them)
    await ctx.sock.sendMessage(ctx.jid, { text: `🎁 You gave ${amt} to @${numOf(target)} (💰 ${me.money})` })
  },
}

/** privacy — list privacy settings. */
export const privacy = {
  name: 'privacy', category: 'utils', description: 'Show bot privacy settings.',
  async run(ctx) {
    await ctx.sock.sendMessage(ctx.jid, { text: '🔒 *PRIVACY*\n• Auto-read: (set via .setvar AUTO_READ)\n• Always-online: ' + (await cfg.get('alwaysonline') ? 'ON' : 'OFF') + '\n• This bot never reads GPS, battery, or personal info — those aren\'t exposed to the API.' })
  },
}

/** savestatus — set your status (about). */
export const savestatus = {
  name: 'savestatus', aliases: ['setstatus'], category: 'utils', description: 'Set bot about text. Usage: .savestatus <text>',
  async run(ctx) {
    if (!(await ownerOnly(ctx))) return
    const t = ctx.args.join(' ')
    if (!t) return ctx.sock.sendMessage(ctx.jid, { text: 'Usage: .savestatus <text>' })
    try { await ctx.sock.updateProfileStatus?.(t); await ctx.sock.sendMessage(ctx.jid, { text: '✅ About updated.' }) }
    catch (e) { await ctx.sock.sendMessage(ctx.jid, { text: `❌ ${e.message}` }) }
  },
}

/** statusinfo / readstatus — view bot's own status. */
export const statusinfo = {
  name: 'statusinfo', aliases: ['mysstatus'], category: 'utils', description: 'Show the bot\'s about text.',
  async run(ctx) {
    const jid = (ctx.sock?.user?.id?.split(':')[0] || '') + '@s.whatsapp.net'
    try { const s = await ctx.sock.getStatus?.(jid); await ctx.sock.sendMessage(ctx.jid, { text: `📝 About: ${s?.status || 'not set'}` }) } catch {}
  },
}

/** likestatus — react to a status (honest note for stories). */
export const likestatus = {
  name: 'likestatus', aliases: ['reactstatus'], category: 'utils', description: 'React to a status.',
  async run(ctx) {
    await ctx.sock.sendMessage(ctx.jid, { text: 'ℹ️ You can react to a status by replying to it in WhatsApp; the bot API doesn\'t allow reacting to arbitrary statuses.' })
  },
}

/** join — join a group via invite code (owner). */
export const join = {
  name: 'join', category: 'utils', description: 'Join a group via invite link/code (owner). Usage: .join <link or code>',
  async run(ctx) {
    if (!(await ownerOnly(ctx))) return
    const raw = ctx.args[0] || ''
    const code = (raw.match(/chat\.whatsapp\.com\/([\w-]+)/) || [null, raw.replace(/\W/g, '').slice(0, 22)])[1]
    if (!code) return ctx.sock.sendMessage(ctx.jid, { text: 'Usage: .join <https://chat.whatsapp.com/CODE>' })
    try { const res = await ctx.sock.groupAcceptInvite?.(code); await ctx.sock.sendMessage(ctx.jid, { text: `✅ Joined group ${res || code}.` }) }
    catch (e) { await ctx.sock.sendMessage(ctx.jid, { text: `❌ ${e.message}` }) }
  },
}

/** delallnote — clear all my notes. */
export const delallnote = {
  name: 'delallnote', aliases: ['clearallnote'], category: 'utils', description: 'Delete all your notes.',
  async run(ctx) {
    const all = await notes.all()
    for (const k of Object.keys(all)) if (String(all[k]).startsWith(ctx.sender + ':')) await notes.set(k, '')
    await ctx.sock.sendMessage(ctx.jid, { text: '🗑️ All your notes deleted.' })
  },
}

/** tovv — image/sticker to view-once video note. */
export const tovv = {
  name: 'tovv', aliases: ['vvvideo'], category: 'converter', description: 'Convert a reply image/sticker to a view-once video note.',
  async run(ctx) {
    const t = ctx.message?.message?.imageMessage ? 'imageMessage' : null
    try {
      const { downloadMedia, runFfmpeg } = await import('../../lib/media.js')
      const file = await downloadMedia(ctx.sock, ctx.message, t || 'imageMessage')
      const fs = await import('fs')
      const out = file.replace(/\.[^.]+$/, '.vv.mp4')
      await runFfmpeg(file, out, ['-loop', '1', '-t', '2', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-f', 'mp4'])
      const buf = fs.default.readFileSync(out)
      try { fs.default.unlinkSync(file) } catch {}; try { fs.default.unlinkSync(out) } catch {}
      await ctx.sock.sendMessage(ctx.jid, { video: buf, ptt: false, viewOnce: true })
    } catch (e) { await ctx.sock.sendMessage(ctx.jid, { text: `❌ ${e.message}` }) }
  },
}

/** pdf — image to PDF. */
export const pdf = {
  name: 'pdf', category: 'converter', description: 'Convert a reply image to PDF.',
  async run(ctx) {
    try {
      const { downloadMedia, runFfmpeg } = await import('../../lib/media.js')
      const file = await downloadMedia(ctx.sock, ctx.message, 'imageMessage')
      const sharp = (await import('sharp')).default
      const pdf = await sharp(file).jpeg().pdf()
      const fs = await import('fs')
      try { fs.default.unlinkSync(file) } catch {}
      await ctx.sock.sendMessage(ctx.jid, { document: pdf, mimetype: 'application/pdf', fileName: 'image.pdf' })
    } catch (e) { await ctx.sock.sendMessage(ctx.jid, { text: `❌ ${e.message}` }) }
  },
}

/** reasoning — AI reasoning mode. */
export const reasoning = {
  name: 'reasoning', aliases: ['think'], category: 'ai', description: 'Get a step-by-step AI reasoning answer. Usage: .reasoning <question>',
  async run(ctx) {
    const { aiChat } = await import('../../apis/ai.js')
    const { aiKey } = await import('../../lib/secrets.js')
    if (!aiKey()) return ctx.sock.sendMessage(ctx.jid, { text: '⚠️ No AI key set. Add one with .setkey or in .env.' })
    const q = ctx.args.join(' ')
    if (!q) return ctx.sock.sendMessage(ctx.jid, { text: 'Usage: .reasoning <question>' })
    try { const r = await aiChat(q, { system: 'Think step by step and show your reasoning clearly, then give a concise conclusion.' }); await ctx.sock.sendMessage(ctx.jid, { text: `🧠 ${r}` }) }
    catch (e) { await ctx.sock.sendMessage(ctx.jid, { text: `❌ ${e.message}` }) }
  },
}
