/**
 * apis/translate.js — translation.
 *
 * Primary: the configured AI provider (reliable, works for every language
 * incl. Igbo/Yoruba/Hausa). Fallback: Google's free endpoint when it answers.
 * If AI has no key and Google is blocked, we throw an honest error — never
 * return fake text.
 */
import { aiChat } from './ai.js'
import { hasAiKey, aiProvider } from '../lib/secrets.js'

const LANG_LABEL = {
  en: 'English', es: 'Spanish', fr: 'French', de: 'German', pt: 'Portuguese',
  it: 'Italian', ru: 'Russian', zh: 'Chinese', ja: 'Japanese', ar: 'Arabic',
  ig: 'Igbo', yo: 'Yoruba', ha: 'Hausa', sw: 'Swahili', nl: 'Dutch', tr: 'Turkish',
}

/**
 * Translate `text` to `target` (a language code or name). Returns
 * { translated, target, label }.
 */
export async function translate(text, target = 'en', source = 'auto') {
  // 1) Real AI-based translation (preferred, works for all languages)
  if (hasAiKey()) {
    const label = LANG_LABEL[target] || target
    const reply = await aiChat(
      `Translate this text into ${label} (language code: ${target})${source !== 'auto' ? ` from ${source}` : ''}. ` +
      `Return ONLY the translation, no notes.\n\nTEXT:\n${text}`,
      { system: 'You are a precise translator. Output only the translated text.' }
    )
    return { translated: reply, target, label }
  }

  // 2) Fallback: free Google endpoint (works if not rate-limited)
  const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(source)}&tl=${encodeURIComponent(target)}&dt=t&q=${encodeURIComponent(text)}`)
  if (!res.ok) throw new Error('Translate failed: no AI key and the free endpoint is unavailable.')
  const d = await res.json()
  const translated = (d[0] || []).map((x) => x[0]).join('')
  const tl = d[4] || target
  return { translated, target: tl, label: LANG_LABEL[tl] || tl }
}

export { LANG_LABEL }
