import { getUser, saveUser, heist, hunt, dailyStreak, levelboard } from '../../lib/economy.js'
import { bold } from '../../lib/utils.js'

/** casino — double-or-nothing game. */
export const casino = {
  name: 'casino', aliases: ['betall'], category: 'economy', description: 'Double it or lose it. Usage: .casino 500',
  async run(ctx) {
    const amt = Math.round(Number(ctx.args[0]))
    const u = await getUser(ctx.sender)
    if (!amt || amt < 1) return ctx.sock.sendMessage(ctx.jid, { text: 'Usage: .casino <amount>' })
    if (u.money < amt) return ctx.sock.sendMessage(ctx.jid, { text: `Not enough money (you have ${u.money}).` })
    const win = Math.random() < Math.min(amt / 1000, 0.7) // odds scale with size
    const r = win ? amt : -amt
    u.money += r
    await saveUser(u)
    await ctx.sock.sendMessage(ctx.jid, { text: `${win ? '🎉 You doubled it!' : '💀 House wins...'}\n${r}\nWallet: ${bold(String(u.money))}` })
  },
}

/** heist — risky big reward. */
export const heistc = {
  name: 'heist', aliases: ['robbery'], category: 'economy', description: 'Attempt a risky heist.',
  async run(ctx) {
    const u = await getUser(ctx.sender)
    const r = heist(u, 1)
    if (!r.ok) return ctx.sock.sendMessage(ctx.jid, { text: r.msg })
    await ctx.sock.sendMessage(ctx.jid, { text: `${r.win ? '💰 You pulled it off!' : '🚔 Busted and ran off!'}\n${r.amount >= 0 ? '+' : '-'}${r.amount}\nWallet: ${bold(String(r.money))}` })
  },
}

/** hunt — find loot. */
export const huntc = {
  name: 'hunt', aliases: ['hunting'], category: 'economy', description: 'Go hunting for loot.',
  async run(ctx) {
    const u = await getUser(ctx.sender)
    const r = hunt(u)
    if (!r.ok) return ctx.sock.sendMessage(ctx.jid, { text: r.msg })
    await ctx.sock.sendMessage(ctx.jid, { text: `🏹 Hunt brought ${bold(String(r.gain))} coins!\nWallet: ${bold(String(r.money))}${r.leveled ? `\n🎉 Level up → ${r.level}` : ''}` })
  },
}

/** profile — user stats. */
export const profile = {
  name: 'profile', aliases: ['me'], category: 'economy', description: 'Your stats.',
  async run(ctx) {
    const u = await getUser(ctx.sender)
    const parts = Object.entries(u.inventory || {}).map(([k, v]) => `${k} x${v}`)
    await ctx.sock.sendMessage(ctx.jid, {
      text: `👤 *PROFILE*\n• Wallet: ${bold(String(u.money))}\n• Level: ${u.level} (${u.xp} XP)\n• Streak: ${u.streak || 0} day(s)\n• Items: ${parts.length ? parts.join(', ') : 'none'}`,
    })
  },
}

/** toprank — XP leaderboard. */
export const toprank = {
  name: 'toprank', aliases: ['levelboard', 'xpleader'], category: 'economy', description: 'Top XP users.',
  async run(ctx) {
    const list = await levelboard()
    if (!list.length) return ctx.sock.sendMessage(ctx.jid, { text: 'No XP yet.' })
    const text = list.map((u, i) => `${i + 1}. @${u.id} — Lv ${bold(String(u.level))} (${u.xp} XP)`).join('\n')
    await ctx.sock.sendMessage(ctx.jid, { text: `🏆 *LEVEL LEADERBOARD*\n${text}` })
  },
}
