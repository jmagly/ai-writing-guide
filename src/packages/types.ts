/**
 * Package Registry Types
 *
 * Defines the PackageRegistryAdapter interface and supporting types for
 * Git-based remote install of frameworks, addons, and extensions.
 * Mirrors the RegistryAdapter pattern in src/skills/types.ts.
 *
 * @implements #557
 */

/**
 * Parsed reference from user input
 *
 * Examples:
 *   "roko/ring-methodology"           → { scheme: 'gitea', owner: 'roko', name: 'ring-methodology' }
 *   "github:Roko-Network/ring-method" → { scheme: 'github', owner: 'Roko-Network', name: 'ring-method' }
 *   "https://git.example.com/a/b.git" → { scheme: 'https', rawUrl: '...' }
 *   "roko/ring-methodology@v1.2.0"    → { ..., version: 'v1.2.0' }
 */
export interface PackageRef {
  /** Original reference string as typed by the user */
  raw: string;

  /** Scheme that identified this ref: 'gitea' | 'github' | 'https' | 'ssh' | 'local-cache' */
  scheme: string;

  /** Repository owner / org (when applicable) */
  owner?: string;

  /** Repository / package name (without owner) */
  name?: string;

  /** Full remote URL (for generic git refs) */
  rawUrl?: string;

  /** Version tag or branch to pin (e.g. 'v1.2.0', 'main') */
  version?: string;
}

/**
 * Resolved source describing where to fetch the package
 */
export interface PackageSource {
  /** Canonical git remote URL */
  gitUrl: string;

  /** Tag, branch, or commit to checkout after clone */
  ref?: string;

  /** Human-friendly label for display */
  label: string;
}

/**
 * Installed package record stored in ~/.aiwg/packages.yaml
 */
export interface PackageEntry {
  /** Resolved version tag or 'latest' */
  version: string;

  /** Canonical git remote URL */
  source: string;

  /** Artifact type from manifest: 'framework' | 'addon' | 'extension' */
  type: 'framework' | 'addon' | 'extension' | 'unknown';

  /** Absolute path to cached content on disk */
  cachePath: string;

  /** ISO-8601 date of installation */
  installedAt: string;

  /** Projects this package has been deployed to */
  deployedTo?: PackageDeployRecord[];

  /** Immutable Git/Fortemi verification identity (schema additive for v1 registry). */
  provenance?: PackageProvenanceRecord;
}

export interface PackageProvenanceRecord {
  lockId: string;
  resolvedCommit: string;
  treeSha256: string;
  artifactSha256: string;
  envelopeSha256: string;
  verificationStatus: 'verified' | 'integrity-only' | 'untrusted' | 'failed';
}

/**
 * Deployment record tracking where a package was deployed
 */
export interface PackageDeployRecord {
  projectPath: string;
  provider: string;
  deployedAt: string;
}

/**
 * Top-level structure of ~/.aiwg/packages.yaml
 */
export interface PackageRegistryFile {
  apiVersion: 'aiwg.io/v1';
  kind: 'PackageRegistry';
  /** Map of "<owner>/<name>" → PackageEntry */
  packages: Record<string, PackageEntry>;
}

/**
 * Summary information for listing
 */
export interface PackageInfo {
  /** Canonical key: "<owner>/<name>" */
  key: string;

  /** Package name (without owner) */
  name: string;

  /** Owner / org */
  owner?: string;

  /** Installed version */
  version: string;

  /** Artifact type */
  type: string;

  /** Git remote URL */
  source: string;

  /** ISO-8601 installation date */
  installedAt: string;

  /** Number of project deployments */
  deployCount: number;

  /** Immutable lock identity when the package uses the provenance envelope. */
  lockId?: string;

  /** Local verification result; absence denotes a legacy registry entry. */
  verificationStatus?: PackageProvenanceRecord['verificationStatus'];
}

/**
 * Options for fetching/installing a package
 */
export interface FetchOptions {
  /** Force re-pull even if cached version exists */
  refresh?: boolean;

  /** SSH key path (optional override) */
  sshKey?: string;
}

/**
 * Options for deploying an installed package
 */
export interface PackageDeployOptions {
  /** Target provider (claude, copilot, cursor, etc.) */
  provider?: string;

  /** Project directory to deploy into */
  projectDir: string;
}

/**
 * Package registry adapter interface
 *
 * Adapters handle resolution and fetching for specific source types
 * (Git URL, Gitea shorthand, GitHub shorthand, local cache).
 */
export interface PackageRegistryAdapter {
  /** Adapter identifier: 'git' | 'gitea' | 'github' | 'local-cache' */
  readonly id: string;

  /** Human-readable name */
  readonly name: string;

  /**
   * Whether this adapter can handle the given reference string.
   * Called in priority order; first match wins.
   */
  canResolve(ref: string): boolean;

  /**
   * Resolve a reference string to a PackageSource.
   * Returns null if the reference cannot be resolved.
   */
  resolve(ref: PackageRef): Promise<PackageSource | null>;

  /**
   * Fetch (clone or pull) the package to the local cache.
   * Returns the absolute path to the cached package directory.
   */
  fetch(source: PackageSource, options?: FetchOptions): Promise<string>;

  /** List packages available from this adapter (local-cache only) */
  list?(): Promise<PackageInfo[]>;
}
