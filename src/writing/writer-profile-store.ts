import { mkdir, readFile, writeFile, rename, rm, readdir, lstat } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { resolveUserConfigDir } from '../config/user-config-dir.mjs';
import { parseWriterProfile, type WriterProfile } from './writer-profile.js';

export interface WriterProfileStoreOptions {
  cwd: string;
  scope?: 'project' | 'user';
  userConfigDir?: string;
}

/** Explicit scopes never fall through to a profile in another scope. */
export class WriterProfileStore {
  readonly directory: string;
  constructor(options: WriterProfileStoreOptions) {
    if (options.scope && !['project', 'user'].includes(options.scope)) throw new Error('Invalid writer profile scope');
    this.directory = path.join(options.scope === 'user'
      ? resolveUserConfigDir({ configDir: options.userConfigDir })
      : path.resolve(options.cwd, '.aiwg'), 'writer-profiles');
  }

  private profilePath(id: string): string {
    if (!/^[a-z0-9][a-z0-9.-]{0,79}$/.test(id) || id.includes('..')) throw new Error('Invalid writer profile ID');
    return path.join(this.directory, `${id}.json`);
  }

  private async regularFile(file: string): Promise<void> {
    const stat = await lstat(file);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('Writer profile must be a regular file');
  }

  async read(id: string): Promise<WriterProfile> {
    const file = this.profilePath(id);
    await this.regularFile(file);
    const profile = parseWriterProfile(JSON.parse(await readFile(file, 'utf8')));
    if (profile.id !== id) throw new Error('Writer profile ID mismatch');
    return profile;
  }

  async list(): Promise<string[]> {
    try {
      const files = await readdir(this.directory, { withFileTypes: true });
      return files.filter(file => file.isFile() && /^[a-z0-9][a-z0-9.-]*\.json$/.test(file.name))
        .map(file => file.name.slice(0, -5)).sort();
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw error;
    }
  }

  private async locked<T>(id: string, action: () => Promise<T>): Promise<T> {
    const file = this.profilePath(id);
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    const lock = `${file}.lock`;
    try { await mkdir(lock, { mode: 0o700 }); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EEXIST') throw new Error('Writer profile is locked by another operation');
      throw error;
    }
    try { return await action(); }
    finally { await rm(lock, { recursive: true, force: true }); }
  }

  /** expectedRevision=0 creates; updates require the current revision. */
  async save(input: unknown, expectedRevision: number): Promise<WriterProfile> {
    const profile = parseWriterProfile(input);
    return this.locked(profile.id, async () => {
      let current: WriterProfile | undefined;
      try { current = await this.read(profile.id); }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
      if ((current?.revision ?? 0) !== expectedRevision) throw new Error('Writer profile revision conflict');
      const next = parseWriterProfile({ ...profile, revision: expectedRevision + 1 });
      const file = this.profilePath(profile.id);
      const temporary = `${file}.${randomUUID()}.tmp`;
      try {
        await writeFile(temporary, JSON.stringify(next, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
        // Invalidate before publishing: an interrupted update may lose cache, never retain stale text.
        await this.invalidate(profile.id);
        await rename(temporary, file);
      } finally { await rm(temporary, { force: true }); }
      return next;
    });
  }

  private async invalidate(id: string): Promise<void> {
    this.profilePath(id);
    // This store deliberately retains no historical sample content.
    for (const kind of ['cache', 'history']) {
      await rm(path.join(this.directory, kind, id), { recursive: true, force: true });
    }
  }

  async delete(id: string, expectedRevision: number): Promise<void> {
    await this.locked(id, async () => {
      const current = await this.read(id);
      if (current.revision !== expectedRevision) throw new Error('Writer profile revision conflict');
      await this.invalidate(id);
      await rm(this.profilePath(id));
    });
  }
}
