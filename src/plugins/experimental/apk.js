import { searchApk } from '../../apis/apk.js'
import { experimental } from './index.js'

export const apk = experimental({
  name: 'apk', aliases: ['apksearch'], category: 'experimental',
  description: 'Search APKPure for an app. Usage: .apk <query>',
  async run(ctx) {
    const q = ctx.args.join(' ').trim()
    if (!q) return ctx.sock.sendMessage(ctx.jid, { text: 'Usage: .apk <app name>' })

    await ctx.sock.sendMessage(ctx.jid, { text: `🔎 Searching APKPure for *${q}*…` })

    const r = await searchApk(q)
    if (!r.ok) return ctx.sock.sendMessage(ctx.jid, { text: `❌ ${r.msg}` })

    const lines = r.results.map((a, i) =>
      `${i + 1}. *${a.name}*${a.version ? ` (v${a.version})` : ''}\n    ${a.url || a.package || ''}`
    )
    await ctx.sock.sendMessage(ctx.jid, {
      text: `📱 *APKPure results for "${q}"*\n\n${lines.join('\n\n')}\n\n_Note: the bot returns links, not the APK bytes — install at your own risk._`,
    })
  },
})