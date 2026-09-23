/** bible — random verse from a free API. */
export const bible = {
  name: 'bible', category: 'fun', description: 'Get a random Bible verse.',
  async run(ctx) {
    try {
      const r = await fetch('https://bible-api.com/?random=verse&translation=kjv')
      const d = await r.json()
      await ctx.sock.sendMessage(ctx.jid, { text: `📖 ${d.reference}\n\n${d.text || d.verses?.[0]?.text}` })
    } catch { await ctx.sock.sendMessage(ctx.jid, { text: '❌ Could not fetch a verse.' }) }
  },
}

/** fox / duck / meow / woof — random animal images (free APIs). */
const ANIMALS = {
  fox: { url: 'https://randomfox.ca/floof/', parse: (d) => d.image, label: 'Fox' },
  duck: { url: 'https://random-d.uk/api/v2/random', parse: (d) => d.url, label: 'Duck' },
  meow: { url: 'https://api.thecatapi.com/v1/images/search', parse: (d) => d[0]?.url, label: 'Cat' },
  woof: { url: 'https://dog.ceo/api/breeds/image/random', parse: (d) => d.message, label: 'Dog' },
}
const animal = (name, cfg) => ({
  name, category: 'fun', description: `Send a random ${cfg.label.toLowerCase()} image.`,
  async run(ctx) {
    try {
      const r = await fetch(cfg.url)
      if (!r.ok) throw new Error('fail')
      const d = await r.json()
      const url = cfg.parse(d)
      const buf = Buffer.from(await (await fetch(url)).arrayBuffer())
      await ctx.sock.sendMessage(ctx.jid, { image: buf, caption: `🐾 ${cfg.label}` })
    } catch { await ctx.sock.sendMessage(ctx.jid, { text: '❌ Could not fetch an image.' }) }
  },
})
export const fox = animal('fox', ANIMALS.fox)
export const duck = animal('duck', ANIMALS.duck)
export const meow = animal('meow', ANIMALS.meow)
export const woof = animal('woof', ANIMALS.woof)

/** pokemon — Pokédex lookup (free PokéAPI). */
export const pokemon = {
  name: 'pokemon', aliases: ['pokedex'], category: 'fun', description: 'Look up a Pokémon. Usage: .pokemon <name>',
  async run(ctx) {
    const q = (ctx.args[0] || '').toLowerCase().trim()
    if (!q) return ctx.sock.sendMessage(ctx.jid, { text: 'Usage: .pokemon <name>' })
    try {
      const r = await fetch(`https://pokeapi.co/api/v2/pokemon/${encodeURIComponent(q)}`)
      if (!r.ok) throw new Error('not found')
      const d = await r.json()
      const img = d.sprites?.front_default
      await ctx.sock.sendMessage(ctx.jid, { image: img ? { url: img } : undefined, caption: `⚡ *${d.name}*\n• Height: ${d.height}dm\n• Weight: ${d.weight}hg\n• Types: ${d.types.map((t) => t.type.name).join(', ')}` })
    } catch { await ctx.sock.sendMessage(ctx.jid, { text: `❌ Pokémon "${q}" not found.` }) }
  },
}

/** ngl — anonymous message link. Honest: generates a writeme-style link with a message. */
export const ngl = {
  name: 'ngl', category: 'fun', description: 'Create an anonymous-message (not-google-lies) link for a question. Usage: .ngl <question>',
  async run(ctx) {
    const q = ctx.args.join(' ')
    if (!q) return ctx.sock.sendMessage(ctx.jid, { text: 'Usage: .ngl <question>  (makes a shareable link to get anonymous replies)' })
    const url = `https://ngl.link/?q=${encodeURIComponent(q)}`
    await ctx.sock.sendMessage(ctx.jid, { text: `💬 *Anonymous question:* ${q}\n📎 ${url}\nNote: hosting this link yourself is required for it to receive replies.` })
  },
}

/** urban — Urban Dictionary lookup (free API). */
export const urban = {
  name: 'urban', aliases: ['ud'], category: 'fun', description: 'Urban Dictionary meaning. Usage: .urban <term>',
  async run(ctx) {
    const q = ctx.args.join(' ')
    if (!q) return ctx.sock.sendMessage(ctx.jid, { text: 'Usage: .urban <term>' })
    try {
      const r = await fetch(`https://api.urbandictionary.com/v0/define?term=${encodeURIComponent(q)}`)
      const d = await r.json()
      const def = d.list?.[0]
      if (!def) return ctx.sock.sendMessage(ctx.jid, { text: `❌ No definition for "${q}".` })
      await ctx.sock.sendMessage(ctx.jid, { text: `📚 *${def.word}*\n${def.definition.slice(0, 700)}` })
    } catch { await ctx.sock.sendMessage(ctx.jid, { text: '❌ Urban Dictionary unavailable.' }) }
  },
}

/** wyr — Would You Rather? (local). */
const WYR = [
  'Have the ability to fly, or the ability to read minds?',
  'Always be 10 minutes late, or always be 20 minutes early?',
  'Win a lifetime supply of your favourite food, or free rent for a year?',
  'Talk to animals, or speak every human language?',
  'Never use social media again, or never watch TV again?',
  'Have a rewind button on your life, or a pause button?',
]
export const wyr = {
  name: 'wyr', aliases: ['wouldyourather'], category: 'fun', description: 'A "would you rather" question.',
  run: async (ctx) => { await ctx.sock.sendMessage(ctx.jid, { text: WYR[Math.floor(Math.random() * WYR.length)] }) },
}
