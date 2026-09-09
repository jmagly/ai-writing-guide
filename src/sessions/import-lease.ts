import {
  mkdir, readFile, rename, rm, stat, writeFile,
} from 'node:fs/promises';
import { hostname } from 'node:os';
import { dirname } from 'node:path';

export interface ImportLeaseOwner {
  contractVersion: '1.0.0';
  runId: string;
  pid: number;
  host: string;
  startedAt: string;
  heartbeatAt: string;
}

export interface ImportLease {
  owner: ImportLeaseOwner;
  lockPath: string;
  release(): Promise<void>;
}

export interface ImportLeaseOptions {
  waitMs?: number;
  pollMs?: number;
  heartbeatMs?: number;
  staleMs?: number;
  now?: () => Date;
  processAlive?: (pid: number) => boolean;
}

const DEFAULTS = {
  waitMs: 5_000,
  pollMs: 50,
  heartbeatMs: 1_000,
  staleMs: 30_000,
} as const;

export class ImportLeaseContentionError extends Error {
  readonly code = 'IMPORT_LOCKED';

  constructor(
    public readonly owner: ImportLeaseOwner | null,
    public readonly waitMs: number,
  ) {
    const identity = owner
      ? `run ${owner.runId} (pid ${owner.pid} on ${owner.host}, heartbeat ${owner.heartbeatAt})`
      : 'an unreadable owner';
    super(
      `session import lease is held by ${identity}; waited ${waitMs}ms. `
      + 'Wait for that run to finish, or remove the lease only after confirming the owner is no longer active.',
    );
    this.name = 'ImportLeaseContentionError';
  }
}

export function importLeasePath(databasePath: string): string {
  return `${databasePath}.import.lock`;
}

export async function acquireImportLease(
  databasePath: string,
  runId: string,
  options: ImportLeaseOptions = {},
): Promise<ImportLease> {
  const waitMs = options.waitMs ?? DEFAULTS.waitMs;
  const pollMs = options.pollMs ?? DEFAULTS.pollMs;
  const heartbeatMs = options.heartbeatMs ?? DEFAULTS.heartbeatMs;
  const staleMs = options.staleMs ?? DEFAULTS.staleMs;
  const now = options.now ?? (() => new Date());
  const processAlive = options.processAlive ?? defaultProcessAlive;
  const lockPath = importLeasePath(databasePath);
  const ownerPath = `${lockPath}/owner.json`;
  const deadline = Date.now() + waitMs;

  await mkdir(dirname(databasePath), { recursive: true, mode: 0o700 });
  while (true) {
    try {
      await mkdir(lockPath, { mode: 0o700 });
      const observed = now().toISOString();
      const owner: ImportLeaseOwner = {
        contractVersion: '1.0.0',
        runId,
        pid: process.pid,
        host: hostname(),
        startedAt: observed,
        heartbeatAt: observed,
      };
      await writeOwner(ownerPath, owner);
      let heartbeatWrite = Promise.resolve();
      const timer = setInterval(() => {
        owner.heartbeatAt = now().toISOString();
        heartbeatWrite = heartbeatWrite
          .then(() => writeOwner(ownerPath, owner))
          .catch(() => undefined);
      }, heartbeatMs);
      timer.unref();
      let released = false;
      return {
        owner,
        lockPath,
        async release(): Promise<void> {
          if (released) return;
          released = true;
          clearInterval(timer);
          await heartbeatWrite;
          const current = await readOwner(ownerPath);
          if (current?.runId === owner.runId) {
            await rm(lockPath, { recursive: true, force: true });
          }
        },
      };
    } catch (error) {
      if (!isNodeError(error) || error.code !== 'EEXIST') throw error;
      const existing = await readOwner(ownerPath);
      if (await staleLease(lockPath, existing, staleMs, processAlive)) {
        const confirmed = await readOwner(ownerPath);
        if (sameLease(existing, confirmed)
          && await staleLease(lockPath, confirmed, staleMs, processAlive)) {
          await rm(lockPath, { recursive: true, force: true });
          continue;
        }
      }
      if (Date.now() >= deadline) {
        throw new ImportLeaseContentionError(existing, waitMs);
      }
      await delay(Math.min(pollMs, Math.max(1, deadline - Date.now())));
    }
  }
}

async function writeOwner(path: string, owner: ImportLeaseOwner): Promise<void> {
  const temporary = `${path}.tmp-${process.pid}`;
  await writeFile(temporary, `${JSON.stringify(owner)}\n`, { mode: 0o600 });
  await rename(temporary, path);
}

async function readOwner(path: string): Promise<ImportLeaseOwner | null> {
  try {
    const value = JSON.parse(await readFile(path, 'utf8')) as Partial<ImportLeaseOwner>;
    if (value.contractVersion !== '1.0.0'
      || typeof value.runId !== 'string'
      || typeof value.pid !== 'number'
      || typeof value.host !== 'string'
      || typeof value.startedAt !== 'string'
      || typeof value.heartbeatAt !== 'string') return null;
    return value as ImportLeaseOwner;
  } catch {
    return null;
  }
}

async function staleLease(
  lockPath: string,
  owner: ImportLeaseOwner | null,
  staleMs: number,
  processAlive: (pid: number) => boolean,
): Promise<boolean> {
  if (!owner || owner.host !== hostname()) return false;
  if (processAlive(owner.pid)) return false;
  const heartbeat = owner ? Date.parse(owner.heartbeatAt) : Number.NaN;
  if (Number.isFinite(heartbeat)) return Date.now() - heartbeat > staleMs;
  try {
    return Date.now() - (await stat(lockPath)).mtimeMs > staleMs;
  } catch {
    return false;
  }
}

function sameLease(
  first: ImportLeaseOwner | null,
  second: ImportLeaseOwner | null,
): boolean {
  if (!first || !second) return first === second;
  return first.runId === second.runId
    && first.pid === second.pid
    && first.host === second.host
    && first.startedAt === second.startedAt
    && first.heartbeatAt === second.heartbeatAt;
}

function defaultProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return isNodeError(error) && error.code === 'EPERM';
  }
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
