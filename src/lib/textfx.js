/**
 * lib/textfx.js — real, local text-effect renderer.
 *
 * ephoto360 / textpro.me now block automated form submission, so like the
 * reference bot we render effects locally with SVG + sharp: instant, offline,
 * and nothing external to break. Each effect is a styled SVG template; sharp
 * rasterises it to PNG. One or two lines of text are supported.
 */
import sharp from 'sharp'

/** Effects that look better stacked on two lines (use "|" to split). */
export const TWO_LINE = new Set(['gaming', 'metallic', 'gradient'])

const FONT_STACK = `'Arial Black', 'Segoe UI', Arial, sans-serif`

/** Build an SVG string for an effect. width x canvas 1000x400. */
function svgFor(effect, t1, t2) {
  const W = 1000, H = 420
  const cx = W / 2
  const text = escapeXml(t1)
  const sub = escapeXml(t2)
  const mid = (H + 160) / 2

  const base =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
    `<defs>${grad(effect)}${glowFilter(effect)}</defs>` +
    `<rect width="${W}" height="${H}" fill="${bg(effect)}"/>` +
    `<text x="${cx}" y="${t2 ? H - 120 : mid}" text-anchor="middle" font-family="${FONT_STACK}" font-weight="900" font-size="${t2 ? 72 : 120}" fill="url(#g)"${glowAttr(effect)}>${text}</text>` +
    (sub ? `<text x="${cx}" y="${H - 40}" text-anchor="middle" font-family="${FONT_STACK}" font-weight="700" font-size="50" fill="#fff" opacity="0.9">${sub}</text>` : '') +
    `</svg>`
  return base
}

function glowFilter(effect) {
  const glow = { neonlight: true, glitch: true, galaxy: true, rainbow: true, gaming: true, fire: true }
  if (!glow[effect]) return ''
  return `<filter id="glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`
}

function glowAttr(effect) {
  return { neonlight: true, glitch: true, galaxy: true, rainbow: true, gaming: true, fire: true }[effect]
    ? ' filter="url(#glow)"'
    : ''
}

function grad(effect) {
  switch (effect) {
    case 'neonlight': return `<linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#00e5ff"/><stop offset="1" stop-color="#7c4dff"/></linearGradient>`
    case 'hacker': return `<linearGradient id="g" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#39ff14"/><stop offset="1" stop-color="#00ffaa"/></linearGradient>`
    case 'glitch': return `<linearGradient id="g" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#ff2d55"/><stop offset=".5" stop-color="#00e5ff"/><stop offset="1" stop-color="#ffb300"/></linearGradient>`
    case 'galaxy': return `<linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#7c4dff"/><stop offset="1" stop-color="#ff4081"/></linearGradient>`
    case 'fire': return `<linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#ffe082"/><stop offset="1" stop-color="#ff3d00"/></linearGradient>`
    case 'gaming': return `<linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#00e5ff"/><stop offset="1" stop-color="#ff4081"/></linearGradient>`
    case 'metallic': return `<linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#fafafa"/><stop offset="1" stop-color="#9e9e9e"/></linearGradient>`
    case 'rainbow': return `<linearGradient id="g" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#ff0000"/><stop offset=".16" stop-color="#ff8000"/><stop offset=".33" stop-color="#ffff00"/><stop offset=".5" stop-color="#00ff00"/><stop offset=".66" stop-color="#00ffff"/><stop offset=".83" stop-color="#0000ff"/><stop offset="1" stop-color="#8000ff"/></linearGradient>`
    default: return `<linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#00e5ff"/><stop offset="1" stop-color="#7c4dff"/></linearGradient>`
  }
}

function bg(effect) {
  switch (effect) {
    case 'fire': return '#1a1100'
    case 'neonlight': case 'glitch': case 'galaxy': case 'gaming': return '#0a0a14'
    case 'metallic': return '#000'
    case 'rainbow': return '#111'
    default: return '#0b0b12'
  }
}

function escapeXml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/** Rasterise an effect to a PNG buffer. */
export async function renderEffect(effect, t1, t2 = '') {
  const svg = svgFor(effect, t1, t2)
  return sharp(Buffer.from(svg)).png().toBuffer()
}

/** The list of available effects (each is a command). */
export function effectList() {
  return ['neonlight', 'hacker', 'glitch', 'galaxy', 'fire', 'gaming', 'metallic', 'rainbow']
}
