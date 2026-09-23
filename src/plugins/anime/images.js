import { randomAnimeImage, isAnimeCategory } from '../../apis/anime.js'
import { bold } from '../../lib/utils.js'

/** Send a real anime image from a (verified) SFW category. */
async function sendImage(ctx, category) {
  await ctx.sock.sendMessage(ctx.jid, { text: '🎨 Fetching a real anime image...' })
  try {
    const r = await randomAnimeImage(category)
    await ctx.sock.sendMessage(ctx.jid, {
      image: r.buf,
      caption: `🖼️ *${category}*\nSource: ${bold(r.source)}${r.anime ? '\nAnime: ' + bold(r.anime) : ''}`,
    })
  } catch (e) {
    await ctx.sock.sendMessage(ctx.jid, { text: `⚠️ ${e.message}` })
  }
}

/** waifu — random waifu image. */
export const waifu = {
  name: 'waifu', aliases: ['waifuimg'], category: 'anime', description: 'A random waifu image.',
  run: (ctx) => sendImage(ctx, 'waifu'),
}

/** neko — random neko image. */
export const neko = {
  name: 'neko', aliases: ['kitten'], category: 'anime', description: 'A random neko image.',
  run: (ctx) => sendImage(ctx, 'neko'),
}

/** animereac — send a reacting anime image (hug/kiss/pat/slap/etc). */
export const animereac = {
  name: 'animereac', aliases: ['animeimg', 'reaction', 'animg'], category: 'anime',
  description: 'Anime reaction image. Usage: .animereac <hug|kiss|pat|slap|baka|smug|neko|waifu>',
  async run(ctx) {
    const cat = (ctx.args[0] || 'neko').toLowerCase()
    if (!isAnimeCategory(cat)) {
      return ctx.sock.sendMessage(ctx.jid, {
        text: `✳️ Pick one of:\n${['neko','waifu','hug','kiss','pat','slap','smug','cuddle','tickle','feed','punch','cry','laugh','happy','sad','angry'].join(', ')}`,
      })
    }
    await sendImage(ctx, cat)
  },
}

