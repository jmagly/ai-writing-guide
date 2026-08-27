import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { resolve } from 'node:path'
import test from 'node:test'

const root = resolve(import.meta.dirname, '..')

test('starts the MCP stdio transport and answers initialize', async (t) => {
  const child = spawn(process.execPath, ['server.js'], { cwd: root, stdio: ['pipe', 'pipe', 'pipe'] })
  t.after(() => child.kill('SIGTERM'))

  const request = JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'test', version: '1' } }
  })
  child.stdin.write(`${request}\n`)

  const timeout = setTimeout(() => child.kill('SIGTERM'), 5_000)
  const [data] = await once(child.stdout, 'data')
  clearTimeout(timeout)
  const response = JSON.parse(String(data).trim())
  assert.equal(response.id, 1)
  assert.equal(response.result.serverInfo.name, 'droid-mcp-server')
})
