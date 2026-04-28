/**
 * Filesystem Storage Adapter
 *
 * The default backend. Wraps `fs.promises` and honors per-subsystem root
 * overrides from `storage.config`. Output is byte-identical to the
 * pre-abstraction direct-fs calls so consumer migrations stay safe.
 *
 * @design @.aiwg/architecture/storage-design.md (§5.1)
 * @issue #934
 * @issue #956
 */

import { existsSync } from 'fs';
import { appendFile, mkdir, readFile, readdir, rm, stat, writeFile } from 'fs/promises';
import { dirname, join, relative, resolve, sep } from 'path';
import type { StorageAdapter, StorageEntry, WriteMeta } from '../types.js';

export class FilesystemAdapter implements StorageAdapter {
  /** Absolute path where this subsystem's content lives. */
  private readonly root: string;

  constructor(root: string) {
    this.root = resolve(root);
  }

  /**
   * Path traversal guard. Rejects `..`, leading `/`, leading `~`, and
   * backslashes (which on POSIX would be treated as filename chars but
   * are almost always a Windows-vs-POSIX bug). Also rejects empty paths.
   */
  private resolveSafe(relPath: string): string {
    if (typeof relPath !== 'string' || relPath.length === 0) {
      throw new Error('storage(fs): path must be a non-empty string');
    }
    if (relPath.includes('\\')) {
      throw new Error(`storage(fs): backslash not allowed in path "${relPath}"`);
    }
    if (relPath.startsWith('/') || relPath.startsWith('~')) {
      throw new Error(`storage(fs): absolute paths not allowed: "${relPath}"`);
    }
    const segments = relPath.split('/');
    if (segments.some((s) => s === '..')) {
      throw new Error(`storage(fs): ".." traversal not allowed in "${relPath}"`);
    }
    const abs = resolve(this.root, relPath);
    // Final guard: ensure the resolved path is still under root, even if
    // the segment check missed something unusual (e.g. empty segments).
    if (abs !== this.root && !abs.startsWith(this.root + sep)) {
      throw new Error(`storage(fs): resolved path escapes subsystem root: "${relPath}"`);
    }
    return abs;
  }

  async read(path: string): Promise<string | null> {
    const abs = this.resolveSafe(path);
    if (!existsSync(abs)) return null;
    return readFile(abs, 'utf-8');
  }

  async write(path: string, content: string, _meta?: WriteMeta): Promise<void> {
    const abs = this.resolveSafe(path);
    await mkdir(dirname(abs), { recursive: true });
    await writeFile(abs, content, 'utf-8');
  }

  /**
   * Atomic append. Uses fs.appendFile, which opens with O_APPEND so the
   * kernel guarantees atomicity for writes ≤ PIPE_BUF (4096 bytes on
   * Linux). Concurrent appenders interleave at line granularity rather
   * than racing read-then-write. See #976.
   */
  async append(path: string, content: string): Promise<void> {
    const abs = this.resolveSafe(path);
    await mkdir(dirname(abs), { recursive: true });
    await appendFile(abs, content, 'utf-8');
  }

  async list(prefix: string): Promise<StorageEntry[]> {
    // Empty prefix = list everything under root. A non-empty prefix
    // restricts to entries whose subsystem-relative path starts with it
    // (after path-normalizing the prefix itself).
    if (typeof prefix !== 'string') {
      throw new Error('storage(fs): list prefix must be a string');
    }
    if (prefix.length > 0) {
      // resolveSafe also validates the prefix shape
      this.resolveSafe(prefix);
    }
    if (!existsSync(this.root)) return [];

    const out: StorageEntry[] = [];
    await walkInto(this.root, this.root, prefix, out);
    return out;
  }

  async delete(path: string): Promise<void> {
    const abs = this.resolveSafe(path);
    if (!existsSync(abs)) return;
    await rm(abs, { force: true });
  }
}

async function walkInto(
  root: string,
  dir: string,
  prefix: string,
  out: StorageEntry[]
): Promise<void> {
  let entries: import('fs').Dirent[];
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const e of entries) {
    const full = join(dir, e.name);
    const rel = relative(root, full).split(sep).join('/');

    if (e.isDirectory()) {
      // Descend if the dir could contain matches
      if (prefix === '' || rel.startsWith(prefix) || prefix.startsWith(rel + '/')) {
        await walkInto(root, full, prefix, out);
      }
      continue;
    }

    if (!e.isFile()) continue;
    if (prefix !== '' && !rel.startsWith(prefix)) continue;

    let size: number | undefined;
    let modifiedAt: Date | undefined;
    try {
      const s = await stat(full);
      size = s.size;
      modifiedAt = s.mtime;
    } catch {
      // ignore stat failures
    }
    const entry: StorageEntry = { path: rel };
    if (size !== undefined) entry.size = size;
    if (modifiedAt !== undefined) entry.modifiedAt = modifiedAt;
    out.push(entry);
  }
}
