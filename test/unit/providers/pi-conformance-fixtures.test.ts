import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../../..');
const fixtureRoot = join(root, 'test/fixtures');

function jsonl(name: string): unknown[] {
  return readFileSync(join(fixtureRoot, 'sessions/pi', name), 'utf8')
    .trimEnd()
    .split('\n')
    .map(line => JSON.parse(line));
}

describe('Pi provider conformance fixtures', () => {
  it('pins the audited upstream contract and every trust/runtime surface', () => {
    const manifest = JSON.parse(
      readFileSync(join(fixtureRoot, 'providers/pi/manifest.json'), 'utf8'),
    ) as Record<string, unknown>;
    expect(manifest).toMatchObject({
      upstreamPackage: '@earendil-works/pi-coding-agent',
      upstreamVersion: '0.85.0',
      upstreamCommit: '47236c84450656043dd8fb21c8513d1421505ae3',
      verified: '2026-09-04',
      headlessTrustPolicies: ['--approve', '--no-approve'],
      machineModes: ['print', 'json', 'rpc'],
    });
    const projectResources = manifest.projectResources as string[];
    expect(projectResources).toEqual(expect.arrayContaining([
      'AGENTS.md',
      '.agents/skills/example/SKILL.md',
      '.pi/skills/pi-local/SKILL.md',
      '.pi/prompts/operator.md',
      '.pi/extensions/operator.ts',
      '.pi/settings.json',
    ]));
    for (const path of projectResources) {
      expect(existsSync(join(fixtureRoot, 'providers/pi/project', path))).toBe(true);
    }
    for (const path of manifest.globalResources as string[]) {
      expect(existsSync(join(fixtureRoot, 'providers/pi/global', path))).toBe(true);
    }
    expect(readFileSync(
      join(fixtureRoot, 'providers/pi/project/.pi/settings.json'), 'utf8',
    )).toContain('AIWG tests must preserve this file byte-for-byte.');
    expect(readFileSync(
      join(fixtureRoot, 'providers/pi/project/.pi/extensions/operator.ts'), 'utf8',
    )).toContain('Tests must never execute');
  });

  it('models a v3 append-only tree with branches, compaction, retry evidence, and an opaque entry', () => {
    const entries = jsonl('branched-v3.jsonl') as Array<Record<string, unknown>>;
    expect(entries[0]).toMatchObject({ type: 'session', version: 3 });
    const ids = new Set(entries.slice(1).map(entry => entry.id));
    for (const entry of entries.slice(1)) {
      expect(typeof entry.id).toBe('string');
      expect(entry.parentId === null || ids.has(entry.parentId)).toBe(true);
    }
    expect(entries.map(entry => entry.type)).toEqual(expect.arrayContaining([
      'branch_summary', 'compaction', 'custom', 'future_entry',
    ]));
    expect(entries.find(entry => entry.type === 'custom')).toMatchObject({
      customType: 'aiwg.test.retry',
      data: { attempts: 2, settled: true },
    });
  });

  it('contains only explicitly redacted sensitive values', () => {
    const raw = readFileSync(join(fixtureRoot, 'sessions/pi/redaction-v3.jsonl'), 'utf8');
    expect(raw).toContain('OPENROUTER_API_KEY=[REDACTED]');
    expect(raw).not.toMatch(/sk-or-v1-|Bearer\s+[A-Za-z0-9]/);
    expect(jsonl('redaction-v3.jsonl')).toHaveLength(3);
  });

  it('keeps malformed input isolated as a negative fixture', () => {
    const names = readdirSync(join(fixtureRoot, 'sessions/pi'));
    expect(names.sort()).toEqual([
      'branched-v3.jsonl', 'malformed.jsonl', 'redaction-v3.jsonl',
    ]);
    expect(() => jsonl('malformed.jsonl')).toThrow();
  });
});
