import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { glob } from 'glob';
import { checkPattern, digest } from './contracts.mjs';

export const DEFAULT_EXCLUDES = ['**/node_modules/**', '**/.git/**', '**/.aiwg/**', '**/dist/**', '**/build/**', '**/coverage/**', '**/.venv/**', '**/venv/**', '**/target/**', '**/bin/**', '**/obj/**', '**/__pycache__/**'];
export function relativePath(value) {
  if (typeof value !== 'string' || !value || value.includes('\0') || path.isAbsolute(value) || value.includes('\\') || /^[A-Za-z]:/.test(value) || value.split('/').some(p => p === '..' || p === '.')) throw new Error(`Unsafe relative path: ${value}`);
  return value;
}
function inside(root, candidate) {
  return candidate === root || candidate.startsWith(root + path.sep);
}

/** Reject symlink traversal for writes, including symlinks pointing inside root. */
export async function targetPath(root, relative, { write = false } = {}) {
  relativePath(relative);
  const base = await fs.realpath(root);
  const parts = relative.split('/');
  let current = base;
  for (const part of parts) {
    current = path.join(current, part);
    try {
      const info = await fs.lstat(current);
      if (write && info.isSymbolicLink()) throw new Error(`Refusing write through symlink: ${relative}`);
      const actual = await fs.realpath(current);
      if (!inside(base, actual)) throw new Error(`Path escapes target root: ${relative}`);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  return current;
}

export async function findFiles(root, include, exclude = [], maxFiles = 100000) {
  include.forEach(checkPattern); exclude.forEach(checkPattern);
  const results = await glob(include, { cwd: root, ignore: exclude, nodir: true, dot: true, follow: false, posix: true });
  const sorted = [...new Set(results)].sort();
  if (sorted.length > maxFiles) throw new Error(`Inventory exceeds maxFiles (${sorted.length} > ${maxFiles}); narrow the protocol explicitly`);
  return sorted;
}

export async function readBounded(root, relative, maxBytes) {
  const file = await targetPath(root, relative);
  const info = await fs.stat(file);
  if (!info.isFile() || info.size > maxBytes) throw new Error(`File is not regular or exceeds maxFileBytes: ${relative}`);
  const data = await fs.readFile(file);
  if (data.length > maxBytes) throw new Error(`File grew beyond maxFileBytes: ${relative}`);
  return { data, hash: digest(data), size: data.length };
}

/** Create-only artifact writer. Existing evidence is never silently overwritten. */
export async function writeNew(root, relative, value) {
  const file = await targetPath(root, relative, { write: true });
  await fs.mkdir(path.dirname(file), { recursive: true });
  // Recheck after directory creation before opening the final path.
  await targetPath(root, relative, { write: true });
  await fs.writeFile(file, typeof value === 'string' ? value : JSON.stringify(value, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  return file;
}

export async function writeAtomic(root, relative, data) {
  const file = await targetPath(root, relative, { write: true });
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temp = `${relative}.${crypto.randomUUID()}.tmp`;
  const tempFile = await writeNew(root, temp, data);
  try {
    await targetPath(root, relative, { write: true });
    await fs.rename(tempFile, file);
  } finally {
    await fs.rm(tempFile, { force: true });
  }
}
