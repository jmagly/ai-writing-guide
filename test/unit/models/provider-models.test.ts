import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  MODEL_WRAPPERS,
  loadProviderModelMetadata,
} from '../../../src/models/provider-models.js';

const roots: string[] = [];

async function fixture(providers: string[]) {
  const root = await mkdtemp(join(tmpdir(), 'aiwg-provider-models-'));
  const project = join(root, 'project');
  roots.push(root);
  await mkdir(join(root, 'agentic/code/providers'), { recursive: true });
  await mkdir(join(project, '.aiwg'), { recursive: true });
  await writeFile(join(project, '.aiwg/aiwg.config'), JSON.stringify({
    version: '1',
    providers,
    installed: {
      fixture: {
        version: '1.0.0',
        source: 'bundled',
        installedAt: new Date(0).toISOString(),
        deployedTo: Object.fromEntries(providers.map(provider => [
          provider,
          { agents: 1, commands: 0, skills: 0, rules: 0 },
        ])),
      },
    },
    scripts: {},
  }));
  await writeFile(join(root, 'agentic/code/providers/model-catalog.v1.json'), JSON.stringify({
    version: '1.0.0',
    refreshedAt: '2026-07-20',
    providers: {
      codex: {
        roles: {
          reasoning: { id: 'gpt-premium', status: 'active', observed: true },
          coding: { id: 'gpt-standard', status: 'active', observed: true },
          efficiency: { id: 'gpt-economy', status: 'active', observed: true },
        },
      },
      claude: {
        roles: {
          reasoning: { id: 'claude-premium', status: 'active' },
          coding: { id: 'claude-standard', status: 'active' },
          efficiency: { id: 'claude-economy', status: 'active' },
        },
      },
    },
  }));
  return { root, project };
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })));
});

describe('provider model metadata', () => {
  it('lists role models and wrapper names only for configured providers', async () => {
    const { root, project } = await fixture(['codex']);
    const result = await loadProviderModelMetadata(project, root);

    expect(Object.keys(result!.providers)).toEqual(['codex']);
    expect(result!.providers.codex).toEqual([
      expect.objectContaining({ role: 'reasoning', model: 'gpt-premium', wrapper: MODEL_WRAPPERS.reasoning }),
      expect.objectContaining({ role: 'coding', model: 'gpt-standard', wrapper: MODEL_WRAPPERS.coding }),
      expect.objectContaining({ role: 'efficiency', model: 'gpt-economy', wrapper: MODEL_WRAPPERS.efficiency }),
    ]);
  });

  it('returns null when the global catalog is unavailable', async () => {
    const { project } = await fixture(['codex']);
    expect(await loadProviderModelMetadata(project, join(project, 'missing'))).toBeNull();
  });

  it('does not advertise providers that are not installed in the workspace', async () => {
    const { root, project } = await fixture([]);
    expect((await loadProviderModelMetadata(project, root))!.providers).toEqual({});
  });
});
