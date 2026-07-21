import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import {
  collectPackagedAgentInventory,
  diagnoseOversizedAgent,
  normalizeAgentArtifactName,
  parseManagedArtifactMarker,
} from '../../../src/agents/packaged-agent-inventory.js';

describe('packaged agent inventory', () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'aiwg-packaged-agent-inventory-'));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('covers framework, addon, plugin, and root persona agents', async () => {
    const paths = [
      'agentic/code/frameworks/sdlc-complete/agents/framework-agent.md',
      'agentic/code/addons/aiwg-utils/agents/addon-agent.md',
      'agentic/code/plugins/utils/agents/plugin-agent.md',
      'agentic/code/agents/personas/root-agent.md',
    ];
    for (const relative of paths) {
      const absolute = join(root, relative);
      mkdirSync(dirname(absolute), { recursive: true });
      writeFileSync(absolute, `---\nname: ${relative}\n---\n`);
    }

    const inventory = await collectPackagedAgentInventory(root);

    expect([...inventory.keys()].sort()).toEqual([
      'addon-agent',
      'framework-agent',
      'plugin-agent',
      'root-agent',
    ]);
  });

  it('normalizes provider-specific agent filename suffixes', () => {
    expect(normalizeAgentArtifactName('reviewer.agent.md')).toBe('reviewer');
    expect(normalizeAgentArtifactName('reviewer.soul.md')).toBe('reviewer');
    expect(normalizeAgentArtifactName('reviewer.md')).toBe('reviewer');
    expect(normalizeAgentArtifactName('reviewer.toml')).toBe('reviewer');
  });

  it('parses both YAML and HTML managed markers', () => {
    expect(parseManagedArtifactMarker('# aiwg:managed v2026.7.15 bundled\n')).toEqual({
      version: '2026.7.15',
      source: 'bundled',
    });
    expect(parseManagedArtifactMarker('<!-- aiwg:managed v1 project-local -->\n')).toEqual({
      version: '1',
      source: 'project-local',
    });
  });

  it('distinguishes current package, stale managed, and unmanaged oversized files', async () => {
    const agents = join(root, 'agentic/code/frameworks/sdlc-complete/agents');
    mkdirSync(agents, { recursive: true });
    writeFileSync(join(agents, 'lean.md'), 'lean');
    writeFileSync(join(agents, 'large.md'), 'x'.repeat(17 * 1024));
    const inventory = await collectPackagedAgentInventory(root);
    const ceiling = 16 * 1024;

    expect(diagnoseOversizedAgent('large.md', '# local copy\n', inventory, ceiling)).toBe('current-package');
    expect(diagnoseOversizedAgent(
      'lean.agent.md',
      '# aiwg:managed v2026.7.13 bundled\nold large body',
      inventory,
      ceiling,
    )).toBe('stale-deployment');
    expect(diagnoseOversizedAgent('lean.md', '# operator copy\n', inventory, ceiling)).toBe('unmanaged-local');
    expect(diagnoseOversizedAgent(
      'lean.soul.md',
      '# aiwg:managed v1 project-local\nlocal body',
      inventory,
      ceiling,
    )).toBe('unmanaged-local');
  });
});
