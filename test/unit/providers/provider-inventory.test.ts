import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { collectProviderInventory } from '../../../src/providers/provider-inventory.js';

const roots: string[] = [];

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'aiwg-provider-inventory-'));
  roots.push(root);
  const project = join(root, 'project');
  const home = join(root, 'home');
  await mkdir(join(project, '.aiwg'), { recursive: true });
  await mkdir(join(home, '.aiwg'), { recursive: true });
  await writeFile(join(project, '.aiwg/aiwg.config'), JSON.stringify({
    version: '1',
    providers: ['claude-code', 'codex'],
    installed: {
      sdlc: {
        version: '1',
        source: 'bundled',
        installedAt: new Date(0).toISOString(),
        deployedTo: {
          codex: { agents: 1, commands: 0, skills: 1, rules: 0 },
        },
      },
    },
    scripts: {},
  }));
  await writeFile(join(home, '.aiwg/aiwg.config'), JSON.stringify({
    version: '1',
    providers: ['opencode'],
    installed: {},
    scripts: {},
  }));
  return { project, home };
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })));
});

describe('provider inventory', () => {
  it('separates configuration, deployment, detection, availability, and active state', async () => {
    const { project, home } = await fixture();
    const inventory = await collectProviderInventory(project, {
      homeDir: home,
      env: { PATH: '/fixture/bin', AIWG_PROVIDER: 'claude' },
      detectProcess: false,
      pathExists: async path => path === join(home, '.config/opencode/opencode.json'),
      findExecutable: async names => names.includes('codex') ? '/fixture/bin/codex' : null,
      now: () => new Date(0),
    });

    const claude = inventory.providers.find(provider => provider.id === 'claude')!;
    expect(claude).toMatchObject({
      configured: true,
      deployed: false,
      detected: true,
      available: true,
      active: true,
    });
    expect(claude.evidence).toContainEqual(
      expect.objectContaining({ kind: 'project-config', scope: 'project' }),
    );

    const codex = inventory.providers.find(provider => provider.id === 'codex')!;
    expect(codex).toMatchObject({
      configured: true,
      deployed: true,
      detected: true,
      available: true,
      active: false,
    });
    expect(codex.evidence.map(item => item.kind)).toEqual(
      expect.arrayContaining(['deployment-record', 'executable']),
    );

    const opencode = inventory.providers.find(provider => provider.id === 'opencode')!;
    expect(opencode.configured).toBe(true);
    expect(opencode.evidence).toContainEqual(
      expect.objectContaining({ kind: 'user-config', scope: 'user' }),
    );

    const warp = inventory.providers.find(provider => provider.id === 'warp')!;
    expect(warp).toMatchObject({
      configured: false,
      deployed: false,
      detected: false,
      available: false,
      active: false,
    });
    expect(warp.reasons.join(' ')).toContain('Configure or install');
  });
});
