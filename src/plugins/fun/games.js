/**
 * games.js — real fun/game commands (genuine local logic, no API).
 * NOTE: `.dice` lives in economy/extra.js (it supports both bare roll and bet).
 *       `.rolldice` lives in utils/more.js. This file keeps only the rest.
 */

const TRUTH_8BALL = [
  'It is certain. 🎯', 'Without a doubt. ✅', 'Yes — definitely. ✔️', 'Most likely. 📈',
  'Outlook good. 🌤️', 'Yes. 👍', 'Signs point to yes. 🔮', 'Reply hazy, try again. 🌫️',
  'Ask again later. ⏳', 'Cannot predict now. 🔮', 'Concentrate and ask again. 🧠',
  'Don\'t count on it. ❌', 'My reply is no. 🙅', 'Very doubtful. 🤔', 'No. 🚫',
]
const FLIP = ['HEADS', 'TAILS']
const LOVES = [
  'You two are a perfect match! 💞', 'There is a spark... but be patient. ✨',
  'Opposites attract — interesting! 🧲', 'Hmm, maybe think it over. 🤔',
  'Absolute soulmates! 🥰', 'It\'s complicated. 💔',
]

export const flipcoin = {
  name: 'flipcoin', aliases: ['flip', 'toss'], category: 'fun', description: 'Flip a coin.',
  run(ctx) {
    const v = FLIP[Math.floor(Math.random() * 2)]
    return ctx.sock.sendMessage(ctx.jid, { text: `🪙 The coin landed on: *${v}*` })
  },
}

export const eightball = {
  name: '8ball', aliases: ['ask'], category: 'fun', description: 'Ask the magic 8-ball a yes/no question.',
  run(ctx) {
    const q = ctx.args.join(' ')
    if (!q) return ctx.sock.sendMessage(ctx.jid, { text: '🎱 Ask a question: .8ball <question>' })
    const v = TRUTH_8BALL[Math.floor(Math.random() * TRUTH_8BALL.length)]
    return ctx.sock.sendMessage(ctx.jid, { text: `🎱 *${q}*\n${v}` })
  },
}

export const choose = {
  name: 'choose', aliases: ['pick', 'or'], category: 'fun', description: 'Choose between options. Usage: .choose A | B | C',
  run(ctx) {
    const opts = ctx.args.join(' ').split('|').map((s) => s.trim()).filter(Boolean)
    if (opts.length < 2) return ctx.sock.sendMessage(ctx.jid, { text: 'Usage: .choose option | option | option' })
    const v = opts[Math.floor(Math.random() * opts.length)]
    return ctx.sock.sendMessage(ctx.jid, { text: `🤔 I choose: *${v}*` })
  },
}

export const lovescore = {
  name: 'lovescore', aliases: ['compat'], category: 'fun', description: 'Love compatibility. Usage: .lovescore <name1> <name2>',
  run(ctx) {
    const parts = ctx.args.join(' ')
    if (!parts) return ctx.sock.sendMessage(ctx.jid, { text: 'Usage: .lovescore <name1> <name2>' })
    const score = Math.floor(Math.random() * 100)
    let hash = 0; for (const c of parts) hash = (hash + c.charCodeAt(0)) % 97
    const s = Math.min(100, Math.max(1, Math.abs(hash + score) % 100))
    const msg = LOVES[Math.floor(s / 25) % LOVES.length]
    return ctx.sock.sendMessage(ctx.jid, { text: `💘 *${parts}*\nCompatibility: *${s}%*\n${msg}` })
  },
}

export const rate = {
  name: 'rate', aliases: ['howcool'], category: 'fun', description: 'Rate something out of 100.',
  run(ctx) {
    const what = ctx.args.join(' ') || ctx.sender.split('@')[0]
    const v = Math.floor(Math.random() * 101)
    return ctx.sock.sendMessage(ctx.jid, { text: `⭐ Rating for "${what}": *${v}/100*` })
  },
}

export const truth = {
  name: 'truth', category: 'fun', description: 'A random truth/dare.',
  run(ctx) {
    const truths = [
      'What\'s the most embarrassing thing you\'ve done?', 'Who\'s your secret crush?',
      'What\'s a lie you told recently?', 'What\'s your biggest fear?',
      'Have you ever cheated on a test?', 'What\'s your guilty pleasure?',
      'What\'s the worst date you\'ve been on?',
    ]
    const dare = [
      'Send the last message you sent to your crush. (or type it)', 'Do 10 push-ups right now.',
      'Show your gallery to the group.', 'Say the alphabet backwards.', 'Do an impression of an admin.',
    ]
    const list = ctx.args[0]?.toLowerCase() === 'dare' ? dare : truths
    const v = list[Math.floor(Math.random() * list.length)]
    return ctx.sock.sendMessage(ctx.jid, { text: `🎲 ${v}` })
  },
}