import { store } from '../../lib/database.js'
import { bold, numOf } from '../../lib/utils.js'

const afkStore = store('afk')

/** AFK — mark yourself away. */
export const afk = {
  name: 'afk', category: 'tools', description: 'Set yourself as away. Usage: .afk <reason>',
  async run(ctx) {
    const reason = ctx.args.join(' ') || 'busy'
    await afkStore.set(ctx.sender, { reason, since: Date.now() })
    await ctx.sock.sendMessage(ctx.jid, { text: `🛌 ${ctx.name || numOf(ctx.sender)} is now AFK — ${reason}` })
  },
}

/** readmore — split long text with a "read more" jump. */
export const readmore = {
  name: 'readmore', category: 'tools', description: 'Split text with a read-more break.',
  async run(ctx) {
    const text = ctx.args.join(' ')
    if (!text) return ctx.sock.sendMessage(ctx.jid, { text: 'Usage: .readmore <text>' })
    const parts = text.split('|').map((s) => s.trim())
    if (parts.length < 2) return ctx.sock.sendMessage(ctx.jid, { text: '⚠️ Use a `|` to split the two halves.' })
    const readmore = '\u200b───\u200b READ MORE \u200b───\u200b'
    await ctx.sock.sendMessage(ctx.jid, { text: `${parts[0]}\n${readmore}\n${parts.slice(1).join(' ')}` })
  },
}

/** mention — tag yourself (or the reply target) with text. */
export const mention = {
  name: 'mention', category: 'tools', description: 'Tag someone with a message. Usage: .mention <text>',
  async run(ctx) {
    const target = ctx.message?.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || ctx.sender
    const text = ctx.args.join(' ') || 'hey'
    await ctx.sock.sendMessage(ctx.jid, { text: `@${numOf(target)} ${text}`, mentions: [target] })
  },
}

/**
 * FONT_MAP — correct Unicode Mathematical Alphanumeric blocks.
 *   bold   → 𝗔𝗕𝗖 (U+1D5D4..)
 *   italic → 𝘈𝘉𝘊 (U+1D608..)
 *   script → 𝓐𝓑𝓒 (U+1D4D0..)
 *   mono   → 𝙰𝙱𝙲 (U+1D670..)
 *   fancy  → 𝐀𝐁𝐂 (U+1D400..)  [math bold]
 */
const FONT_MAP = {
  bold: {
    a:'𝗮',b:'𝗯',c:'𝗰',d:'𝗱',e:'𝗲',f:'𝗳',g:'𝗴',h:'𝗵',i:'𝗶',j:'𝗷',k:'𝗸',l:'𝗹',m:'𝗺',
    n:'𝗻',o:'𝗼',p:'𝗽',q:'𝗾',r:'𝗿',s:'𝘀',t:'𝘁',u:'𝘂',v:'𝘃',w:'𝘄',x:'𝘅',y:'𝘆',z:'𝘇',
  },
  italic: {
    a:'𝘢',b:'𝘣',c:'𝘤',d:'𝘥',e:'𝘦',f:'𝘧',g:'𝘨',h:'𝘩',i:'𝘪',j:'𝘫',k:'𝘬',l:'𝘭',m:'𝘮',
    n:'𝘯',o:'𝘰',p:'𝘱',q:'𝘲',r:'𝘳',s:'𝘴',t:'𝘵',u:'𝘶',v:'𝘷',w:'𝘸',x:'𝘹',y:'𝘺',z:'𝘻',
  },
  script: {
    a:'𝓪',b:'𝓫',c:'𝓬',d:'𝓭',e:'𝓮',f:'𝓯',g:'𝓰',h:'𝓱',i:'𝓲',j:'𝓳',k:'𝓴',l:'𝓵',m:'𝓶',
    n:'𝓷',o:'𝓸',p:'𝓹',q:'𝓺',r:'𝓻',s:'𝓼',t:'𝓽',u:'𝓾',v:'𝓿',w:'𝔀',x:'𝔁',y:'𝔂',z:'𝔃',
  },
  mono: {
    a:'𝚊',b:'𝚋',c:'𝚌',d:'𝚍',e:'𝚎',f:'𝚏',g:'𝚐',h:'𝚑',i:'𝚒',j:'𝚓',k:'𝚔',l:'𝚕',m:'𝚖',
    n:'𝚗',o:'𝚘',p:'𝚙',q:'𝚚',r:'𝚛',s:'𝚜',t:'𝚝',u:'𝚞',v:'𝚟',w:'𝚠',x:'𝚡',y:'𝚢',z:'𝚣',
  },
  fancy: {
    a:'𝐚',b:'𝐛',c:'𝐜',d:'𝐝',e:'𝐞',f:'𝐟',g:'𝐠',h:'𝐡',i:'𝐢',j:'𝐣',k:'𝐤',l:'𝐥',m:'𝐦',
    n:'𝐧',o:'𝐨',p:'𝐩',q:'𝐪',r:'𝐫',s:'𝐬',t:'𝐭',u:'𝐮',v:'𝐯',w:'𝐰',x:'𝐱',y:'𝐲',z:'𝐳',
  },
}

export const font = {
  name: 'font', aliases: ['stylish'], category: 'tools',
  description: 'Convert text to a fancy font. Usage: .font <bold|italic|script|mono|fancy> <text>',
  async run(ctx) {
    const style = (ctx.args[0] || '').toLowerCase()
    const map = FONT_MAP[style]
    const text = ctx.args.slice(1).join(' ')
    if (!map || !text) {
      return ctx.sock.sendMessage(ctx.jid, {
        text: `Usage: .font <${Object.keys(FONT_MAP).join('|')}> <text>`,
      })
    }
    const out = text.split('').map((ch) => map[ch.toLowerCase()] || ch).join('')
    await ctx.sock.sendMessage(ctx.jid, { text: out })
  },
}

/** quote — a random real quote from a free API. */
export const quote = {
  name: 'quote', aliases: ['quotes'], category: 'tools', description: 'Get a random quote.',
  async run(ctx) {
    try {
      const r = await fetch('https://dummyjson.com/quotes/random')
      const j = await r.json()
      await ctx.sock.sendMessage(ctx.jid, { text: `“${j.quote}”\n— ${j.author}` })
    } catch {
      await ctx.sock.sendMessage(ctx.jid, { text: '❌ Could not fetch a quote right now.' })
    }
  },
}

/** getdevice — honest: only the bot's host. */
export const getdevice = {
  name: 'getdevice', aliases: ['device'], category: 'tools', description: 'Show the platform of the bot host.',
  run: async (ctx) => {
    await ctx.sock.sendMessage(ctx.jid, { text: `🖥️ Bot host: ${process.platform}/${process.arch}\n(We can only report the bot\'s own device — WhatsApp doesn't expose other users\' platform.)` })
  },
}

/** msgs — count messages processed by the session. */
export const msgs = {
  name: 'msgs', aliases: ['count'], category: 'tools', description: 'Show processed message count.',
  run: async (ctx) => {
    const cnt = (await store('stats').get('count')) || 0
    await ctx.sock.sendMessage(ctx.jid, { text: `📊 Messages processed: ${cnt}` })
  },
}

// (bold helper is re-exported for convenience; delete this if unused)
export { bold }