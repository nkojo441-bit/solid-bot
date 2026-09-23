/** tts — text to speech via the free Google TTS endpoint. */
export const tts = {
  name: 'tts', aliases: ['speak'], category: 'tools', description: 'Read text aloud. Usage: .tts <text> (optional: .tts <language>|<text>)',
  async run(ctx) {
    const arg = ctx.args.join(' ')
    if (!arg) return ctx.sock.sendMessage(ctx.jid, { text: 'Usage: .tts <text>' })
    // optional "lang|text" form, e.g. .tts es|hola
    let lang = 'en'
    let text = arg
    if (arg.includes('|')) {
      const [l, t] = arg.split('|')
      lang = l.trim() || 'en'
      text = t.trim()
    }
    try {
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${encodeURIComponent(lang)}&q=${encodeURIComponent(text)}`
      const r = await fetch(url)
      if (!r.ok) throw new Error(`TTS failed (${r.status})`)
      const buf = Buffer.from(await r.arrayBuffer())
      if (buf.length < 200) throw new Error('empty audio')
      await ctx.sock.sendMessage(ctx.jid, { audio: buf, mimetype: 'audio/mp4', ptt: true, fileName: 'tts.mp3' })
    } catch {
      await ctx.sock.sendMessage(ctx.jid, { text: '❌ Text-to-speech is unavailable right now. Check text length/language.' })
    }
  },
}
