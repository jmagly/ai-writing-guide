/**
 * Package Registry Coordinator
 *
 * Orchestrates resolution and fetching across all PackageRegistryAdapters.
 * Priority order: local-cache lookup → gitea shorthand → github shorthand → git URL
 *
 * @implements #557
 */

import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join, relative, sep } from 'path';
import type {
  PackageRef,
  PackageSource,
  PackageRegistryAdapter,
  FetchOptions,
  PackageInfo,
} from './types.js';
import { GitAdapter } from './adapters/git.js';
import { GiteaAdapter } from './adapters/gitea.js';
import { GitHubAdapter } from './adapters/github.js';
import { ClawHubPackageAdapter } from './adapters/clawhub.js';
import { LocalCacheAdapter } from './adapters/local-cache.js';
import {
  getPackageEntry,
  setPackageEntry,
  listPackages as listFromRegistry,
  removePackageEntry,
} from './package-registry.js';
import { discoverInstallablePackage } from './package-discovery.js';
import {
  buildFortemiEnvelopeShard,
  canonicalJson,
  createOperationReceipt,
  createProvenanceEnvelope,
  sha256,
  validateProvenanceEnvelope,
  verifyProvenanceEnvelope,
} from '../marketplace/provenance.js';
import {
  findIndexedPackage,
  readMarketplaceIndex,
  readTrustStore,
  recordInstalledPackage,
} from '../marketplace/exchange.js';
import type {
  MarketplacePackageLock,
  MarketplaceProvenanceEnvelope,
  MarketplaceTrustStore,
  MarketplaceVerificationPolicy,
  MarketplaceVerificationResult,
} from '../marketplace/provenance-types.js';

/**
 * All adapters in resolution priority order
 * (Scheme-prefixed adapters first so explicit prefixes are matched before
 *  Gitea/GitHub shorthands and the generic Git fallback)
 */
const ALL_ADAPTERS: PackageRegistryAdapter[] = [
  new ClawHubPackageAdapter(),
  new GiteaAdapter(),
  new GitHubAdapter(),
  new GitAdapter(),
];

const CACHE_ADAPTER = new LocalCacheAdapter();

function pathSeparatorSafe(parent: string, child: string): string {
  return relative(parent, child).replaceAll(sep, '/') || '.';
}

/**
 * Parse a raw reference string into a PackageRef
 *
 * Supported formats:
 *   owner/name                 → gitea shorthand
 *   owner/name@v1.2.0          → gitea shorthand with version
 *   github:owner/name          → github shorthand
 *   github:owner/name@v1.2.0   → github shorthand with version
 *   https://...                → direct git URL
 *   git@host:owner/name.git    → direct SSH URL
 */
export function parseRef(raw: string): PackageRef {
  const ref: PackageRef = { raw, scheme: 'unknown' };

  // Scheme-prefixed: "github:owner/name[@version]"
  if (raw.startsWith('github:')) {
    const body = raw.slice('github:'.length);
    const [repoAndOwner, version] = body.split('@');
    const parts = (repoAndOwner ?? '').split('/');
    ref.scheme = 'github';
    ref.owner = parts[0];
    ref.name = parts.slice(1).join('/') || undefined;
    ref.version = version;
    return ref;
  }

  // Scheme-prefixed: "clawhub:owner/name[@version]" and "openclaw:owner/name[@version]"
  if (raw.startsWith('clawhub:') || raw.startsWith('openclaw:')) {
    const prefix = raw.startsWith('clawhub:') ? 'clawhub:' : 'openclaw:';
    const body = raw.slice(prefix.length);
    const [repoAndOwner, version] = body.split('@');
    const parts = (repoAndOwner ?? '').split('/');
    ref.scheme = 'clawhub';
    ref.owner = parts[0];
    ref.name = parts.slice(1).join('/') || undefined;
    ref.version = version;
    return ref;
  }

  // Direct URL
  if (raw.startsWith('https://') || raw.startsWith('http://') || raw.startsWith('git@') || raw.startsWith('ssh://')) {
    ref.scheme = raw.startsWith('git@') ? 'ssh' : 'https';
    // Strip optional @version suffix from URL (non-standard but convenient)
    const atIdx = raw.lastIndexOf('@');
    if (atIdx > raw.indexOf('://') + 3 || raw.startsWith('git@')) {
      // Only treat trailing @version if it looks like a version tag
      const tail = raw.slice(atIdx + 1);
      if (/^[vV]?\d|^main$|^master$|^HEAD/.test(tail) && atIdx > 20) {
        ref.rawUrl = raw.slice(0, atIdx);
        ref.version = tail;
        return ref;
      }
    }
    ref.rawUrl = raw;
    return ref;
  }

  // Gitea shorthand: "owner/name[@version]"
  const atIdx = raw.indexOf('@');
  const body = atIdx >= 0 ? raw.slice(0, atIdx) : raw;
  const parts = body.split('/');
  ref.scheme = 'gitea';
  ref.owner = parts[0];
  ref.name = parts.slice(1).join('/') || undefined;
  ref.version = atIdx >= 0 ? raw.slice(atIdx + 1) : undefined;

  return ref;
}

/**
 * Resolve a ref to a PackageSource using the appropriate adapter
 */
export async function resolveRef(ref: PackageRef): Promise<{ source: PackageSource; adapter: PackageRegistryAdapter } | null> {
  for (const adapter of ALL_ADAPTERS) {
    if (!adapter.canResolve(ref.raw)) continue;
    const source = await adapter.resolve(ref);
    if (source) return { source, adapter };
  }
  return null;
}

/**
 * Read the namespace for a cached package.
 *
 * Resolution order:
 * 1. `namespace` field in `manifest.json` (explicit — highest priority)
 * 2. Owner segment parsed from `registryKey` (e.g. `roko/ring-methodology` → `roko`)
 *    Also handles scheme-prefixed keys: `clawhub:author/name` → `author`,
 *    `github:thirdparty/repo` → `thirdparty`.
 * 3. `"third-party"` — safe fallback when the key cannot be parsed.
 *
 * AIWG-owned packages (owner = `aiwg`) return `"aiwg"` which is the default
 * namespace used by the AIWG deploy pipeline.
 *
 * @param cachePath   - Absolute path to the cloned/cached package directory
 * @param registryKey - The key stored in packages.yaml, e.g. `"owner/name"` or
 *                      `"github:owner/name"` or `"clawhub:owner/name"`
 */
export async function readPackageNamespace(
  cachePath: string,
  registryKey: string
): Promise<string> {
  // 1. Prefer explicit manifest.json namespace field
  try {
    const manifestContent = await readFile(join(cachePath, 'manifest.json'), 'utf-8');
    const manifest = JSON.parse(manifestContent) as { namespace?: string };
    if (typeof manifest.namespace === 'string' && manifest.namespace.trim()) {
      return manifest.namespace.trim();
    }
  } catch {
    // manifest missing or unreadable — fall through to key-based derivation
  }

  // 2. Derive from registry key owner segment
  // Strip leading scheme prefix: "github:", "clawhub:", "openclaw:"
  const schemeMatch = registryKey.match(/^(?:github|clawhub|openclaw):(.+)$/);
  const keyBody = schemeMatch ? schemeMatch[1]! : registryKey;

  // Handle direct URLs — cannot derive meaningful owner
  if (
    keyBody.startsWith('https://') ||
    keyBody.startsWith('http://') ||
    keyBody.startsWith('git@') ||
    keyBody.startsWith('ssh://')
  ) {
    return 'third-party';
  }

  // owner/name format
  const slashIdx = keyBody.indexOf('/');
  if (slashIdx > 0) {
    const owner = keyBody.slice(0, slashIdx).trim();
    if (owner) return owner;
  }

  // 3. Fallback
  return 'third-party';
}

/**
 * Install a package from a ref string
 *
 * 1. Parse ref
 * 2. Resolve to PackageSource via adapters
 * 3. Fetch (clone/pull) to local cache
 * 4. Register in ~/.aiwg/packages.yaml
 *
 * Returns the cache path and resolved namespace.
 */
export async function installPackage(
  rawRef: string,
  options: FetchOptions & {
    configDir?: string;
    ref?: string;
    packageSelector?: string;
    verify?: boolean;
    verificationPolicy?: Partial<MarketplaceVerificationPolicy>;
    trustStore?: MarketplaceTrustStore;
    expectedEnvelope?: MarketplaceProvenanceEnvelope;
    expectedLockId?: string;
    catalogId?: string;
    actor?: string;
  } = {}
): Promise<{
  cachePath: string;
  checkoutPath: string;
  key: string;
  type: string;
  namespace: string;
  envelope: MarketplaceProvenanceEnvelope;
  lock: MarketplacePackageLock;
  verification: MarketplaceVerificationResult;
  receiptPath?: string;
}> {
  const ref = parseRef(rawRef);

  const resolved = await resolveRef(ref);
  if (!resolved) {
    throw new Error(
      `Cannot resolve package reference: '${rawRef}'\n` +
      `Supported formats:\n` +
      `  owner/name              (Gitea shorthand)\n` +
      `  github:owner/name       (GitHub shorthand)\n` +
      `  clawhub:owner/name      (ClawHub / OpenClaw registry)\n` +
      `  openclaw:owner/name     (ClawHub / OpenClaw registry alias)\n` +
      `  https://...             (direct Git URL)\n` +
      `  git@host:owner/name.git (SSH URL)`
    );
  }

  const { source, adapter } = resolved;
  if (options.ref) source.ref = options.ref;
  const cachePath = await adapter.fetch(source, { refresh: options.refresh });
  const discovered = await discoverInstallablePackage(cachePath, options.packageSelector);
  const standardEnvelopePaths = [
    join(cachePath, '.aiwg', 'marketplace', 'envelope.json'),
    join(cachePath, 'aiwg-marketplace-envelope.json'),
  ];
  let envelope = options.expectedEnvelope;
  if (!envelope) {
    for (const filename of standardEnvelopePaths) {
      if (!existsSync(filename)) continue;
      const value = JSON.parse(await readFile(filename, 'utf8')) as unknown;
      validateProvenanceEnvelope(value);
      envelope = value;
      break;
    }
  }
  if (!envelope) {
    envelope = await createProvenanceEnvelope({
      checkoutPath: cachePath,
      artifactPath: discovered.artifactPath,
      wrapperPath: pathSeparatorSafe(cachePath, discovered.wrapperPath),
      manifest: discovered.manifest,
      requestedRef: source.ref ?? ref.version ?? 'HEAD',
      remote: source.gitUrl,
      publisher: String(discovered.manifest.author ?? discovered.manifest.namespace ?? ref.owner ?? 'unverified'),
    });
  }
  const key = `${envelope.package.namespace}/${envelope.package.name}`;
  const namespace = envelope.package.namespace;
  const type = discovered.type;
  const existingEntry = await getPackageEntry(key, options.configDir);
  let previousLock: MarketplacePackageLock | undefined;
  if (existingEntry?.provenance?.lockId) {
    previousLock = (await findIndexedPackage(existingEntry.provenance.lockId, { configDir: options.configDir }))?.lock;
  }
  const localIndex = await readMarketplaceIndex({ configDir: options.configDir });
  const installedLocks = Object.fromEntries(Object.values(localIndex.packages).map((entry) => [entry.lock.identity, entry.lock.lockId]));
  const trustStore = options.trustStore ?? await readTrustStore({ configDir: options.configDir });
  const verification = await verifyProvenanceEnvelope({
    envelope,
    contentRoot: discovered.artifactPath,
    checkoutPath: cachePath,
    trustStore,
    policy: options.verify
      ? { requireSignature: true, allowIntegrityOnly: false, ...options.verificationPolicy }
      : options.verificationPolicy,
    installedLocks,
    previousLock,
  });
  if (!verification.ok) throw new Error(`Package verification failed: ${verification.errors.join('; ')}`);
  if (options.expectedLockId && verification.lock.lockId !== options.expectedLockId) {
    throw new Error(`Catalog/direct lock mismatch: expected ${options.expectedLockId}, got ${verification.lock.lockId}`);
  }
  if (options.expectedEnvelope && sha256(canonicalJson(options.expectedEnvelope)) !== verification.envelopeSha256) {
    throw new Error('Catalog envelope changed before installation');
  }
  const fortemi = await buildFortemiEnvelopeShard(envelope);
  const receipt = createOperationReceipt({
    operation: 'install',
    lock: verification.lock,
    actor: options.actor ?? 'aiwg',
    verificationStatus: verification.status,
    evidence: {
      source: source.gitUrl,
      requestedRef: envelope.source.requestedRef,
      resolvedCommit: envelope.source.resolvedCommit,
      catalog: options.catalogId ?? null,
      directGit: !options.catalogId,
    },
    conformance: fortemi.conformance,
  });
  await recordInstalledPackage({
    configDir: options.configDir,
    envelope,
    lock: verification.lock,
    receipt,
    cachePath,
    artifactPath: discovered.artifactPath,
    verificationStatus: verification.status,
    fortemiShard: fortemi.archive,
    catalogId: options.catalogId,
  });
  await setPackageEntry(key, {
    version: envelope.package.version,
    source: envelope.source.canonicalRemote,
    type: type === 'plugin' ? 'extension' : type as 'framework' | 'addon' | 'extension',
    cachePath: discovered.artifactPath,
    installedAt: receipt.occurredAt,
    deployedTo: existingEntry?.deployedTo ?? [],
    provenance: {
      lockId: verification.lock.lockId,
      resolvedCommit: verification.lock.resolvedCommit,
      treeSha256: verification.lock.treeSha256,
      artifactSha256: verification.lock.artifactSha256,
      envelopeSha256: verification.lock.envelopeSha256,
      verificationStatus: verification.status,
    },
  }, options.configDir);

  return {
    cachePath: discovered.artifactPath,
    checkoutPath: cachePath,
    key,
    type,
    namespace,
    envelope,
    lock: verification.lock,
    verification,
  };
}

/**
 * Refresh all registered remote packages (used by `aiwg sync`)
 */
export async function refreshAllPackages(options: { configDir?: string } = {}): Promise<string[]> {
  const packages = await listFromRegistry(options.configDir);
  const refreshed: string[] = [];

  for (const pkg of packages) {
    try {
      await installPackage(
        pkg.source.startsWith('git@') || pkg.source.startsWith('https://')
          ? pkg.source
          : pkg.source,
        { refresh: true, configDir: options.configDir }
      );
      refreshed.push(pkg.key);
    } catch {
      // Non-fatal — continue with other packages
    }
  }

  return refreshed;
}

/**
 * List all installed packages
 */
export async function listInstalledPackages(configDir?: string): Promise<PackageInfo[]> {
  return listFromRegistry(configDir);
}

/**
 * Remove a package from the registry (does not delete cache)
 */
export async function uninstallPackage(key: string, configDir?: string): Promise<boolean> {
  return removePackageEntry(key, configDir);
}

/**
 * Look up the cache path for an installed package by name
 * (used by `aiwg use` to resolve local packages before bundled npm)
 */
export async function resolveInstalledPackage(name: string): Promise<string | undefined> {
  return CACHE_ADAPTER.resolveCachePath(name);
}
