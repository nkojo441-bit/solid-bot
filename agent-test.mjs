import assert from 'node:assert/strict'
import { looksLikeAgentRequest } from './src/agent/agent.js'

const base = { body: '', message: { message: {} } }

assert.equal(looksLikeAgentRequest({ ...base, body: 'what anime is this?' }), true)
assert.equal(looksLikeAgentRequest({ ...base, body: 'hello' }), false)
assert.equal(looksLikeAgentRequest({
  ...base,
  body: '',
  message: { message: { imageMessage: {} } },
}), true)

console.log('AI agent routing tests passed.')
