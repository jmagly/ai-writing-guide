import { spawnSync } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { FEATURE_CATALOG, getFeature, type FeatureDefinition } from './catalog.js';
import { getFeaturesRoot } from './paths.js';

interface FeatureManifest {
  name: string;
  private: true;
  version: string;
  description: string;
  dependencies: Record<string, string>;
  allowScripts: Record<string, boolean>;
}

export interface InstallFeatureOptions {
  root?: string;
  npmCommand?: string;
}

export async function prepareFeatureManifest(
  feature: FeatureDefinition,
  root = getFeaturesRoot(),
): Promise<FeatureManifest> {
  await fs.mkdir(root, { recursive: true });
  const manifestPath = path.join(root, 'package.json');
  let current: Partial<FeatureManifest> = {};
  try {
    current = JSON.parse(await fs.readFile(manifestPath, 'utf8')) as Partial<FeatureManifest>;
  } catch {
    // First install, or an invalid partial file left by an interrupted write.
  }

  const knownSpecs = Object.assign({}, ...FEATURE_CATALOG.map(candidate => candidate.packageSpecs)) as Record<string, string>;
  const priorDependencies = Object.fromEntries(
    Object.entries(current.dependencies ?? {}).filter(([name]) => name in knownSpecs),
  );
  const dependencies = {
    ...priorDependencies,
    ...feature.packageSpecs,
  };
  const allowScripts: Record<string, boolean> = {};
  for (const candidate of FEATURE_CATALOG) {
    for (const packageName of candidate.scriptPackages ?? []) {
      if (packageName in dependencies) allowScripts[packageName] = true;
    }
  }

  const manifest: FeatureManifest = {
    name: 'aiwg-optional-features',
    private: true,
    version: '1.0.0',
    description: 'User-owned optional runtime packages managed by aiwg features',
    dependencies,
    allowScripts,
  };

  const tempPath = `${manifestPath}.tmp-${process.pid}`;
  await fs.writeFile(tempPath, `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600 });
  await fs.rename(tempPath, manifestPath);
  return manifest;
}

export async function installFeature(name: string, options: InstallFeatureOptions = {}): Promise<string> {
  const feature = getFeature(name);
  if (!feature) throw new Error(`Unknown optional feature: ${name}`);

  const root = options.root ?? getFeaturesRoot();
  await prepareFeatureManifest(feature, root);

  const npmCommand = options.npmCommand ?? (process.platform === 'win32' ? 'npm.cmd' : 'npm');
  const result = spawnSync(
    npmCommand,
    ['install', '--prefix', root, '--no-audit', '--no-fund'],
    { stdio: 'inherit', env: process.env },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`npm exited with status ${result.status ?? 'unknown'} while installing ${name}`);
  }
  return root;
}
