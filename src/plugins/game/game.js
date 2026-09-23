import { store } from '../../lib/database.js'
import { numOf, isOwner } from '../../lib/utils.js'

const game = store('games')
const CE = /&#0?39;/g, CQ = /&quot;/g, CAMP = /&amp;/g, CLT = /&lt;/g, CGT = /&gt;/g
const dec = (s) => s.replace(CE, "'").replace(CQ, '"').replace(CAMP, '&').replace(CLT, '<').replace(CGT, '>')

/* ── TIC TAC TOE ── */
const grid = () => [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ']
const X = '❌', O = '⭕'
function boardStr(g) {
  return `┏━━━━━\n┃ ${g[0]} ${g[1]} ${g[2]}\n┃ ${g[3]} ${g[4]} ${g[5]}\n┃ ${g[6]} ${g[7]} ${g[8]}\n┗━━━━━`
}
function winner(g) {
  const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]]
  for (const [a,b,c] of lines) if (g[a] !== ' ' && g[a] === g[b] && g[b] === g[c]) return g[a]
  return null
}

export const ttt = {
  name: 'ttt', aliases: ['tictactoe'], category: 'game', description: 'Start a Tic Tac Toe game. Usage: .ttt @opponent  | then .ttt <1-9> to move',
  async run(ctx) {
    const key = `${ctx.jid}:ttt`
    const m = ctx.args[0]
    if (m && /^[1-9]$/.test(m)) {
      const st = await game.get(key)
      if (!st) return ctx.sock.sendMessage(ctx.jid, { text: 'No game in this chat. Start one with `.ttt @opponent`.' })
      if (numOf(ctx.sender) !== numOf(st.turn)) return ctx.sock.sendMessage(ctx.jid, { text: `It's your opponent's turn.` })
      const i = Number(m) - 1
      if (st.board[i] !== ' ') return ctx.sock.sendMessage(ctx.jid, { text: 'That cell is taken.' })
      st.board[i] = st.turn === 'X' ? X : O
      st.turn = st.turn === 'X' ? 'O' : 'X'
      const w = winner(st.board)
      if (w) { await game.set(key, { done: true }); return ctx.sock.sendMessage(ctx.jid, { text: `${boardStr(st.board)}\n\n🎉 ${w} *wins!*` }) }
      if (!st.board.includes(' ')) { await game.set(key, { done: true }); return ctx.sock.sendMessage(ctx.jid, { text: `${boardStr(st.board)}\n\n🤝 Draw!` }) }
      await game.set(key, st)
      return ctx.sock.sendMessage(ctx.jid, { text: `${boardStr(st.board)}\n\nTurn: ${numOf(st.turn)}` })
    }
    // start
    const opp = ctx.message?.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
    if (!opp) return ctx.sock.sendMessage(ctx.jid, { text: 'Usage: .ttt @opponent' })
    await game.set(key, { board: grid(), turn: 'X', playerX: ctx.sender, playerO: opp })
    await ctx.sock.sendMessage(ctx.jid, { text: `🎮 *Tic Tac Toe* started!\nX = you (@${numOf(ctx.sender)})\nO = @${numOf(opp)}\n\n${boardStr(grid())}\n\nYour move: .ttt 1-9` })
  },
}

export const delttt = {
  name: 'delttt', category: 'game', description: 'Cancel the current Tic Tac Toe.',
  async run(ctx) {
    await game.set(`${ctx.jid}:ttt`, null)
    await ctx.sock.sendMessage(ctx.jid, { text: '🗑️ Tic Tac Toe game cancelled.' })
  },
}

/* ── GUESS THE NUMBER ── */
export const guess = {
  name: 'guess', category: 'game', description: 'Guess a number 1-100. Usage: .guess <number>',
  async run(ctx) {
    const key = `${ctx.jid}:guess`
    const n = Number(ctx.args[0])
    let st = await game.get(key)
    if (!st) {
      st = { target: Math.floor(Math.random() * 100) + 1, guesses: 0 }
      await game.set(key, st)
      return ctx.sock.sendMessage(ctx.jid, { text: '🎲 I\'m thinking of a number 1-100. Guess with `.guess <number>`.' })
    }
    if (!n || n < 1 || n > 100) return ctx.sock.sendMessage(ctx.jid, { text: 'Enter a number 1-100.' })
    st.guesses++
    if (n === st.target) {
      await game.set(key, null)
      return ctx.sock.sendMessage(ctx.jid, { text: `🎉 Correct! It was *${st.target}*. Solved in ${st.guesses} tries.` })
    }
    await game.set(key, st)
    await ctx.sock.sendMessage(ctx.jid, { text: `${n < st.target ? '📈 Higher' : '📉 Lower'} (${st.guesses} tries)` })
  },
}

/* ── TRIVIA (free Open Trivia DB) ── */
export const trivia = {
  name: 'trivia', category: 'game', description: 'Get a trivia question. Usage: .trivia',
  async run(ctx) {
    const key = `${ctx.jid}:trivia`
    try {
      const r = await fetch('https://opentdb.com/api.php?amount=1')
      const j = await r.json()
      if (!j.results?.length) throw new Error('empty')
      const q = j.results[0]
      const opts = [...q.incorrect_answers, q.correct_answer].sort(() => Math.random() - 0.5)
      await game.set(key, { answer: q.correct_answer })
      await ctx.sock.sendMessage(ctx.jid, { text: `${q.category} (${q.difficulty})\n\n${dec(q.question)}\n\n${opts.map((o, i) => `${i + 1}. ${dec(o)}`).join('\n')}\n\nAnswer with .trivia <number>` })
    } catch { await ctx.sock.sendMessage(ctx.jid, { text: '❌ Trivia API unavailable.' }) }
  },
}

/* ── HANGMAN ── */
const WORDS = ['BempsX', 'whatsapp', 'python', 'javascript', 'developer', 'banana', 'wizard', 'python3', 'memory']
export const hangman = {
  name: 'hangman', category: 'game', description: 'Play hangman. Usage: .hangman <letter>',
  async run(ctx) {
    const key = `${ctx.jid}:hangman`
    let st = await game.get(key)
    const ch = (ctx.args[0] || '').toLowerCase()
    if (!st) {
      const word = WORDS[Math.floor(Math.random() * WORDS.length)]
      st = { word, found: word.split('').map((x) => (x === ' ' ? ' ' : '_')), tries: 0 }
      await game.set(key, st)
      return ctx.sock.sendMessage(ctx.jid, { text: `🔤 *Hangman*\n${st.found.join(' ')}\n\nGuess a letter with .hangman <letter>` })
    }
    if (!ch) return ctx.sock.sendMessage(ctx.jid, { text: `🔤 *Hangman*\n${st.found.join(' ')}\nTries: ${st.tries}\n\nGuess a letter with .hangman <letter>` })
    if (st.found.includes(ch)) return ctx.sock.sendMessage(ctx.jid, { text: 'Already guessed.' })
    if (!st.word.includes(ch)) {
      st.tries++
      if (st.tries >= 6) { await game.set(key, null); return ctx.sock.sendMessage(ctx.jid, { text: `☠️ Out of tries! The word was *${st.word}*.` }) }
      await game.set(key, st)
      return ctx.sock.sendMessage(ctx.jid, { text: `❌ Wrong. (${st.tries}/6)\n${st.found.join(' ')}` })
    }
    for (let i = 0; i < st.word.length; i++) if (st.word[i] === ch) st.found[i] = ch
    await game.set(key, st)
    if (!st.found.includes('_')) { await game.set(key, null); return ctx.sock.sendMessage(ctx.jid, { text: `🎉 You got it! *${st.word}*` }) }
    await ctx.sock.sendMessage(ctx.jid, { text: `✅ ${st.found.join(' ')}` })
  },
}

export const delhangman = {
  name: 'delhangman', category: 'game', description: 'Cancel the current hangman game.',
  async run(ctx) {
    await game.set(`${ctx.jid}:hangman`, null)
    await ctx.sock.sendMessage(ctx.jid, { text: '🗑️ Hangman game cancelled.' })
  },
}
