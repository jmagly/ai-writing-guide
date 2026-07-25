import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { projectAiwgPath, resolveProjectAiwgDir } from "../config/project-artifacts.js";
import type { VerifiedWebRelease } from "./web-release.js";

export const RESOURCE_LOCKFILE_SCHEMA = "aiwg.resources-lock/v1";
export const RESOURCE_LOCKFILE_NAME = "resources.lock.json";
export const DEFAULT_RESOURCE_LOCK_KEY = "framework";

export interface LockedWebResource {
  source: "web";
  selector: string;
  selectorKind: VerifiedWebRelease["selectorKind"];
  version: string;
  manifestUrl: string;
  baseUrl: string;
  manifestSha256: string;
  channelSequence?: number;
  fortemiCore: {
    manifestSha256: string;
    manifestSize: number;
    exportSha256: string;
    exportSize: number;
  };
  descriptorCount: number;
  lockedAt: string;
}

export interface ResourceLockfile {
  schemaVersion: typeof RESOURCE_LOCKFILE_SCHEMA;
  generatedAt: string;
  resources: Record<string, LockedWebResource>;
}

export interface WriteResourceLockOptions {
  key?: string;
  now?: Date;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function validateLockedResource(value: unknown, key: string): LockedWebResource {
  if (!isRecord(value)) throw new Error(`resource lock entry '${key}' must be an object`);
  if (value.source !== "web") throw new Error(`resource lock entry '${key}' has an unsupported source`);
  for (const field of ["selector", "selectorKind", "version", "manifestUrl", "baseUrl", "manifestSha256", "lockedAt"]) {
    if (typeof value[field] !== "string") throw new Error(`resource lock entry '${key}' has an invalid ${field}`);
  }
  if (value.selectorKind !== "exact" && value.selectorKind !== "channel") {
    throw new Error(`resource lock entry '${key}' has an invalid selectorKind`);
  }
  if (typeof value.descriptorCount !== "number" || !Number.isSafeInteger(value.descriptorCount) || value.descriptorCount < 0) {
    throw new Error(`resource lock entry '${key}' has an invalid descriptorCount`);
  }
  if (value.channelSequence !== undefined && (
    typeof value.channelSequence !== "number" ||
    !Number.isSafeInteger(value.channelSequence) ||
    value.channelSequence < 1
  )) {
    throw new Error(`resource lock entry '${key}' has an invalid channelSequence`);
  }
  if (!isRecord(value.fortemiCore)) throw new Error(`resource lock entry '${key}' has invalid fortemiCore metadata`);
  const fortemiCore = value.fortemiCore;
  for (const field of ["manifestSha256", "exportSha256"]) {
    if (typeof fortemiCore[field] !== "string") {
      throw new Error(`resource lock entry '${key}' has an invalid fortemiCore.${field}`);
    }
  }
  for (const field of ["manifestSize", "exportSize"]) {
    if (typeof fortemiCore[field] !== "number" || !Number.isSafeInteger(fortemiCore[field]) || fortemiCore[field] < 0) {
      throw new Error(`resource lock entry '${key}' has an invalid fortemiCore.${field}`);
    }
  }
  return value as unknown as LockedWebResource;
}

export function resourceLockfilePath(projectDir: string): string {
  return projectAiwgPath(projectDir, RESOURCE_LOCKFILE_NAME);
}

export function releaseToLockedWebResource(release: VerifiedWebRelease, now = new Date()): LockedWebResource {
  return {
    source: "web",
    selector: release.selector,
    selectorKind: release.selectorKind,
    version: release.version,
    manifestUrl: release.manifestUrl,
    baseUrl: release.baseUrl,
    manifestSha256: release.manifestDigest,
    ...(release.channelSequence === undefined ? {} : { channelSequence: release.channelSequence }),
    fortemiCore: {
      manifestSha256: release.fortemiManifestSha256,
      manifestSize: release.fortemiManifestSize,
      exportSha256: release.fortemiExportSha256,
      exportSize: release.fortemiExportSize,
    },
    descriptorCount: release.descriptors.size,
    lockedAt: now.toISOString(),
  };
}

export function readResourceLockfile(projectDir: string): ResourceLockfile | null {
  const pathname = resourceLockfilePath(projectDir);
  if (!fs.existsSync(pathname)) return null;
  const parsed = JSON.parse(fs.readFileSync(pathname, "utf8")) as unknown;
  if (!isRecord(parsed) || parsed.schemaVersion !== RESOURCE_LOCKFILE_SCHEMA) {
    throw new Error(`${RESOURCE_LOCKFILE_NAME} has an unsupported schemaVersion`);
  }
  if (typeof parsed.generatedAt !== "string") {
    throw new Error(`${RESOURCE_LOCKFILE_NAME} has an invalid generatedAt`);
  }
  if (!isRecord(parsed.resources)) {
    throw new Error(`${RESOURCE_LOCKFILE_NAME} has an invalid resources object`);
  }
  const resources: Record<string, LockedWebResource> = {};
  for (const [key, value] of Object.entries(parsed.resources)) {
    resources[key] = validateLockedResource(value, key);
  }
  return {
    schemaVersion: RESOURCE_LOCKFILE_SCHEMA,
    generatedAt: parsed.generatedAt,
    resources,
  };
}

export function writeWebResourceLock(
  projectDir: string,
  release: VerifiedWebRelease,
  options: WriteResourceLockOptions = {},
): { path: string; lockfile: ResourceLockfile; entry: LockedWebResource } {
  const key = options.key ?? DEFAULT_RESOURCE_LOCK_KEY;
  if (!/^[a-z][a-z0-9-]{0,63}$/.test(key)) throw new Error(`Invalid resource lock key: ${key}`);
  const now = options.now ?? new Date();
  const existing = readResourceLockfile(projectDir);
  const entry = releaseToLockedWebResource(release, now);
  const lockfile: ResourceLockfile = {
    schemaVersion: RESOURCE_LOCKFILE_SCHEMA,
    generatedAt: now.toISOString(),
    resources: {
      ...(existing?.resources ?? {}),
      [key]: entry,
    },
  };

  const dir = resolveProjectAiwgDir(projectDir);
  fs.mkdirSync(dir, { recursive: true });
  const pathname = path.join(dir, RESOURCE_LOCKFILE_NAME);
  const tmpPath = `${pathname}.${randomBytes(6).toString("hex")}.tmp`;
  try {
    fs.writeFileSync(tmpPath, JSON.stringify(lockfile, null, 2) + "\n", { encoding: "utf8", flag: "wx" });
    fs.renameSync(tmpPath, pathname);
  } catch (error) {
    fs.rmSync(tmpPath, { force: true });
    throw error;
  }
  return { path: pathname, lockfile, entry };
}
