/**
 * General-purpose helpers shared across the bot.
 */
import settings from '../../settings.js'

/** Strip non-digits from a number string, add 234 prefix if local (NG) style. */
export function normalizeNumber(input) {
  let n = String(input || '').replace(/\D/g, '')
  if (n.startsWith('0')) n = '234' + n.slice(1)
  if (!n.startsWith('234') && n.length === 10) n = '234' + n
  return n
}

// WhatsApp can address the same person by a phone JID (@s.whatsapp.net)
// or an opaque LID (@lid). Keep known owner LIDs so username/LID addressing
// does not accidentally lock the real owner out of owner-only commands.
const ownerLids = new Set(
  String(process.env.OWNER_LIDS || '')
    .split(',')
    .map((v) => v.trim().replace(/\D/g, ''))
    .filter(Boolean)
)

export function rememberOwnerJid(jid, alternateJid) {
  const primary = String(jid || '')
  const alt = String(alternateJid || '')
  const primaryDigits = primary.replace(/\D/g, '')
  const altDigits = alt.replace(/\D/g, '')
  if (primaryDigits === settings.ownerNumber && altDigits) ownerLids.add(altDigits)
  if (altDigits === settings.ownerNumber && primaryDigits) ownerLids.add(primaryDigits)
}

/** True if the given jid is the bot owner, including known WhatsApp LIDs. */
export function isOwner(jid) {
  if (!jid) return false
  const digits = String(jid).replace(/\D/g, '')
  return digits === settings.ownerNumber || ownerLids.has(digits)
}

/** True if the given jid is the bot itself. */
export function isSelf(jid, sock) {
  return jid.replace(/\D/g, '') === String(sock?.user?.id || '').replace(/\D/g, '')
}

/** Wrap text in asterisks for WhatsApp bold. */
export const bold = (t) => `*${t}*`

/** Human-readable time ago, e.g. "5m ago". */
export function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return `${Math.floor(s / 86400)}d`
}

/** Escape regex special chars. */
export const escapeRegex = (str) => String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Strip a JID to just the number. */
export const numOf = (jid) => String(jid || '').replace(/\D/g, '')

// Small cache of group metadata so we don't hammer Baileys on every message.
const _groupCache = new Map()
async function groupParticipants(sock, groupJid) {
  if (_groupCache.has(groupJid)) return _groupCache.get(groupJid)
  try {
    const meta = await sock.groupMetadata(groupJid)
    const parts = meta?.participants || []
    _groupCache.set(groupJid, parts)
    // refresh after some time (unref so it never keeps the process alive)
    const t = setTimeout(() => _groupCache.delete(groupJid), 60e3)
    if (t.unref) t.unref()
    return parts
  } catch {
    return []
  }
}

/**
 * Resolve a human-readable name for a sender.
 *
 * Order:
 *   1. pushName (Baileys gives the contact's saved name / device name)
 *   2. group participant entry (subject / name)
 *   3. the bare number
 *  Never returns the literal string "USER".
 */
export async function resolveUserName(sock, groupJid, sender, pushName) {
  // 1. Real pushname, unless it's blank or the literal placeholder "USER".
  const push = (pushName || '').trim()
  if (push && !/^user$/i.test(push) && !/^unknown$/i.test(push)) return push

  // 2. Look in the group's participant list.
  if (sock?.groupMetadata && groupJid?.endsWith('@g.us')) {
    const parts = await groupParticipants(sock, groupJid)
    const me = parts.find((p) => numOf(p.id) === numOf(sender))
    const name = me?.subject || me?.name || me?.verifiedName
    if (name && typeof name === 'string' && name.trim()) return name.trim()
  }

  // 3. Fallback to the number. Also try the contact store if available.
  try {
    const contact = sock?.contacts?.[sender] || sock?.user?.contacts?.[sender]
    if (contact?.name) return contact.name
  } catch {}

  // 4. The bare number.
  return '@' + numOf(sender)
}
