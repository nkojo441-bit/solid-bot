/**
 * economy.js — persistent economy engine (real, DB-backed).
 * Every user has a wallet, inventory, cooldowns and an XP profile.
 * All state lives on disk via the JsonStore so nothing resets on restart.
 */
import { store } from './database.js'

const db = store('economy')
const SHOP = store('shop')

// Real, functional shop catalogue (owner can extend via command).
const DEFAULT_SHOP = {
  nokia: { price: 50, name: 'Nokia 3310', emoji: '📱' },
  phone: { price: 500, name: 'Smartphone', emoji: '📲' },
  laptop: { price: 2000, name: 'Laptop', emoji: '💻' },
  car: { price: 10000, name: 'Car', emoji: '🚗' },
  mansion: { price: 50000, name: 'Mansion', emoji: '🏡' },
  lambo: { price: 100000, name: 'Lamborghini', emoji: '🏎️' },
}

const DAILY = 200
const WORK_MIN = 50
const WORK_MAX = 300

export async function ensureUser(jid) {
  const id = jid.replace(/\D/g, '')
  let u = await db.get(id)
  if (!u) {
    u = {
      id, money: 0, bank: 0, xp: 0, level: 1,
      inventory: {},
      cooldowns: {},
      married: null,
    }
    await db.set(id, u)
  }
  return u
}

export async function getUser(jid) {
  return ensureUser(jid)
}

export async function saveUser(u) {
  await db.set(u.id, u)
  return u
}

function onCooldown(u, action, ms) {
  const last = u.cooldowns[action] || 0
  return Date.now() - last < ms
}

function setCooldown(u, action) {
  u.cooldowns[action] = Date.now()
  saveUser(u)
}

export function daily(user) {
  if (onCooldown(user, 'daily', 24 * 3600e3)) return { ok: false, msg: 'You already claimed today. Come back tomorrow!' }
  user.money += DAILY
  setCooldown(user, 'daily')
  saveUser(user)
  return { ok: true, amount: DAILY, money: user.money }
}

export function work(user) {
  if (onCooldown(user, 'work', 60e3)) return { ok: false, msg: 'You are tired. Wait a minute before working again.' }
  const amount = WORK_MIN + Math.floor(Math.random() * (WORK_MAX - WORK_MIN))
  user.money += amount
  setCooldown(user, 'work')
  saveUser(user)
  return { ok: true, amount, money: user.money }
}

export function gamble(user, amount, chance = 0.5) {
  amount = Math.round(Number(amount))
  if (!amount || amount < 1) return { ok: false, msg: 'Enter a valid amount.' }
  if (user.money < amount) return { ok: false, msg: `Not enough money (you have ${user.money}).` }
  const win = Math.random() < chance
  if (win) user.money += amount
  else user.money -= amount
  saveUser(user)
  return { ok: true, win, amount, money: user.money }
}

export function slotspin(user, bet) {
  bet = Math.round(Number(bet))
  if (!bet || bet < 1) return { ok: false, msg: 'Enter a valid bet.' }
  if (user.money < bet) return { ok: false, msg: `Not enough money (you have ${user.money}).` }
  const symbols = ['🍒', '🍋', '🔔', '⭐', '💎', '7️⃣']
  const r = () => symbols[Math.floor(Math.random() * symbols.length)]
  const row = [r(), r(), r()]
  const same = row.every((x) => x === row[0])
  const payout = same ? bet * 5 : (row[0] === row[1] && row[1] === row[2]) ? bet * 5 : 0
  const twoMatch = row[0] === row[1] || row[1] === row[2] || row[0] === row[2]
  const amount = same ? bet * 5 : twoMatch ? bet * 2 : -bet
  user.money += amount
  saveUser(user)
  return { ok: true, row, amount, money: user.money }
}

export function transfer(from, toJid, amount) {
  amount = Math.round(Number(amount))
  if (!amount || amount < 1) return { ok: false, msg: 'Enter a valid amount.' }
  if (from.money < amount) return { ok: false, msg: `Not enough money (you have ${from.money}).` }
  from.money -= amount
  saveUser(from)
  return ensureUser(toJid).then((to) => {
    to.money += amount
    saveUser(to)
    return { ok: true, amount }
  })
}

export async function _shop() {
  const existing = await SHOP.get('items')
  if (!existing) {
    await SHOP.set('items', DEFAULT_SHOP)
    return DEFAULT_SHOP
  }
  return existing
}

export async function buy(user, itemKey) {
  const shop = await _shop()
  const item = shop[itemKey]
  if (!item) return { ok: false, msg: `Item "${itemKey}" not in shop.` }
  if (user.money < item.price) return { ok: false, msg: `Not enough money (you have ${user.money}).` }
  user.money -= item.price
  user.inventory[itemKey] = (user.inventory[itemKey] || 0) + 1
  saveUser(user)
  return { ok: true, item, money: user.money }
}

export function xpGain(user, amount = 20) {
  user.xp += amount
  const newLevel = Math.floor(Math.sqrt(user.xp / 100)) + 1
  if (newLevel > user.level) {
    user.level = newLevel
    saveUser(user)
    return { leveled: true, level: newLevel }
  }
  saveUser(user)
  return { leveled: false, level: user.level }
}

export async function leaderboard() {
  const all = await db.all()
  const arr = Object.values(all).filter((u) => u && typeof u.money === 'number')
  return arr.sort((a, b) => b.money - a.money).slice(0, 10)
}

export async function levelboard() {
  const all = await db.all()
  const arr = Object.values(all).filter((u) => u && typeof u.xp === 'number')
  return arr.sort((a, b) => b.xp - a.xp).slice(0, 10)
}

/** Heist — high risk, high reward. Team size boosts odds. */
export function heist(user, team = 1) {
  if (onCooldown(user, 'heist', 60e3)) return { ok: false, msg: 'The crew needs a minute. Try again soon.' }
  const winChance = 0.35 + (team - 1) * 0.05
  const win = Math.random() < winChance
  const reward = win ? 200 + Math.floor(Math.random() * 800) * team : -(100 + Math.floor(Math.random() * 200))
  user.money = Math.max(0, user.money + reward)
  setCooldown(user, 'heist')
  saveUser(user)
  return { ok: true, win, amount: Math.abs(reward), money: user.money }
}

/** Hunt — earn random loot (XP + money) with a cooldown. */
export function hunt(user) {
  if (onCooldown(user, 'hunt', 30e3)) return { ok: false, msg: 'Still tracking. Wait 30s before hunting again.' }
  const gain = 10 + Math.floor(Math.random() * 120)
  user.money += gain
  setCooldown(user, 'hunt')
  const xp = xpGain(user, 15)
  saveUser(user)
  return { ok: true, gain, money: user.money, leveled: xp.leveled, level: user.level }
}

/** Daily streak — consecutive-days bonus. */
export function dailyStreak(user) {
  const today = new Date().toDateString()
  const yesterday = new Date(Date.now() - 86400e3).toDateString()
  if (user.lastDaily === today) return { ok: false, msg: 'Already claimed today. Come back tomorrow!' }
  const streak = user.lastDaily === yesterday ? (user.streak || 0) + 1 : 1
  const bonus = DAILY + (streak - 1) * 25
  user.money += bonus
  user.streak = streak
  user.lastDaily = today
  saveUser(user)
  return { ok: true, streak, bonus, money: user.money }
}

/** Beg — small random alms, short cooldown. */
export function beg(user) {
  if (onCooldown(user, 'beg', 20e3)) return { ok: false, msg: 'You already begged. Wait a bit.' }
  const amount = Math.floor(Math.random() * 40)
  user.money += amount
  setCooldown(user, 'beg')
  saveUser(user)
  return { ok: true, amount, money: user.money }
}

/** Deposit to bank (safe from rob). */
export function deposit(user, amount) {
  amount = Math.round(Number(amount))
  if (!amount || amount < 1) return { ok: false, msg: 'Enter a valid amount.' }
  if (user.money < amount) return { ok: false, msg: `Not enough wallet money (${user.money}).` }
  user.money -= amount
  user.bank = (user.bank || 0) + amount
  saveUser(user)
  return { ok: true, amount, money: user.money, bank: user.bank }
}

/** Withdraw from bank. */
export function withdraw(user, amount) {
  amount = Math.round(Number(amount))
  if (!amount || amount < 1) return { ok: false, msg: 'Enter a valid amount.' }
  if ((user.bank || 0) < amount) return { ok: false, msg: `Not enough bank balance (${user.bank}).` }
  user.bank -= amount
  user.money += amount
  saveUser(user)
  return { ok: true, amount, money: user.money, bank: user.bank }
}

/** Loan — borrow against bank, repaid with 20% interest. */
export function takeLoan(user, amount) {
  amount = Math.round(Number(amount))
  if (!amount || amount < 1) return { ok: false, msg: 'Enter a valid amount.' }
  if (amount > 5000) return { ok: false, msg: 'Max loan is 5000.' }
  if (user.loanActive) return { ok: false, msg: `You already owe ${user.loanDebt}. Repay it first.` }
  user.money += amount
  user.loanActive = true
  user.loanDebt = Math.round(amount * 1.2)
  saveUser(user)
  return { ok: true, amount, money: user.money, debt: user.loanDebt }
}

/** Repay a loan. */
export function repayLoan(user) {
  if (!user.loanActive) return { ok: false, msg: 'You have no active loan.' }
  if (user.money < user.loanDebt) return { ok: false, msg: `You need ${user.loanDebt} to repay. You have ${user.money}.` }
  user.money -= user.loanDebt
  const debt = user.loanDebt
  user.loanActive = false
  user.loanDebt = 0
  saveUser(user)
  return { ok: true, debt, money: user.money }
}

/** Rob a random user (theft with risk). */
export async function rob(user, targetJid) {
  if (onCooldown(user, 'rob', 60e3)) return { ok: false, msg: 'You just robbed. Wait a minute.' }
  const target = await getUser(targetJid)
  if (!target || (target.money || 0) < 20) return { ok: false, msg: 'Target has too little to rob.' }
  const chance = Math.random()
  const amount = Math.min(Math.floor(Math.random() * 200), target.money)
  if (chance < 0.5) {
    target.money -= amount
    user.money += amount
    saveUser(target); saveUser(user)
    setCooldown(user, 'rob')
    return { ok: true, success: true, amount, money: user.money }
  }
  const penalty = Math.min(Math.floor(amount / 2), user.money)
  user.money -= penalty
  setCooldown(user, 'rob')
  saveUser(user)
  return { ok: true, success: false, penalty, money: user.money }
}

/** Net worth (wallet + bank). */
export function netWorth(u) {
  return (u.money || 0) + (u.bank || 0)
}

export { DAILY, DEFAULT_SHOP }
