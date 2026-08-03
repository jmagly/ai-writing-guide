import { chmodSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '../../..')
const gate = join(root, 'tools/ci/wait-for-github-tag.mjs')

function fakeGh(mode: 'retry' | 'lightweight' | 'mismatch' | 'missing') {
  const directory = mkdtempSync(join(tmpdir(), 'aiwg-gh-tag-'))
  const executable = join(directory, 'gh')
  const counter = join(directory, 'count')
  writeFileSync(executable, `#!/bin/sh
count=0
[ ! -f "$COUNT_FILE" ] || count=$(cat "$COUNT_FILE")
count=$((count + 1))
echo "$count" > "$COUNT_FILE"
case "$MODE" in
  retry) [ "$count" -lt 3 ] && exit 1; echo '{"object":{"type":"tag","sha":"abc123"}}' ;;
  lightweight) echo '{"object":{"type":"commit","sha":"def456"}}' ;;
  mismatch) echo '{"object":{"type":"tag","sha":"def456"}}' ;;
  missing) exit 1 ;;
esac
`)
  chmodSync(executable, 0o755)
  return { executable, counter, mode }
}

function runGate(mode: 'retry' | 'lightweight' | 'mismatch' | 'missing', attempts = 3) {
  const fixture = fakeGh(mode)
  const result = spawnSync(process.execPath, [gate, '--repo', 'owner/repo', '--tag', 'v1.2.3', '--expected-sha', 'abc123', '--attempts', String(attempts), '--delay-seconds', '0'], {
    encoding: 'utf8',
    env: { ...process.env, GH_BIN: fixture.executable, COUNT_FILE: fixture.counter, MODE: fixture.mode },
  })
  return { ...result, count: Number(readFileSync(fixture.counter, 'utf8')) }
}

describe('GitHub mirror tag gate', () => {
  it('retries until the annotated tag object exists', () => {
    const result = runGate('retry')
    expect(result.status).toBe(0)
    expect(result.count).toBe(3)
    expect(result.stdout).toContain('Found annotated tag')
  })

  it('rejects a lightweight tag immediately', () => {
    const result = runGate('lightweight')
    expect(result.status).toBe(1)
    expect(result.count).toBe(1)
    expect(result.stderr).toContain('lightweight')
  })

  it('rejects a different annotated tag object', () => {
    const result = runGate('mismatch')
    expect(result.status).toBe(1)
    expect(result.count).toBe(1)
    expect(result.stderr).toContain('expected original signed tag object')
  })

  it('fails after the bounded retry budget', () => {
    const result = runGate('missing', 2)
    expect(result.status).toBe(1)
    expect(result.count).toBe(2)
    expect(result.stderr).toContain('Timed out')
  })

  it('orders the tag gate before verified release creation and guards success output', () => {
    const workflow = readFileSync(join(root, '.gitea/workflows/github-mirror.yml'), 'utf8')
    expect(workflow.indexOf('Wait for operator-pushed signed annotated tag')).toBeLessThan(workflow.indexOf('Create GitHub Release'))
    expect(workflow).toContain('git ls-remote origin "refs/tags/$TAG"')
    expect(workflow).toContain('--expected-sha "$EXPECTED_TAG_OBJECT"')
    expect(workflow).not.toContain('--expected-sha "$(git rev-parse')
    expect(workflow).toContain('--verify-tag')
    expect(workflow).toContain('steps.release.outcome')
  })
})
