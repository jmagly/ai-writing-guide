import fs from "node:fs";
import path from "node:path";
import { getResourceCacheRoot } from "./web-release.js";
import { readResourceLockfile } from "./lockfile.js";

const SHA256_PATTERN = /^[0-9a-f]{64}$/;

export interface CleanWebResourceCacheOptions {
  cacheRoot?: string;
  dryRun?: boolean;
  force?: boolean;
}

export interface CacheCleanupEntry {
  version: string;
  manifestSha256: string;
  path: string;
}

export interface CleanWebResourceCacheResult {
  cacheRoot: string;
  dryRun: boolean;
  force: boolean;
  locked: CacheCleanupEntry[];
  removed: CacheCleanupEntry[];
  preserved: CacheCleanupEntry[];
  skipped: Array<{ path: string; reason: string }>;
}

function lockedReleaseKeys(projectDir: string): Set<string> {
  const lockfile = readResourceLockfile(projectDir);
  const locked = new Set<string>();
  for (const resource of Object.values(lockfile?.resources ?? {})) {
    locked.add(`${resource.version}/${resource.manifestSha256}`);
  }
  return locked;
}

function releaseGenerations(cacheRoot: string): { entries: CacheCleanupEntry[]; skipped: Array<{ path: string; reason: string }> } {
  const releasesRoot = path.join(cacheRoot, "releases");
  const skipped: Array<{ path: string; reason: string }> = [];
  const entries: CacheCleanupEntry[] = [];
  if (!fs.existsSync(releasesRoot)) return { entries, skipped };

  for (const versionEntry of fs.readdirSync(releasesRoot, { withFileTypes: true })) {
    const versionPath = path.join(releasesRoot, versionEntry.name);
    if (!versionEntry.isDirectory()) {
      skipped.push({ path: versionPath, reason: "not a directory" });
      continue;
    }
    for (const digestEntry of fs.readdirSync(versionPath, { withFileTypes: true })) {
      const generationPath = path.join(versionPath, digestEntry.name);
      if (!digestEntry.isDirectory()) {
        skipped.push({ path: generationPath, reason: "not a directory" });
        continue;
      }
      if (!SHA256_PATTERN.test(digestEntry.name)) {
        skipped.push({ path: generationPath, reason: "not a release digest generation" });
        continue;
      }
      entries.push({
        version: versionEntry.name,
        manifestSha256: digestEntry.name,
        path: generationPath,
      });
    }
  }

  entries.sort((left, right) =>
    left.version.localeCompare(right.version) || left.manifestSha256.localeCompare(right.manifestSha256),
  );
  return { entries, skipped };
}

export function cleanWebResourceCache(
  projectDir: string,
  options: CleanWebResourceCacheOptions = {},
): CleanWebResourceCacheResult {
  const cacheRoot = getResourceCacheRoot(options.cacheRoot);
  const dryRun = options.dryRun === true;
  const force = options.force === true;
  const lockedKeys = lockedReleaseKeys(projectDir);
  const { entries, skipped } = releaseGenerations(cacheRoot);
  const locked = entries.filter((entry) => lockedKeys.has(`${entry.version}/${entry.manifestSha256}`));
  const preserved: CacheCleanupEntry[] = [];
  const removed: CacheCleanupEntry[] = [];

  for (const entry of entries) {
    const isLocked = lockedKeys.has(`${entry.version}/${entry.manifestSha256}`);
    if (isLocked && !force) {
      preserved.push(entry);
      continue;
    }
    removed.push(entry);
    if (!dryRun) fs.rmSync(entry.path, { recursive: true, force: true });
  }

  return { cacheRoot, dryRun, force, locked, removed, preserved, skipped };
}
