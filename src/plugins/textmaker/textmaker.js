import { renderEffect, effectList, TWO_LINE } from '../../lib/textfx.js'

/**
 * TEXTMAKER — local, real text-effect images (SVG + sharp). No external API.
 * Effects are rendered instantly on-device, so they can never break.
 * Two-line effects accept: .gaming BempsX | MD
 */

function build(name) {
  return {
    name,
    aliases: [`${name}img`],
    category: 'textmaker',
    description: `Create a "${name}" text image.`,
    async run(ctx) {
      const body = ctx.args.join(' ') || ctx.body.replace(new RegExp(`^${name}\\s+`, 'i'), '')
      if (!body) {
        return ctx.sock.sendMessage(ctx.jid, {
          text: `🎨 Give me some text:\n*.${name} BempsX-Nova*` +
            (TWO_LINE.has(name) ? `\n\nSupports two lines:\n*.${name} BempsX | MD*` : ''),
        })
      }
      if (body.length > 60) return ctx.sock.sendMessage(ctx.jid, { text: '❌ Keep it under 60 characters.' })
      const [t1, t2] = body.includes('|') ? body.split('|').map((s) => s.trim()) : [body.trim(), '']
      try {
        const buf = await renderEffect(name, t1, t2)
        await ctx.sock.sendMessage(ctx.jid, { image: buf, caption: `🎨 *${name}*` })
      } catch (e) {
        await ctx.sock.sendMessage(ctx.jid, { text: `❌ Could not render: ${e.message}` })
      }
    },
  }
}

export const textmakers = Object.fromEntries(
  effectList().map((name) => [name, build(name)])
)

// The listing command.
export const textmaker = {
  name: 'textmaker', aliases: ['textfx', 'effects'], category: 'textmaker',
  description: 'List every text effect available.',
  async run(ctx) {
    const list = effectList()
    await ctx.sock.sendMessage(ctx.jid, {
      text: `🎨 *TEXT EFFECTS* (${list.length})\n\n` +
        list.map((n) => `• ${ctx.prefix}${n}`).join('\n') +
        `\n\n💡 Usage: *${ctx.prefix}neonlight BempsX-Nova*\n` +
        `Two-line effects (${[...TWO_LINE].join(', ')}) accept:\n*${ctx.prefix}gaming BempsX | MD*`,
    })
  },
}
