import { aiChat } from '../../apis/ai.js'
import { aiKey, aiKeyLabel } from '../../lib/secrets.js'

const missingKey = (p) =>
  `⚠️ *${p}* needs a key.\nAdd \`${aiKeyLabel(p)}\` to .env (or use .setkey ${p} <key>).`

/** Build a command that targets one specific AI provider. */
function providerCmd(name, provider, alias) {
  return {
    name, aliases: alias ? [alias] : [], category: 'ai',
    description: `Ask AI via ${provider}. Usage: .${name} <question>`,
    async run(ctx) {
      if (!aiKey(provider)) return ctx.sock.sendMessage(ctx.jid, { text: missingKey(provider) })
      const q = ctx.args.join(' ') || ctx.body
      if (!q) return ctx.sock.sendMessage(ctx.jid, { text: `Usage: .${name} <question>` })
      const reply = await aiChat(q, { provider })
      await ctx.sock.sendMessage(ctx.jid, { text: `🤖 *${provider}*:\n${reply}` })
    },
  }
}

export const gemini = providerCmd('gemini', 'gemini')
export const gpt = providerCmd('gpt', 'openai', 'openai')
export const deepseek = providerCmd('deepseek', 'deepseek')
export const groq = providerCmd('groq', 'groq')
export const mistral = providerCmd('mistral', 'mistral')
export const cohere = providerCmd('cohere', 'cohere')
export const together = providerCmd('together', 'together')

/** coder — programming assistant. */
export const coder = {
  name: 'coder', category: 'ai', description: 'Ask a coding assistant. Usage: .coder <question>',
  async run(ctx) {
    if (!aiKey()) return ctx.sock.sendMessage(ctx.jid, { text: missingKey() })
    const q = ctx.args.join(' ')
    if (!q) return ctx.sock.sendMessage(ctx.jid, { text: 'Usage: .coder <question>' })
    const reply = await aiChat(q, { system: 'You are an expert software engineer. Provide clean, correct code with a short explanation. Use fenced code blocks.' })
    await ctx.sock.sendMessage(ctx.jid, { text: `🧑‍💻 *Coder*:\n${reply}` })
  },
}

/** chatbot — a chatty persona. */
export const chatbot = {
  name: 'chatbot', aliases: ['bot'], category: 'ai', description: 'Chat with the bot (conversational). Usage: .chatbot <message>',
  async run(ctx) {
    if (!aiKey()) return ctx.sock.sendMessage(ctx.jid, { text: missingKey() })
    const q = ctx.args.join(' ') || ctx.body
    if (!q) return ctx.sock.sendMessage(ctx.jid, { text: 'Say something: .chatbot <message>' })
    const reply = await aiChat(q, { system: 'You are a friendly, humorous WhatsApp companion. Keep replies short and conversational.' })
    await ctx.sock.sendMessage(ctx.jid, { text: reply })
  },
}

/** grammar — fix grammar/spelling. */
export const grammar = {
  name: 'grammar', aliases: ['grammar'], category: 'ai', description: 'Fix grammar. Usage: .grammar <text>',
  async run(ctx) {
    if (!aiKey()) return ctx.sock.sendMessage(ctx.jid, { text: missingKey() })
    const q = ctx.args.join(' ')
    if (!q) return ctx.sock.sendMessage(ctx.jid, { text: 'Usage: .grammar <text>' })
    const reply = await aiChat(q, { system: 'You are a grammar editor. Correct the text and only output the corrected version.' })
    await ctx.sock.sendMessage(ctx.jid, { text: reply })
  },
}

/** aisearch — AI-powered search/explanation. */
export const aisearch = {
  name: 'aisearch', aliases: ['aisearch'], category: 'ai', description: 'Ask the AI to research a topic. Usage: .aisearch <topic>',
  async run(ctx) {
    if (!aiKey()) return ctx.sock.sendMessage(ctx.jid, { text: missingKey() })
    const q = ctx.args.join(' ')
    if (!q) return ctx.sock.sendMessage(ctx.jid, { text: 'Usage: .aisearch <topic>' })
    const reply = await aiChat(q, { system: 'You are a researcher. Give a clear, well-structured summary with key points.' })
    await ctx.sock.sendMessage(ctx.jid, { text: `🔎 ${reply}` })
  },
}
