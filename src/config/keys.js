/**
 * src/config/keys.js — BAKE YOUR API KEYS HERE (single place).
 *
 * BempsX-Nova: paste your real keys below. They ship inside the code so anyone
 * who forks BempsX-Nova gets a fully-working bot out of the box — the only thing
 * they must set is their OWN SESSION_ID and OWNER_NUMBER.
 *
 * Precedence (lowest → highest):
 *   1. baked here        → works for every fork, no signups
 *   2. .env / platform   → overrides (for power users or per-deployment keys)
 *
 * The bot reads these through src/lib/secrets.js — it is the ONLY consumer,
 * so nothing is scattered across plugins.
 *
 * ────────────────────────────────────────────────────────────────
 *  ⚠️  These are yours. If you make the repo PUBLIC, anyone with the keys
 *      can use your quota. That is the trade-off of "bake them in" — it is
 *      exactly what you asked for. Keep quota/limits in mind.
 * ────────────────────────────────────────────────────────────────
 */

export const BOT_KEYS = {
  /* ── AI providers (pick one via AI_PROVIDER) ─────────────────── */
  GEMINI_API_KEY: '',         // Set GEMINI_API_KEY in .env / hosting secrets.
  OPENAI_API_KEY: '',        // platform.openai.com          → .gpt
  DEEPSEEK_API_KEY: '',      // platform.deepseek.com        → .deepseek
  GROQ_API_KEY: '',          // console.groq.com             → .groq, fast free
  MISTRAL_API_KEY: '',       // console.mistral.ai           → .mistral
  COHERE_API_KEY: '',        // cohere.com/keys              → .cohere
  TOGETHER_API_KEY: '',      // api.together.xyz/keys        → .together

  /* ── Download / media helper (ONE key for YouTube/TikTok/IG/etc) ── */
  // Paste the single scraper/helper key + URL you run (or the one you buy).
  BOT_API_KEY: '',           // shared key your gateway uses
  GATEWAY_URL: '',           // your gateway base, e.g. https://bempsx-gtw.onrender.com

  // Alternative: per-service helper keys (if you use them instead of a gateway)
  INSTAGRAM_KEY: '', TIKTOK_KEY: '', YOUTUBE_KEY: '', TWITTER_KEY: '',
  SPOTIFY_KEY: '', FACEBOOK_KEY: '', APISCRIPT_KEY: '',

  /* ── Optional extras ─────────────────────────────────────────── */
  OPENWEATHER_API_KEY: '',   // else free Open-Meteo is used

  /* ── Session site (baked so forks only set SESSION_ID + OWNER_NUMBER) ── */
  SESSION_API: 'https://bempsx-md-session.onrender.com',
}
