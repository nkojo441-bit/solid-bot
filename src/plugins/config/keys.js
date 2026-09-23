import { store } from '../../lib/database.js'
import { isOwner } from '../../lib/utils.js'
import { aiKeyLabel } from '../../lib/secrets.js'

const keyStore = store('aikeys')

const PROVIDERS = ['gemini', 'openai', 'deepseek', 'groq', 'mistral', 'cohere', 'together']

const ownerOnly = async (ctx) => {
  if (isOwner(ctx.sender)) return true
  await ctx.sock.sendMessage(ctx.jid, { text: '🔒 Owner only.' })
  return false
}

/** setkey — set an AI provider key at runtime (no redeploy). */
export const setkey = {
  name: 'setkey', aliases: ['addkey'], category: 'config', description: 'Set an AI provider key. Usage: .setkey <provider> <key>',
  async run(ctx) {
    if (!(await ownerOnly(ctx))) return
    const provider = (ctx.args[0] || '').toLowerCase()
    const key = ctx.args[1]
    if (!PROVIDERS.includes(provider) || !key) {
      return ctx.sock.sendMessage(ctx.jid, { text: `Usage: .setkey <provider> <key>\nProviders: ${PROVIDERS.join(', ')}` })
    }
    await keyStore.set(provider, key)
    process.env[aiKeyLabel(provider)] = key // take effect now
    await ctx.sock.sendMessage(ctx.jid, { text: `✅ *${provider}* key set (live + saved).` })
  },
}

/** delkey — clear a provider key. */
export const delkey = {
  name: 'delkey', aliases: ['remkey'], category: 'config', description: 'Remove an AI provider key. Usage: .delkey <provider>',
  async run(ctx) {
    if (!(await ownerOnly(ctx))) return
    const provider = (ctx.args[0] || '').toLowerCase()
    if (!PROVIDERS.includes(provider)) return ctx.sock.sendMessage(ctx.jid, { text: `Usage: .delkey <provider>\nProviders: ${PROVIDERS.join(', ')}` })
    await keyStore.delete(provider)
    delete process.env[aiKeyLabel(provider)]
    await ctx.sock.sendMessage(ctx.jid, { text: `♻️ *${provider}* key removed.` })
  },
}
