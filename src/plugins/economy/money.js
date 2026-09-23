import {
  getUser,
  daily as dailyFn,
  work as workFn,
  gamble as gambleFn,
  slotspin as slotFn,
  transfer,
  leaderboard,
} from '../../lib/economy.js'
import { bold } from '../../lib/utils.js'

const amount = (ctx) => ctx.args[0]

export const balance = {
  name: 'balance', aliases: ['bal', 'money'], category: 'economy', description: 'Check your wallet balance.',
  async run(ctx) {
    const u = await getUser(ctx.sender)
    await ctx.sock.sendMessage(ctx.jid, {
      text: `${bold('💰 Balance')}\nWallet: ${bold(String(u.money))}\nBank: ${bold(String(u.bank))}\nLevel: ${u.level} (${u.xp} XP)`,
    })
  },
}

export const daily = {
  name: 'daily', category: 'economy', description: 'Claim your daily reward.',
  async run(ctx) {
    const u = await getUser(ctx.sender)
    const r = dailyFn(u)
    if (!r.ok) return ctx.sock.sendMessage(ctx.jid, { text: r.msg })
    await ctx.sock.sendMessage(ctx.jid, { text: `🎁 Daily claimed: +${bold(String(r.amount))}\nWallet: ${bold(String(r.money))}` })
  },
}

/** work — NOTE: alias "mine" was removed because economy/extra.js owns `.mine`. */
export const work = {
  name: 'work', aliases: ['job', 'labor'], category: 'economy', description: 'Work to earn money.',
  async run(ctx) {
    const u = await getUser(ctx.sender)
    const r = workFn(u)
    if (!r.ok) return ctx.sock.sendMessage(ctx.jid, { text: r.msg })
    await ctx.sock.sendMessage(ctx.jid, { text: `💼 You worked and earned +${bold(String(r.amount))}\nWallet: ${bold(String(r.money))}` })
  },
}

export const gamble = {
  name: 'gamble', aliases: ['bet'], category: 'economy', description: 'Gamble a bet (50/50). Usage: .gamble 500',
  async run(ctx) {
    const u = await getUser(ctx.sender)
    const r = gambleFn(u, amount(ctx))
    if (!r.ok) return ctx.sock.sendMessage(ctx.jid, { text: r.msg })
    await ctx.sock.sendMessage(ctx.jid, {
      text: `${r.win ? '🎉 You won!' : '😢 You lost...'}\nBet: ${bold(String(r.amount))}\nWallet: ${bold(String(r.money))}`,
    })
  },
}

export const slots = {
  name: 'slots', aliases: ['slot'], category: 'economy', description: 'Spin the slot machine. Usage: .slots 100',
  async run(ctx) {
    const u = await getUser(ctx.sender)
    const r = slotFn(u, amount(ctx))
    if (!r.ok) return ctx.sock.sendMessage(ctx.jid, { text: r.msg })
    const sign = r.amount >= 0 ? '+' : ''
    await ctx.sock.sendMessage(ctx.jid, {
      text: `🎰 ${r.row.join(' ')}\n${sign}${r.amount} | Wallet: ${bold(String(r.money))}`,
    })
  },
}

export const give = {
  name: 'give', aliases: ['transfer', 'pay', 'sendmoney'], category: 'economy', description: 'Send money to someone. Usage: .give 23481... 500',
  async run(ctx) {
    const toJid = ctx.args[0]
    const amt = ctx.args[1]
    const u = await getUser(ctx.sender)
    if (!toJid) return ctx.sock.sendMessage(ctx.jid, { text: 'Usage: .give <number> <amount>' })
    const r = await transfer(u, '@' + toJid.replace(/\D/g, '') + '@s.whatsapp.net', amt)
    if (!r.ok) return ctx.sock.sendMessage(ctx.jid, { text: r.msg })
    await ctx.sock.sendMessage(ctx.jid, { text: `🔄 Sent ${bold(String(r.amount))} to ${toJid}.` })
  },
}

export const top = {
  name: 'top', aliases: ['leaderboard', 'richest'], category: 'economy', description: 'Richest users.',
  async run(ctx) {
    const list = await leaderboard()
    if (!list.length) return ctx.sock.sendMessage(ctx.jid, { text: 'No users yet.' })
    const text = list.map((u, i) => `${i + 1}. @${u.id} — ${bold(String(u.money))}`).join('\n')
    await ctx.sock.sendMessage(ctx.jid, { text: `🏆 *RICHEST* (wallet money)\n${text}` })
  },
}