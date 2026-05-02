/**
 * Unit tests for project-local remove (#1037)
 *
 * Covers cases 1–4 + 6 from the design at
 * `.aiwg/architecture/design-aiwg-remove-revert.md`. Cases 5 (permission)
 * and 7 (upstream fall-through) are integration concerns.
 *
 * @source @src/extensions/project-local-remove.ts
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { createHash } from 'crypto';
import {
  hashBundleArtifacts,
  removeProjectLocalBundle,
} from '../../../src/extensions/project-local-remove.js';
import {
  resetStorage,
  initStorage,
} from '../../../src/storage/index.js';
import type { AiwgConfig } from '../../../src/config/aiwg-config.js';

function tmp(): string {
  const d = mkdtempSync(join(tmpdir(), 'aiwg-plr-'));
  return d;
}

function sha256(buf: Buffer | string): string {
  return createHash('sha256').update(buf).digest('hex');
}

function writeBundle(projectDir: string, id: string, ruleBody = 'rule body'): string {
  const dir = join(projectDir, '.aiwg', 'extensions', id);
  mkdirSync(join(dir, 'rules'), { recursive: true });
  mkdirSync(join(dir, 'skills', 'demo-skill'), { recursive: true });
  writeFileSync(join(dir, 'rules', 'r1.md'), ruleBody);
  writeFileSync(join(dir, 'skills', 'demo-skill', 'SKILL.md'), 'skill body');
  return dir;
}

function deployArtifacts(projectDir: string, ruleBody = 'rule body'): void {
  // Pretend deploy: write provider files identical to source
  mkdirSync(join(projectDir, '.claude', 'rules'), { recursive: true });
  mkdirSync(join(projectDir, '.claude', 'skills', 'demo-skill'), { recursive: true });
  writeFileSync(join(projectDir, '.claude', 'rules', 'r1.md'), ruleBody);
  writeFileSync(join(projectDir, '.claude', 'skills', 'demo-skill', 'SKILL.md'), 'skill body');
}

function makeConfig(bundleId: string, hashes: Record<string, string>): AiwgConfig {
  return {
    version: '1',
    providers: ['claude'],
    installed: {
      [bundleId]: {
        version: '1.0.0',
        source: 'project-local',
        installedAt: new Date().toISOString(),
        deployedTo: { claude: { agents: 0, commands: 0, skills: 1, rules: 1 } },
        localPath: `.aiwg/extensions/${bundleId}/`,
        localType: 'extension',
        manifestVersion: '1',
        artifactHashes: hashes,
      },
    },
    scripts: {},
  };
}

describe('hashBundleArtifacts', () => {
  let projectDir: string;

  beforeEach(() => { projectDir = tmp(); });
  afterEach(() => { rmSync(projectDir, { recursive: true, force: true }); });

  it('hashes rules and skills with source-relative keys', async () => {
    const dir = writeBundle(projectDir, 'foo');
    const hashes = await hashBundleArtifacts(dir);
    expect(Object.keys(hashes).sort()).toEqual([
      'rules/r1.md',
      'skills/demo-skill/SKILL.md',
    ]);
    expect(hashes['rules/r1.md']).toBe(sha256('rule body'));
    expect(hashes['skills/demo-skill/SKILL.md']).toBe(sha256('skill body'));
  });

  it('skips README.md and INDEX.md', async () => {
    const dir = writeBundle(projectDir, 'foo');
    writeFileSync(join(dir, 'rules', 'README.md'), 'readme');
    writeFileSync(join(dir, 'rules', 'INDEX.md'), 'index');
    const hashes = await hashBundleArtifacts(dir);
    expect(Object.keys(hashes)).not.toContain('rules/README.md');
    expect(Object.keys(hashes)).not.toContain('rules/INDEX.md');
  });
});

describe('removeProjectLocalBundle (#1037 / #1048)', () => {
  let projectDir: string;

  beforeEach(async () => {
    projectDir = tmp();
    resetStorage();
    await initStorage(projectDir);
  });
  afterEach(async () => {
    resetStorage();
    rmSync(projectDir, { recursive: true, force: true });
  });

  it('returns isProjectLocal=false when bundle not in installed (fall-through)', async () => {
    const config = { version: '1', providers: ['claude'], installed: {}, scripts: {} } as AiwgConfig;
    const result = await removeProjectLocalBundle(config, projectDir, 'unknown');
    expect(result.isProjectLocal).toBe(false);
    expect(result.found).toBe(false);
  });

  it('returns isProjectLocal=false when bundle is installed but source!=project-local', async () => {
    const config = {
      version: '1', providers: ['claude'],
      installed: {
        'sdlc': { version: '1', source: 'bundled', installedAt: 'x', deployedTo: { claude: { agents: 0, commands: 0, skills: 0, rules: 0 } } },
      },
      scripts: {},
    } as AiwgConfig;
    const result = await removeProjectLocalBundle(config, projectDir, 'sdlc');
    expect(result.isProjectLocal).toBe(false);
  });

  it('Case 1 (pristine): deletes deployed file and removes registry entry', async () => {
    const dir = writeBundle(projectDir, 'foo');
    deployArtifacts(projectDir);
    const hashes = await hashBundleArtifacts(dir);
    const config = makeConfig('foo', hashes);

    const result = await removeProjectLocalBundle(config, projectDir, 'foo');

    expect(result.found).toBe(true);
    expect(result.partialProviders).toEqual([]);
    expect(result.revertedProviders).toEqual(['claude']);
    expect(existsSync(join(projectDir, '.claude', 'rules', 'r1.md'))).toBe(false);
    expect(existsSync(join(projectDir, '.claude', 'skills', 'demo-skill', 'SKILL.md'))).toBe(false);
    expect(config.installed['foo']).toBeUndefined();

    // Source preserved
    expect(existsSync(join(dir, 'rules', 'r1.md'))).toBe(true);
    expect(existsSync(join(dir, 'manifest.json'))).toBe(false); // we never wrote manifest in this fixture
    expect(existsSync(join(dir, 'skills', 'demo-skill', 'SKILL.md'))).toBe(true);
  });

  it('Case 2 (mutated): default refuses, leaves file, marks partial', async () => {
    const dir = writeBundle(projectDir, 'foo');
    deployArtifacts(projectDir);
    const hashes = await hashBundleArtifacts(dir);
    const config = makeConfig('foo', hashes);

    // Mutate the deployed file
    writeFileSync(join(projectDir, '.claude', 'rules', 'r1.md'), 'mutated by operator');

    const result = await removeProjectLocalBundle(config, projectDir, 'foo');

    expect(result.partialProviders).toEqual(['claude']);
    expect(existsSync(join(projectDir, '.claude', 'rules', 'r1.md'))).toBe(true); // still there
    expect(config.installed['foo']).toBeDefined(); // registry preserved
    const ruleOutcome = result.outcomes.find(o => o.artifactPath === 'rules/r1.md');
    expect(ruleOutcome?.case).toBe('mutated');
    expect(ruleOutcome?.reverted).toBe(false);
  });

  it('Case 2 + --force: deletes mutated file', async () => {
    const dir = writeBundle(projectDir, 'foo');
    deployArtifacts(projectDir);
    const hashes = await hashBundleArtifacts(dir);
    const config = makeConfig('foo', hashes);
    writeFileSync(join(projectDir, '.claude', 'rules', 'r1.md'), 'mutated');

    const result = await removeProjectLocalBundle(config, projectDir, 'foo', { force: true });

    expect(result.partialProviders).toEqual([]);
    expect(existsSync(join(projectDir, '.claude', 'rules', 'r1.md'))).toBe(false);
    // Source intact
    expect(existsSync(join(dir, 'rules', 'r1.md'))).toBe(true);
  });

  it('Case 3 (missing deployed file): silent success', async () => {
    const dir = writeBundle(projectDir, 'foo');
    // Don't deploy — files are missing
    const hashes = await hashBundleArtifacts(dir);
    const config = makeConfig('foo', hashes);

    const result = await removeProjectLocalBundle(config, projectDir, 'foo');

    expect(result.partialProviders).toEqual([]);
    expect(result.revertedProviders).toEqual(['claude']);
    expect(config.installed['foo']).toBeUndefined();
    const out = result.outcomes.find(o => o.artifactPath === 'rules/r1.md');
    expect(out?.case).toBe('missing');
  });

  it('Case 4 (replaced): refuses when another bundle owns the source path', async () => {
    const dir = writeBundle(projectDir, 'foo');
    deployArtifacts(projectDir);
    const hashes = await hashBundleArtifacts(dir);
    const config = makeConfig('foo', hashes);
    // Inject a second project-local bundle that claims the same source path
    config.installed['other'] = {
      version: '1.0.0',
      source: 'project-local',
      installedAt: new Date().toISOString(),
      deployedTo: { claude: { agents: 0, commands: 0, skills: 0, rules: 1 } },
      localPath: '.aiwg/extensions/other/',
      localType: 'extension',
      manifestVersion: '1',
      artifactHashes: { 'rules/r1.md': 'differenthash' },
    };

    const result = await removeProjectLocalBundle(config, projectDir, 'foo');

    expect(result.partialProviders).toEqual(['claude']);
    expect(existsSync(join(projectDir, '.claude', 'rules', 'r1.md'))).toBe(true); // preserved
    const replaced = result.outcomes.find(o => o.artifactPath === 'rules/r1.md');
    expect(replaced?.case).toBe('replaced');
    expect(replaced?.message).toContain("'other'");
  });

  it('Case 4 + --force: still refuses (force does not authorize destroying others)', async () => {
    const dir = writeBundle(projectDir, 'foo');
    deployArtifacts(projectDir);
    const hashes = await hashBundleArtifacts(dir);
    const config = makeConfig('foo', hashes);
    config.installed['other'] = {
      version: '1.0.0', source: 'project-local', installedAt: new Date().toISOString(),
      deployedTo: { claude: { agents: 0, commands: 0, skills: 0, rules: 1 } },
      localPath: '.aiwg/extensions/other/', localType: 'extension', manifestVersion: '1',
      artifactHashes: { 'rules/r1.md': 'x' },
    };

    const result = await removeProjectLocalBundle(config, projectDir, 'foo', { force: true });

    const replaced = result.outcomes.find(o => o.artifactPath === 'rules/r1.md');
    expect(replaced?.reverted).toBe(false);
    expect(existsSync(join(projectDir, '.claude', 'rules', 'r1.md'))).toBe(true);
  });

  it('Case 6 (source dir deleted before remove): reverts deploy anyway from registry hashes', async () => {
    const dir = writeBundle(projectDir, 'foo');
    deployArtifacts(projectDir);
    const hashes = await hashBundleArtifacts(dir);
    const config = makeConfig('foo', hashes);

    // Operator deletes the bundle source out-of-band
    rmSync(dir, { recursive: true, force: true });

    const result = await removeProjectLocalBundle(config, projectDir, 'foo');

    expect(result.revertedProviders).toEqual(['claude']);
    expect(existsSync(join(projectDir, '.claude', 'rules', 'r1.md'))).toBe(false);
    // Registry entry removed (source was already gone — nothing to preserve there)
    expect(config.installed['foo']).toBeUndefined();
  });

  it('--dry-run: prints plan, no filesystem or registry changes', async () => {
    const dir = writeBundle(projectDir, 'foo');
    deployArtifacts(projectDir);
    const hashes = await hashBundleArtifacts(dir);
    const config = makeConfig('foo', hashes);

    const result = await removeProjectLocalBundle(config, projectDir, 'foo', { dryRun: true });

    expect(existsSync(join(projectDir, '.claude', 'rules', 'r1.md'))).toBe(true); // unchanged
    expect(config.installed['foo']).toBeDefined(); // unchanged
    expect(result.outcomes.every(o => o.message.startsWith('[dry-run]') || o.case === 'missing')).toBe(true);
  });

  it('--keep-registry: reverts files but leaves entry in installed', async () => {
    const dir = writeBundle(projectDir, 'foo');
    deployArtifacts(projectDir);
    const hashes = await hashBundleArtifacts(dir);
    const config = makeConfig('foo', hashes);

    const result = await removeProjectLocalBundle(config, projectDir, 'foo', { keepRegistry: true });

    expect(result.revertedProviders).toEqual(['claude']);
    expect(existsSync(join(projectDir, '.claude', 'rules', 'r1.md'))).toBe(false);
    expect(config.installed['foo']).toBeDefined();
    // Provider entries also preserved (we only delete deployedTo when not keepRegistry)
    expect(config.installed['foo'].deployedTo['claude']).toBeDefined();
  });

  // Sanity: source preservation invariant — verify no test scenario above
  // ever deletes content under .aiwg/<type>/<name>/
  it('source preservation: no path under .aiwg/ is deleted regardless of case or --force', async () => {
    const dir = writeBundle(projectDir, 'foo');
    deployArtifacts(projectDir);
    const hashes = await hashBundleArtifacts(dir);
    const config = makeConfig('foo', hashes);
    writeFileSync(join(projectDir, '.claude', 'rules', 'r1.md'), 'mutated');

    await removeProjectLocalBundle(config, projectDir, 'foo', { force: true });

    expect(existsSync(join(dir, 'rules', 'r1.md'))).toBe(true);
    expect(existsSync(join(dir, 'skills', 'demo-skill', 'SKILL.md'))).toBe(true);
  });

  it('emits remove activity entry to .aiwg/activity.log', async () => {
    const dir = writeBundle(projectDir, 'foo');
    deployArtifacts(projectDir);
    const hashes = await hashBundleArtifacts(dir);
    const config = makeConfig('foo', hashes);

    await removeProjectLocalBundle(config, projectDir, 'foo');
    const log = readFileSync(join(projectDir, '.aiwg', 'activity.log'), 'utf-8');
    expect(log).toContain('] delete | remove: foo:extension | claude=');
  });
});
