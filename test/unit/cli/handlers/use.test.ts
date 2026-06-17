/**
 * Unit tests for use.ts — addon discovery and disallow list logic
 *
 * Tests the three exported utility functions:
 *   - getAllAddons()  — discovers addon dirs, applies disallow list
 *   - isValidAddon() — validates a name against fs + disallow list
 *   - addonPath()    — constructs source path, handles ring alias
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, rm, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import os from 'os';
import { getAllAddons, isValidAddon, addonPath, USE_ALL_DISALLOW, useHandler } from '../../../../src/cli/handlers/use.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function createFakeAddonTree(root: string, addonNames: string[]) {
  const addonsDir = path.join(root, 'agentic', 'code', 'addons');
  await mkdir(addonsDir, { recursive: true });
  for (const name of addonNames) {
    await mkdir(path.join(addonsDir, name), { recursive: true });
  }
  return addonsDir;
}

// ---------------------------------------------------------------------------
// USE_ALL_DISALLOW
// ---------------------------------------------------------------------------

describe('USE_ALL_DISALLOW', () => {
  it('contains aiwg-dev', () => {
    expect(USE_ALL_DISALLOW.has('aiwg-dev')).toBe(true);
  });

  it('does not contain any standard addon', () => {
    const standardAddons = ['aiwg-utils', 'ralph', 'rlm', 'daemon', 'ring-methodology', 'voice-framework'];
    for (const addon of standardAddons) {
      expect(USE_ALL_DISALLOW.has(addon)).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// addonPath()
// ---------------------------------------------------------------------------

describe('addonPath()', () => {
  it('constructs path from framework root and addon name', () => {
    const result = addonPath('/some/root', 'agent-loop');
    expect(result).toBe('/some/root/agentic/code/addons/agent-loop');
  });

  it('maps ralph legacy alias to agent-loop folder', () => {
    const result = addonPath('/some/root', 'ralph');
    expect(result).toBe('/some/root/agentic/code/addons/agent-loop');
  });

  it('maps ring alias to ring-methodology folder', () => {
    const result = addonPath('/some/root', 'ring');
    expect(result).toBe('/some/root/agentic/code/addons/ring-methodology');
  });

  it('passes through all other names unchanged', () => {
    const names = ['aiwg-utils', 'rlm', 'daemon', 'voice-framework', 'auto-memory'];
    for (const name of names) {
      expect(addonPath('/root', name)).toBe(`/root/agentic/code/addons/${name}`);
    }
  });
});

// ---------------------------------------------------------------------------
// getAllAddons()
// ---------------------------------------------------------------------------

describe('getAllAddons()', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = path.join(os.tmpdir(), `aiwg-use-test-${Date.now()}`);
    await mkdir(tmpDir, { recursive: true });
  });

  afterEach(async () => {
    if (existsSync(tmpDir)) await rm(tmpDir, { recursive: true, force: true });
  });

  it('returns all addon directory names', async () => {
    await createFakeAddonTree(tmpDir, ['aiwg-utils', 'ralph', 'rlm']);
    const addons = await getAllAddons(tmpDir);
    expect(addons).toContain('aiwg-utils');
    expect(addons).toContain('ralph');
    expect(addons).toContain('rlm');
  });

  it('excludes aiwg-dev from results', async () => {
    await createFakeAddonTree(tmpDir, ['aiwg-utils', 'ralph', 'aiwg-dev', 'daemon']);
    const addons = await getAllAddons(tmpDir);
    expect(addons).not.toContain('aiwg-dev');
  });

  it('excludes all entries in USE_ALL_DISALLOW', async () => {
    const all = ['aiwg-utils', 'ralph', ...USE_ALL_DISALLOW];
    await createFakeAddonTree(tmpDir, all);
    const addons = await getAllAddons(tmpDir);
    for (const disallowed of USE_ALL_DISALLOW) {
      expect(addons).not.toContain(disallowed);
    }
  });

  it('returns an empty array when no addons exist', async () => {
    await mkdir(path.join(tmpDir, 'agentic', 'code', 'addons'), { recursive: true });
    const addons = await getAllAddons(tmpDir);
    expect(addons).toEqual([]);
  });

  it('only returns directories, not files', async () => {
    const addonsDir = path.join(tmpDir, 'agentic', 'code', 'addons');
    await createFakeAddonTree(tmpDir, ['aiwg-utils']);
    // Add a stray file in the addons dir
    await (await import('fs/promises')).writeFile(path.join(addonsDir, 'README.md'), '# hi');
    const addons = await getAllAddons(tmpDir);
    expect(addons).not.toContain('README.md');
    expect(addons).toContain('aiwg-utils');
  });

  it('correctly discovers all addons from the real agentic tree', async () => {
    // Use the actual repo root — validates against real source
    const repoRoot = path.resolve(__dirname, '../../../..');
    const addons = await getAllAddons(repoRoot);

    // Known addons that must be present
    expect(addons).toContain('aiwg-utils');
    expect(addons).toContain('agent-loop');
    expect(addons).toContain('rlm');
    expect(addons).toContain('daemon');
    expect(addons).toContain('voice-framework');

    // aiwg-dev must be excluded
    expect(addons).not.toContain('aiwg-dev');

    // Must find more than the old hardcoded 4
    expect(addons.length).toBeGreaterThan(4);
  });
});

// ---------------------------------------------------------------------------
// isValidAddon()
// ---------------------------------------------------------------------------

describe('isValidAddon()', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = path.join(os.tmpdir(), `aiwg-valid-test-${Date.now()}`);
    await mkdir(tmpDir, { recursive: true });
  });

  afterEach(async () => {
    if (existsSync(tmpDir)) await rm(tmpDir, { recursive: true, force: true });
  });

  it('returns true for an existing addon directory', async () => {
    await createFakeAddonTree(tmpDir, ['agent-loop']);
    expect(await isValidAddon(tmpDir, 'agent-loop')).toBe(true);
  });

  it('resolves ralph alias to agent-loop', async () => {
    await createFakeAddonTree(tmpDir, ['agent-loop']);
    expect(await isValidAddon(tmpDir, 'ralph')).toBe(true);
  });

  it('returns false for a non-existent addon', async () => {
    await mkdir(path.join(tmpDir, 'agentic', 'code', 'addons'), { recursive: true });
    expect(await isValidAddon(tmpDir, 'does-not-exist')).toBe(false);
  });

  it('returns true for aiwg-dev — explicit installs are allowed', async () => {
    await createFakeAddonTree(tmpDir, ['aiwg-dev']);
    expect(await isValidAddon(tmpDir, 'aiwg-dev')).toBe(true);
  });

  it('returns true for real addons in the actual repo including aiwg-dev', async () => {
    const repoRoot = path.resolve(__dirname, '../../../..');
    expect(await isValidAddon(repoRoot, 'agent-loop')).toBe(true);
    expect(await isValidAddon(repoRoot, 'ralph')).toBe(true); // legacy alias
    expect(await isValidAddon(repoRoot, 'aiwg-utils')).toBe(true);
    expect(await isValidAddon(repoRoot, 'rlm')).toBe(true);
    expect(await isValidAddon(repoRoot, 'daemon')).toBe(true);
    // aiwg-dev is excluded from `use all` but can be installed explicitly
    expect(await isValidAddon(repoRoot, 'aiwg-dev')).toBe(true);
  });
});

describe('use cockpit', () => {
  let tmpDir: string;
  let oldHome: string | undefined;

  beforeEach(async () => {
    tmpDir = path.join(os.tmpdir(), `aiwg-use-cockpit-test-${Date.now()}`);
    oldHome = process.env.AIWG_COCKPIT_HOME;
    process.env.AIWG_COCKPIT_HOME = path.join(tmpDir, 'cockpit-home');
    await mkdir(tmpDir, { recursive: true });
    await writeFile(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({ name: 'aiwg', version: '2026.6.1' })
    );
  });

  afterEach(async () => {
    if (oldHome === undefined) delete process.env.AIWG_COCKPIT_HOME;
    else process.env.AIWG_COCKPIT_HOME = oldHome;
    if (existsSync(tmpDir)) await rm(tmpDir, { recursive: true, force: true });
  });

  it('routes to the opt-in cockpit acquisition path', async () => {
    const result = await useHandler.execute({
      args: ['cockpit', '--dry-run'],
      rawArgs: ['use', 'cockpit', '--dry-run'],
      cwd: tmpDir,
      frameworkRoot: tmpDir,
    });

    expect(result.exitCode).toBe(0);
    expect(result.message).toContain('@aiwg/cockpit@2026.6.1');
    expect(result.message).toContain('Run without --dry-run');
  });
});
