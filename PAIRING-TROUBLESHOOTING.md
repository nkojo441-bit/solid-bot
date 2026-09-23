# WhatsApp pairing troubleshooting

## Clean pairing

Use a fresh pairing attempt:

```powershell
npm run pair
```

The pairing command automatically clears the local `session/` directory before creating the socket. It is deliberately separate from `index.js` so plugin loading, database startup, HTTP servers, and bot handlers cannot block pairing.

## Phone number

Use international digits only:

```text
233500835166
```

Do not use:

```text
+233500835166
+233 500 835 166
(233) 500-835-166
```

## If no code appears

The terminal should show these stages:

1. `Old pairing session cleared.`
2. `Creating a dedicated WhatsApp pairing socket…`
3. `WhatsApp connection: connecting…`
4. `WhatsApp socket is ready; requesting pairing code…`
5. `PAIRING CODE: XXXX-XXXX`

If it stops before stage 3, the local Node/Baileys socket could not start.
If it stops between stages 3 and 4, check the computer's internet/firewall/proxy access to WhatsApp.
If stage 5 appears but WhatsApp refuses the code, the problem is at the WhatsApp account/linking handshake rather than terminal input.


## v4 pairing runtime

The pairing command uses a dedicated `baileys-pairing` alias pinned to the current official v7 release candidate so the bot's legacy Baileys dependency is not changed. It also attempts to read the current WhatsApp Web revision with a 10-second timeout. Pairing requests are serialized: exactly one code is requested per socket/session.

If WhatsApp returns 401/logged-out immediately after a code is displayed, the client has reached the WhatsApp login stage but the server rejected the companion login. Repeatedly generating codes is intentionally avoided because pairing state must remain consistent through the full lifecycle.
