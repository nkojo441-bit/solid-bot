/**
 * ping — latency check.
 */
export default {
  name: 'ping',
  aliases: ['p'],
  category: 'core',
  description: 'Check bot response time.',
  run({ sock, jid }) {
    const t = Date.now()
    sock.sendMessage(jid, { text: '🏓 Pong!' }).then(() => {
      const ms = Date.now() - t
      console.log(`[ping] ${ms}ms`)
    })
  },
}
