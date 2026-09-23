import sharp from 'sharp'
import { downloadMedia, unwrapContent } from '../../lib/media.js'

/**
 * IMAGE-MEME — real locally-rendered meme overlays (sharp + SVG).
 * Composites a themed overlay onto a square-cropped photo. The photo comes
 * from an image the user sends, an image they reply to, or (fallback) the
 * target's profile picture via sock.profilePictureUrl.
 */

const S = 600
const FONT = "'Segoe UI', Arial, sans-serif"

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** Resolve the source image buffer: own image, quoted image, or a target's PP. */
async function sourceImage(ctx) {
  // message types we support
  const own = unwrapContent(ctx.message?.message)
  if (own?.imageMessage) return downloadMedia(ctx.sock, ctx.message, 'imageMessage')
  // quoted image
  const q = ctx.message?.message?.extendedTextMessage?.contextInfo?.quotedMessage
  if (q && unwrapContent(q)?.imageMessage) {
    return downloadMedia(ctx.sock, { message: q, key: ctx.message?.key }, 'imageMessage')
  }
  // fallback: a tagged user's profile picture
  const target = ctx.message?.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] ||
    ctx.args[0]?.replace(/@|\D/g, '')
  if (target && ctx.sock?.profilePictureUrl) {
    const jid = target.includes('@') ? target : `@${target}@s.whatsapp.net`
    try {
      const url = await ctx.sock.profilePictureUrl(jid, 'image')
      const res = await fetch(url)
      return Buffer.from(await res.arrayBuffer())
    } catch { /* fall through */ }
  }
  throw new Error('NO_IMAGE')
}

async function overlay(buffer, svg, { grey = false, tint = null } = {}) {
  const base = await sharp(buffer).resize(S, S, { fit: 'cover' }).png().toBuffer()
  let p = base
  if (grey) p = await sharp(p).greyscale().png().toBuffer()
  if (tint) p = await sharp(p).tint(tint).png().toBuffer()
  return sharp(p).composite([{ input: Buffer.from(svg), top: 0, left: 0 }]).png().toBuffer()
}

const memeCommand = ({ name, aliases = [], label, desc, build, grey = false, tint = null }) => ({
  name, aliases, category: 'image', description: desc,
  async run(ctx) {
    const t = ctx.args.join(' ') || ''
    try {
      let buf
      try { buf = await sourceImage(ctx) }
      catch {
        return ctx.sock.sendMessage(ctx.jid, {
          text: '🖼️ I need an image.\n\nReply to a photo with this command, or tag someone whose profile picture is visible to me.',
        })
      }
      const out = await overlay(buf, build(`${esc(t)}`), { grey, tint })
      await ctx.sock.sendMessage(ctx.jid, { image: out, caption: label })
    } catch (e) {
      if (e.message === 'NO_IMAGE' || /profile|404|not.?found|ENOTFOUND|download/i.test(e.message)) {
        await ctx.sock.sendMessage(ctx.jid, {
          text: '🖼️ I need an image.\n\nReply to a photo with this command, or tag someone whose profile picture is visible to me.',
        })
      } else {
        await ctx.sock.sendMessage(ctx.jid, { text: `❌ ${e.message}` })
      }
    }
  },
})

const MEMES = [
  { name: 'wasted', label: '💀 WASTED', desc: 'GTA "wasted" overlay', grey: true,
    build: () => `<svg width="${S}" height="${S}"><rect width="${S}" height="${S}" fill="#000" opacity="0.42"/><text x="${S/2}" y="${S/2+22}" font-family="${FONT}" font-size="82" font-weight="bold" fill="#c0392b" text-anchor="middle" stroke="#000" stroke-width="3" letter-spacing="6">WASTED</text></svg>` },
  { name: 'rip-meme', aliases: ['rip'], label: '🪦 R.I.P.', desc: 'Gravestone overlay', grey: true,
    build: (t) => `<svg width="${S}" height="${S}"><rect width="${S}" height="${S}" fill="#000" opacity="0.5"/><text x="${S/2}" y="140" font-family="${FONT}" font-size="90" font-weight="bold" fill="#e8e8e8" text-anchor="middle" letter-spacing="10">R.I.P.</text><text x="${S/2}" y="${S-70}" font-family="${FONT}" font-size="34" fill="#cfcfcf" text-anchor="middle">${t || 'Gone but not forgotten'}</text></svg>` },
  { name: 'trigger-meme', aliases: ['triggered'], label: '😡 TRIGGERED', desc: 'Triggered overlay', tint: { r: 255, g: 90, b: 60 },
    build: () => `<svg width="${S}" height="${S}"><rect width="${S}" height="${S}" fill="#ff2200" opacity="0.22"/><rect x="0" y="${S-105}" width="${S}" height="105" fill="#c0140a"/><text x="${S/2}" y="${S-36}" font-family="${FONT}" font-size="52" font-weight="bold" fill="#fff" text-anchor="middle" letter-spacing="4">TRIGGERED</text></svg>` },
  { name: 'mnm', aliases: ['moneyman'], label: '💰 Rich', desc: 'Money rain overlay',
    build: () => `<svg width="${S}" height="${S}">${Array.from({length:26},()=>{const x=Math.random()*S,y=Math.random()*S,r=Math.random()*28+22;return `<text x="${x.toFixed(0)}" y="${y.toFixed(0)}" font-size="${r.toFixed(0)}" opacity="0.9">💵</text>`}).join('')}<rect x="0" y="${S-92}" width="${S}" height="92" fill="#0b6623" opacity="0.85"/><text x="${S/2}" y="${S-32}" font-family="${FONT}" font-size="46" font-weight="bold" fill="#ffd700" text-anchor="middle">RICH 💰</text></svg>` },
  { name: 'jailbars', aliases: ['jail', 'prison'], label: '🚔 Jailed', desc: 'Prison bars overlay', grey: true,
    build: () => `<svg width="${S}" height="${S}"><rect width="${S}" height="${S}" fill="#000" opacity="0.28"/>${Array.from({length:7},(_,i)=>`<rect x="${18+i*88}" y="0" width="26" height="${S}" fill="#2b2b2b" opacity="0.92" rx="4"/>`).join('')}<rect x="0" y="0" width="${S}" height="22" fill="#2b2b2b"/><rect x="0" y="${S-22}" width="${S}" height="22" fill="#2b2b2b"/></svg>` },
  { name: 'stonks', label: '📈 Stonks', desc: 'Stonks overlay',
    build: () => `<svg width="${S}" height="${S}"><rect width="${S}" height="${S}" fill="#0a1f2e" opacity="0.35"/><polyline points="40,520 160,430 260,470 380,250 500,150 560,90" fill="none" stroke="#00e676" stroke-width="10" stroke-linecap="round"/><text x="${S/2}" y="${S-34}" font-family="${FONT}" font-size="60" font-weight="bold" fill="#00e676" text-anchor="middle" stroke="#003b1f" stroke-width="2">STONKS</text></svg>` },
  { name: 'wanted', label: '🎯 WANTED', desc: 'Wanted poster overlay',
    build: (t) => `<svg width="${S}" height="${S}"><rect width="${S}" height="${S}" fill="none"/><rect x="20" y="20" width="${S-40}" height="${S-40}" fill="none" stroke="#8b6b3d" stroke-width="10" rx="6"/><text x="${S/2}" y="80" font-family="${FONT}" font-size="44" font-weight="bold" fill="#e8c46a" text-anchor="middle" letter-spacing="6">WANTED</text><text x="${S/2}" y="${S-40}" font-family="${FONT}" font-size="26" fill="#e8c46a" text-anchor="middle">${t || 'BY BEMPSX-NOVA'}</text></svg>` },
]

export const memes = Object.fromEntries(
  MEMES.map((cfg) => [cfg.name, memeCommand(cfg)])
)

/** carbon — real code → styled image (syntax highlighted). */
export const carbon = {
  name: 'carbon', aliases: ['code2img'], category: 'image',
  description: 'Turn code into a styled image.',
  async run(ctx) {
    const code = ctx.args.join(' ') || ctx.body.replace(/^carbon\s+/i, '') || ctx.message?.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation
    if (!code) return ctx.sock.sendMessage(ctx.jid, { text: '💻 Usage: *.carbon const x = 1*\n\nOr reply to a code message.' })
    if (code.length > 1800) return ctx.sock.sendMessage(ctx.jid, { text: '❌ Too long — keep under 1800 characters.' })
    try {
      const lines = code.split('\n').slice(0, 34)
      const lineH = 30, pad = 34, headerH = 46
      const width = Math.min(1100, Math.max(560, Math.max(...lines.map((l) => l.length)) * 10.2 + pad * 2 + 52))
      const height = headerH + lines.length * lineH + pad * 2
      const colour = (raw) => {
        let s = esc(raw)
        s = s.replace(/(\/\/.*)$/g, '<tspan fill="#6a9955">$1</tspan>')
        s = s.replace(/(&quot;[^&]*?&quot;|&apos;[^&]*?&apos;|`[^`]*?`)/g, '<tspan fill="#ce9178">$1</tspan>')
        s = s.replace(/\b(const|let|var|function|return|if|else|for|while|class|import|export|from|async|await|new|try|catch|throw|typeof)\b/g, '<tspan fill="#569cd6">$1</tspan>')
        s = s.replace(/\b(\d+(?:\.\d+)?)\b/g, '<tspan fill="#b5cea8">$1</tspan>')
        return s
      }
      const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="${width}" height="${height}" rx="14" fill="#1e1e1e"/><rect width="${width}" height="${headerH}" rx="14" fill="#323233"/><circle cx="26" cy="23" r="7" fill="#ff5f56"/><circle cx="50" cy="23" r="7" fill="#ffbd2e"/><circle cx="74" cy="23" r="7" fill="#27c93f"/><text x="${width-18}" y="28" font-family="${FONT}" font-size="13" fill="#7a7a7a" text-anchor="end">BEMPSX-NOVA</text>${lines.map((l,i)=>`<text x="${pad}" y="${headerH+pad+i*lineH}" font-family="monospace" font-size="17" fill="#4a4a4a">${String(i+1).padStart(2,' ')}</text><text x="${pad+44}" y="${headerH+pad+i*lineH}" font-family="monospace" font-size="17" fill="#d4d4d4">${colour(l)}</text>`).join('')}</svg>`
      const buf = await sharp(Buffer.from(svg)).png().toBuffer()
      await ctx.sock.sendMessage(ctx.jid, { image: buf, caption: '💻 *Carbon*' })
    } catch (e) {
      await ctx.sock.sendMessage(ctx.jid, { text: `❌ ${e.message}` })
    }
  },
}
