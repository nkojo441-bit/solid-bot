# Solid Bot

A modular, multi-device WhatsApp bot built with Node.js and Baileys. It is designed for group management, automation, AI-powered interactions, media processing, and extensible command plugins.

<div align="center">
  <img src="assets/bempsx-md.png" alt="Solid Bot menu" width="1000" />
</div>

<div align="center">

![WhatsApp Bot](https://img.shields.io/badge/WhatsApp-Multi%20Device-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20-339933?style=for-the-badge&logo=node.js&logoColor=white)
![Baileys](https://img.shields.io/badge/Baileys-WhatsApp%20Socket-000000?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

</div>

## Overview

This project is a full-featured WhatsApp companion bot for group chats and personal automation. It ships with an auto-loading plugin architecture, optional AI providers, media utilities, group moderation controls, and flexible deployment options.

The bot is built to be easy to extend: new behaviors can be added by dropping a plugin into `src/plugins`, without having to wire up command registration manually.

## Highlights

- Multi-device WhatsApp support via Baileys
- Auto-loaded modular plugins
- Group moderation and anti-link controls
- AI provider support (`gemini`, `openai`, `deepseek`, `groq`, `mistral`, `cohere`, `together`)
- Media conversion, download, and image processing helpers
- Fun commands, games, economy features, and utility tools
- Optional database backends: MongoDB, PostgreSQL, MySQL
- Session pairing flow with saved WhatsApp credentials
- Local JSON fallback when a database is not configured

## Tech Stack

- JavaScript / ES modules
- Node.js 20+
- Baileys
- dotenv for environment config
- Optional database drivers for MongoDB, PostgreSQL, and MySQL
- ffmpeg-static and sharp for media handling

## Project Structure

```text
solid-bot/
├── index.js                  # bot startup and lifecycle
├── settings.js               # runtime settings / env config
├── .env.example              # environment template
├── assets/                   # branding and static assets
├── src/
│   ├── apis/                 # API integrations and helpers
│   ├── config/               # configuration helpers
│   ├── core/                 # socket lifecycle and system runtime
│   ├── handlers/             # message and group event handlers
│   ├── lib/                  # shared logic, storage, secrets, banners, etc.
│   └── plugins/              # auto-loaded plugins by category
├── scripts/                  # setup, testing, and maintenance utilities
├── servers/                  # local server helpers and session utilities
├── deploy/                   # deployment assets and environment helpers
├── docs/                     # documentation and notes
├── package.json              # project scripts and dependencies
├── test-run.mjs              # smoke test runner
├── agent-test.mjs            # agent verification script
├── README.md                 # project documentation
├── .gitignore
├── .env.example
└── LICENSE                   # if present in your branch
```

## Prerequisites

- Node.js 20 or newer
- npm
- A WhatsApp account for pairing or session authentication
- Optional API keys for AI and other provider features

## Quick Start

```bash
git clone https://github.com/nkojo441-bit/solid-bot.git
cd solid-bot
npm install
cp .env.example .env
```

Then edit `.env` and set at least the essentials:

```env
OWNER_NUMBER=233500835166
SESSION_ID=
SESSION_API=
AI_PROVIDER=gemini
GEMINI_API_KEY=
```

Start the bot:

```bash
npm start
```

For a phone-number pairing flow instead of a stored session:

```bash
npm run pair
```

## Configuration

The bot reads runtime values from `.env`, with defaults provided in `.env.example`.

### Common environment variables

| Variable | Purpose |
| --- | --- |
| `OWNER_NUMBER` | Primary owner number used for admin controls |
| `PAIRING_NUMBER` | Optional prefilled number during pairing |
| `SESSION_ID` | Saved WhatsApp session identifier |
| `SESSION_API` | Session server URL for short session workflows |
| `AI_PROVIDER` | Provider selection such as `gemini`, `openai`, or `groq` |
| `GEMINI_API_KEY` / `OPENAI_API_KEY` | API credentials for AI features |
| `DATABASE_URL` | Optional MongoDB/PostgreSQL/MySQL connection string |
| `ANTI_LINK` | Enables link blocking behavior |
| `WELCOME` | Enables group welcome messages |
| `AUTO_READ` | Automatically marks incoming messages as read |
| `PORT` | App server port |
| `LOG_LEVEL` | Logging verbosity |

For the full list, review `.env.example` before production deployment.

## Pairing and Sessions

The project supports multiple session strategies:

1. Interactive pairing via `npm run pair`
2. Saved session ID and session server API values
3. Local session credentials generated during a successful link flow

If the session becomes invalid or stale, clear it and pair again:

```bash
npm run reset-session
npm run pair
```

When pairing, enter the WhatsApp number in international format without spaces, plus signs, or dashes.

## Available Functionality

The repository includes a broad plugin set covering many day-to-day bot tasks. Some examples include:

- AI and assistant commands
- Media converters and editors
- Downloader utilities
- Group management tools
- Game and social commands
- Utility commands and text transformations
- Economy, leaderboard, and stats features
- Privacy and chat control options

## Useful Scripts

```bash
npm start                 # start the bot
npm run dev               # run with file watching
npm run pair               # pair a device with WhatsApp
npm run reset-session      # clear stored session data
npm run test               # run automated project tests
npm run lint               # lint the project
npm run test:smoke         # smoke tests
npm run session:serve      # serve session-related helpers
```

## Development Notes

- New commands can be added by creating a plugin file under `src/plugins`.
- The plugin loader automatically discovers `.js` files and registers them on boot.
- Plugin categories are inferred from the folder structure unless explicitly set in the exported object.
- The project supports local JSON storage by default when no database is configured.

## Deployment

The project includes deployment support for common hosting providers and container workflows. The repo contains deployment-related files under `deploy/`, and the project is ready for containerized or remote deployment.

## Security and Best Practices

- Never commit `.env` files with live credentials
- Protect API keys and session tokens
- Use a dedicated WhatsApp number for bots when possible
- Review and restrict any admin controls exposed to group owners

## License

This project is distributed under the MIT license, as defined in the package metadata.

## Contributing

Contributions are welcome. If you’re improving functionality, commands, or documentation:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run the relevant tests or smoke checks
5. Open a pull request with a clear summary

## Support

If you run into pairing or session issues, review the project’s pairing troubleshooting notes and verify your environment variables before restarting the bot.

---

Built for flexible WhatsApp automation, group features, and easy extensibility.
