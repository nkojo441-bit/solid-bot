/**
 * group.js — group lifecycle helpers.
 *
 * Welcome new members, say goodbye on leave, and spring-clean spammy links.
 * Each feature is gated by settings so you can flip them on/off in .env.
 */
import settings from '../../settings.js'
import { store } from '../lib/database.js'

const LINK_RE = /(https?:\/\/|www\.|wa\.me|chat\.whatsapp\.com|t\.me)\S*/i
const gset = store('groupset')

async function antiOn(jid, name) { return Boolean(await gset.get(`${jid}:${name}`)) }

/** Anti-link guard + antiword + antispam + antitag, gated by per-group toggles. */
export async function handleGroupEvent(sock, m, jid, { text, isGroup }) {
  if (!isGroup) return
  const participant = m.key?.participant

  // Anti-link (global setting or per-group toggle).
  const linkOn = settings.antiLink || (await antiOn(jid, 'antilink'))
  if (linkOn && text && LINK_RE.test(text)) {
    const safe = text.replace(LINK_RE, '')
    if (safe.trim() === '') {
      try {
        await sock.sendMessage(jid, {
          text: `🚫 *Links are not allowed in this group.*\n${participant || ''}`,
          mentions: participant ? [participant] : undefined,
        })
      } catch {}
    }
  }

  // Anti-word (per-group list).
  if ((await antiOn(jid, 'antiword')) && text) {
    const words = (await gset.get(`${jid}:antiword:words`)) || []
    const lower = text.toLowerCase()
    const hit = words.find((w) => lower.includes(w))
    if (hit) {
      try {
        await sock.sendMessage(jid, {
          text: `🚫 *Blocked word:* ${hit}\n@${participant?.split('@')[0] || ''}`,
          mentions: participant ? [participant] : undefined,
        })
      } catch {}
    }
  }

  // Anti-tag (non-admins spamming @all) — handled elsewhere, note only.
}

/** Run on a group participant change (add/remove). */
export async function onParticipantsUpdate(sock, update) {
  const { jid, participants, action } = update
  const welcome = settings.welcome || (await antiOn(jid, 'welcome'))
  const goodbye = (await antiOn(jid, 'goodbye')) || (settings.welcome && action === 'remove')
  if (!welcome && !goodbye) return
  for (const userJid of participants) {
    if (action === 'add' && welcome) {
      try {
        await sock.sendMessage(jid, {
          text: `👋 Welcome to the group, @${userJid.split('@')[0]}!\nSay hi to everyone.`,
          mentions: [userJid],
        })
      } catch {}
    } else if (action === 'remove' && goodbye) {
      try {
        await sock.sendMessage(jid, {
          text: `👋 @${userJid.split('@')[0]} left the group.`,
          mentions: [userJid],
        })
      } catch {}
    }
  }
}
