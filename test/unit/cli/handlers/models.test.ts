import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { modelsHandler } from '../../../../src/cli/handlers/models.js';

const roots: string[] = [];
async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'aiwg-models-'));
  roots.push(root);
  const agent = path.join(root, 'agentic/code/frameworks/demo/agents/reviewer.md');
  const skill = path.join(root, 'agentic/code/frameworks/demo/skills/check/SKILL.md');
  await mkdir(path.dirname(agent), { recursive: true });
  await mkdir(path.dirname(skill), { recursive: true });
  await writeFile(agent, `---
name: reviewer
description: Review
model: opus
---
Review.
`);
  await writeFile(skill, `---
name: check
description: Check
commandHint:
  model: haiku
---
Check.
`);
  return { root, agent, skill };
}
afterEach(async () => {
  vi.restoreAllMocks();
  const { rm } = await import('node:fs/promises');
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })));
});
async function run(root: string, args: string[]) {
  return modelsHandler.execute({
    args, rawArgs: ['models', ...args], cwd: root, frameworkRoot: root,
  });
}

describe('models CLI handler', () => {
  it('lists and resolves exact skill policy without mutation', async () => {
    const { root, skill } = await fixture();
    const before = await readFile(skill, 'utf8');
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    expect((await run(root, ['resolve', '--skill', 'check', '--provider', 'codex', '--json'])).exitCode)
      .toBe(0);
    const output = JSON.parse(String(log.mock.calls.at(-1)?.[0]));
    expect(output).toHaveLength(1);
    expect(output[0].policy).toMatchObject({ role: 'efficiency', tier: 'economy' });
    expect(output[0].compiled.outcome).toBe('unsupported');
    expect(await readFile(skill, 'utf8')).toBe(before);
  });

  it('supports dry-run and atomic selected skill updates', async () => {
    const { root, skill } = await fixture();
    const before = await readFile(skill, 'utf8');
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    expect((await run(root, [
      'set', '--skill', 'check', '--tier', 'premium', '--provider', 'codex', '--dry-run',
    ])).exitCode)
      .toBe(0);
    expect(String(log.mock.calls[0]?.[0])).toContain('unsupported');
    expect(await readFile(skill, 'utf8')).toBe(before);
    expect((await run(root, ['set', '--skill', 'check', '--tier', 'premium'])).exitCode)
      .toBe(0);
    expect(await readFile(skill, 'utf8')).toContain('modelTier: premium');
  });

  it('migrates legacy skill hints and preserves unrelated content', async () => {
    const { root, skill } = await fixture();
    expect((await run(root, ['migrate', '--all'])).exitCode).toBe(0);
    const output = await readFile(skill, 'utf8');
    expect(output).toContain('model: haiku');
    expect(output).toContain('modelRole: efficiency');
    expect(output).toContain('modelTier: economy');
    expect(output).toContain('description: Check');
    expect((await run(root, ['migrate', '--all'])).exitCode).toBe(0);
    expect(await readFile(skill, 'utf8')).toBe(output);
  });

  it('round-trips project defaults and rejects invalid mutation before writes', async () => {
    const { root } = await fixture();
    await writeFile(path.join(root, 'models.json'), JSON.stringify({
      description: 'operator content',
      providers: { custom: { coding: 'local/model' } },
    }));
    expect((await run(root, ['set-default', 'economy'])).exitCode).toBe(0);
    const config = JSON.parse(await readFile(path.join(root, 'models.json'), 'utf8'));
    expect(config.defaults.tier).toBe('economy');
    expect(config.description).toBe('operator content');
    expect(config.providers.custom.coding).toBe('local/model');
    expect((await run(root, ['set', '--all', '--tier', 'invalid'])).exitCode).toBe(2);
  });
});
