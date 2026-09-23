<div align="center">

<!-- HERO BANNER -->
<img src="assets/bempsx-md.png" alt="BempsX-Nova" width="100%" />

<!-- ANIMATED LIVE DOT -->
<p>
  <img src="https://img.shields.io/badge/-online-25D366?style=for-the-badge" alt="online" height="22" />
  &nbsp;
  <code><b>MykelGoal</b> = <b>BEMPSX</b> · 🇳🇬</code>
  &nbsp;
  <img src="https://img.shields.io/badge/version-2.0.0-39ff14?style=for-the-badge" alt="v2" height="22" />
</p>

<div>
  <img src="https://img.shields.io/badge/commands-389%2B-9b5de5?style=for-the-badge" alt="commands" height="26"/>
  <img src="https://img.shields.io/badge/categories-19-ff5c8a?style=for-the-badge" alt="categories" height="26"/>
  <img src="https://img.shields.io/badge/node-%3E%3D20-blue?style=for-the-badge&logo=node.js" alt="node" height="26"/>
  <img src="https://img.shields.io/badge/whatsapp-multi--device-25D366?style=for-the-badge&logo=whatsapp" alt="wa" height="26"/>
</div>

<br/>

> ## 🐍 **"The snake that bites back — real commands, no fakes."**

</div>

---

## ✦ What Is **BempsX-Nova**?

**BempsX-Nova** is a **production-grade, multi-device WhatsApp bot** built on the modern **Baileys** engine. It ships with **389+ real commands** across **19 categories** — clean modular code, one central config, honest output, free APIs.

It's built like a real dev builds it. Not a spaghetti clone.

---

## ⁉️ Why It's Different

| | 🐍 **BempsX-Nova** | 🧟 Typical copied bots |
|---|---|---|
| **Real commands** | Every command does what it says | Stub / placeholder replies |
| **Modular** | `plugins/` + `lib/` + `apis/` | One giant file |
| **Keys** | Baked-in → forks need **2 fields** | Users sign up for 5 services |
| **Honest** | "Set YOUTUBE_KEY to enable" — never fakes | Fakes a "download" |
| **Cost** | **All free** | Paid API quota |

---

## 🚀 One-Click Deploy

<div align="center">

&nbsp;
<a href="https://railway.app/new/template?template=">
  <img src="https://railway.app/button.svg" alt="Deploy on Railway" width="180" />
</a>
&nbsp;
<br/><br/>

<a href="https://heroku.com/deploy?template=">
  <img src="https://www.herokucdn.com/deploy/button.svg" alt="Deploy to Heroku" width="180" />
</a>
&nbsp;
<a href="https://fly.io/launch">
  <img src="https://img.shields.io/badge/deploy%20on-fly.io-7d3cff?style=for-the-badge&logo=flydotio&logoColor=white" alt="Fly.io" height="58" />
</a>
&nbsp;
<a href="https://hub.docker.com">
  <img src="https://img.shields.io/badge/docker-0db7ed?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" height="58" />
</a>

</div>

---

## ⚡ Quick Start

> **Fork → set 2 values → run.** That's literally it.

```bash
# 1. Clone
git clone 
cd bempsx-nova-bot

# 2. Install (auto-fetches FREE yt-dlp — no paid downloader key)
npm install

# 3. Configure — OWNER_NUMBER is required for owner controls; pairing asks separately for the bot number
cp .env.example .env
```

Open `.env` → set ⭐ **`OWNER_NUMBER`** and, when using a saved session, **`SESSION_ID`**. For AI commands, also set the API key for the selected **`AI_PROVIDER`**.

```bash
# 4. Run
npm start
```

> 🧪 Want a **pairing code** instead of a session string?
> ```bash
> npm run pair
> ```

> **If pairing does not work:** make sure no old `session/` directory is being reused, then run:
> ```bash
> npm run reset-session
> npm run pair
> ```
> Enter the WhatsApp number with the country code and **digits only** (for example `233500835166`). The pairing startup no longer depends on a separate Baileys version lookup, so it can proceed even when that lookup is blocked or hangs.
> On WhatsApp open **Settings → Linked devices → Link a device → Link with phone number**, then enter the code printed by the bot.
> Keep the bot process running until it reports `Connected`.

---

## 🗺️ Command Browser — 389+ Commands

<details>
<summary><b>🤖 AI & Gemini — 17</b></summary>

`ai` `aistatus` `summarize` `translate` `imagine` `aisearch` `chatbot` `coder` `cohere` `deepseek` `gemini` `gpt` `grammar` `groq` `mistral` `together` `reasoning`

> `.ai anything` · `.imagine a cyberpunk city` · `.coder write a risk game`
</details>

<details>
<summary><b>🎭 Anime — 28</b></summary>

`anime` `animequote` `manga` `topanime` `airing` `animegif` `animenews` `animerec` `character` `animereac` `neko` `hug` `kiss` `pat` `slap` `smug` `cuddle` `tickle` `feed` `punch` `cry` `laugh` `happy` `sad` `angry` `baka` `awoo` `waifu`
</details>

<details>
<summary><b>⚙️ Bot — 33</b></summary>

`alwaysonline` `owner` `restart` `runtime` `shutdown` `stats` `uptime` `antidelete` `autotyping` `cmdreact` `ignore` `p-status` `rejectcall` `reload` `startupmsg` `update` `akick` `allow` `allow-gcadd` `antieditinfo` `banlist` `delmod` `delsudo` `events` `getmods` `getsudo` `gfilter` `listfilters` `permit` `reset` `setmod` `setsudo`
</details>

<details>
<summary><b>🎛️ Config — 7</b></summary>

`allvar` `delvar` `getvar` `mode` `setvar` `delkey` `setkey`

> ⭐ `.setvar KEY value` changes settings **live**, no redeploy.
</details>

<details>
<summary><b>🔧 Converter — 23</b></summary>

`doc` `ptv` `take` `tomp3` `tovn` `sticker` `toimage` `bass` `vibrato` `robot` `echo` `chipmunk` `slow` `fast` `nightcore` `fat` `squirrel` `8d` `tovideo` `vv` `vvpr` `pdf` `tovv`
</details>

<details>
<summary><b>📣 Core — 6</b></summary>

`guard` `wall` `whoami` `info` `menu` `ping`
</details>

<details>
<summary><b>⬇️ Downloaders — 14</b></summary>

`lyrics` `play` `video` `tiktok` `instagram` `youtube` `twitter` `spotify` `facebook` `mediafire` `gdrive` `pint` `apk` `shazam`

> **Free** via bundled `yt-dlp`. `.play <song>` = audio, `.video <url>` = video.
</details>

<details>
<summary><b>💰 Economy — 39</b></summary>

`bank` `beg` `deposit` `loan` `payloan` `rob` `withdraw` `bankrob` `bankupgrade` `blackjack` `economy` `tax` `addmoney` `coinflip` `crime` `dice` `fish` `mine` `networth` `poor` `resetecon` `rps` `sell` `streak` `casino` `heist` `hunt` `profile` `toprank` `balance` `daily` `gamble` `give` `slots` `top` `work` `buy` `inventory` `shop`

> Full persistent economy — wallets, banks, loans, jobs, shop, heists, blackjack, slots.
</details>

<details>
<summary><b>😄 Fun — 53</b></summary>

`lick` `bite` `poke` `pinch` `dance` `wave` `wink` `blush` `pout` `shy` `shrug` `stare` `mad` `cool` `scared` `nervous` `confused` `sleep` `yawn` `thumbsup` `facepalm` `celebrate` `clap` `thanks` `love` `handhold` `evillaugh` `dare` `smack` `brofist` `fist` `country` `crypto` `emojimix` `insult` `joke` `pickupline` `ship` `choose` `8ball` `flipcoin` `lovescore` `rate` `truth` `bible` `duck` `fox` `meow` `ngl` `pokemon` `urban` `woof` `wyr`
</details>

<details>
<summary><b>🎮 Game — 6</b></summary>

`ttt` `delttt` `guess` `hangman` `delhangman` `trivia`

> Real in-chat games: Tic-Tac-Toe, Hangman, Guess-the-number, Trivia.
</details>

<details>
<summary><b>👥 Group — 46</b></summary>

`antiedit` `antieditchat` `antigcstatus` `antigm` `creategc` `gcstatus` `gdesc` `gname` `gpp` `groupguard` `listadmin` `listoffline` `listonline` `mute-user` `removepp` `revoke` `tkick` `unmute-user` `antibot` `antiword` `antispam` `antitag` `antilink` `add` `demote` `ginfo` `kick` `poll` `promote` `tagall` `ban` `unban` `unwarn` `warn` `warnlist` `goodbye` `invite` `kickall` `kickr` `leave` `lock` `mute` `tag` `unlock` `unmute` `welcome`
</details>

<details>
<summary><b>🎨 Image & Effects — 28</b></summary>

`black` `circlestk` `compress` `exif` `gif` `mp4` `photo` `roundstk` `white` `wm` `carbon` `wasted` `rip-meme` `trigger-meme` `rainbow` `mnm` `jailbars` `stonks` `wanted` `greyscale` `sepia` `negate` `pixelate` `blur` `invert` `rotate` `flop` `enhance`
</details>

<details>
<summary><b>🧾 Misc & Search — 12</b></summary>

`advice` `fact` · `imageinfo` `ytinfo` `ytsearch` `gitclone` `img` `wallpaper` `websearch` `book` `github` `npm`
</details>

<details>
<summary><b>🔐 Privacy — 12</b></summary>

`archive` `delete` `lastseen` `mute-chat` `mypp` `mystatus` `online` `pinchat` `presence` `read` `unarchive` `unpinchat`
</details>

<details>
<summary><b>✨ Textmaker — 8</b></summary>

`textmaker` `neonlight` `hacker` `glitch` `galaxy` `fire` `gaming` `metallic`

> Real SVG + sharp text art — no external image API.
</details>

<details>
<summary><b>🧰 Tools — 21</b></summary>

`qr` `dev` `locate` `delcmd` `delcmds` `listcmd` `setcmd` `afk` `font` `getdevice` `mention` `msgs` `quote` `readmore` `tts` `catfact` `currency` `define` `shorten` `weather` `wiki`
</details>

<details>
<summary><b>👤 User — 8</b></summary>

`bio` `block` `blocklist` `clearchat` `pp` `setname` `setpp` `unblock`
</details>

<details>
<summary><b>📙 Utils — 28</b></summary>

`addnote` `allnotes` `delnote` `getnote` `biner` `calc` `ip` `jid` `random` `time` `unbiner` `delallnote` `forward` `gift` `join` `likestatus` `plugin` `privacy` `qrcode` `quoted` `reactions` `savestatus` `statusinfo` `areact` `element` `quotedinfo` `rolldice` `tinyurl`
</details>

---

## 🛠️ Architecture

```
bempsx-nova-bot/
├── index.js               # boot + lifecycle
├── settings.js            # central config (.env + defaults)
├── .env.example           # complete deployment/local environment template
├── assets/                # branding / images
├── src/
│   ├── apis/              # real API clients (ai, anime, free, downloader, translate)
│   ├── config/keys.js     # ⭐ bake your API keys here (single place)
│   ├── core/              # socket (Baileys) + keeper (health server)
│   ├── handlers/          # command dispatch, message pipeline, group events
│   ├── lib/               # secrets, database, economy, media, textfx, banner…
│   └── plugins/           # ⇢ drop a file → auto-loads (389 commands)
├── scripts/setup.js       # fetches FREE yt-dlp on install
└── deploy/                # render / docker / fly / koyeb / heroku / app.json
```

> **Truly modular:** any `.js` in `src/plugins/` that exports a plugin auto-loads. Zero wiring.

---

## 🔑 Configuration

| Env | Purpose |
|---|---|
| `AI_PROVIDER` | `gemini / groq / openai / …` (default `gemini`) |
| `GEMINI_MODEL` | override the AI model |
| `BOT_API_KEY` / `GATEWAY_URL` | optional one-key gateway |
| `DATABASE_URL` | PostgreSQL/MySQL/Mongo — empty = local JSON |
| `ANTI_LINK` / `WELCOME` / `AUTO_READ` | behaviour toggles |
| `REASSERT_MS` | how often the ownership banner re-prints |

> `.env.example` contains the complete environment template. API keys and session credentials are intentionally blank; do not commit real secrets.

---

## 🚨 Ownership & License

```text
【 BempsX-Nova 】 is the property of MY KEL GOAL (BEMPSX).

Fork users MAY run & deploy it. You may NOT:
  • rename it and claim you built it
  • re-upload the source under your name
  • strip the branding / ownership notice and resell it

The bot re-asserts ownership on deploy, on a timer, and when branding is changed.
```

Distributed free for the community. No warranty. Use responsibly.

---

<div align="center">

### 🐍 Built with 🔥 by **MY KEL GOAL** ( **BEMPSX** )

*BempsX-Nova — not yours, but free for the community.*

</div>

## WhatsApp phone-number pairing

Pairing is intentionally isolated from the main bot startup. `npm run pair` runs `scripts/pair.js`, which clears only the local `session/` directory, asks for the phone number, creates a dedicated Baileys socket, requests one pairing code, and waits for WhatsApp to confirm the link.

```bash
npm run pair
```

Enter the full international number using digits only, for example `233500835166`.
Do not include `+`, spaces, parentheses, or dashes.

After the code appears, use WhatsApp → Settings → Linked devices → Link a device → Link with phone number.

Once the terminal reports `WhatsApp connection opened. Device is linked.`, stop the pairing command and run `npm start`.

The pairing command does not load plugins, the database, the HTTP keep-alive server, AI modules, or the normal message handlers. This keeps pairing independent from the rest of the application.
