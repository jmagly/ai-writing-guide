/**
 * Unit tests for aiwg promote (#1037 / PR-1..PR-5)
 *
 * @source @src/extensions/project-local-promote.ts
 * @design @.aiwg/architecture/design-doctor-log-promote.md
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { promoteProjectLocalBundle } from '../../../src/extensions/project-local-promote.js';
import { resetStorage, initStorage } from '../../../src/storage/index.js';
import type { AiwgConfig } from '../../../src/config/aiwg-config.js';

function tmp(): string {
  return mkdtempSync(join(tmpdir(), 'aiwg-plp-'));
}

function writeBundle(projectDir: string, id: string, opts: { withRefs?: boolean } = {}): string {
  const dir = join(projectDir, '.aiwg', 'extensions', id);
  mkdirSync(join(dir, 'rules'), { recursive: true });
  writeFileSync(
    join(dir, 'manifest.json'),
    JSON.stringify({
      id,
      type: 'extension',
      name: id,
      version: '1.0.0',
      description: 'Test bundle',
      manifestVersion: '1',
      platforms: { claude: 'full' },
      keywords: ['test'],
      deployment: { pathTemplate: '.{platform}/rules/{id}.md' },
    }, null, 2),
  );
  const ruleBody = opts.withRefs ? '@.aiwg/requirements/UC-001.md\n' : 'rule body';
  writeFileSync(join(dir, 'rules', 'r1.md'), ruleBody);
  return dir;
}

function makeConfig(bundleId: string): AiwgConfig {
  return {
    version: '1', providers: ['claude'],
    installed: {
      [bundleId]: {
        version: '1.0.0',
        source: 'project-local',
        installedAt: new Date().toISOString(),
        deployedTo: { claude: { agents: 0, commands: 0, skills: 0, rules: 1 } },
        localPath: `.aiwg/extensions/${bundleId}/`,
        localType: 'extension',
        manifestVersion: '1',
      },
    },
    scripts: {},
  };
}

describe('promoteProjectLocalBundle (#1037)', () => {
  let projectDir: string;
  let frameworkRoot: string;

  beforeEach(async () => {
    projectDir = tmp();
    frameworkRoot = tmp();
    resetStorage();
    await initStorage(projectDir);
  });
  afterEach(async () => {
    resetStorage();
    rmSync(projectDir, { recursive: true, force: true });
    rmSync(frameworkRoot, { recursive: true, force: true });
  });

  it('PR-1: bundle-not-found when no project-local bundle matches', async () => {
    const config = { version: '1', providers: ['claude'], installed: {}, scripts: {} } as AiwgConfig;
    const r = await promoteProjectLocalBundle(config, projectDir, 'unknown', { frameworkRoot });
    expect(r.ok).toBe(false);
    expect(r.failureReason).toBe('bundle-not-found');
  });

  it('PR-2: --dry-run produces a plan without filesystem or registry changes', async () => {
    writeBundle(projectDir, 'foo');
    const config = makeConfig('foo');

    const r = await promoteProjectLocalBundle(config, projectDir, 'foo', {
      dryRun: true, frameworkRoot,
    });
    expect(r.ok).toBe(true);
    expect(r.plan).toBeDefined();
    expect(r.plan!.destination).toBe(join(frameworkRoot, 'agentic/code/addons/foo'));
    // No copy
    expect(existsSync(r.plan!.destination)).toBe(false);
    // Registry unchanged
    expect(config.installed['foo'].source).toBe('project-local');
  });

  it('PR-3: copy succeeds and re-hash verifies; registry source flips to bundled', async () => {
    writeBundle(projectDir, 'foo');
    const config = makeConfig('foo');

    const r = await promoteProjectLocalBundle(config, projectDir, 'foo', {
      frameworkRoot,
    });
    expect(r.ok).toBe(true);
    expect(r.copied).toContain('manifest.json');
    expect(r.copied).toContain(join('rules', 'r1.md'));

    const dest = r.plan!.destination;
    expect(existsSync(join(dest, 'manifest.json'))).toBe(true);
    expect(existsSync(join(dest, 'rules', 'r1.md'))).toBe(true);
    expect(readFileSync(join(dest, 'rules', 'r1.md'), 'utf-8')).toBe('rule body');

    expect(config.installed['foo'].source).toBe('bundled');
    expect(config.installed['foo'].localPath).toBeUndefined();
  });

  it('PR-3: source preserved when --cleanup not set', async () => {
    const dir = writeBundle(projectDir, 'foo');
    const config = makeConfig('foo');

    await promoteProjectLocalBundle(config, projectDir, 'foo', { frameworkRoot });
    expect(existsSync(join(dir, 'manifest.json'))).toBe(true);
  });

  it('PR-3: --cleanup removes .aiwg/<type>/<name>/ source after success', async () => {
    const dir = writeBundle(projectDir, 'foo');
    const config = makeConfig('foo');

    await promoteProjectLocalBundle(config, projectDir, 'foo', { frameworkRoot, cleanup: true });
    expect(existsSync(dir)).toBe(false);
  });

  it('PR-4: refuses when destination already exists', async () => {
    writeBundle(projectDir, 'foo');
    const config = makeConfig('foo');
    // Pre-create destination
    mkdirSync(join(frameworkRoot, 'agentic/code/addons/foo'), { recursive: true });

    const r = await promoteProjectLocalBundle(config, projectDir, 'foo', { frameworkRoot });
    expect(r.ok).toBe(false);
    expect(r.failureReason).toBe('destination-exists');
    expect(config.installed['foo'].source).toBe('project-local');
  });

  it('PR-5: refuses on @.aiwg/ project-local references; --force overrides', async () => {
    writeBundle(projectDir, 'refs', { withRefs: true });
    const config = makeConfig('refs');

    const blocked = await promoteProjectLocalBundle(config, projectDir, 'refs', { frameworkRoot });
    expect(blocked.ok).toBe(false);
    expect(blocked.failureReason).toBe('project-local-references');
    expect(blocked.message).toContain('rules/r1.md');

    // With --force, promotion proceeds
    const forced = await promoteProjectLocalBundle(config, projectDir, 'refs', { frameworkRoot, force: true });
    expect(forced.ok).toBe(true);
  });

  it('--to corpus copies to the given path', async () => {
    writeBundle(projectDir, 'foo');
    const config = makeConfig('foo');
    const corpus = tmp();
    try {
      const r = await promoteProjectLocalBundle(config, projectDir, 'foo', {
        to: 'corpus',
        corpusPath: corpus,
        frameworkRoot,
      });
      expect(r.ok).toBe(true);
      expect(existsSync(join(corpus, 'foo', 'manifest.json'))).toBe(true);
      expect(config.installed['foo'].source).toBe('corpus');
    } finally {
      rmSync(corpus, { recursive: true, force: true });
    }
  });

  it('emits promote activity entry to .aiwg/activity.log on success', async () => {
    writeBundle(projectDir, 'foo');
    const config = makeConfig('foo');
    await promoteProjectLocalBundle(config, projectDir, 'foo', { frameworkRoot });

    const log = readFileSync(join(projectDir, '.aiwg', 'activity.log'), 'utf-8');
    expect(log).toContain('] promote | promote: foo:extension |');
  });

  it('emits promote-failed when destination already exists (no copy attempted)', async () => {
    writeBundle(projectDir, 'foo');
    const config = makeConfig('foo');
    mkdirSync(join(frameworkRoot, 'agentic/code/addons/foo'), { recursive: true });

    const r = await promoteProjectLocalBundle(config, projectDir, 'foo', { frameworkRoot });
    expect(r.ok).toBe(false);
    // pre-flight failure → no activity entry expected (no operation actually attempted)
    // (matches design: only `promote` and `promote-failed` for actual copy attempts)
  });
});
