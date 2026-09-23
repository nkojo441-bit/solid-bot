import {
  getUser,
  beg as begFn,
  deposit as depositFn,
  withdraw as withdrawFn,
  takeLoan as loanFn,
  repayLoan as repayFn,
  rob as robFn,
  netWorth,
} from '../../lib/economy.js'
import { bold } from '../../lib/utils.js'

export const beg = {
  name: 'beg', category: 'economy', description: 'Beg for a little money.',
  async run(ctx) {
    const u = await getUser(ctx.sender)
    const r = begFn(u)
    if (!r.ok) return ctx.sock.sendMessage(ctx.jid, { text: r.msg })
    await ctx.sock.sendMessage(ctx.jid, { text: `🥺 Begging paid off: +${bold(String(r.amount))}\nWallet: ${bold(String(r.money))}` })
  },
}

export const bankc = {
  name: 'bank', aliases: ['banks'], category: 'economy', description: 'Show wallet + bank.',
  async run(ctx) {
    const u = await getUser(ctx.sender)
    await ctx.sock.sendMessage(ctx.jid, { text: `🏦 *BANK*\nWallet: ${bold(String(u.money))}\nBank: ${bold(String(u.bank || 0))}\nNet worth: ${bold(String(netWorth(u)))}` })
  },
}

export const depositc = {
  name: 'deposit', aliases: ['dep'], category: 'economy', description: 'Move money into the bank. Usage: .deposit 500',
  async run(ctx) {
    const u = await getUser(ctx.sender)
    const r = depositFn(u, ctx.args[0])
    if (!r.ok) return ctx.sock.sendMessage(ctx.jid, { text: r.msg })
    await ctx.sock.sendMessage(ctx.jid, { text: `🏦 Deposited ${bold(String(r.amount))}\nWallet: ${bold(String(r.money))}\nBank: ${bold(String(r.bank))}` })
  },
}

export const withdrawc = {
  name: 'withdraw', aliases: ['with'], category: 'economy', description: 'Move money out of the bank. Usage: .withdraw 500',
  async run(ctx) {
    const u = await getUser(ctx.sender)
    const r = withdrawFn(u, ctx.args[0])
    if (!r.ok) return ctx.sock.sendMessage(ctx.jid, { text: r.msg })
    await ctx.sock.sendMessage(ctx.jid, { text: `💵 Withdrew ${bold(String(r.amount))}\nWallet: ${bold(String(r.money))}\nBank: ${bold(String(r.bank))}` })
  },
}

export const loanc = {
  name: 'loan', category: 'economy', description: 'Take a loan (repay 20% interest). Usage: .loan 1000',
  async run(ctx) {
    const u = await getUser(ctx.sender)
    const r = loanFn(u, ctx.args[0])
    if (!r.ok) return ctx.sock.sendMessage(ctx.jid, { text: r.msg })
    await ctx.sock.sendMessage(ctx.jid, { text: `🏦 Loan of ${bold(String(r.amount))} issued!\nRepay: ${bold(String(r.debt))}\nWallet: ${bold(String(r.money))}` })
  },
}

export const payloanc = {
  name: 'payloan', aliases: ['repay'], category: 'economy', description: 'Repay your loan.',
  async run(ctx) {
    const u = await getUser(ctx.sender)
    const r = repayFn(u)
    if (!r.ok) return ctx.sock.sendMessage(ctx.jid, { text: r.msg })
    await ctx.sock.sendMessage(ctx.jid, { text: `✅ Repaid ${bold(String(r.debt))}.\nWallet: ${bold(String(r.money))}` })
  },
}

export const robc = {
  name: 'rob', aliases: ['steal'], category: 'economy', description: 'Rob a user. Usage: .rob <number>',
  async run(ctx) {
    const target = ctx.args[0]
    if (!target) return ctx.sock.sendMessage(ctx.jid, { text: 'Usage: .rob <target number>' })
    const u = await getUser(ctx.sender)
    const r = await robFn(u, '@' + target.replace(/\D/g, '') + '@s.whatsapp.net')
    if (!r.ok) return ctx.sock.sendMessage(ctx.jid, { text: r.msg })
    await ctx.sock.sendMessage(ctx.jid, {
      text: r.success
        ? `🦹 Robbed ${target} for ${bold(String(r.amount))}!\nWallet: ${bold(String(r.money))}`
        : `🚨 Busted! You lost ${bold(String(r.penalty))}.\nWallet: ${bold(String(r.money))}`,
    })
  },
}
