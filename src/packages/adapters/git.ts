/**
 * Git Adapter
 *
 * Base adapter for fetching packages from any Git URL.
 * Handles clone to cache, pull for refresh, and version tag checkout.
 *
 * Cache layout:
 *   ~/.cache/aiwg/packages/<owner>/<name>@<version>/
 *
 * @implements #557
 */

import { execFile } from 'child_process';
import { promisify } from 'util';
import { mkdir, mkdtemp, readFile, rename, rm } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';
import { existsSync } from 'fs';
import type { PackageRef, PackageSource, PackageRegistryAdapter, FetchOptions, PackageInfo } from '../types.js';

const execFileAsync = promisify(execFile);

/**
 * Default cache root
 */
function getCacheRoot(): string {
  const xdgCache = process.env.XDG_CACHE_HOME;
  const base = xdgCache ? xdgCache : join(homedir(), '.cache');
  return join(base, 'aiwg', 'packages');
}

/**
 * Build cache path for a package at a specific version
 */
export function buildCachePath(owner: string, name: string, version: string): string {
  const safe = version.replace(/[^a-zA-Z0-9._-]/g, '_');
  return join(getCacheRoot(), owner, `${name}@${safe}`);
}

/**
 * Run a git command, returning stdout
 */
async function git(args: string[], cwd?: string): Promise<string> {
  const env: Record<string, string> = { ...process.env as Record<string, string> };

  // Suppress interactive prompts
  env.GIT_TERMINAL_PROMPT = '0';

  const { stdout } = await execFileAsync('git', args, {
    cwd,
    env,
    timeout: 120_000,
  });
  return stdout.trim();
}

/**
 * Detect the manifest type from a cloned package directory
 */
async function detectManifestType(
  cachePath: string
): Promise<'framework' | 'addon' | 'extension' | 'unknown'> {
  const manifestPath = join(cachePath, 'manifest.json');
  try {
    const content = await readFile(manifestPath, 'utf-8');
    const manifest = JSON.parse(content) as { type?: string };
    const t = manifest.type?.toLowerCase() ?? '';
    if (t === 'framework') return 'framework';
    if (t === 'addon') return 'addon';
    if (t === 'extension') return 'extension';
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

/**
 * Resolve the latest tag from a remote git repo
 */
async function resolveLatestTag(gitUrl: string): Promise<string> {
  try {
    const output = await git(['ls-remote', '--tags', '--sort=-v:refname', gitUrl]);
    const firstLine = output.split('\n')[0] ?? '';
    const match = firstLine.match(/refs\/tags\/(.+)/);
    if (match && match[1]) return match[1].replace(/\^{}$/, '');
  } catch {
    // fall through
  }
  return 'latest';
}

async function resolveRemoteCommit(gitUrl: string, requestedRef: string): Promise<string | undefined> {
  if (/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(requestedRef)) return requestedRef;
  const patterns = requestedRef === 'HEAD'
    ? ['HEAD']
    : [`refs/tags/${requestedRef}^{}`, `refs/tags/${requestedRef}`, `refs/heads/${requestedRef}`, requestedRef];
  try {
    const output = await git(['ls-remote', gitUrl, ...patterns]);
    const rows = output.split('\n').filter(Boolean).map((line) => {
      const [oid = '', ref = ''] = line.split(/\s+/, 2);
      return { oid, ref };
    });
    const peeled = rows.find((row) => row.ref.endsWith('^{}'));
    const selected = peeled ?? rows[0];
    return selected && /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(selected.oid)
      ? selected.oid
      : undefined;
  } catch {
    return undefined;
  }
}

function urlCacheIdentity(gitUrl: string): { owner: string; name: string } {
  const urlKey = gitUrl
    .replace(/^https?:\/\//, '')
    .replace(/^ssh:\/\//, '')
    .replace(/^git@/, '')
    .replace(/\.git$/, '')
    .replace(/[:/]/g, '_');
  const parts = urlKey.split('_').filter(Boolean);
  return {
    name: parts[parts.length - 1] ?? 'package',
    owner: parts[parts.length - 2] ?? 'unknown',
  };
}

/**
 * GitAdapter
 *
 * Handles any https:// or git@... URL directly.
 * Also serves as the base class for Gitea/GitHub shorthand adapters.
 */
export class GitAdapter implements PackageRegistryAdapter {
  readonly id: string = 'git';
  readonly name: string = 'Git (direct URL)';

  /**
   * Returns true for https:// or git@/ssh:// URLs, or git+https:// URLs
   */
  canResolve(ref: string): boolean {
    return (
      ref.startsWith('https://') ||
      ref.startsWith('http://') ||
      ref.startsWith('git@') ||
      ref.startsWith('ssh://') ||
      ref.startsWith('git+https://')
    );
  }

  async resolve(ref: PackageRef): Promise<PackageSource | null> {
    if (!ref.rawUrl) return null;
    return {
      gitUrl: ref.rawUrl,
      ref: ref.version,
      label: ref.rawUrl,
    };
  }

  async fetch(source: PackageSource, options: FetchOptions = {}): Promise<string> {
    // Resolve discovery inputs before any deployment and cache by immutable
    // commit rather than by a movable tag/branch name (#2009).
    let requestedRef = source.ref;
    if (!requestedRef) {
      const latest = await resolveLatestTag(source.gitUrl);
      requestedRef = latest === 'latest' ? 'HEAD' : latest;
      source.ref = requestedRef;
    }
    const advertisedCommit = await resolveRemoteCommit(source.gitUrl, requestedRef);
    const { owner, name } = urlCacheIdentity(source.gitUrl);
    if (advertisedCommit) {
      const existing = buildCachePath(owner, name, advertisedCommit);
      if (!options.refresh && existsSync(join(existing, '.git'))) {
        const existingCommit = await git(['rev-parse', 'HEAD^{commit}'], existing);
        if (existingCommit !== advertisedCommit) throw new Error(`Immutable package cache mismatch at ${existing}`);
        return existing;
      }
    }

    const ownerDir = join(getCacheRoot(), owner);
    await mkdir(ownerDir, { recursive: true });
    const stage = await mkdtemp(join(ownerDir, `.${name}.resolve-`));
    try {
      await git(['clone', '--no-checkout', source.gitUrl, stage]);
      await git(['checkout', '--detach', requestedRef], stage);
      const resolvedCommit = await git(['rev-parse', 'HEAD^{commit}'], stage);
      if (!/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(resolvedCommit)) {
        throw new Error(`Git resolved '${requestedRef}' to invalid commit '${resolvedCommit}'`);
      }
      if (advertisedCommit && resolvedCommit !== advertisedCommit) {
        throw new Error(`Git ref '${requestedRef}' moved during resolution (${advertisedCommit} -> ${resolvedCommit})`);
      }
      const cachePath = buildCachePath(owner, name, resolvedCommit);
      if (existsSync(join(cachePath, '.git'))) {
        const cachedCommit = await git(['rev-parse', 'HEAD^{commit}'], cachePath);
        if (cachedCommit !== resolvedCommit) throw new Error(`Immutable package cache mismatch at ${cachePath}`);
        await rm(stage, { recursive: true, force: true });
        return cachePath;
      }
      await rename(stage, cachePath);
      return cachePath;
    } catch (error) {
      await rm(stage, { recursive: true, force: true });
      throw error;
    }
  }

  /** GitAdapter does not list packages */
  async list(): Promise<PackageInfo[]> {
    return [];
  }
}

export { detectManifestType };
