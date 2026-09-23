import { systemInfo, fmtUptime } from '../../lib/system.js'
import settings from '../../../settings.js'
import { isOwner } from '../../lib/utils.js'

const num = (jid) => String(jid || '').replace(/@s\.whatsapp\.net|@g\.us/g, '')

const ownerOnly = async (ctx) => {
  if (isOwner(ctx.sender)) return true
  await ctx.sock.sendMessage(ctx.jid, { text: '🔒 Owner only.' })
  return false
}

export const pp = {
  name: 'pp', aliases: ['profilepic'], category: 'user', description: 'Get someone\'s profile picture. Usage: .pp @user',
  async run(ctx) {
    const target = ctx.message?.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || `@${ctx.sender.split('@')[0]}@s.whatsapp.net`
    try {
      const url = await ctx.sock.profilePictureUrl(target, 'image')
      const buf = Buffer.from(await (await fetch(url)).arrayBuffer())
      await ctx.sock.sendMessage(ctx.jid, { image: buf, caption: `🖼️ @${num(target)}` })
    } catch { await ctx.sock.sendMessage(ctx.jid, { text: '⚠️ No profile picture available.' }) }
  },
}

export const setpp = {
  name: 'setpp', category: 'user', description: 'Set the bot\'s profile picture (owner). Send an image with .setpp',
  async run(ctx) {
    if (!(await ownerOnly(ctx))) return
    const image = ctx.message?.message?.imageMessage || ctx.message?.message?.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage
    if (!image) return ctx.sock.sendMessage(ctx.jid, { text: 'Send an image with .setpp' })
    try {
      const buf = await ctx.sock.downloadMediaMessage(ctx.message)
      await ctx.sock.updateProfilePicture(ctx.sock.user?.id, { url: 'data:image/jpeg;base64,' + buf.toString('base64') })
      await ctx.sock.sendMessage(ctx.jid, { text: '✅ Profile picture updated.' })
    } catch (e) { await ctx.sock.sendMessage(ctx.jid, { text: `❌ ${e.message}` }) }
  },
}

export const setname = {
  name: 'setname', category: 'user', description: 'Set the bot\'s display name (owner). Usage: .setname <name>',
  async run(ctx) {
    if (!(await ownerOnly(ctx))) return
    const name = ctx.args.join(' ')
    if (!name) return ctx.sock.sendMessage(ctx.jid, { text: 'Usage: .setname <name>' })
    try { await ctx.sock.updateProfileStatus?.(name); await ctx.sock.sendMessage(ctx.jid, { text: `✅ Name set to *${name}*` }) }
    catch (e) { await ctx.sock.sendMessage(ctx.jid, { text: `❌ ${e.message}` }) }
  },
}

export const bio = {
  name: 'bio', aliases: ['about'], category: 'user', description: 'Set the bot\'s about/bio. Usage: .bio <text>',
  async run(ctx) {
    if (!(await ownerOnly(ctx))) return
    const b = ctx.args.join(' ')
    if (!b) return ctx.sock.sendMessage(ctx.jid, { text: 'Usage: .bio <text>' })
    try { await ctx.sock.updateProfileStatus?.(b); await ctx.sock.sendMessage(ctx.jid, { text: `✅ About set.` }) }
    catch (e) { await ctx.sock.sendMessage(ctx.jid, { text: `❌ ${e.message}` }) }
  },
}

export const block = {
  name: 'block', category: 'user', description: 'Block a user. Usage: .block @user',
  async run(ctx) {
    if (!(await ownerOnly(ctx))) return
    const target = ctx.message?.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || (ctx.args[0] ? `@${ctx.args[0].replace(/\D/g,'')}@s.whatsapp.net` : null)
    if (!target) return ctx.sock.sendMessage(ctx.jid, { text: 'Usage: .block @user' })
    await ctx.sock.updateBlockStatus(target, 'block')
    await ctx.sock.sendMessage(ctx.jid, { text: `🚫 Blocked @${num(target)}` })
  },
}

export const unblock = {
  name: 'unblock', category: 'user', description: 'Unblock a user. Usage: .unblock @user',
  async run(ctx) {
    if (!(await ownerOnly(ctx))) return
    const target = ctx.message?.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || (ctx.args[0] ? `@${ctx.args[0].replace(/\D/g,'')}@s.whatsapp.net` : null)
    if (!target) return ctx.sock.sendMessage(ctx.jid, { text: 'Usage: .unblock @user' })
    await ctx.sock.updateBlockStatus(target, 'unblock')
    await ctx.sock.sendMessage(ctx.jid, { text: `♻️ Unblocked @${num(target)}` })
  },
}

export const blocklist = {
  name: 'blocklist', aliases: ['listblock'], category: 'user', description: 'List blocked users.',
  async run(ctx) {
    if (!(await ownerOnly(ctx))) return
    try { const l = await ctx.sock.fetchBlocklist(); await ctx.sock.sendMessage(ctx.jid, { text: `🚫 *BLOCKED* (${l.length})\n${l.map((j) => `• ${num(j)}`).join('\n')}` }) }
    catch (e) { await ctx.sock.sendMessage(ctx.jid, { text: `❌ ${e.message}` }) }
  },
}

export const clearchat = {
  name: 'clearchat', aliases: ['deletechat'], category: 'user', description: 'Delete the whole chat history (owner). Usage: .clearchat',
  async run(ctx) {
    if (!(await ownerOnly(ctx))) return
    try { await ctx.sock.chatModify({ delete: true, lastMessages: [{ key: ctx.message?.key, messageTimestamp: Date.now() }] }, ctx.jid).catch(()=>{}); await ctx.sock.sendMessage(ctx.jid, { text: '🗑️ Chat cleared.' }) }
    catch (e) { await ctx.sock.sendMessage(ctx.jid, { text: `❌ ${e.message}` }) }
  },
}
