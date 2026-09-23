/**
 * apis/ai.js — unified AI client.
 *
 * One function, six real providers. It auto-selects via settings/secret and
 * falls back to the configured provider. Providers are chosen in `.env`:
 *   AI_PROVIDER = gemini | openai | deepseek | groq | mistral | cohere | together
 *
 * Endpoints are the real public APIs. Where a model is not specified, a
 * sensible free-tier default is used.
 */
import { aiProvider, aiKey, aiKeyLabel } from '../lib/secrets.js'

const DEFAULTS = {
  gemini: 'gemini-3.6-flash',
  openai: 'gpt-4o-mini',
  deepseek: 'deepseek-chat',
  groq: 'llama-3.3-70b-versatile',
  mistral: 'mistral-large-latest',
  cohere: 'command-r-plus',
  together: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
}

/** Resolve a model, allowing an env override like GEMINI_MODEL / AI_MODEL. */
function modelFor(provider) {
  const envKey = `${provider.toUpperCase()}_MODEL`
  return process.env[envKey] || process.env.AI_MODEL || DEFAULTS[provider]
}

/** Unified request → text response. */
export async function aiChat(prompt, opts = {}) {
  const provider = (opts.provider || aiProvider()).toLowerCase()
  const model = opts.model || modelFor(provider)
  const system = opts.system || 'You are a helpful, concise assistant for a WhatsApp bot.'
  const key = aiKey(provider)
  if (!key) {
    const err = new Error(`No API key set for ${provider}. Add ${aiKeyLabel(provider)} to .env`)
    err.code = 'MISSING_KEY'
    err.provider = provider
    throw err
  }
  return callProvider(provider, { model, system, prompt, maxTokens: opts.maxTokens, temperature: opts.temperature })
}

async function callProvider(provider, { model, system, prompt, maxTokens = 1024, temperature = 0.7 }) {
  const messages = [
    { role: 'system', content: system },
    { role: 'user', content: prompt },
  ]

  if (provider === 'gemini') return gemini({ model, system, prompt })
  if (provider === 'cohere') return cohere({ model, system, prompt, maxTokens, temperature })
  // openai / deepseek / groq / mistral / together all speak OpenAI's chat format
  const base = {
    openai: 'https://api.openai.com/v1/chat/completions',
    deepseek: 'https://api.deepseek.com/chat/completions',
    groq: 'https://api.groq.com/openai/v1/chat/completions',
    mistral: 'https://api.mistral.ai/v1/chat/completions',
    together: 'https://api.together.xyz/v1/chat/completions',
  }[provider]

  if (!base) throw new Error(`Unsupported AI provider: ${provider}`)
  const res = await fetch(base, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${aiKey(provider)}` },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature }),
    signal: AbortSignal.timeout(120_000),
  })
  if (!res.ok) {
    const t = await res.text().catch(() => '')
    throw new Error(`${provider} API error ${res.status}: ${t.slice(0, 200)}`)
  }
  const data = await res.json()
  return data?.choices?.[0]?.message?.content?.trim() || ''
}

async function gemini({ model, system, prompt }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${aiKey('gemini')}`
  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120_000),
  })
  if (!res.ok) {
    const t = await res.text().catch(() => '')
    throw new Error(`Gemini API error ${res.status}: ${t.slice(0, 200)}`)
  }
  const data = await res.json()
  return data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('')?.trim() || ''
}

async function cohere({ model, system, prompt, maxTokens, temperature }) {
  const res = await fetch('https://api.cohere.com/v2/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${aiKey('cohere')}` },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: `# System\n${system}\n\n# User\n${prompt}` }],
      max_tokens: maxTokens,
      temperature,
    }),
    signal: AbortSignal.timeout(120_000),
  })
  if (!res.ok) {
    const t = await res.text().catch(() => '')
    throw new Error(`Cohere API error ${res.status}: ${t.slice(0, 200)}`)
  }
  const data = await res.json()
  return data?.message?.content?.[0]?.text?.trim() || ''
}

/** List which AI providers currently have a key configured. */
export function aiStatus() {
  return ['gemini', 'openai', 'deepseek', 'groq', 'mistral', 'cohere', 'together']
    .map((p) => `${p} (${aiKey(p) ? '✓ key set' : '— no key'})`)
    .join('\n')
}


/**
 * Vision request for the agent. Gemini is used because its API accepts inline
 * image data directly. Other providers remain available to the normal AI
 * commands exactly as before.
 */
export async function aiVision(imageBuffer, { prompt } = {}) {
  const key = aiKey('gemini')
  if (!key) {
    const err = new Error('Gemini API key is required for image understanding.')
    err.code = 'MISSING_KEY'
    throw err
  }
  const model = modelFor('gemini')
  const mimeType = detectImageMime(imageBuffer)
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`
  const body = {
    contents: [{
      role: 'user',
      parts: [
        { inline_data: { mime_type: mimeType, data: Buffer.from(imageBuffer).toString('base64') } },
        { text: prompt || 'Describe this image accurately.' },
      ],
    }],
    generationConfig: { temperature: 0.1, responseMimeType: 'application/json' },
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120_000),
  })
  if (!res.ok) {
    const t = await res.text().catch(() => '')
    throw new Error(`Gemini vision error ${res.status}: ${t.slice(0, 200)}`)
  }
  const data = await res.json()
  return data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('')?.trim() || ''
}

function detectImageMime(buf) {
  const b = Buffer.from(buf)
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png'
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg'
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return 'image/gif'
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46) return 'image/webp'
  return 'image/jpeg'
}
