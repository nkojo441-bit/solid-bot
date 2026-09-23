/**
 * agent/agent.js — natural-language agent layer.
 *
 * The agent does not replace the command system. It is an orchestration layer:
 * natural language -> AI plan -> existing plugin command -> normal plugin output.
 *
 * It is deliberately conservative around state-changing/admin commands. Those
 * can still be used normally with their existing commands; the agent only
 * auto-executes them when the sender is the configured owner.
 */
import { aiChat, aiVision } from '../apis/ai.js'
import { hasAiKey } from '../lib/secrets.js'
import { getPlugins, findPlugin } from '../plugins/index.js'
import { isOwner as isOwnerUtil } from '../lib/utils.js'

const BLOCKED_FOR_AGENT = new Set([
  'setkey', 'delkey', 'setvar', 'delvar', 'setcmd', 'delcmd', 'delcmds',
  'restart', 'shutdown', 'kick', 'kickall', 'kickr', 'tkick', 'ban', 'unban',
  'akick', 'delsudo', 'delmod', 'delete', 'delallnote', 'delnote',
])

function unwrapQuoted(message) {
  const c = message?.message
  const q =
    c?.extendedTextMessage?.contextInfo?.quotedMessage ||
    c?.imageMessage?.contextInfo?.quotedMessage ||
    c?.videoMessage?.contextInfo?.quotedMessage ||
    null
  if (!q) return null
  return {
    message: q,
    key: {
      remoteJid: message?.key?.remoteJid,
      id: c?.extendedTextMessage?.contextInfo?.stanzaId,
      participant: c?.extendedTextMessage?.contextInfo?.participant,
    },
  }
}

async function imageBufferFromContext(ctx) {
  const direct = ctx.message?.message?.imageMessage
    ? ctx.message
    : ctx.message?.message?.viewOnceMessage?.message?.imageMessage
      ? { ...ctx.message, message: ctx.message.message.viewOnceMessage.message }
      : null

  const target = direct || unwrapQuoted(ctx.message)
  if (!target) return null

  try {
    return Buffer.from(await ctx.sock.downloadMediaMessage(target))
  } catch {
    return null
  }
}

function commandCatalog(plugins) {
  return plugins
    .filter((p) => p?.name)
    .map((p) => ({
      name: p.name,
      aliases: p.aliases || [],
      category: p.category || 'other',
      description: p.description || '',
    }))
}

function extractJson(text) {
  const raw = String(text || '').trim()
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidate = fenced ? fenced[1].trim() : raw
  try { return JSON.parse(candidate) } catch {}
  const obj = candidate.match(/\{[\s\S]*\}/)
  if (obj) {
    try { return JSON.parse(obj[0]) } catch {}
  }
  return null
}

function normalizePlan(plan) {
  if (!plan || typeof plan !== 'object') return null
  const steps = Array.isArray(plan.steps) ? plan.steps : []
  return {
    intent: String(plan.intent || '').slice(0, 300),
    steps: steps.slice(0, 3).map((s) => ({
      command: String(s?.command || '').toLowerCase().replace(/^\./, ''),
      args: Array.isArray(s?.args) ? s.args.map(String).slice(0, 20) : [],
    })).filter((s) => s.command),
  }
}

async function plan(ctx) {
  const plugins = await getPlugins()
  const catalog = commandCatalog(plugins)
  const mediaHint = Boolean(
    ctx.message?.message?.imageMessage ||
    ctx.message?.message?.videoMessage ||
    ctx.message?.message?.viewOnceMessage?.message?.imageMessage ||
    ctx.message?.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage
  )

  const prompt = [
    'You are the action planner for BempsX-Nova, a WhatsApp bot.',
    'Turn the user request into a short plan using ONLY commands from the supplied registry.',
    'Do not invent commands. Prefer the most specific existing command.',
    'Use up to 3 sequential steps when a request genuinely needs multiple existing commands.',
    'If the user is asking what anime is shown in an attached/quoted image, use command "anime" only if a title can be extracted; otherwise use the special action "vision_anime" as the only step.',
    'Return JSON only: {"intent":"...","steps":[{"command":"...","args":["..."]}]}',
    `Media attached: ${mediaHint ? 'yes' : 'no'}`,
    `User request: ${ctx.body || ctx.message?.text || ''}`,
    'Command registry:',
    JSON.stringify(catalog),
  ].join('\n\n')

  const reply = await aiChat(prompt, {
    system: 'You are a strict JSON router. Never answer the user directly. Return valid JSON only.',
    maxTokens: 700,
    temperature: 0.1,
  })
  return normalizePlan(extractJson(reply))
}

async function identifyAnime(ctx) {
  const image = await imageBufferFromContext(ctx)
  if (!image) throw new Error('Please send or quote the anime image you want me to identify.')

  const result = await aiVision(image, {
    prompt: [
      'Identify the anime shown in this image.',
      'Return JSON only with keys: title, character, confidence, explanation.',
      'If uncertain, use title "" and confidence 0.',
      'Do not invent a title.',
    ].join(' '),
  })

  const data = extractJson(result) || {}
  const title = String(data.title || '').trim()
  const character = String(data.character || '').trim()
  const confidence = Number(data.confidence || 0)

  if (!title || confidence < 0.35) {
    return '🎬 I could not identify the anime confidently from this image.'
  }

  try {
    const { animeSearch } = await import('../apis/extra.js')
    const matches = await animeSearch(title)
    const best = matches?.[0]
    if (best?.title) {
      return `🎬 *Anime identified*\n\n*${best.title}*${character ? `\n👤 Character: ${character}` : ''}\n⭐ Score: ${best.score || '?'}\n📺 Type: ${best.type || 'Anime'}\n🎞️ Episodes: ${best.episodes || '?'}\n\n${data.explanation || ''}`.trim()
    }
  } catch {}

  return `🎬 *Anime identified*\n\n*${title}*${character ? `\n👤 Character: ${character}` : ''}\n\n${data.explanation || ''}`.trim()
}

function agentContext(ctx, args, body) {
  return { ...ctx, args, body }
}

async function executePlan(ctx, plan) {
  if (!plan?.steps?.length) throw new Error('I could not determine which BempsX-Nova capability to use.')

  const outputs = []
  for (const step of plan.steps) {
    if (step.command === 'vision_anime') {
      outputs.push(await identifyAnime(ctx))
      continue
    }

    const plugin = await findPlugin(step.command)
    if (!plugin) throw new Error(`I could not find the "${step.command}" capability.`)

    if (BLOCKED_FOR_AGENT.has(plugin.name) && !isOwnerUtil(ctx.sender)) {
      throw new Error('That action requires the owner and was not executed automatically.')
    }

    await plugin.run(agentContext(ctx, step.args, `${plugin.name} ${step.args.join(' ')}`))
    outputs.push(`Executed .${plugin.name}`)
  }
  return outputs
}

export function looksLikeAgentRequest(ctx) {
  const text = String(ctx.body || ctx.message?.text || '').trim()
  if (!text) {
    return Boolean(
      ctx.message?.message?.imageMessage ||
      ctx.message?.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage
    )
  }
  if (/^(hi|hello|hey|yo|ok|okay|thanks|thank you|good morning|good night)\b/i.test(text)) return false
  return /\b(what|which|who|where|when|why|how|find|search|look up|show|tell|identify|download|convert|translate|weather|anime|manga|news|lyrics|meaning|define|calculate|check|give me|can you|please)\b/i.test(text)
    || text.endsWith('?')
}

export async function runAgent(ctx) {
  if (!hasAiKey()) return false
  const planResult = await plan(ctx)
  if (!planResult) throw new Error('I could not understand that request.')
  await executePlan(ctx, planResult)
  return true
}