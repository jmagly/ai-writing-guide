/**
 * Unit tests for shadow resolver (#1036)
 *
 * Covers all seven cases from ADR §4 of
 * `.aiwg/architecture/adr-override-shadow-policy.md`.
 *
 * @source @src/extensions/shadow-resolver.ts
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { resolveShadows, formatShadowReport } from '../../../src/extensions/shadow-resolver.js';
import { buildUpstreamRegistry } from '../../../src/extensions/upstream-registry.js';
import type { ProjectLocalBundle } from '../../../src/extensions/project-local-discovery.js';

function makeTmpDir(prefix = 'aiwg-shadow'): string {
  const dir = join(tmpdir(), `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function writeUpstreamRule(
  frameworkRoot: string,
  bundle: string,
  ruleId: string,
  opts: { safetyCritical?: boolean; container?: 'addons' | 'frameworks' } = {}
): void {
  const container = opts.container ?? 'addons';
  const dir = join(frameworkRoot, 'agentic/code', container, bundle, 'rules');
  mkdirSync(dir, { recursive: true });
  const fm = ['---', `id: ${ruleId}`];
  if (opts.safetyCritical) fm.push('safety-critical: true');
  fm.push('---', '', `# ${ruleId}`);
  writeFileSync(join(dir, `${ruleId}.md`), fm.join('\n'));
}

function writeProjectBundleRule(
  projectDir: string,
  bundleId: string,
  ruleId: string,
  manifest: Record<string, unknown> = {}
): ProjectLocalBundle {
  const bundlePath = join(projectDir, '.aiwg', 'extensions', bundleId);
  const rulesDir = join(bundlePath, 'rules');
  mkdirSync(rulesDir, { recursive: true });
  writeFileSync(join(rulesDir, `${ruleId}.md`), `---\nid: ${ruleId}\n---\n\n# ${ruleId}\n`);
  const merged: Record<string, unknown> = {
    id: bundleId,
    type: 'extension',
    name: bundleId,
    version: '1.0.0',
    description: 'Test bundle',
    manifestVersion: '1',
    platforms: { claude: 'full' },
    keywords: ['test'],
    deployment: { pathTemplate: '.{platform}/rules/{id}.md' },
    ...manifest,
  };
  writeFileSync(join(bundlePath, 'manifest.json'), JSON.stringify(merged, null, 2));
  return {
    id: bundleId,
    type: 'extension',
    manifest: merged as ProjectLocalBundle['manifest'],
    bundlePath,
    localPath: `.aiwg/extensions/${bundleId}/`,
    manifestPath: `.aiwg/extensions/${bundleId}/manifest.json`,
  };
}

describe('shadow-resolver (#1036)', () => {
  let frameworkRoot: string;
  let projectDir: string;

  beforeEach(() => {
    frameworkRoot = makeTmpDir('aiwg-fr');
    projectDir = makeTmpDir('aiwg-proj');
  });

  afterEach(() => {
    rmSync(frameworkRoot, { recursive: true, force: true });
    rmSync(projectDir, { recursive: true, force: true });
  });

  it('Case 1 — no collision: deploys without warning', async () => {
    writeUpstreamRule(frameworkRoot, 'aiwg-utils', 'human-authorization');
    const bundle = writeProjectBundleRule(projectDir, 'foo', 'project-only-rule');
    const upstream = await buildUpstreamRegistry({ frameworkRoot });
    const result = await resolveShadows([bundle], upstream);

    expect(result.shadows).toHaveLength(0);
    expect(result.blockedBundleIds.size).toBe(0);
    expect(result.resolutions[0].verdict).toBe('deploy');
  });

  it('Case 2 — non-safety shadow: deploy-with-warning', async () => {
    writeUpstreamRule(frameworkRoot, 'aiwg-utils', 'optional-rule');
    const bundle = writeProjectBundleRule(projectDir, 'foo', 'optional-rule');
    const upstream = await buildUpstreamRegistry({ frameworkRoot });
    const result = await resolveShadows([bundle], upstream);

    expect(result.shadows).toHaveLength(1);
    expect(result.shadows[0].verdict).toBe('deploy-with-warning');
    expect(result.shadows[0].blocking).toBe(false);
    expect(result.blockedBundleIds.size).toBe(0);
  });

  it('Case 3 — safety-critical with overrides: deploy-acknowledged', async () => {
    writeUpstreamRule(frameworkRoot, 'aiwg-utils', 'human-authorization', { safetyCritical: true });
    const bundle = writeProjectBundleRule(projectDir, 'foo', 'human-authorization', {
      overrides: ['human-authorization'],
    });
    const upstream = await buildUpstreamRegistry({ frameworkRoot });
    const result = await resolveShadows([bundle], upstream);

    expect(result.shadows).toHaveLength(1);
    expect(result.shadows[0].verdict).toBe('deploy-acknowledged');
    expect(result.shadows[0].prominent).toBe(true);
    expect(result.shadows[0].blocking).toBe(false);
    expect(result.blockedBundleIds.size).toBe(0);
  });

  it('Case 4 — safety-critical without overrides: REFUSE', async () => {
    writeUpstreamRule(frameworkRoot, 'aiwg-utils', 'human-authorization', { safetyCritical: true });
    const bundle = writeProjectBundleRule(projectDir, 'foo', 'human-authorization');
    const upstream = await buildUpstreamRegistry({ frameworkRoot });
    const result = await resolveShadows([bundle], upstream);

    expect(result.shadows).toHaveLength(1);
    expect(result.shadows[0].verdict).toBe('refuse-unsafe');
    expect(result.shadows[0].blocking).toBe(true);
    expect(result.blockedBundleIds.has('foo')).toBe(true);
    expect(result.shadows[0].message).toContain("overrides: [\"human-authorization\"]");
  });

  it('Case 5 — phantom override: REFUSE', async () => {
    writeUpstreamRule(frameworkRoot, 'aiwg-utils', 'human-authorization', { safetyCritical: true });
    const bundle = writeProjectBundleRule(projectDir, 'foo', 'project-only-rule', {
      overrides: ['nonexistent-upstream-id'],
    });
    const upstream = await buildUpstreamRegistry({ frameworkRoot });
    const result = await resolveShadows([bundle], upstream);

    const phantom = result.resolutions.find((r) => r.verdict === 'refuse-phantom');
    expect(phantom).toBeDefined();
    expect(phantom?.message).toContain('nonexistent-upstream-id');
    expect(result.blockedBundleIds.has('foo')).toBe(true);
  });

  it('Case 6 — two project-local bundles export same artifact id: REFUSE both', async () => {
    const a = writeProjectBundleRule(projectDir, 'foo', 'shared-rule');
    const b = writeProjectBundleRule(projectDir, 'bar', 'shared-rule');
    const upstream = await buildUpstreamRegistry({ frameworkRoot });
    const result = await resolveShadows([a, b], upstream);

    const dups = result.resolutions.filter((r) => r.verdict === 'refuse-duplicate');
    expect(dups).toHaveLength(2);
    expect(result.blockedBundleIds.has('foo')).toBe(true);
    expect(result.blockedBundleIds.has('bar')).toBe(true);
  });

  it('Case 7 — git-installed (cache) shadow: same path as bundled, source label differs', async () => {
    const cacheRoot = makeTmpDir('aiwg-cache');
    try {
      // Place an upstream rule in the cache root rather than framework root
      const dir = join(cacheRoot, 'some-pkg', 'rules');
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, 'cache-rule.md'), '---\nid: cache-rule\n---\n\n# cache-rule\n');

      const bundle = writeProjectBundleRule(projectDir, 'foo', 'cache-rule');
      const upstream = await buildUpstreamRegistry({ frameworkRoot, cacheRoot });
      const result = await resolveShadows([bundle], upstream);

      expect(result.shadows).toHaveLength(1);
      expect(result.shadows[0].verdict).toBe('deploy-with-warning');
      expect(result.shadows[0].upstream?.source).toBe('cache');
      expect(result.shadows[0].message).toContain('git-installed');
    } finally {
      rmSync(cacheRoot, { recursive: true, force: true });
    }
  });

  it('formatShadowReport returns empty string for empty result', async () => {
    const upstream = await buildUpstreamRegistry({ frameworkRoot });
    const result = await resolveShadows([], upstream);
    expect(formatShadowReport(result)).toBe('');
  });

  it('formatShadowReport surfaces blockers with ✗ marker', async () => {
    writeUpstreamRule(frameworkRoot, 'aiwg-utils', 'human-authorization', { safetyCritical: true });
    const bundle = writeProjectBundleRule(projectDir, 'foo', 'human-authorization');
    const upstream = await buildUpstreamRegistry({ frameworkRoot });
    const result = await resolveShadows([bundle], upstream);
    const report = formatShadowReport(result);

    expect(report).toContain('blocked artifacts');
    expect(report).toContain('refuse-unsafe');
    expect(report).toContain('human-authorization');
  });

  it('upstream registry detects safety-critical from frontmatter on real human-authorization rule', async () => {
    // Sanity check against the actual upstream file we flagged in this PR
    const realFramework = process.cwd();
    const upstream = await buildUpstreamRegistry({ frameworkRoot: realFramework });
    const ha = upstream.byKey.get('rule:human-authorization');
    expect(ha).toBeDefined();
    expect(ha?.safetyCritical).toBe(true);
  });
});
