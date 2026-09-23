/**
/**
 * test-run.mjs — live smoke test of the REAL command pipeline.
 * Also asserts the plugin registry has no unresolved conflicts.
 */
import { onMessage } from './src/handlers/message.js'
import { loadPlugins, getRegistryReport } from './src/plugins/index.js'

const SKIP_NETWORK = process.env.SKIP_NETWORK === '1' ||
                     process.env.NODE_ENV === 'test'
const SKIPPED = []

// ── registry integrity check ──────────────────────────────────
await loadPlugins()
const report = getRegistryReport()
console.log(`[registry] ${report.total} plugins across ${report.categories} categories from ${report.files} files`)
if (report.duplicateNames.length) {
  console.error(`[registry] ❌ ${report.duplicateNames.length} duplicate NAME(s):`)
  for (const d of report.duplicateNames) console.error(`   • "${d.name}" — kept ${d.kept}, dropped ${d.dropped}`)
}
if (report.duplicateAliases.length) {
  console.warn(`[registry] ⚠️  ${report.duplicateAliases.length} duplicate ALIAS(es):`)
  for (const d of report.duplicateAliases) console.warn(`   • "${d.alias}" — kept by ${d.kept.name} (${d.kept.file}), dropped from ${d.dropped}`)
}
// Fail the run if any NAMES collide (they shouldn't after Phase 1).
if (report.duplicateNames.length) process.exit(1)

// ... rest of your existing test-run.mjs ...
// ── fake socket that records sends ─────────────────────────────
const sent = []
const sock = {
  user: { id: '2348012345678:1@c.us' },
  sendMessage: async (jid, content, opts = {}) => {
    sent.push({ jid, content, opts })
    return { key: {} }
  },
  groupParticipantsUpdate: async () => sent.push({ gpu: true }),
  groupMetadata: async () => ({ subject: 'Test Group', owner: '2348012345678@s.whatsapp.net', participants: [
    { id: '2349000000001@s.whatsapp.net' }, { id: '2349000000002@s.whatsapp.net' },
  ] }),
  groupAdd: async () => [{}],
  groupSettingUpdate: async () => sent.push({ gsu: true }),
  groupInviteCode: async () => 'ABC-123',
  groupLeave: async () => sent.push({ leave: true }),
  updateBlockStatus: async () => sent.push({ block: true }),
  fetchBlocklist: async () => ['123@s.whatsapp.net'],
  chatModify: async () => sent.push({ modify: true }),
  profilePictureUrl: async () => 'https://example.com/a.jpg',
  updateProfilePicture: async () => sent.push({ pp: true }),
  updateProfileStatus: async () => sent.push({ status: true }),
  downloadMediaMessage: async () => Buffer.from('fake-image-bytes'),
  sendPresenceUpdate: async () => sent.push({ presence: true }),
  groupCreate: async (name, parts) => ({ gid: '123@g.us' }),
  groupUpdateSubject: async () => sent.push({ gsub: true }),
  groupUpdateDescription: async () => sent.push({ gdesc: true }),
  groupRevokeInvite: async () => sent.push({ revoke: true }),
  removeProfilePicture: async () => sent.push({ rmpp: true }),
  getStatus: async () => ({ status: 'enjoying BempsX' }),
  sendReadReceipt: async () => sent.push({ read: true }),
  groupAcceptInvite: async () => sent.push({ join: true }),
  updateProfileStatus: async () => sent.push({ status: true }),
}

// ── build a Baileys message from text ──────────────────────────
const msg = (text, extra = {}) => ({
  key: { remoteJid: extra.jid || '2349000000001@s.whatsapp.net', fromMe: false },
  message: {
    conversation: text,
    ...(extra.quotedImage ? {
      extendedTextMessage: { text, contextInfo: { quotedMessage: { imageMessage: { url: 'x' } } } },
    } : {}),
  },
})

const jid = '2348000000001@g.us' // a group

const tests = []
const run = async (cmd, text, { jid: j = jid, group = true, sender = '2349000000001@s.whatsapp.net' } = {}) => {
  const m = msg(text, { jid: j, ...(sender ? {} : {}) })
  // patch sender
  m.key.participant = sender
  try {
    const before = sent.length
    await onMessage(sock, m, j, group)
    const produced = sent.length > before
    tests.push({ cmd, ok: produced, err: null })
  } catch (e) {
    tests.push({ cmd, ok: false, err: e.message })
  }
}

// ── run many commands through the real pipeline ────────────────
const cmds = [
  '.menu', '.ping', '.info',
  '.weather Lagos', '.currency 100 USD NGN', '.define hello', '.wiki baileys',
  '.shorten https://github.com/MykelGoal', '.catfact', '.qr hello',
  '.balance', '.top', '.work', '.daily', '.gamble 5', '.slots 5', '.shop', '.buy nokia',
  '.promote', '.demote', '.kick', '.tagall hello', '.ginfo', '.poll Q | a | b',
  '.warn', '.warnlist', '.ban', '.unban',
  '.ai hello', '.summarize text', '.translate ig hello',
  '.sticker', '.toimage', '.tovideo', '.bass',
  '.tiktok https://x.com', '.instagram https://x.com',
  '.hug friend', '.kiss', '.slap', '.dice', '.flipcoin', '.8ball should i?',
  '.choose a | b | c', '.lovescore you me', '.rate pizza', '.truth',
  '.book harry potter', '.github octocat', '.npm axios', '.advice', '.fact',
  '.anime naruto', '.animequote', '.topanime', '.manga one piece',
  '.calc 2+2*5', '.addnote work note', '.getnote work', '.allnotes', '.delnote work',
  '.random 1 100', '.time', '.biner hi', '.unbiner 01101000',
  '.vv', '.vvpr', '.waifu', '.neko', '.animereac hug',
  '.locate 6.5244 3.3792', '.dev',
  '.beg', '.bank', '.deposit 50', '.withdraw 10', '.loan 100', '.payloan',
  '.setvar BOT_NAME BEMPSX-NOVA', '.getvar BOT_NAME', '.allvar', '.mode public',
  '.textmaker', '.neonlight BEMPSX-NOVA', '.rainbow hello',
  '.wasted', '.jailbars', '.rip-meme', '.wanted', '.stonks', '.carbon const x=1',
  // group auto-mods + toggles
  '.mute', '.unmute', '.lock', '.unlock', '.kickall', '.kickr', '.tag hello', '.invite',
  '.goodbye', '.welcome', '.antilink', '.antiword on', '.antibot', '.antispam', '.antitag',
  // bot / process
  '.stats', '.uptime', '.runtime', '.owner', '.alwaysonline',
  // user
  '.pp', '.setname BempsX', '.bio hello', '.blocklist',
  // tools
  '.afk brb', '.readmore a | b', '.mention hey', '.font bold hello', '.quote', '.device', '.tts hello',
  // economy extra
  '.fish', '.mine', '.crime', '.coinflip 5 heads', '.dice 5 3', '.rps 5 rock', '.networth', '.streak', '.sell nokia', '.poor',
  // fun extra
  '.joke', '.pickupline', '.ship alice bob', '.insult', '.emojimix 😀 😎', '.country nigeria', '.crypto bitcoin',
  // game
  '.ttt @2349000000002', '.guess', '.trivia', '.hangman v', '.delttt', '.delhangman',
  // search / downloader
  '.websearch baileys', '.img cat', '.wallpaper nature', '.gitclone mykelgoal/bempsx-md-bot',
  '.play hello', '.video https://example.com', '.lyrics coldplay yellow',
  // anime extra
  '.airing', '.character naruto', '.animegif', '.animenews naruto',
  // AI models + keys
  '.gemini hi', '.gpt hi', '.deepseek hi', '.groq hi', '.mistral hi', '.cohere hi', '.coder fix this', '.chatbot hello', '.grammar teh cat', '.aisearch BempsX',
  '.setkey gemini ABC', '.delkey gemini',
  // privacy / user
  '.lastseen', '.online', '.mypp', '.mystatus', '.read', '.presence available', '.pinchat', '.unpinchat', '.archive', '.unarchive', '.mute-chat 1',
  // group admin
  '.creategc Test Group | 2349000000001', '.gcstatus', '.gname NewName', '.gdesc hello', '.gpp', '.removepp', '.revoke', '.tkick @2349000000002', '.listadmin', '.listonline', '.listoffline', '.mute-user @2349000000002', '.unmute-user @2349000000002', '.groupguard', '.antigm', '.antigcstatus', '.antiedit',
  // tools custom
  '.setcmd bake|hello $1', '.listcmd', '.delcmd bake',
  // utils
  '.tinyurl https://example.com', '.rolldice', '.areact 👍', '.quotedinfo', '.element fe',
  // bot control
  '.ignore @2349000000002', '.p-status', '.startupmsg Hello', '.cmdreact', '.autotyping', '.rejectcall', '.antidelete', '.reload', '.update',
  // bot moderation
  '.setsudo @2349000000002', '.delsudo @2349000000002', '.getsudo', '.banlist', '.setmod @2349000000002', '.getmods', '.allow', '.akick', '.events', '.permit', '.gfilter', '.listfilters',
  // fun zoo
  '.bible', '.fox', '.duck', '.meow', '.woof', '.pokemon pikachu', '.ngl Am I cool?', '.urban word', '.wyr',
  // economy casino
  '.bankrob', '.bankupgrade', '.blackjack 5', '.economy', '.tax 1',
  // image filters
  '.black', '.white', '.compress', '.exif', '.photo', '.wm BempsX', '.circlestk', '.gif',
  // search focus
  '.ytsearch lofi', '.ytinfo https://youtu.be/x', '.imageinfo', '.imageinfo', '.mediafire x', '.gdrive x', '.pint x',
  // reset / join / forward
  '.reset',
  // utils final
  '.plugin', '.qrcode hi', '.quoted', '.reactions 👍', '.forward 2349000000002', '.gift @2349000000002 5', '.privacy', '.savestatus hello', '.statusinfo', '.likestatus', '.join https://chat.whatsapp.com/ABC', '.delallnote', '.reasoning 2+2',
  // banner / ownership
  '.wall', '.whoami', '.guard',
]

const NETWORK_COMMANDS = new Set([
  '.tiktok https://x.com', '.instagram https://x.com', '.play hello',
  '.video https://example.com', '.lyrics coldplay yellow', '.mediafire x',
  '.gdrive x', '.pint x', '.ytsearch lofi', '.ytinfo https://youtu.be/x',
  '.weather Lagos', '.crypto bitcoin', '.book harry potter', '.github octocat',
  '.npm axios', '.anime naruto', '.animequote', '.topanime', '.manga one piece',
  '.airing', '.character naruto', '.animegif', '.animenews naruto', '.advice',
  '.fact', '.catfact', '.quote', '.joke', '.pickupline', '.country nigeria',
  '.bible', '.fox', '.duck', '.meow', '.woof', '.pokemon pikachu', '.urban word',
  '.websearch baileys', '.img cat', '.wallpaper nature', '.gitclone mykelgoal/bempsx-md-bot',
  '.tinyurl https://example.com', '.define hello', '.wiki baileys', '.currency 100 USD NGN',
  '.shorten https://github.com/MykelGoal', '.ai hello', '.summarize text', '.translate ig hello',
  '.coder fix this', '.chatbot hello', '.grammar teh cat', '.aisearch BempsX', '.gemini hi',
  '.gpt hi', '.deepseek hi', '.groq hi', '.mistral hi', '.cohere hi', '.reasoning 2+2',
  '.imagine a cat', '.qr hello', '.qrcode hi',
])

for (const c of cmds) {
  if (SKIP_NETWORK && NETWORK_COMMANDS.has(c)) {
    SKIPPED.push(c)
    continue
  }
  await run(c, c)
}

// DM route (menu fallback)
await run('.menu (dm)', '.menu', { jid: '2349000000001@s.whatsapp.net', group: false })

// report
let pass = 0, fail = 0
for (const t of tests) {
  const mark = t.ok ? '✓' : '✗'
  if (t.ok) pass++; else fail++
  console.log(`${mark} ${t.cmd}${t.err ? `  →  ${t.err}` : ''}`)
}
console.log(`\n${pass} passed, ${fail} failed`)
const failed = tests.filter((t) => !t.ok).map((t) => t.cmd)
if (failed.length) console.log('FAILED:', failed.join(', '))

if (SKIPPED.length) {
  console.log(`\n⏭  ${SKIPPED.length} network command(s) skipped (SKIP_NETWORK=1):`)
  console.log('   ' + SKIPPED.join(', '))
}

if (SKIP_NETWORK && fail > 0) {
  const realFailures = tests.filter((t) => !t.ok && !SKIPPED.includes(t.cmd))
  if (realFailures.length === 0) {
    console.log('\n✅ All offline-testable commands passed.')
    process.exit(0)
  }
  console.log(`\n❌ ${realFailures.length} non-network failure(s):`)
  for (const t of realFailures) console.log(`   • ${t.cmd} → ${t.err}`)
  process.exit(1)
}

process.exit(fail ? 1 : 0)
