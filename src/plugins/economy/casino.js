import { getUser, saveUser, netWorth, _shop } from '../../lib/economy.js'
import { store } from '../../lib/database.js'
import { isOwner, numOf } from '../../lib/utils.js'

const econ = store('economy')
const cooldown = (u, n, ms) => {
  const last = u.cooldowns[n] || 0
  u.cooldowns[n] = Date.now()
  if (Date.now() - last < ms) return true
  return false
}
const ownerOnly = async (ctx) => {
  if (isOwner(ctx.sender)) return true
  await ctx.sock.sendMessage(ctx.jid, { text: '🔒 Owner only.' })
  return false
}

/** bankrob — rob the bank (high risk). */
export const bankrob = {
  name: 'bankrob', aliases: ['robthebank'], category: 'economy', description: 'Risky bank heist.',
  async run(ctx) {
    const u = await getUser(ctx.sender)
    if (cooldown(u, 'bankrob', 2 * 60e3)) { await saveUser(u); return ctx.sock.sendMessage(ctx.jid, { text: '🚔 The bank is on alert. Wait 2 minutes.' }) }
    const win = Math.random() < 0.25
    if (win) {
      const g = 500 + Math.floor(Math.random() * 4000)
      u.money += g
      await saveUser(u)
      return ctx.sock.sendMessage(ctx.jid, { text: `💰 BANK HEIST SUCCESS! +${g} (💰 ${u.money})` })
    }
    const lose = Math.min(200 + Math.floor(Math.random() * 800), u.money)
    u.money -= lose
    await saveUser(u)
    return ctx.sock.sendMessage(ctx.jid, { text: `🚨 BUSTED! You lost ${lose} (💰 ${u.money})` })
  },
}

/** bankupgrade — upgrade your bank capacity. */
export const bankupgrade = {
  name: 'bankupgrade', aliases: ['upgrade'], category: 'economy', description: 'Upgrade your bank capacity. Usage: .bankupgrade',
  async run(ctx) {
    const u = await getUser(ctx.sender)
    const level = u.bankLevel || 1
    const cost = level * 5000
    if ((u.money || 0) < cost) return ctx.sock.sendMessage(ctx.jid, { text: `Upgrade to level ${level + 1} costs ${cost}. You have ${u.money}.` })
    u.money -= cost
    u.bankLevel = level + 1
    await saveUser(u)
    await ctx.sock.sendMessage(ctx.jid, { text: `🏦 Bank upgraded to level ${level + 1} (capacity ${level * 20000}). Cost: ${cost}.` })
  },
}

/** blackjack — vs the dealer. */
const draw = () => Math.floor(Math.random() * 13) + 1
const bjVal = (cards) => cards.reduce((s, c) => s + Math.min(c, 10), 0)
export const blackjack = {
  name: 'blackjack', aliases: ['bj'], category: 'economy', description: 'Play blackjack. Usage: .blackjack <bet> | (during a hand) .blackjack hit|stand',
  async run(ctx) {
    const u = await getUser(ctx.sender)
    const stateKey = `${ctx.sender}:bj`
    const arg = (ctx.args[0] || '').toLowerCase()
    // mid-hand
    let hand = await econ.get(stateKey)
    if (hand && (arg === 'hit' || arg === 'stand')) {
      if (arg === 'hit') {
        hand.player.push(draw())
        const v = bjVal(hand.player)
        if (v > 21) {
          await econ.set(stateKey, null)
          await saveUser(u)
          return ctx.sock.sendMessage(ctx.jid, { text: `🃏 ${hand.player.join(', ')} = *${v}*  Bust! You lost ${hand.bet}.` })
        }
        if (v === 21) { await econ.set(stateKey, null); return ctx.sock.sendMessage(ctx.jid, { text: `🃏 Blackjack! You win ${hand.bet}!` }) }
        await econ.set(stateKey, hand)
        return ctx.sock.sendMessage(ctx.jid, { text: `🃏 Your cards: ${hand.player.join(', ')} = ${v}. (hit/stand)` })
      }
      // stand
      await econ.set(stateKey, null)
      const dealer = hand.dealer
      const pv = bjVal(hand.player)
      const dv = bjVal(dealer)
      if (dv > 21 || pv > dv) {
        u.money += hand.bet
        await saveUser(u)
        return ctx.sock.sendMessage(ctx.jid, { text: `🃏 You ${pv} vs dealer ${dv} — YOU WIN! +${hand.bet} (💰 ${u.money})` })
      }
      if (pv === dv) return ctx.sock.sendMessage(ctx.jid, { text: `🃏 You ${pv} vs dealer ${dv} — Push. No change.` })
      u.money -= hand.bet
      await saveUser(u)
      return ctx.sock.sendMessage(ctx.jid, { text: `🃏 You ${pv} vs dealer ${dv} — Dealer wins. You lost ${hand.bet} (💰 ${u.money})` })
    }
    // start
    const bet = Math.round(Number(ctx.args[0]))
    if (!bet || bet < 1) return ctx.sock.sendMessage(ctx.jid, { text: 'Usage: .blackjack <bet>' })
    if ((u.money || 0) < bet) return ctx.sock.sendMessage(ctx.jid, { text: `Not enough money (💰 ${u.money}).` })
    const player = [draw(), draw()]
    const dealer = [draw(), draw()]
    await econ.set(stateKey, { bet, player, dealer })
    await ctx.sock.sendMessage(ctx.jid, { text: `🃏 *Blackjack* (bet ${bet})\nYour cards: ${player.join(', ')} = ${bjVal(player)}\nDealer shows: ${dealer[0]}\n\n.hit or .stand` })
  },
}

/** economy — overall economy stats. */
export const economy = {
  name: 'economy', aliases: ['econstats'], category: 'economy', description: 'Economy statistics.',
  async run(ctx) {
    const all = Object.values(await econ.all()).filter((u) => u && typeof u.money === 'number')
    if (!all.length) return ctx.sock.sendMessage(ctx.jid, { text: 'No users yet.' })
    const total = all.reduce((s, u) => s + netWorth(u), 0)
    const richest = all.reduce((a, b) => (netWorth(b) > netWorth(a) ? b : a))
    await ctx.sock.sendMessage(ctx.jid, { text: `🪙 *ECONOMY*\nUsers: ${all.length}\nTotal wealth: ${total}\nRichest: @${numOf(richest.id)} (${netWorth(richest)})\nShop items: ${Object.keys(await _shop()).length}` })
  },
}

/** tax — charge a small tax on all users (owner). */
export const tax = {
  name: 'tax', category: 'economy', description: 'Levy a tax on wallet money (owner). Usage: .tax <percent>',
  async run(ctx) {
    if (!(await ownerOnly(ctx))) return
    const pct = Math.max(0, Math.min(50, Number(ctx.args[0]) || 0))
    const all = Object.values(await econ.all()).filter((u) => u && typeof u.money === 'number')
    for (const u of all) { u.money = Math.max(0, Math.round(u.money * (1 - pct / 100))); await saveUser(u) }
    await ctx.sock.sendMessage(ctx.jid, { text: `💰 Levied ${pct}% tax on ${all.length} users.` })
  },
}
