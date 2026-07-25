import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanWebResourceCache } from "../../../src/resources/cache-cleanup.js";
import { writeWebResourceLock } from "../../../src/resources/lockfile.js";
import type { VerifiedWebRelease } from "../../../src/resources/web-release.js";

const LOCKED_DIGEST = "a".repeat(64);
const UNLOCKED_DIGEST = "b".repeat(64);

describe("web resource cache cleanup", () => {
  let projectDir: string;
  let cacheRoot: string;

  beforeEach(() => {
    projectDir = fs.mkdtempSync(path.join(os.tmpdir(), "aiwg-cache-clean-project-"));
    cacheRoot = fs.mkdtempSync(path.join(os.tmpdir(), "aiwg-cache-clean-cache-"));
  });

  afterEach(() => {
    fs.rmSync(projectDir, { recursive: true, force: true });
    fs.rmSync(cacheRoot, { recursive: true, force: true });
  });

  function generation(version: string, digest: string): string {
    const pathname = path.join(cacheRoot, "releases", version, digest);
    fs.mkdirSync(pathname, { recursive: true });
    fs.writeFileSync(path.join(pathname, "complete.json"), "{}\n");
    return pathname;
  }

  function lockedRelease(): VerifiedWebRelease {
    return {
      selector: "stable",
      selectorKind: "channel",
      version: "2026.7.24",
      manifestDigest: LOCKED_DIGEST,
      baseUrl: "https://releases.aiwg.io",
      manifestUrl: "https://releases.aiwg.io/resources/2026.7.24/manifest.json",
      cacheDir: generation("2026.7.24", LOCKED_DIGEST),
      releaseManifestPath: "manifest.json",
      releaseSignaturePath: "manifest.sig",
      fortemiManifestPath: "manifest.json",
      fortemiExportPath: "aiwg-fortemi-index-v2.json",
      fortemiManifestSha256: "c".repeat(64),
      fortemiManifestSize: 128,
      fortemiExportSha256: "d".repeat(64),
      fortemiExportSize: 1024,
      channelSequence: 3,
      descriptors: new Map(),
    };
  }

  it("removes unlocked release generations and preserves locked generations", () => {
    const locked = lockedRelease();
    const unlockedPath = generation("2026.7.25", UNLOCKED_DIGEST);
    writeWebResourceLock(projectDir, locked);

    const result = cleanWebResourceCache(projectDir, { cacheRoot });

    expect(result.preserved.map((entry) => entry.manifestSha256)).toEqual([LOCKED_DIGEST]);
    expect(result.removed.map((entry) => entry.manifestSha256)).toEqual([UNLOCKED_DIGEST]);
    expect(fs.existsSync(locked.cacheDir)).toBe(true);
    expect(fs.existsSync(unlockedPath)).toBe(false);
  });

  it("reports removals without deleting when dry-run is set", () => {
    const unlockedPath = generation("2026.7.25", UNLOCKED_DIGEST);

    const result = cleanWebResourceCache(projectDir, { cacheRoot, dryRun: true });

    expect(result.dryRun).toBe(true);
    expect(result.removed.map((entry) => entry.manifestSha256)).toEqual([UNLOCKED_DIGEST]);
    expect(fs.existsSync(unlockedPath)).toBe(true);
  });

  it("removes locked generations only when forced", () => {
    const locked = lockedRelease();
    writeWebResourceLock(projectDir, locked);

    const result = cleanWebResourceCache(projectDir, { cacheRoot, force: true });

    expect(result.force).toBe(true);
    expect(result.locked.map((entry) => entry.manifestSha256)).toEqual([LOCKED_DIGEST]);
    expect(result.preserved).toEqual([]);
    expect(result.removed.map((entry) => entry.manifestSha256)).toEqual([LOCKED_DIGEST]);
    expect(fs.existsSync(locked.cacheDir)).toBe(false);
  });
});
