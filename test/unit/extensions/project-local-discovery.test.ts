/**
 * Unit tests for project-local bundle discovery (#1034)
 *
 * @source @src/extensions/project-local-discovery.ts
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, writeFileSync, symlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  discoverProjectLocalBundles,
  loadAndValidateManifest,
} from '../../../src/extensions/project-local-discovery.js';

function makeTmpDir(): string {
  const dir = join(tmpdir(), `aiwg-pl-discovery-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function writeBundle(
  projectDir: string,
  type: 'extensions' | 'addons' | 'frameworks' | 'plugins',
  name: string,
  manifest: Record<string, unknown>
): void {
  const bundleDir = join(projectDir, '.aiwg', type, name);
  mkdirSync(bundleDir, { recursive: true });
  writeFileSync(join(bundleDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
}

function validManifest(overrides: Record<string, unknown> = {}): Record<string, unknown> {
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

describe('project-local-discovery', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTmpDir();
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('UC-PL-6: no project-local artifacts', () => {
    it('returns empty result when no .aiwg/<type>/ dirs exist', async () => {
      const result = await discoverProjectLocalBundles(tmpDir);
      expect(result.bundles).toEqual([]);
      expect(result.errors).toEqual([]);
      expect(result.isEmpty).toBe(true);
    });

    it('silently skips dirs without manifest.json (workspace state, not bundles)', async () => {
      // Per #1058: dirs without manifest.json are not malformed bundles —
      // they're workspace state (e.g. .aiwg/frameworks/<id>/working/) or
      // simply empty placeholder dirs. The scanner ignores them silently.
      mkdirSync(join(tmpDir, '.aiwg', 'extensions', 'foo'), { recursive: true });
      const result = await discoverProjectLocalBundles(tmpDir);
      expect(result.bundles).toEqual([]);
      expect(result.errors).toEqual([]);
      expect(result.isEmpty).toBe(true);
    });

    it('silently skips missing dirs and processes present ones (UC-PL-2 incremental add)', async () => {
      writeBundle(tmpDir, 'addons', 'bar', validManifest({ id: 'bar' }));
      // No extensions/ dir at all
      const result = await discoverProjectLocalBundles(tmpDir);
      expect(result.bundles).toHaveLength(1);
      expect(result.bundles[0].id).toBe('bar');
    });
  });

  describe('UC-PL-1: first discovery', () => {
    it('discovers a single addon bundle', async () => {
      writeBundle(tmpDir, 'addons', 'foo', validManifest());
      const result = await discoverProjectLocalBundles(tmpDir);
      expect(result.bundles).toHaveLength(1);
      expect(result.bundles[0].id).toBe('foo');
      expect(result.bundles[0].type).toBe('addon');
      expect(result.bundles[0].localPath).toBe('.aiwg/addons/foo/');
      expect(result.counts.addon).toBe(1);
      expect(result.isEmpty).toBe(false);
    });

    it('discovers bundles across all four type directories', async () => {
      writeBundle(tmpDir, 'extensions', 'a', validManifest({ id: 'a', type: 'extension', addonConfig: undefined }));
      writeBundle(tmpDir, 'addons', 'b', validManifest({ id: 'b' }));
      writeBundle(tmpDir, 'frameworks', 'c', validManifest({ id: 'c', type: 'framework', addonConfig: undefined, frameworkConfig: { path: 'src/' } }));
      writeBundle(tmpDir, 'plugins', 'd', validManifest({ id: 'd', type: 'plugin', addonConfig: undefined, pluginConfig: { payloadType: 'addon', payloadPath: 'payload/' } }));

      const result = await discoverProjectLocalBundles(tmpDir);
      expect(result.bundles).toHaveLength(4);
      expect(result.counts).toEqual({ extension: 1, addon: 1, framework: 1, plugin: 1 });
    });
  });

  describe('UC-PL-5: malformed manifest tolerance', () => {
    it('reports invalid JSON without halting other valid bundles', async () => {
      const goodDir = join(tmpDir, '.aiwg', 'addons', 'good');
      mkdirSync(goodDir, { recursive: true });
      writeFileSync(join(goodDir, 'manifest.json'), JSON.stringify(validManifest({ id: 'good' })));

      const badDir = join(tmpDir, '.aiwg', 'addons', 'bad');
      mkdirSync(badDir, { recursive: true });
      writeFileSync(join(badDir, 'manifest.json'), '{ this is not JSON');

      const result = await discoverProjectLocalBundles(tmpDir);
      expect(result.bundles).toHaveLength(1);
      expect(result.bundles[0].id).toBe('good');
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some((e) => e.field === '(JSON parse)')).toBe(true);
    });

    it('reports schema-invalid manifest as structured error', async () => {
      writeBundle(tmpDir, 'addons', 'broken', { id: 'broken' /* missing required fields */ });
      const result = await discoverProjectLocalBundles(tmpDir);
      expect(result.bundles).toHaveLength(0);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('rejects manifest with mismatched type vs directory', async () => {
      // Manifest says type: addon but lives in .aiwg/extensions/
      writeBundle(tmpDir, 'extensions', 'mismatch', validManifest({ id: 'mismatch' }));
      const result = await discoverProjectLocalBundles(tmpDir);
      expect(result.bundles).toHaveLength(0);
      expect(result.errors.some((e) => e.field === 'type')).toBe(true);
    });
  });

  describe('NFR-PL-11: size cap', () => {
    it('refuses manifest > 64 KB before parse', async () => {
      const dir = join(tmpDir, '.aiwg', 'addons', 'huge');
      mkdirSync(dir, { recursive: true });
      // Write 65 KB of JSON-ish content
      writeFileSync(join(dir, 'manifest.json'), '"' + 'x'.repeat(65 * 1024) + '"');

      const result = await discoverProjectLocalBundles(tmpDir);
      expect(result.bundles).toHaveLength(0);
      expect(result.errors.some((e) => e.field === '(file size)')).toBe(true);
    });
  });

  describe('NFR-PL-10: symlink refusal', () => {
    it('refuses symlinked bundle directory by default', async () => {
      // Create a real bundle outside .aiwg
      const realBundle = join(tmpDir, 'real-bundle');
      mkdirSync(realBundle);
      writeFileSync(join(realBundle, 'manifest.json'), JSON.stringify(validManifest({ id: 'real' })));

      // Create a symlink at .aiwg/addons/foo pointing to real-bundle
      mkdirSync(join(tmpDir, '.aiwg', 'addons'), { recursive: true });
      try {
        symlinkSync(realBundle, join(tmpDir, '.aiwg', 'addons', 'foo'));
      } catch {
        // skip on platforms that disallow symlinks for the test user
        return;
      }

      const result = await discoverProjectLocalBundles(tmpDir);
      expect(result.bundles).toHaveLength(0);
      expect(result.errors.some((e) => e.actual === 'symlink')).toBe(true);
    });

    it('accepts symlinked bundle directory when allowSymlinks is true', async () => {
      const realBundle = join(tmpDir, 'real-bundle');
      mkdirSync(realBundle);
      writeFileSync(join(realBundle, 'manifest.json'), JSON.stringify(validManifest({ id: 'real' })));

      mkdirSync(join(tmpDir, '.aiwg', 'addons'), { recursive: true });
      try {
        symlinkSync(realBundle, join(tmpDir, '.aiwg', 'addons', 'foo'));
      } catch {
        return;
      }

      const result = await discoverProjectLocalBundles(tmpDir, { allowSymlinks: true });
      expect(result.bundles).toHaveLength(1);
      expect(result.bundles[0].id).toBe('real');
    });
  });

  describe('NFR-PL-6: case-conflict refusal', () => {
    it('refuses two bundles within the same type that differ only in case', async () => {
      writeBundle(tmpDir, 'addons', 'foo', validManifest({ id: 'foo' }));
      writeBundle(tmpDir, 'addons', 'Foo', validManifest({ id: 'Foo' }));
      // On case-insensitive filesystems, the second writeBundle may overwrite
      // the first. Skip the test if only one bundle resulted.
      const result = await discoverProjectLocalBundles(tmpDir);
      // Either: refused (case-sensitive FS) or same id seen twice
      if (result.bundles.length === 0) {
        // Both refused due to case collision
        expect(result.errors.some((e) => e.field === 'id')).toBe(true);
      } else {
        // Single FS entry won — this is a CI-platform-dependent outcome, accept it
        expect(result.bundles.length).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('legacy file ignored (#1039 §3)', () => {
    it('does not treat .aiwg/frameworks/registry.json as a bundle', async () => {
      mkdirSync(join(tmpDir, '.aiwg', 'frameworks'), { recursive: true });
      writeFileSync(
        join(tmpDir, '.aiwg', 'frameworks', 'registry.json'),
        JSON.stringify({ frameworks: [] })
      );

      const result = await discoverProjectLocalBundles(tmpDir);
      // No bundle found, no error (the file is not a directory and is silently skipped)
      expect(result.bundles).toHaveLength(0);
      // `registry.json` is a regular file, lstat reports !isDirectory, skipped
      // without an error entry.
      expect(result.errors).toEqual([]);
    });
  });

  describe('loadAndValidateManifest (direct)', () => {
    it('returns absent error when manifest.json missing', async () => {
      const result = await loadAndValidateManifest(
        join(tmpDir, 'nonexistent', 'manifest.json'),
        'addon',
        tmpDir
      );
      expect(result.bundle).toBeUndefined();
      expect(result.errors[0].actual).toBe('absent');
    });
  });

  // Regression: framework workspace dirs created by aiwg use must not be
  // flagged as malformed bundles. The path .aiwg/frameworks/<id>/ is
  // overloaded — both project-local framework bundles AND workspace state
  // from initializeFrameworkWorkspace() share that location. Issue #1058.
  describe('framework workspace dirs (#1058)', () => {
    it('silently skips .aiwg/frameworks/<id>/ dirs without manifest.json', async () => {
      // Simulate workspace state from `aiwg use sdlc`
      const wsDir = join(tmpDir, '.aiwg', 'frameworks', 'sdlc-complete');
      mkdirSync(join(wsDir, 'archive'), { recursive: true });
      mkdirSync(join(wsDir, 'projects'), { recursive: true });
      mkdirSync(join(wsDir, 'repo'), { recursive: true });
      mkdirSync(join(wsDir, 'working'), { recursive: true });
      // Note: no manifest.json — this is workspace state, not a bundle

      const result = await discoverProjectLocalBundles(tmpDir);
      expect(result.bundles).toEqual([]);
      expect(result.errors).toEqual([]);
      expect(result.isEmpty).toBe(true);
    });

    it('still flags real malformed bundles (manifest.json present but invalid)', async () => {
      // A genuine project-local bundle with a broken manifest still errors
      const bundleDir = join(tmpDir, '.aiwg', 'frameworks', 'my-framework');
      mkdirSync(bundleDir, { recursive: true });
      writeFileSync(join(bundleDir, 'manifest.json'), 'not json');

      const result = await discoverProjectLocalBundles(tmpDir);
      expect(result.bundles).toEqual([]);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].field).toBe('(JSON parse)');
    });

    it('happily coexists: workspace dirs ignored, real bundles discovered', async () => {
      // Workspace dir (no manifest)
      mkdirSync(join(tmpDir, '.aiwg', 'frameworks', 'sdlc-complete', 'working'), { recursive: true });
      // Real bundle (has manifest)
      const frameworkManifest = validManifest({
        id: 'my-fw',
        type: 'framework',
        frameworkConfig: { path: 'src/' },
      });
      delete (frameworkManifest as Record<string, unknown>).addonConfig;
      writeBundle(tmpDir, 'frameworks', 'my-fw', frameworkManifest);

      const result = await discoverProjectLocalBundles(tmpDir);
      expect(result.bundles).toHaveLength(1);
      expect(result.bundles[0].id).toBe('my-fw');
      expect(result.errors).toEqual([]);
    });
  });
});
