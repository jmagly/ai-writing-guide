/**
 * Package Registry
 *
 * Manages ~/.aiwg/packages.yaml — the local registry of installed remote
 * packages (frameworks, addons, extensions installed via `aiwg install`).
 *
 * @implements #557
 */

import { readFile, writeFile, mkdir, access } from 'fs/promises';
import { resolve, join } from 'path';
import { homedir } from 'os';
import { existsSync } from 'fs';
import { stringify, parse } from 'yaml';
import type { PackageEntry, PackageDeployRecord, PackageInfo, PackageRegistryFile } from './types.js';

const PACKAGES_FILENAME = 'packages.yaml';

/**
 * Empty registry template
 */
function emptyRegistry(): PackageRegistryFile {
  return {
    apiVersion: 'aiwg.io/v1',
    kind: 'PackageRegistry',
    packages: {},
  };
}

/**
 * Resolve ~/.aiwg directory path using the same resolution logic as user-config
 */
function resolveAiwgDir(): string {
  // Respect explicit override
  if (process.env.AIWG_CONFIG) return process.env.AIWG_CONFIG;

  const primary = join(homedir(), '.aiwg');
  const xdg = join(homedir(), '.config', 'aiwg');

  if (existsSync(primary)) return primary;
  if (existsSync(xdg)) return xdg;
  return primary; // default
}

/**
 * Get the path to packages.yaml
 */
export function getPackagesFilePath(configDir?: string): string {
  const dir = configDir || resolveAiwgDir();
  return resolve(dir, PACKAGES_FILENAME);
}

/**
 * Read packages.yaml, returning an empty registry if the file does not exist
 */
export async function readPackageRegistry(configDir?: string): Promise<PackageRegistryFile> {
  const filePath = getPackagesFilePath(configDir);

  try {
    await access(filePath);
  } catch {
    return emptyRegistry();
  }

  const content = await readFile(filePath, 'utf-8');
  const parsed = parse(content) as PackageRegistryFile | null;
  if (!parsed || typeof parsed !== 'object') return emptyRegistry();

  // Ensure packages map exists
  if (!parsed.packages) parsed.packages = {};
  return parsed;
}

/**
 * Write packages.yaml, creating ~/.aiwg/ if needed
 */
export async function writePackageRegistry(
  registry: PackageRegistryFile,
  configDir?: string
): Promise<void> {
  const dir = configDir || resolveAiwgDir();
  await mkdir(dir, { recursive: true });

  const filePath = resolve(dir, PACKAGES_FILENAME);
  const content = stringify(registry, { lineWidth: 0 });
  await writeFile(filePath, content, 'utf-8');
}

/**
 * Get a single package entry by key (e.g. "roko/ring-methodology")
 */
export async function getPackageEntry(
  key: string,
  configDir?: string
): Promise<PackageEntry | undefined> {
  const registry = await readPackageRegistry(configDir);
  return registry.packages[key];
}

/**
 * Upsert a package entry
 */
export async function setPackageEntry(
  key: string,
  entry: PackageEntry,
  configDir?: string
): Promise<void> {
  const registry = await readPackageRegistry(configDir);
  registry.packages[key] = entry;
  await writePackageRegistry(registry, configDir);
}

/**
 * Remove a package entry
 */
export async function removePackageEntry(
  key: string,
  configDir?: string
): Promise<boolean> {
  const registry = await readPackageRegistry(configDir);
  if (!registry.packages[key]) return false;
  delete registry.packages[key];
  await writePackageRegistry(registry, configDir);
  return true;
}

/**
 * Record a deployment against an existing package entry
 */
export async function recordDeployment(
  key: string,
  record: PackageDeployRecord,
  configDir?: string
): Promise<void> {
  const registry = await readPackageRegistry(configDir);
  const entry = registry.packages[key];
  if (!entry) return;

  if (!entry.deployedTo) entry.deployedTo = [];

  // Replace existing record for the same project+provider
  const idx = entry.deployedTo.findIndex(
    (d) => d.projectPath === record.projectPath && d.provider === record.provider
  );
  if (idx >= 0) {
    entry.deployedTo[idx] = record;
  } else {
    entry.deployedTo.push(record);
  }

  registry.packages[key] = entry;
  await writePackageRegistry(registry, configDir);
}

/**
 * List all installed packages as PackageInfo summaries
 */
export async function listPackages(configDir?: string): Promise<PackageInfo[]> {
  const registry = await readPackageRegistry(configDir);
  return Object.entries(registry.packages).map(([key, entry]) => {
    const parts = key.split('/');
    return {
      key,
      name: parts.length > 1 ? parts.slice(1).join('/') : key,
      owner: parts.length > 1 ? parts[0] : undefined,
      version: entry.version,
      type: entry.type,
      source: entry.source,
      installedAt: entry.installedAt,
      deployCount: entry.deployedTo?.length ?? 0,
      ...(entry.provenance?.lockId ? { lockId: entry.provenance.lockId } : {}),
      ...(entry.provenance?.verificationStatus ? { verificationStatus: entry.provenance.verificationStatus } : {}),
    };
  });
}
