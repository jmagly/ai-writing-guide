import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { injectLegacyContext, LEGACY_INJECT_END, LEGACY_INJECT_START } from '../../../src/smiths/context-pipeline/legacy-inject.js';

const roots: string[] = [];
afterEach(async () => Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))));

async function fixture(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'aiwg-legacy-inject-'));
  roots.push(root);
  return root;
}

describe('legacy full injection', () => {
  it('creates a marker-delimited Codex compatibility file', async () => {
    const root = await fixture();
    const result = await injectLegacyContext('codex', root, '# Framework\n\nGenerated context.');
    const content = await readFile(join(root, 'AGENTS.md'), 'utf8');
    expect(result.changed).toHaveLength(1);
    expect(content).toContain(LEGACY_INJECT_START);
    expect(content).toContain('Generated context.');
    expect(content).toContain(LEGACY_INJECT_END);
  });

  it('preserves operator prose, removes the canonical hook, and creates a backup', async () => {
    const root = await fixture();
    await writeFile(join(root, 'AGENTS.md'), [
      '# Team Rules', '', 'Keep this.', '', '<!-- AIWG:context-hook:start -->',
      '@WORKSPACE.md', '@AIWG.md', '<!-- AIWG:context-hook:end -->', '',
    ].join('\n'));
    const result = await injectLegacyContext('codex', root, '# Framework');
    const content = await readFile(join(root, 'AGENTS.md'), 'utf8');
    expect(content).toContain('Keep this.');
    expect(content).not.toContain('@WORKSPACE.md');
    expect(result.backups).toHaveLength(1);
  });

  it('is idempotent and dry-run does not write', async () => {
    const root = await fixture();
    const dry = await injectLegacyContext('codex', root, '# Framework', { dryRun: true });
    expect(dry.changed).toHaveLength(1);
    await expect(readFile(join(root, 'AGENTS.md'), 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
    await injectLegacyContext('codex', root, '# Framework');
    const repeated = await injectLegacyContext('codex', root, '# Framework');
    expect(repeated.changed).toEqual([]);
  });
});
