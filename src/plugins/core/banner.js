import { wallText, assertOwner } from '../../lib/banner.js'
import { isOwner, numOf } from '../../lib/utils.js'

/** wall — send the BempsX-Nova wall-text into a chat. */
export const wall = {
  name: 'wall', aliases: ['walltext', 'banner'], category: 'core',
  description: 'Print the BempsX-Nova ownership wall-text.',
  async run(ctx) {
    await ctx.sock.sendMessage(ctx.jid, { text: wallText() || `【 BempsX-Nova 】 — by BEMPSX.` })
  },
}

/** whoami — confirm who owns the bot (and who is calling). */
export const whoami = {
  name: 'whoami', category: 'core',
  description: 'Show the bot owner and whether you are the owner.',
  async run(ctx) {
    const youAreOwner = isOwner(ctx.sender)
    await ctx.sock.sendMessage(ctx.jid, {
      text: `【 BempsX-Nova 】\nBot owner: BempsX-Nova\nYour contact: @${numOf(ctx.sender)}\nYou are the owner: ${youAreOwner ? '✅ YES' : '❌ NO'}`,
      mentions: [ctx.sender],
    })
  },
}

/** guard — non-owner access is flagged; owner gets the wall. */
export const guard = {
  name: 'guard', aliases: ['checkowner'], category: 'core',
  description: 'Fire the ownership guard.',
  async run(ctx) {
    if (assertOwner(ctx.sender, ctx.sock?.user?.id)) {
      await ctx.sock.sendMessage(ctx.jid, { text: wallText() })
    } else {
      await ctx.sock.sendMessage(ctx.jid, { text: '⛔ This bot belongs to BempsX-Nova. Access denied.' })
    }
  },
}
