/**
 * secrets.js — central API key / secret manager.
 *
 * EVERY key is read here — the only place in the bot, so nothing is scattered.
 * Resolution order (lowest trust → highest):
 *   1. keys BAKED into src/config/keys.js  (so forks work out of the box —
 *      BEMPSX provides these; users only set SESSION_ID + OWNER_NUMBER)
 *   2. env / platform dashboard (.env)      (override per deployment)
 *   3. runtime `.setkey` store               (owner can set live from WhatsApp)
 *
 * If a key is absent everywhere, the calling plugin replies honestly
 * ("set GEMINI_API_KEY") rather than faking output.
 */
import { BOT_KEYS } from '../config/keys.js'

/** env-var (or baked) → internal provider key. */
const ENV_KEYS = {
  gemini: 'GEMINI_API_KEY',
  openai: 'OPENAI_API_KEY',
  deepseek: 'DEEPSEEK_API_KEY',
  groq: 'GROQ_API_KEY',
  mistral: 'MISTRAL_API_KEY',
  cohere: 'COHERE_API_KEY',
  together: 'TOGETHER_API_KEY',
}

// Read a key: env override → baked default → ''.
function keyFor(label) {
  return process.env[label] || BOT_KEYS[label] || ''
}

const raw = {
  aiProvider: process.env.AI_PROVIDER || 'gemini',
  gemini: keyFor('GEMINI_API_KEY'),
  openai: keyFor('OPENAI_API_KEY'),
  deepseek: keyFor('DEEPSEEK_API_KEY'),
  groq: keyFor('GROQ_API_KEY'),
  mistral: keyFor('MISTRAL_API_KEY'),
  cohere: keyFor('COHERE_API_KEY'),
  together: keyFor('TOGETHER_API_KEY'),

  // Optional helpers / misc (baked default wins if env unset)
  openweather: keyFor('OPENWEATHER_API_KEY'),
  apiscript: keyFor('APISCRIPT_KEY'),
  cdn: process.env.CDN_URL || '',

  // ── BEMPSX gateway (one key unlocks every downloader) ──────────
  botApiKey: keyFor('BOT_API_KEY'),
  gatewayUrl: keyFor('GATEWAY_URL') || process.env.GATEWAY_URL || '',

  adminToken: process.env.ADMIN_TOKEN || '',
}

const KEY_LABELS = ENV_KEYS

/** Wrap the values so they respond to live env changes too. */
function live(label) {
  return process.env[label] || BOT_KEYS[label] || ''
}

/** The currently-selected AI provider (validates against known providers). */
export function aiProvider() {
  const p = String(process.env.AI_PROVIDER || raw.aiProvider || 'gemini').toLowerCase()
  return KEY_LABELS[p] ? p : 'gemini'
}

/** Get the API key for a provider. Returns '' if unset.
 *  Reads live process.env + baked keys so a runtime `.setkey` takes effect. */
export function aiKey(provider = aiProvider()) {
  const p = String(provider).toLowerCase()
  const label = KEY_LABELS[p]
  return label ? live(label) : ''
}

/** Load runtime-set keys (from `.setkey`) back into env on boot. */
export async function hydrateRuntimeKeys() {
  try {
    const { store } = await import('./database.js')
    const s = store('aikeys')
    for (const [provider, label] of Object.entries(KEY_LABELS)) {
      // Current format stores by provider name; older versions stored by
      // environment-variable label. Accept both so existing deployments
      // keep working after an upgrade.
      const v = (await s.get(provider)) || (await s.get(label))
      if (v) process.env[label] = v
    }
  } catch {}
}

/** The env var name for a given provider (for helpful error messages). */
export function aiKeyLabel(provider = aiProvider()) {
  return KEY_LABELS[provider] || 'AI_API_KEY'
}

/** True if the chosen AI provider has a key configured. */
export function hasAiKey(provider = aiProvider()) {
  return Boolean(aiKey(provider))
}

export const secrets = raw
export default secrets
