import { getUser, saveUser, netWorth, dailyStreak, _shop, DEFAULT_SHOP } from '../../lib/economy.js'
import { store } from '../../lib/database.js'
import { isOwner, numOf } from '../../lib/utils.js'

const econ = store('economy')
const cooldown = (set, name, ms) => {
  const last = set[name] || 0
  if (Date.now() - last < ms) return true
  set[name] = Date.now()
  return false
}

const buildRNG = (min, max) => min + Math.floor(Math.random() * (max - min + 1))

const ownerOnly = async (ctx) => {
  if (isOwner(ctx.sender)) return true
  await ctx.sock.sendMessage(ctx.jid, { text: '🔒 Owner only.' })
  return false
}

/** fish — idle fishing minigame. */
export const fish = {
  name: 'fish', category: 'economy', description: 'Go fishing and catch something valuable.',
  async run(ctx) {
    const u = await getUser(ctx.sender)
    if (cooldown(u.cooldowns, 'fish', 30e3)) return ctx.sock.sendMessage(ctx.jid, { text: '🎣 Calm down. Wait 30s to fish again.' })
    const r = Math.random()
    if (r < 0.45) { const g = buildRNG(10, 60); u.money += g; await saveUser(u); return ctx.sock.sendMessage(ctx.jid, { text: `🎣 You caught a *sardine*! +${g} coins (💰 ${u.money})` }) }
    if (r < 0.75) { const g = buildRNG(60, 180); u.money += g; await saveUser(u); return ctx.sock.sendMessage(ctx.jid, { text: `🎣 You caught a *salmon*! +${g} coins (💰 ${u.money})` }) }
    if (r < 0.95) { const g = buildRNG(300, 900); u.money += g; await saveUser(u); return ctx.sock.sendMessage(ctx.jid, { text: `🎣 You caught a *tuna*! +${g} coins (💰 ${u.money})` }) }
    const g = buildRNG(2000, 8000); u.money += g; await saveUser(u)
    return ctx.sock.sendMessage(ctx.jid, { text: `🎣✨ *LEGENDARY CATCH!* A golden trout! +${g} coins (💰 ${u.money})` })
  },
}

/** mine — mining minigame. (unique name — no conflict) */
export const mine = {
  name: 'mine', category: 'economy', description: 'Mine for minerals.',
  async run(ctx) {
    const u = await getUser(ctx.sender)
    if (cooldown(u.cooldowns, 'mine', 45e3)) return ctx.sock.sendMessage(ctx.jid, { text: '⛏️ The mine needs time. Wait 45s.' })
    const r = Math.random()
    if (r < 0.4) { const g = buildRNG(20, 90); u.money += g; await saveUser(u); return ctx.sock.sendMessage(ctx.jid, { text: `⛏️ You mined *stone*. +${g} (💰 ${u.money})` }) }
    if (r < 0.75) { const g = buildRNG(150, 500); u.money += g; await saveUser(u); return ctx.sock.sendMessage(ctx.jid, { text: `⛏️ You mined *iron ore*! +${g} (💰 ${u.money})` }) }
    if (r < 0.94) { const g = buildRNG(600, 1500); u.money += g; await saveUser(u); return ctx.sock.sendMessage(ctx.jid, { text: `⛏️ You mined *gold*! +${g} (💰 ${u.money})` }) }
    u.money += 10000; await saveUser(u)
    return ctx.sock.sendMessage(ctx.jid, { text: `⛏️💎 *DIAMOND!!* +10,000 (💰 ${u.money})` })
  },
}

/** crime — risky heist. */
export const crime = {
  name: 'crime', category: 'economy', description: 'Commit a crime (risky!).',
  async run(ctx) {
    const u = await getUser(ctx.sender)
    if (cooldown(u.cooldowns, 'crime', 40e3)) return ctx.sock.sendMessage(ctx.jid, { text: '🕵️ Too much crime. Wait 40s.' })
    const win = Math.random() < 0.5
    if (win) {
      const g = buildRNG(100, 1000); u.money += g; await saveUser(u)
      return ctx.sock.sendMessage(ctx.jid, { text: `🕵️ You pulled it off! +${g} (💰 ${u.money})` })
    }
    const lose = Math.min(buildRNG(50, 500), u.money); u.money -= lose; await saveUser(u)
    return ctx.sock.sendMessage(ctx.jid, { text: `🚔 You got caught! Lost ${lose} (💰 ${u.money})` })
  },
}

/** coinflip — bet on heads/tails. */
export const coinflip = {
  name: 'coinflip', aliases: ['cf'], category: 'economy', description: 'Bet on a coin flip. Usage: .coinflip <amount> <heads|tails>',
  async run(ctx) {
    const u = await getUser(ctx.sender)
    const amt = Math.round(Number(ctx.args[0]))
    const pick = (ctx.args[1] || '').toLowerCase()
    if (!amt || amt < 1) return ctx.sock.sendMessage(ctx.jid, { text: 'Usage: .coinflip <amount> <heads|tails>' })
    if (u.money < amt) return ctx.sock.sendMessage(ctx.jid, { text: `Not enough money (💰 ${u.money}).` })
    const res = Math.random() < 0.5 ? 'heads' : 'tails'
    if (pick !== 'heads' && pick !== 'tails') return ctx.sock.sendMessage(ctx.jid, { text: 'Pick heads or tails.' })
    const won = res === pick
    u.money += won ? amt : -amt
    await saveUser(u)
    return ctx.sock.sendMessage(ctx.jid, { text: `🪙 It landed on *${res}* — you ${won ? 'WIN' : 'lose'} ${amt}!\n💰 ${u.money}` })
  },
}

/** dice — bet on a die roll. Also supports bare `.dice` for a fun roll. */
export const dice = {
  name: 'dice', aliases: ['rolldie', 'roll'], category: 'economy',
  description: 'Roll a die, or bet: .dice <amount> <1-6>',
  async run(ctx) {
    const amt = Number(ctx.args[0])
    const guess = Number(ctx.args[1])

    // Bare `.dice` / `.dice 3` (no bet): behave like the fun dice command.
    if (!Number.isFinite(amt) || !Number.isFinite(guess) ||
        !Number.isInteger(amt) || !Number.isInteger(guess) ||
        amt < 1 || guess < 1 || guess > 6) {
      const roll = buildRNG(1, 6)
      const sides = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅']
      return ctx.sock.sendMessage(ctx.jid, { text: `🎲 ${roll}\n${sides[roll - 1]}` })
    }

    const u = await getUser(ctx.sender)
    if (u.money < amt) return ctx.sock.sendMessage(ctx.jid, { text: `Not enough money (💰 ${u.money}).` })
    const roll = buildRNG(1, 6)
    const won = roll === guess
    u.money += won ? amt * 5 : -amt
    await saveUser(u)
    return ctx.sock.sendMessage(ctx.jid, { text: `🎲 Rolled *${roll}* — ${won ? 'WIN! +' + amt * 5 : 'lose'} (💰 ${u.money})` })
  },
}

/** rps — rock paper scissors. */
const RPS = ['rock', 'paper', 'scissors']
export const rps = {
  name: 'rps', category: 'economy', description: 'Rock paper scissors. Usage: .rps <amount> <rock|paper|scissors>',
  async run(ctx) {
    const u = await getUser(ctx.sender)
    const amt = Math.round(Number(ctx.args[0]))
    const pick = (ctx.args[1] || '').toLowerCase()
    if (!amt || amt < 1 || !RPS.includes(pick)) return ctx.sock.sendMessage(ctx.jid, { text: 'Usage: .rps <amount> <rock|paper|scissors>' })
    if (u.money < amt) return ctx.sock.sendMessage(ctx.jid, { text: `Not enough money (💰 ${u.money}).` })
    const bot = RPS[Math.floor(Math.random() * 3)]
    let res
    if (bot === pick) res = 'draw'
    else if ((pick === 'rock' && bot === 'scissors') || (pick === 'paper' && bot === 'rock') || (pick === 'scissors' && bot === 'paper')) res = 'win'
    else res = 'lose'
    if (res === 'win') u.money += amt
    else if (res === 'lose') u.money -= amt
    await saveUser(u)
    return ctx.sock.sendMessage(ctx.jid, { text: `✊🤚✌️ You: ${pick} | Bot: ${bot}\n\n${res === 'win' ? '🎉 You WIN! +' + amt : res === 'lose' ? `💸 You lose ${amt}` : '🤝 It\'s a draw!'}\n💰 ${u.money}` })
  },
}

/** networth — total worth. */
export const networth = {
  name: 'networth', aliases: ['worth'], category: 'economy', description: 'Your total net worth.',
  async run(ctx) {
    const u = await getUser(ctx.sender)
    await ctx.sock.sendMessage(ctx.jid, { text: `💰 *Net Worth*\nWallet: ${u.money}\nBank: ${u.bank}\nTotal: *${netWorth(u)}*` })
  },
}

/** streak — check your daily streak. */
export const streak = {
  name: 'streak', category: 'economy', description: 'Claim your daily streak bonus.',
  async run(ctx) {
    const u = await getUser(ctx.sender)
    const r = dailyStreak(u)
    if (!r.ok) return ctx.sock.sendMessage(ctx.jid, { text: r.msg })
    await saveUser(u)
    await ctx.sock.sendMessage(ctx.jid, { text: `🔥 Day ${r.streak} streak! +${r.bonus} coins (💰 ${r.money})` })
  },
}

/** sell — sell an inventory item. */
export const sell = {
  name: 'sell', category: 'economy', description: 'Sell an item from your inventory. Usage: .sell <item>',
  async run(ctx) {
    const u = await getUser(ctx.sender)
    const item = (ctx.args[0] || '').toLowerCase()
    if (!item) return ctx.sock.sendMessage(ctx.jid, { text: 'Usage: .sell <item>' })
    const shop = await _shop()
    const meta = shop[item]
    if (!u.inventory?.[item] || u.inventory[item] < 1) return ctx.sock.sendMessage(ctx.jid, { text: `You don't own a *${item}*.` })
    const price = meta ? Math.round(meta.price * 0.6) : 25
    u.inventory[item]--
    u.money += price
    await saveUser(u)
    return ctx.sock.sendMessage(ctx.jid, { text: `💸 Sold *${meta?.name || item}* for ${price} (💰 ${u.money})` })
  },
}

/** poor — the poorest users. */
export const poor = {
  name: 'poor', category: 'economy', description: 'The poorest users.',
  async run(ctx) {
    const all = Object.values(await econ.all()).filter((u) => u && typeof u.money === 'number')
    const arr = all.sort((a, b) => a.money - b.money).slice(0, 10)
    if (!arr.length) return ctx.sock.sendMessage(ctx.jid, { text: 'No users yet.' })
    await ctx.sock.sendMessage(ctx.jid, { text: `💸 *POOREST*\n${arr.map((u, i) => `${i + 1}. ${u.id} — ${u.money}`).join('\n')}` })
  },
}

/** addmoney — owner. */
export const addmoney = {
  name: 'addmoney', category: 'economy', description: 'Give money to a user (owner). Usage: .addmoney <@user> <amount>',
  async run(ctx) {
    if (!(await ownerOnly(ctx))) return
    const target = ctx.message?.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
    const amt = Math.round(Number(ctx.args[ctx.args.length - 1]))
    if (!target || !amt) return ctx.sock.sendMessage(ctx.jid, { text: 'Usage: .addmoney <@user> <amount>' })
    const u = await getUser(target)
    u.money += amt
    await saveUser(u)
    await ctx.sock.sendMessage(ctx.jid, { text: `✅ Added ${amt} to @${numOf(target)} (💰 ${u.money})` })
  },
}

/** resetecon — owner. */
export const resetecon = {
  name: 'resetecon', aliases: ['reseteconomy'], category: 'economy', description: 'Reset the whole economy (owner).',
  async run(ctx) {
    if (!(await ownerOnly(ctx))) return
    const all = await econ.all()
    for (const u of Object.values(all)) { u.money = 0; u.bank = 0; u.inventory = {}; await saveUser(u) }
    await ctx.sock.sendMessage(ctx.jid, { text: '♻️ Economy reset.' })
  },
}