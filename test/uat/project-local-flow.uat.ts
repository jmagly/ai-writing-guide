/**
 * UAT: Project-local artifact bundle lifecycle (#1046)
 *
 * Validates the end-to-end flow for a project-local bundle:
 *   1. Operator scaffolds `.aiwg/extensions/<id>/` with manifest + a rule
 *   2. Discovery surfaces the bundle without errors
 *   3. Shadow resolution against an empty upstream is a clean "deploy"
 *   4. Removing the bundle directory makes discovery silent again
 *
 * No mocking — all filesystem operations run against real temp directories.
 *
 * Run on demand (included in npm run uat):
 *   npm run uat
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, writeFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import { tmpdir } from 'os';

// @ts-ignore
const __dirname_uat = new URL('.', import.meta.url).pathname;
const PROJECT_ROOT = resolve(__dirname_uat, '../..');

function makeTmpDir(): string {
  const dir = join(tmpdir(), `aiwg-uat-pl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function scaffoldBundle(projectDir: string, id: string): string {
  const bundleDir = join(projectDir, '.aiwg', 'extensions', id);
  mkdirSync(join(bundleDir, 'rules'), { recursive: true });
  writeFileSync(
    join(bundleDir, 'manifest.json'),
    JSON.stringify({
      id,
      type: 'extension',
      name: id,
      version: '1.0.0',
      description: 'UAT project-local bundle',
      manifestVersion: '1',
      platforms: { claude: 'full' },
      keywords: ['uat'],
      deployment: { pathTemplate: '.{platform}/rules/{id}.md' },
    }, null, 2),
  );
  writeFileSync(
    join(bundleDir, 'rules', `${id}-rule.md`),
    `---\nid: ${id}-rule\n---\n\n# ${id} rule\n`,
  );
  return bundleDir;
}

describe('UAT: project-local bundle round-trip (#1046)', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTmpDir();
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('scaffold → discover → resolve → remove → re-discover', async () => {
    // @ts-ignore — JS module loaded by Node ESM
    const { discoverProjectLocalBundles } = await import(
      join(PROJECT_ROOT, 'src/extensions/project-local-discovery.js')
    );
    // @ts-ignore
    const { resolveShadows } = await import(
      join(PROJECT_ROOT, 'src/extensions/shadow-resolver.js')
    );
    // @ts-ignore
    const { buildUpstreamRegistry } = await import(
      join(PROJECT_ROOT, 'src/extensions/upstream-registry.js')
    );

    // ── Step 1: scaffold a project-local bundle ──
    const bundleDir = scaffoldBundle(tmpDir, 'uat-bundle');
    expect(existsSync(join(bundleDir, 'manifest.json'))).toBe(true);

    // ── Step 2: discover surfaces the bundle, no errors ──
    const found = await discoverProjectLocalBundles(tmpDir);
    expect(found.errors).toEqual([]);
    expect(found.bundles).toHaveLength(1);
    expect(found.bundles[0].id).toBe('uat-bundle');
    expect(found.bundles[0].localPath).toBe('.aiwg/extensions/uat-bundle/');

    // ── Step 3: shadow resolution against an empty upstream is a clean deploy ──
    const emptyRoot = makeTmpDir();
    try {
      const upstream = await buildUpstreamRegistry({ frameworkRoot: emptyRoot });
      const verdict = await resolveShadows(found.bundles, upstream);
      expect(verdict.blockedBundleIds.size).toBe(0);
      expect(verdict.shadows).toEqual([]);
      expect(verdict.resolutions.find((r: any) => r.artifactId === 'uat-bundle-rule')?.verdict).toBe('deploy');
    } finally {
      rmSync(emptyRoot, { recursive: true, force: true });
    }

    // ── Step 4: remove the bundle dir, re-discover sees nothing ──
    rmSync(bundleDir, { recursive: true, force: true });
    const reDiscover = await discoverProjectLocalBundles(tmpDir);
    expect(reDiscover.bundles).toEqual([]);
    expect(reDiscover.isEmpty).toBe(true);
  });

  it('scaffold safety-critical shadow without overrides → resolveShadows refuses', async () => {
    // @ts-ignore
    const { discoverProjectLocalBundles } = await import(
      join(PROJECT_ROOT, 'src/extensions/project-local-discovery.js')
    );
    // @ts-ignore
    const { resolveShadows } = await import(
      join(PROJECT_ROOT, 'src/extensions/shadow-resolver.js')
    );
    // @ts-ignore
    const { buildUpstreamRegistry } = await import(
      join(PROJECT_ROOT, 'src/extensions/upstream-registry.js')
    );

    // Use the real repo as upstream — `human-authorization` is safety-critical there
    const bundleDir = join(tmpDir, '.aiwg', 'extensions', 'shadow-attempt');
    mkdirSync(join(bundleDir, 'rules'), { recursive: true });
    writeFileSync(
      join(bundleDir, 'manifest.json'),
      JSON.stringify({
        id: 'shadow-attempt',
        type: 'extension',
        name: 'shadow-attempt',
        version: '1.0.0',
        description: 'UAT shadow refusal',
        manifestVersion: '1',
        platforms: { claude: 'full' },
        keywords: ['uat'],
        deployment: { pathTemplate: '.{platform}/rules/{id}.md' },
      }, null, 2),
    );
    writeFileSync(
      join(bundleDir, 'rules', 'human-authorization.md'),
      `---\nid: human-authorization\n---\n\n# overridden\n`,
    );

    const found = await discoverProjectLocalBundles(tmpDir);
    expect(found.bundles).toHaveLength(1);

    const upstream = await buildUpstreamRegistry({ frameworkRoot: PROJECT_ROOT });
    const verdict = await resolveShadows(found.bundles, upstream);

    const refusal = verdict.resolutions.find((r: any) => r.verdict === 'refuse-unsafe');
    expect(refusal).toBeDefined();
    expect(verdict.blockedBundleIds.has('shadow-attempt')).toBe(true);
  });
});
