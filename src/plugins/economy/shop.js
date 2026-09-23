import { getUser, buy as buyFn, _shop } from '../../lib/economy.js'
import { bold } from '../../lib/utils.js'

export const shop = {
  name: 'shop', aliases: ['store', 'market'], category: 'economy', description: 'Browse the shop.',
  async run(ctx) {
    const items = await _shop()
    const text = Object.entries(items)
      .map(([k, it]) => `• ${it.emoji || '🛍️'} ${bold(it.name)} — ${bold(String(it.price))}\n   cmd: ${ctx.prefix}buy ${k}`)
      .join('\n')
    await ctx.sock.sendMessage(ctx.jid, { text: `🛒 *SHOP*\n${text}\n\nUse ${bold('.buy <item>')} to purchase.` })
  },
}

export const buy = {
  name: 'buy', category: 'economy', description: 'Buy an item. Usage: .buy <item>',
  async run(ctx) {
    const key = ctx.args[0]
    if (!key) return ctx.sock.sendMessage(ctx.jid, { text: 'Usage: .buy <item> (see .shop)' })
    const u = await getUser(ctx.sender)
    const r = await buyFn(u, key)
    if (!r.ok) return ctx.sock.sendMessage(ctx.jid, { text: r.msg })
    await ctx.sock.sendMessage(ctx.jid, { text: `✅ Bought ${bold(r.item.name)} for ${bold(String(r.item.price))}!\nWallet: ${bold(String(r.money))}` })
  },
}

export const inventory = {
  name: 'inventory', aliases: ['inv', 'items', 'bag'], category: 'economy', description: 'See what you own.',
  async run(ctx) {
    const u = await getUser(ctx.sender)
    const inv = u.inventory || {}
    const keys = Object.keys(inv)
    if (!keys.length) return ctx.sock.sendMessage(ctx.jid, { text: '🎒 You own nothing yet. Try .shop' })
    const items = await _shop()
    const text = keys.map((k) => `• ${items[k]?.emoji || ''} ${bold(items[k]?.name || k)} x${inv[k]}`).join('\n')
    await ctx.sock.sendMessage(ctx.jid, { text: `🎒 *INVENTORY*\n${text}` })
  },
}
