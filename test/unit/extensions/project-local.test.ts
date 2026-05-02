/**
 * Project-local artifact lifecycle — cross-cutting matrix tests (#1046)
 *
 * Per-source unit coverage lives in:
 *   - project-local-discovery.test.ts (discovery scanner)
 *   - manifest.test.ts                (Zod schema)
 *   - shadow-resolver.test.ts         (override / shadow policy)
 *
 * This file covers matrix rows from #1046 that span multiple modules or that
 * weren't naturally owned by an existing per-source file.
 *
 * @see .aiwg/testing/test-strategy-project-local.md
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { BundleManifestSchema } from '../../../src/extensions/manifest.js';
import { discoverProjectLocalBundles } from '../../../src/extensions/project-local-discovery.js';
import { resolveShadows } from '../../../src/extensions/shadow-resolver.js';
import { buildUpstreamRegistry } from '../../../src/extensions/upstream-registry.js';

function makeTmpDir(prefix = 'aiwg-pl-matrix'): string {
  const dir = join(tmpdir(), `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function baseAddonManifest(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'foo',
    type: 'addon',
    name: 'Foo',
    version: '1.0.0',
    description: 'Test addon',
    manifestVersion: '1',
    platforms: { claude: 'full' },
    keywords: ['test'],
    deployment: { pathTemplate: '.{platform}/skills/{id}.md' },
    addonConfig: { entry: { skills: 'skills/' } },
    ...overrides,
  };
}

function writeBundle(
  projectDir: string,
  type: 'extensions' | 'addons' | 'frameworks' | 'plugins',
  name: string,
  manifest: Record<string, unknown>,
): string {
  const bundleDir = join(projectDir, '.aiwg', type, name);
  mkdirSync(bundleDir, { recursive: true });
  writeFileSync(join(bundleDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  return bundleDir;
}

function writeRule(bundleDir: string, ruleId: string): void {
  const dir = join(bundleDir, 'rules');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${ruleId}.md`), `---\nid: ${ruleId}\n---\n\n# ${ruleId}\n`);
}

describe('project-local matrix (#1046)', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTmpDir();
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  // ── D-8: Path-traversal in entry paths ────────────────────────────────────
  describe('D-8: path-traversal refusal at the schema layer', () => {
    it('rejects `entry.skills: "../../etc/foo"`', () => {
      const m = baseAddonManifest({
        addonConfig: { entry: { skills: '../../etc/foo' } },
      });
      const result = BundleManifestSchema.safeParse(m);
      expect(result.success).toBe(false);
    });

    it('rejects `frameworkConfig.path: "../../etc"`', () => {
      const m = baseAddonManifest({
        type: 'framework',
        addonConfig: undefined,
        frameworkConfig: { path: '../../etc' },
      });
      const result = BundleManifestSchema.safeParse(m);
      expect(result.success).toBe(false);
    });

    it('rejects `pluginConfig.payloadPath` containing `..`', () => {
      const m = baseAddonManifest({
        type: 'plugin',
        addonConfig: undefined,
        pluginConfig: { payloadType: 'addon', payloadPath: 'safe/../escape' },
      });
      const result = BundleManifestSchema.safeParse(m);
      expect(result.success).toBe(false);
    });

    it('accepts a clean relative path under the bundle', () => {
      const m = baseAddonManifest({
        addonConfig: { entry: { skills: 'skills/' } },
      });
      expect(BundleManifestSchema.safeParse(m).success).toBe(true);
    });
  });

  // ── D-9: Unicode bundle names ─────────────────────────────────────────────
  describe('D-9: unicode bundle names', () => {
    it('rejects non-ASCII bundle ids (kebab-case rule, ASCII-only)', () => {
      const m = baseAddonManifest({ id: 'café' });
      const result = BundleManifestSchema.safeParse(m);
      expect(result.success).toBe(false);
    });

    it('does not crash discovery when the directory name is unicode but manifest id is ASCII', async () => {
      // FS may store any unicode, but the manifest id is what matters for collisions.
      const dirName = 'café-bundle';
      writeBundle(tmpDir, 'addons', dirName, baseAddonManifest({ id: 'cafe-bundle' }));
      const result = await discoverProjectLocalBundles(tmpDir);
      // Either succeeds (found 1) or surfaces a structured error — never throws
      expect(result.bundles.length + result.errors.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ── C-3: Cross-type bundle id collision (extension vs addon) ──────────────
  describe('C-3: cross-type bundle id collision', () => {
    it('allows the same bundle id in two different type directories', async () => {
      writeBundle(tmpDir, 'extensions', 'foo', baseAddonManifest({
        id: 'foo',
        type: 'extension',
        addonConfig: undefined,
      }));
      writeBundle(tmpDir, 'addons', 'foo', baseAddonManifest({ id: 'foo' }));

      const result = await discoverProjectLocalBundles(tmpDir);
      // Both load — namespaces are per-type
      const ids = result.bundles.map(b => `${b.type}:${b.id}`).sort();
      expect(ids).toEqual(['addon:foo', 'extension:foo']);
    });

    it('refuses both bundles when they each export the same artifact id+type', async () => {
      const extDir = writeBundle(tmpDir, 'extensions', 'foo', baseAddonManifest({
        id: 'foo',
        type: 'extension',
        addonConfig: undefined,
      }));
      writeRule(extDir, 'shared-rule');

      const addonDir = writeBundle(tmpDir, 'addons', 'foo', baseAddonManifest({ id: 'foo' }));
      writeRule(addonDir, 'shared-rule');

      const discovery = await discoverProjectLocalBundles(tmpDir);
      const upstreamRoot = makeTmpDir('aiwg-fr');
      try {
        const upstream = await buildUpstreamRegistry({ frameworkRoot: upstreamRoot });
        const verdict = await resolveShadows(discovery.bundles, upstream);
        const dups = verdict.resolutions.filter(r => r.verdict === 'refuse-duplicate');
        expect(dups).toHaveLength(2);
        expect(verdict.blockedBundleIds.has('foo')).toBe(true);
      } finally {
        rmSync(upstreamRoot, { recursive: true, force: true });
      }
    });
  });

  // ── C-2: Three-way collision (project + cache + bundled) ──────────────────
  describe('C-2: three-way collision project-local + cache + bundled', () => {
    it('project-local wins over both cache (git-installed) and bundled upstream', async () => {
      const frameworkRoot = makeTmpDir('aiwg-fr');
      const cacheRoot = makeTmpDir('aiwg-cache');
      try {
        // Bundled upstream rule
        const bundledDir = join(frameworkRoot, 'agentic/code/addons/aiwg-utils/rules');
        mkdirSync(bundledDir, { recursive: true });
        writeFileSync(join(bundledDir, 'three-way.md'), '---\nid: three-way\n---\n\n# bundled\n');

        // Cache (git-installed) version of the same id
        const cacheDir = join(cacheRoot, 'some-pkg', 'rules');
        mkdirSync(cacheDir, { recursive: true });
        writeFileSync(join(cacheDir, 'three-way.md'), '---\nid: three-way\n---\n\n# cache\n');

        // Project-local version
        const bundle = writeBundle(tmpDir, 'extensions', 'mine', {
          id: 'mine',
          type: 'extension',
          name: 'Mine',
          version: '1.0.0',
          description: 'Three-way collision bundle',
          manifestVersion: '1',
          platforms: { claude: 'full' },
          keywords: ['test'],
          deployment: { pathTemplate: '.{platform}/rules/{id}.md' },
        });
        writeRule(bundle, 'three-way');

        const discovery = await discoverProjectLocalBundles(tmpDir);
        const upstream = await buildUpstreamRegistry({ frameworkRoot, cacheRoot });
        const verdict = await resolveShadows(discovery.bundles, upstream);

        // Exactly one shadow surfaced; verdict is deploy-with-warning (not safety-critical)
        expect(verdict.shadows).toHaveLength(1);
        expect(verdict.shadows[0].verdict).toBe('deploy-with-warning');
        expect(verdict.shadows[0].artifactId).toBe('three-way');
        expect(verdict.blockedBundleIds.size).toBe(0);
      } finally {
        rmSync(frameworkRoot, { recursive: true, force: true });
        rmSync(cacheRoot, { recursive: true, force: true });
      }
    });
  });
});
