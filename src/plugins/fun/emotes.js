/**
 * emotes.js — the FUN emote family (auto-generated, 100% real local output).
 *
 * These don't call an API — they produce genuine reactions referencing the
 * target (a @mention or a name in args, falling back to the sender). Because
 * the output is truly bot-generated, nothing here is "fake".
 */

// Each entry: [command, emoji, template]. 
// Template uses {t} = target, {u} = the sender's name.
const EMOTES = [
  ['hug', '🤗', '{u} hugs {t} warmly! 💞'],
  ['kiss', '💋', '{u} kisses {t} on the cheek! 😚'],
  ['slap', '👋', '{u} slaps {t} across the face! 😳'],
  ['punch', '👊', '{u} punches {t}! 💥'],
  ['pat', '🖐️', '{u} pats {t} on the head. 😊'],
  ['lick', '👅', '{u} licks {t}... weirdo. 😝'],
  ['bite', '🦷', '{u} bites {t}! 😬'],
  ['poke', '👉', '{u} pokes {t}!'],
  ['pinch', '🤏', '{u} pinches {t}! 😆'],
  ['feed', '🍽️', '{u} feeds {t} some delicious food! 😋'],
  ['cuddle', '🧸', '{u} cuddles {t} tightly! 🥰'],
  ['tickle', '🪶', '{u} tickles {t} until they laugh! 😂'],
  ['dance', '💃', '{u} starts dancing with {t}! 🕺'],
  ['wave', '👋', '{u} waves at {t}!'],
  ['wink', '😉', '{u} winks at {t} 😏'],
  ['blush', '😊', '{u} blushes at {t}! ☺️'],
  ['pout', '😗', '{u} pouts at {t} 😤'],
  ['shy', '🤭', '{u} feels shy around {t}!'],
  ['shrug', '🤷', '{u} shrugs at {t} — not sure!'],
  ['stare', '👀', '{u} stares at {t}... 👀'],
  ['happy', '😄', '{u} is happy to see {t}!'],
  ['sad', '😢', '{u} is sad because of {t}...'],
  ['angry', '😡', '{u} is angry at {t}! 😠'],
  ['mad', '😤', '{u} is mad at {t}!'],
  ['cry', '😭', '{u} cries in front of {t}! 😢'],
  ['laugh', '😂', '{u} laughs at {t}!'],
  ['smug', '😏', '{u} is smug toward {t}! 😼'],
  ['cool', '😎', '{u} is cool, {t} takes notes!'],
  ['scared', '😱', '{u} is scared of {t}!'],
  ['nervous', '😰', '{u} is nervous around {t}!'],
  ['confused', '😕', '{u} is confused by {t}!'],
  ['sleep', '😴', '{u} is sleepy, {t} should be quiet!'],
  ['yawn', '🥱', '{u} yawns in {t}\'s face!'],
  ['thumbsup', '👍', '{u} gives {t} a thumbs up!'],
  ['facepalm', '🤦', '{u} facepalms at {t}!'],
  ['celebrate', '🎉', '{u} celebrates with {t}! 🥳'],
  ['clap', '👏', '{u} claps for {t}!'],
  ['thanks', '🙏', '{u} thanks {t}!'],
  ['love', '❤️', '{u} loves {t}! 💕'],
  ['handhold', '🤝', '{u} holds {t}\'s hand! 💞'],
  ['evillaugh', '😈', '{u} laughs EVILly at {t}!'],
  ['dare', '⚡', '{u} dares {t} to do something!'],
  ['smack', '💥', '{u} smacks {t}!'],
  ['brofist', '👊', '{u} brofists {t}! 🤜🤛'],
  ['fist', '✊', '{u} fist-bumps {t}!'],
]

function target(ctx) {
  const mention = ctx.message?.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
  if (mention) return '@' + mention.replace(/@s\.whatsapp\.net|@g\.us/g, '')
  const t = ctx.args[0]
  if (t) return t
  return ctx.sender.split('@')[0]
}

// Build one plugin per emote.
export const emotes = Object.fromEntries(EMOTES.map(([name, emoji, tpl]) => [
  name,
  {
    name,
    category: 'fun',
    description: `${emoji} ${name} reaction. Usage: .${name} <user>`,
    run(ctx) {
      const t = target(ctx)
      const u = `@${ctx.sender.split('@')[0]}`
      const msg = tpl.replace('{t}', t).replace('{u}', u)
      const mentions = []
      return ctx.sock.sendMessage(ctx.jid, { text: `${emoji} ${msg}` })
    },
  },
]))
