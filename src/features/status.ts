/**
 * Optional Features — Installation Status Probe
 *
 * Resolves whether each feature in the catalog is currently available
 * by attempting to read its packages from the AIWG install's
 * `node_modules`. Pure best-effort — never throws on missing packages,
 * just reports them as not installed.
 *
 * @implements #1219
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { FEATURE_CATALOG, type FeatureDefinition } from './catalog.js';

export interface PackageStatus {
  /** Package name as published on npm */
  name: string;
  /** True if `node_modules/<name>/package.json` resolves */
  installed: boolean;
  /** Version from the package.json if installed */
  version: string | null;
  /** Absolute path to the resolved package.json (for diagnostics) */
  path: string | null;
}

export interface FeatureStatus {
  /** Feature definition (forwarded for convenience) */
  feature: FeatureDefinition;
  /** Per-package install status */
  packages: PackageStatus[];
  /** True iff all packages in the feature resolve */
  available: boolean;
  /** Names of any missing packages (subset of feature.packages) */
  missing: string[];
}

/**
 * Resolve the AIWG install root for package probing. Tries:
 *   1. AIWG_ROOT env var
 *   2. The directory that contains this module's compiled output
 *      (walks up to find package.json with name "aiwg")
 *   3. process.cwd() as a last resort
 */
async function resolveAiwgRoot(): Promise<string> {
  if (process.env.AIWG_ROOT) return process.env.AIWG_ROOT;

  // Walk up from this module's URL.
  // dist layout: dist/src/features/status.js → walk up to package.json
  let cur = path.dirname(new URL(import.meta.url).pathname);
  for (let i = 0; i < 10; i++) {
    try {
      const pkgPath = path.join(cur, 'package.json');
      const stat = await fs.stat(pkgPath).catch(() => null);
      if (stat?.isFile()) {
        const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf8'));
        if (pkg?.name === 'aiwg') return cur;
      }
    } catch { /* keep walking */ }
    const parent = path.dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }
  return process.cwd();
}

/**
 * Probe a single package by reading its package.json from
 * `<aiwgRoot>/node_modules/<name>/package.json`.
 */
async function probePackage(aiwgRoot: string, name: string): Promise<PackageStatus> {
  const candidate = path.join(aiwgRoot, 'node_modules', name, 'package.json');
  try {
    const raw = await fs.readFile(candidate, 'utf8');
    const meta = JSON.parse(raw) as { version?: string };
    return {
      name,
      installed: true,
      version: meta.version ?? null,
      path: candidate,
    };
  } catch {
    return { name, installed: false, version: null, path: null };
  }
}

/** Status of a single named feature. Returns null if the name is unknown. */
export async function getFeatureStatus(name: string): Promise<FeatureStatus | null> {
  const feature = FEATURE_CATALOG.find(f => f.name === name);
  if (!feature) return null;
  const aiwgRoot = await resolveAiwgRoot();
  const pkgStatuses = await Promise.all(
    feature.packages.map(p => probePackage(aiwgRoot, p)),
  );
  const missing = pkgStatuses.filter(p => !p.installed).map(p => p.name);
  return {
    feature,
    packages: pkgStatuses,
    available: missing.length === 0,
    missing,
  };
}

/** Status of every feature in the catalog. */
export async function getAllFeatureStatuses(): Promise<FeatureStatus[]> {
  const aiwgRoot = await resolveAiwgRoot();
  return Promise.all(
    FEATURE_CATALOG.map(async feature => {
      const pkgStatuses = await Promise.all(
        feature.packages.map(p => probePackage(aiwgRoot, p)),
      );
      const missing = pkgStatuses.filter(p => !p.installed).map(p => p.name);
      return {
        feature,
        packages: pkgStatuses,
        available: missing.length === 0,
        missing,
      };
    }),
  );
}

/**
 * Format a single feature status as a one-line "doctor row":
 *   ✓ embeddings   installed (@xenova/transformers 2.17.2, hnswlib-node 3.0.0)
 *   ○ pty          not installed — `aiwg features install pty` to enable
 */
export function formatStatusLine(status: FeatureStatus, indent = '  '): string {
  const name = status.feature.name.padEnd(11);
  if (status.available) {
    const versions = status.packages
      .map(p => `${p.name} ${p.version ?? '?'}`)
      .join(', ');
    return `${indent}OK ${name} installed (${versions})`;
  }
  return `${indent}-  ${name} not installed — \`aiwg features install ${status.feature.name}\` to enable`;
}
