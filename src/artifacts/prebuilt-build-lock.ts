import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

export interface DirectoryLockOptions {
  timeoutMs?: number;
  pollMs?: number;
}

/**
 * Acquire a cross-process directory lock and return an ownership-safe release.
 *
 * The lock deliberately fails after a bounded wait instead of deleting a lock
 * that may belong to a slow but healthy package build.
 */
export async function acquireDirectoryLock(
  lockPath: string,
  options: DirectoryLockOptions = {},
): Promise<() => Promise<void>> {
  const timeoutMs = options.timeoutMs ?? 180_000;
  const pollMs = options.pollMs ?? 100;
  const deadline = Date.now() + timeoutMs;
  const token = `${process.pid}:${randomUUID()}`;
  const ownerPath = path.join(lockPath, 'owner');

  await mkdir(path.dirname(lockPath), { recursive: true });
  while (true) {
    try {
      await mkdir(lockPath);
      try {
        await writeFile(ownerPath, `${token}\n`, { mode: 0o600 });
      } catch (error) {
        await rm(lockPath, { recursive: true, force: true });
        throw error;
      }
      break;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      if (Date.now() >= deadline) {
        throw new Error(`timed out waiting for build lock: ${lockPath}`);
      }
      await new Promise((resolve) => setTimeout(resolve, pollMs));
    }
  }

  return async () => {
    try {
      if ((await readFile(ownerPath, 'utf8')).trim() !== token) return;
    } catch {
      return;
    }
    await rm(lockPath, { recursive: true, force: true });
  };
}
