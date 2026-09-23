# BempsX-Nova Session Server

A tiny self-hosted service that issues **short session codes** so users don't
have to paste 2 KB of base64 into `.env`.

## Why

Long self-contained session IDs (`BEMPSX~gzip+base64`) work but:
- They're unwieldy to copy/paste.
- They're easy to fat-finger.
- Every redeploy needs the whole blob again.

Short codes (`BEMPSX-K7M2-9XPQ`) solve this: pair once on a helper machine,
POST the creds to the session server, get a short code back, then paste that
code into any deployment's `SESSION_ID`.

## Deploy Once

```bash
# 1. Generate an admin token
npm run session:gen-token
# → prints a 64-char hex string; save it somewhere safe

# 2. Start the server
ADMIN_TOKEN=<the-hex-string> \
SESSION_PORT=8022 \
DATABASE_URL=   # empty = local JSON in ./data/sessions.json
node servers/session-server.js