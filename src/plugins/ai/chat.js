import { aiChat, aiStatus } from '../../apis/ai.js'
import { hasAiKey, aiKeyLabel, aiProvider } from '../../lib/secrets.js'
import { translate } from '../../apis/translate.js'

const missingKey = (p) =>
  `⚠️ *No ${aiProvider()} API key set.*\nAdd \`${aiKeyLabel()}\` to your .env to enable AI, or run \`.aikeys\` to see what's configured.`

export const ai = {
  name: 'ai', aliases: ['gemini', 'gpt', 'chat'], category: 'ai', description: 'Ask the AI anything. Usage: .ai <question>',
  async run(ctx) {
    if (!hasAiKey()) return ctx.sock.sendMessage(ctx.jid, { text: missingKey() })
    const prompt = ctx.args.join(' ') || ctx.body
    if (!prompt) return ctx.sock.sendMessage(ctx.jid, { text: 'Ask me something: .ai <question>' })
    const reply = await aiChat(prompt)
    await ctx.sock.sendMessage(ctx.jid, { text: `🤖 *${aiProvider()}*:\n${reply}` })
  },
}

export const aistatus = {
  name: 'aistatus', aliases: ['aikeys'], category: 'ai', description: 'Show configured AI providers.',
  async run(ctx) {
    await ctx.sock.sendMessage(ctx.jid, { text: `🔑 *AI PROVIDER STATUS*\nActive: ${aiProvider()}\n\n${aiStatus()}` })
  },
}

export const summarize = {
  name: 'summarize', aliases: ['sum'], category: 'ai', description: 'Summarize text.',
  async run(ctx) {
    if (!hasAiKey()) return ctx.sock.sendMessage(ctx.jid, { text: missingKey() })
    const text = ctx.args.join(' ')
    if (!text) return ctx.sock.sendMessage(ctx.jid, { text: 'Usage: .summarize <text>' })
    const reply = await aiChat(`Summarize the following:\n\n${text}`, { system: 'You are a summarizer. Be concise and clear.' })
    await ctx.sock.sendMessage(ctx.jid, { text: reply })
  },
}

export const tr = {
  name: 'translate', aliases: ['tr'], category: 'ai', description: 'Translate text. Usage: .translate <lang> <text>',
  async run(ctx) {
    const lang = (ctx.args[0] || 'en').toLowerCase()
    const text = ctx.args.slice(1).join(' ')
    if (!text) return ctx.sock.sendMessage(ctx.jid, { text: 'Usage: .translate <lang> <text>  e.g. .translate ig Hello' })
    const r = await translate(text, lang)
    await ctx.sock.sendMessage(ctx.jid, { text: `🌐 *${r.label || r.target}*\n${r.translated}` })
  },
}
