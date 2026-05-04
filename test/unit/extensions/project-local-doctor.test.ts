/**
 * Unit tests for the project-local doctor section (#1037 / DC-1)
 *
 * @source @src/extensions/project-local-doctor.ts
 * @design @.aiwg/architecture/design-doctor-log-promote.md
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { createHash } from 'crypto';
import { buildProjectLocalDoctorSection } from '../../../src/extensions/project-local-doctor.js';
import type { AiwgConfig } from '../../../src/config/aiwg-config.js';

function tmp(): string {
  return mkdtempSync(join(tmpdir(), 'aiwg-pld-'));
}
function sha256(buf: string): string {
  return createHash('sha256').update(buf).digest('hex');
}

function writeBundle(projectDir: string, id: string, opts: { ruleBody?: string; mismatchType?: boolean } = {}): void {
  const ruleBody = opts.ruleBody ?? 'rule body';
  const dir = join(projectDir, '.aiwg', 'extensions', id);
  mkdirSync(join(dir, 'rules'), { recursive: true });
  writeFileSync(join(dir, 'rules', 'r1.md'), ruleBody);
  writeFileSync(
    join(dir, 'manifest.json'),
    JSON.stringify({
      id,
      type: opts.mismatchType ? 'addon' : 'extension',
      name: id,
      version: '1.0.0',
      description: 'Test bundle',
      manifestVersion: '1',
      platforms: { claude: 'full' },
      keywords: ['test'],
      deployment: { pathTemplate: '.{platform}/rules/{id}.md' },
    }, null, 2),
  );
}

function deployRule(projectDir: string, body = 'rule body'): void {
  mkdirSync(join(projectDir, '.claude', 'rules'), { recursive: true });
  writeFileSync(join(projectDir, '.claude', 'rules', 'r1.md'), body);
}

function makeConfig(bundleId: string, hashes: Record<string, string>): AiwgConfig {
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
        artifactHashes: hashes,
      },
    },
    scripts: {},
  };
}

describe('project-local-doctor (DC-1)', () => {
  let projectDir: string;
  let frameworkRoot: string;

  beforeEach(() => {
    projectDir = tmp();
    frameworkRoot = tmp();
  });
  afterEach(() => {
    rmSync(projectDir, { recursive: true, force: true });
    rmSync(frameworkRoot, { recursive: true, force: true });
  });

  it('returns empty section when no project-local content exists', async () => {
    const r = await buildProjectLocalDoctorSection({
      projectDir, frameworkRoot, config: null,
    });
    expect(r.output).toBe('');
    expect(r.hasFailures).toBe(false);
  });

  it('reports per-type counts and bundle ids when content exists', async () => {
    writeBundle(projectDir, 'foo');
    writeBundle(projectDir, 'bar');

    const r = await buildProjectLocalDoctorSection({
      projectDir, frameworkRoot, config: null,
    });
    expect(r.output).toContain('Project-local artifacts');
    expect(r.output).toContain('Discovered: 2 bundle');
    expect(r.output).toContain('extensions');
    expect(r.output).toContain('foo');
    expect(r.output).toContain('bar');
  });

  it('surfaces validation errors with structured rows', async () => {
    writeBundle(projectDir, 'mismatched', { mismatchType: true });

    const r = await buildProjectLocalDoctorSection({
      projectDir, frameworkRoot, config: null,
    });
    expect(r.validationErrors).toBeGreaterThanOrEqual(1);
    expect(r.output).toContain('Validation: ✗');
    expect(r.hasFailures).toBe(true);
  });

  it('detects drift when deployed file differs from registered hash', async () => {
    writeBundle(projectDir, 'foo');
    deployRule(projectDir, 'mutated content');
    const hashes = { 'rules/r1.md': sha256('rule body') }; // expected hash != deployed
    const config = makeConfig('foo', hashes);

    const r = await buildProjectLocalDoctorSection({
      projectDir, frameworkRoot, config,
    });
    expect(r.driftCount).toBe(1);
    expect(r.output).toContain('Drift (1)');
    expect(r.output).toContain('foo :: rules/r1.md @ claude');
    expect(r.hasFailures).toBe(true);
  });

  it('reports zero drift when deployed file matches', async () => {
    writeBundle(projectDir, 'foo');
    deployRule(projectDir, 'rule body');
    const hashes = { 'rules/r1.md': sha256('rule body') };
    const config = makeConfig('foo', hashes);

    const r = await buildProjectLocalDoctorSection({
      projectDir, frameworkRoot, config,
    });
    expect(r.driftCount).toBe(0);
    expect(r.output).toContain('Drift: 0');
    expect(r.hasFailures).toBe(false);
  });

  it('reports zero drift when deployed file carries managed-marker (#1086)', async () => {
    // Source has no marker; recorded hash is sha256(source).
    // Deployer injected an HTML-comment marker on line 1 — normalization
    // must strip it on both sides so the hash equivalence still holds.
    writeBundle(projectDir, 'foo');
    deployRule(projectDir, '<!-- aiwg:managed v2026.5.0-rc.6 bundled -->\nrule body');
    const hashes = { 'rules/r1.md': sha256('rule body') };
    const config = makeConfig('foo', hashes);

    const r = await buildProjectLocalDoctorSection({
      projectDir, frameworkRoot, config,
    });
    expect(r.driftCount).toBe(0);
    expect(r.hasFailures).toBe(false);
  });

  it('still detects real drift when content differs beyond the marker (#1086)', async () => {
    writeBundle(projectDir, 'foo');
    deployRule(
      projectDir,
      '<!-- aiwg:managed v2026.5.0-rc.6 bundled -->\nrule body EDITED',
    );
    const hashes = { 'rules/r1.md': sha256('rule body') };
    const config = makeConfig('foo', hashes);

    const r = await buildProjectLocalDoctorSection({
      projectDir, frameworkRoot, config,
    });
    expect(r.driftCount).toBe(1);
    expect(r.hasFailures).toBe(true);
  });

  it('quiet mode suppresses informational subsections but keeps failures', async () => {
    writeBundle(projectDir, 'foo');
    deployRule(projectDir, 'mutated');
    const hashes = { 'rules/r1.md': sha256('rule body') };
    const config = makeConfig('foo', hashes);

    const r = await buildProjectLocalDoctorSection({
      projectDir, frameworkRoot, config, quiet: true,
    });
    expect(r.output).toContain('Drift (1)');
    expect(r.output).not.toContain('Discovered:');
    expect(r.output).not.toContain('Provider deployment matrix');
  });

  it('emits provider deployment matrix from registered installed entries', async () => {
    writeBundle(projectDir, 'foo');
    const hashes = { 'rules/r1.md': sha256('rule body') };
    const config = makeConfig('foo', hashes);
    // Add a second provider
    config.installed['foo'].deployedTo['cursor'] = { agents: 0, commands: 0, skills: 0, rules: 1 };

    const r = await buildProjectLocalDoctorSection({
      projectDir, frameworkRoot, config,
    });
    expect(r.output).toContain('Provider deployment matrix');
    expect(r.output).toMatch(/foo\s+✓ 1\s+✓ 1/);
  });

  it('warns when entries lack artifactHashes (older deploys)', async () => {
    writeBundle(projectDir, 'foo');
    const config = makeConfig('foo', {});
    delete config.installed['foo'].artifactHashes;

    const r = await buildProjectLocalDoctorSection({
      projectDir, frameworkRoot, config,
    });
    expect(r.output).toContain('lack artifactHashes');
  });
});
