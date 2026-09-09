import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { createInterface } from 'node:readline'
import test from 'node:test'

const root = resolve(import.meta.dirname, '..')

test('starts the MCP stdio transport and answers initialize', { timeout: 12_000 }, async (t) => {
  const projectRoot = await mkdtemp(join(tmpdir(), 'aiwg-droid-bridge-test-'))
  const child = spawn(process.execPath, ['server.js'], {
    cwd: root, stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, DROID_PROJECT_ROOT: projectRoot }
  })
  const closed = new Promise(resolve => child.once('close', resolve))
  const lines = createInterface({ input: child.stdout })
  let stderr = ''
  child.stderr.setEncoding('utf8')
  child.stderr.on('data', data => { stderr = (stderr + data).slice(-16_000) })
  t.after(async () => {
    lines.close()
    child.stdin.end()
    const hardStop = setTimeout(() => child.kill('SIGKILL'), 1_000)
    try {
      child.kill('SIGTERM')
      await closed
    } finally {
      clearTimeout(hardStop)
      await rm(projectRoot, { recursive: true, force: true })
    }
  })

  const request = JSON.stringify({
    jsonrpc: '2.0', id: 1, method: 'initialize',
    params: { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'test', version: '1' } }
  })
  let timer
  try {
    const response = await new Promise((resolve, reject) => {
      timer = setTimeout(() => reject(new Error(`Timed out waiting for initialize response; stderr: ${stderr}`)), 5_000)
      child.once('error', reject)
      child.stdin.once('error', reject)
      child.once('close', (code, signal) => reject(new Error(`Server closed before initialize response (${code ?? signal}); stderr: ${stderr}`)))
      lines.once('line', line => {
        try { resolve(JSON.parse(line)) } catch (error) { reject(error) }
      })
      child.stdin.write(`${request}\n`)
    })
    assert.deepEqual(response, {
      jsonrpc: '2.0', id: 1,
      result: {
        protocolVersion: '2025-11-25', capabilities: { tools: {} },
        serverInfo: { name: 'droid-mcp-server', version: '2.0.0' }
      }
    })
  } finally {
    clearTimeout(timer)
  }
})
