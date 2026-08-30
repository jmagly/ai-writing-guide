import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { getFeature } from '../../../src/features/catalog.js';
import { prepareFeatureManifest } from '../../../src/features/installer.js';
import { loadFeaturePackage, requireFeaturePackage } from '../../../src/features/runtime.js';
import { SessionRepository } from '../../../src/sessions/repository.js';
import { getFeatureStatus } from '../../../src/features/status.js';

const tempRoots: string[] = [];
const originalFeatureHome = process.env.AIWG_FEATURES_HOME;
const originalAiwgRoot = process.env.AIWG_ROOT;

async function tempDir(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), 'aiwg-native-policy-'));
  tempRoots.push(root);
  return root;
}

async function writeFakePackage(root: string, name: string, source: string): Promise<void> {
  const packageRoot = path.join(root, 'node_modules', name);
  await mkdir(packageRoot, { recursive: true });
  await writeFile(path.join(packageRoot, 'package.json'), JSON.stringify({ name, version: '1.0.0', main: 'index.js' }));
  await writeFile(path.join(packageRoot, 'index.js'), source);
}

afterEach(async () => {
  if (originalFeatureHome === undefined) delete process.env.AIWG_FEATURES_HOME;
  else process.env.AIWG_FEATURES_HOME = originalFeatureHome;
  if (originalAiwgRoot === undefined) delete process.env.AIWG_ROOT;
  else process.env.AIWG_ROOT = originalAiwgRoot;
  await Promise.all(tempRoots.splice(0).map(root => rm(root, { recursive: true, force: true })));
});

describe('optional native feature policy', () => {
  it('writes package-specific script approvals and preserves prior feature dependencies', async () => {
    const root = await tempDir();
    const pty = getFeature('pty');
    const embeddings = getFeature('embeddings');
    expect(pty).not.toBeNull();
    expect(embeddings).not.toBeNull();

    await writeFile(path.join(root, 'package.json'), JSON.stringify({
      dependencies: { 'unmanaged-package': 'latest' },
      allowScripts: { 'unmanaged-package': true },
    }));

    await prepareFeatureManifest(pty!, root);
    await prepareFeatureManifest(embeddings!, root);

    const manifest = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
    expect(manifest.private).toBe(true);
    expect(manifest.dependencies['node-pty']).toBe('1.1.0');
    expect(manifest.dependencies['hnswlib-node']).toBe('3.0.0');
    expect(manifest.dependencies).not.toHaveProperty('unmanaged-package');
    expect(manifest.allowScripts).toEqual({
      'node-pty': true,
      'hnswlib-node': true,
    });
  });

  it('reports package files with a missing native build as unavailable', async () => {
    const featureRoot = await tempDir();
    const aiwgRoot = await tempDir();
    process.env.AIWG_FEATURES_HOME = featureRoot;
    process.env.AIWG_ROOT = aiwgRoot;
    await writeFakePackage(featureRoot, 'node-pty', "module.exports = require('./build/Release/pty.node')");

    const status = await getFeatureStatus('pty');

    expect(status?.available).toBe(false);
    expect(status?.packages[0]).toMatchObject({
      name: 'node-pty',
      installed: true,
      loadable: false,
    });
    expect(status?.packages[0].error).toContain('Cannot find module');
  });

  it('accepts a native feature only when its runtime entry point loads', async () => {
    const featureRoot = await tempDir();
    const aiwgRoot = await tempDir();
    process.env.AIWG_FEATURES_HOME = featureRoot;
    process.env.AIWG_ROOT = aiwgRoot;
    await writeFakePackage(featureRoot, 'node-pty', 'module.exports = { spawn() {} }');

    const status = await getFeatureStatus('pty');

    expect(status?.available).toBe(true);
    expect(status?.packages[0]).toMatchObject({ installed: true, loadable: true, error: null });
  });

  it('loads a package from the user feature root for runtime consumers', async () => {
    const featureRoot = await tempDir();
    process.env.AIWG_FEATURES_HOME = featureRoot;
    await writeFakePackage(featureRoot, 'node-pty', 'module.exports = { source: "feature-root", spawn() {} }');

    const loaded = await loadFeaturePackage('node-pty');
    const module = (loaded.default ?? loaded) as { source?: string; spawn?: unknown };

    expect(module.source).toBe('feature-root');
    expect(module.spawn).toBeTypeOf('function');
  });

  it('loads synchronous constructor dependencies from the user feature root', async () => {
    const featureRoot = await tempDir();
    process.env.AIWG_FEATURES_HOME = featureRoot;
    await writeFakePackage(featureRoot, 'feature-root-sync', 'module.exports = { source: "feature-root" }');

    const loaded = requireFeaturePackage('feature-root-sync') as { source?: string };

    expect(loaded.source).toBe('feature-root');
  });

  it('routes the session repository through the user-owned SQLite feature', async () => {
    const featureRoot = await tempDir();
    process.env.AIWG_FEATURES_HOME = featureRoot;
    await writeFakePackage(
      featureRoot,
      'better-sqlite3',
      'module.exports = class FeatureRootDatabase { constructor() { throw new Error("feature-root-selected"); } }',
    );

    expect(() => new SessionRepository(':memory:')).toThrow('feature-root-selected');
  });
});
