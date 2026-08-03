/**
 * Resolve a fetched Git checkout to one deployable package without executing it.
 * Supports root bundles and the documented standalone .aiwg/plugins layout.
 *
 * @implements #1997
 * @implements #2009
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { discoverProjectLocalBundles, loadAndValidateManifest } from '../extensions/project-local-discovery.js';
import type { ProjectLocalType } from '../extensions/manifest.js';
import type { PackageKind } from '../marketplace/provenance-types.js';

const TYPES = new Set<ProjectLocalType>(['framework', 'addon', 'extension', 'plugin', 'provider']);

export interface DiscoveredPackage {
  manifest: Record<string, unknown>;
  type: PackageKind;
  wrapperPath: string;
  artifactPath: string;
}

function formatErrors(errors: Array<{ field: string; expected: string; actual: string; hint?: string }>): string {
  return errors.map((error) => `${error.field}: expected ${error.expected}, got ${error.actual}${error.hint ? `; ${error.hint}` : ''}`).join('\n  - ');
}

async function rootManifest(checkoutPath: string): Promise<Record<string, unknown> | undefined> {
  try {
    const value = JSON.parse(await readFile(path.join(checkoutPath, 'manifest.json'), 'utf8')) as unknown;
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
  } catch {
    return undefined;
  }
}

export async function discoverInstallablePackage(
  checkoutPath: string,
  selector?: string,
): Promise<DiscoveredPackage> {
  const checkout = path.resolve(checkoutPath);
  const root = await rootManifest(checkout);
  if (root) {
    const declaredType = String(root.type ?? '') as ProjectLocalType;
    if (root.manifestVersion === '1' && TYPES.has(declaredType)) {
      const validation = await loadAndValidateManifest(
        path.join(checkout, 'manifest.json'),
        declaredType,
        checkout,
      );
      if (!validation.bundle) {
        throw new Error(`Root package manifest validation failed:\n  - ${formatErrors(validation.errors)}`);
      }
      if (selector && selector !== validation.bundle.id) {
        throw new Error(`Package selector '${selector}' does not match root package '${validation.bundle.id}'`);
      }
      return {
        manifest: validation.bundle.manifest as unknown as Record<string, unknown>,
        type: validation.bundle.type === 'provider' ? 'unknown' : validation.bundle.type,
        wrapperPath: checkout,
        artifactPath: validation.bundle.artifactPath,
      };
    }
    // Legacy root manifests remain installable for compatibility, but unknown
    // roots no longer report a successful zero-artifact deployment.
    if (['framework', 'addon', 'extension'].includes(String(root.type))) {
      const name = String(root.id ?? root.name ?? '');
      if (selector && selector !== name) throw new Error(`Package selector '${selector}' does not match root package '${name}'`);
      return {
        manifest: root,
        type: root.type as PackageKind,
        wrapperPath: checkout,
        artifactPath: checkout,
      };
    }
  }

  const discovery = await discoverProjectLocalBundles(checkout);
  if (discovery.errors.length) {
    throw new Error(`Standalone package discovery failed:\n  - ${formatErrors(discovery.errors)}`);
  }
  let candidates = discovery.bundles.filter((bundle) => bundle.type === 'plugin');
  if (selector) candidates = candidates.filter((bundle) => bundle.id === selector);
  if (candidates.length === 0) {
    throw new Error(selector
      ? `No valid standalone plugin '${selector}' exists in this Git repository`
      : 'Git repository contains no valid root package or standalone .aiwg/plugins wrapper');
  }
  if (candidates.length > 1) {
    throw new Error(`Git repository contains multiple standalone plugins (${candidates.map((bundle) => bundle.id).sort().join(', ')}); select one with --package <id>`);
  }
  const selected = candidates[0]!;
  return {
    manifest: selected.manifest as unknown as Record<string, unknown>,
    type: 'plugin',
    wrapperPath: selected.bundlePath,
    artifactPath: selected.artifactPath,
  };
}
