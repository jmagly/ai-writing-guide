import { createHash } from 'node:crypto';
import { access, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WriterProfileStore } from '../../../src/writing/writer-profile-store.js';
import { parseWriterProfile } from '../../../src/writing/writer-profile.js';
import {
  applyWriterProfileMigration,
  planWriterProfileMigration,
  rollbackWriterProfileMigration,
} from '../../../src/writing/writer-migration.js';

const roots: string[] = [];
const digest = (text: string) => createHash('sha256').update(text).digest('hex');
const legacyYaml = 'name: Legacy\nversion: "1.0"\ndescription: old scoring\ntone:\n  confidence: 0.8\n';

afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))); });

async function setup() {
  const cwd = await mkdtemp(path.join(tmpdir(), 'writer-migration-'));
  roots.push(cwd);
  const sourcePath = path.join(cwd, 'legacy.yaml');
  await writeFile(sourcePath, legacyYaml);
  return { cwd, sourcePath };
}

describe('writer profile migration', () => {
  it('builds an opt-in dry-run plan that preserves legacy bytes and creates no active selection', async () => {
    const { cwd, sourcePath } = await setup();
    const plan = await planWriterProfileMigration({
      cwd,
      sourcePath: 'legacy.yaml',
      format: 'yaml',
      profile: { id: 'author', name: 'Author', provenance: { source: 'legacy.yaml', license: 'author-owned' } },
    });

    expect(plan.dryRun).toBe(true);
    expect(plan.source.path).toBe(sourcePath);
    expect(plan.planSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(plan.source).toMatchObject({ sha256: digest(legacyYaml), bytes: Buffer.byteLength(legacyYaml), legacyKind: 'addon-template' });
    expect(plan.target).toMatchObject({ profileId: 'author', existingProfile: null, activatesProfile: false });
    expect(plan.profileTemplate.legacy?.raw).toBe(legacyYaml);
    expect(plan.profileTemplate.legacy?.payload).toMatchObject({ tone: { confidence: 0.8 } });
    expect(await new WriterProfileStore({ cwd }).list()).toEqual([]);
  });

  it('applies through the profile store with a private backup and rolls back a newly created sidecar', async () => {
    const { cwd, sourcePath } = await setup();
    const plan = await planWriterProfileMigration({
      cwd,
      sourcePath,
      format: 'yaml',
      profile: { id: 'author', name: 'Author', provenance: { source: 'legacy.yaml', license: 'author-owned' } },
    });

    const applied = await applyWriterProfileMigration(plan);
    expect(applied.activatedProfile).toBe(false);
    expect(applied.backupPath.startsWith(path.join(cwd, '.aiwg', 'writer-profiles', 'migration-backups', 'author'))).toBe(true);
    const backup = JSON.parse(await readFile(applied.backupPath, 'utf8'));
    expect(Buffer.from(backup.source.rawBase64, 'base64').toString('utf8')).toBe(legacyYaml);
    const saved = await new WriterProfileStore({ cwd }).read('author');
    expect(saved.legacy?.raw).toBe(legacyYaml);

    await expect(rollbackWriterProfileMigration(applied)).resolves.toBe('removed');
    const repeatedPlan = await planWriterProfileMigration({
      cwd,
      sourcePath,
      format: 'yaml',
      profile: { id: 'author', name: 'Author', provenance: { source: 'legacy.yaml', license: 'author-owned' } },
    });
    const repeated = await applyWriterProfileMigration(repeatedPlan);
    expect(repeated.backupPath).not.toBe(applied.backupPath);
    await expect(rollbackWriterProfileMigration(repeated)).resolves.toBe('removed');
    await expect(new WriterProfileStore({ cwd }).read('author')).rejects.toThrow();
  });

  it('restores an existing profile while preserving legacy numeric payloads', async () => {
    const { cwd, sourcePath } = await setup();
    const store = new WriterProfileStore({ cwd });
    const original = parseWriterProfile({
      schemaVersion: 1,
      id: 'author',
      version: '1.0.0',
      name: 'Original',
      provenance: { source: 'manual', license: 'author-owned' },
      samples: [],
      preferences: [{ id: 'explicit', key: 'directness', value: 'direct', origin: 'explicit', confidence: 'low', evidence: [] }],
    });
    await store.save(original, 0);
    const plan = await planWriterProfileMigration({
      cwd,
      sourcePath,
      format: 'yaml',
      profile: { id: 'author', name: 'Migrated', provenance: { source: 'legacy.yaml', license: 'author-owned' } },
    });

    expect(plan.target.existingProfile?.revision).toBe(1);
    expect(plan.target.existingProfile?.sha256).toMatch(/^[a-f0-9]{64}$/);
    const applied = await applyWriterProfileMigration(plan);
    expect((await store.read('author')).legacy?.payload).toMatchObject({ tone: { confidence: 0.8 } });
    await expect(rollbackWriterProfileMigration(applied)).resolves.toBe('restored');
    const restored = await store.read('author');
    expect(restored.name).toBe('Original');
    expect(restored.preferences[0]).toMatchObject({ key: 'directness', value: 'direct' });
    expect(restored.legacy).toBeUndefined();
  });

  it('refuses tampered plans, changed sources, changed targets, stale profile rollbacks and corrupt backups', async () => {
    const { cwd, sourcePath } = await setup();
    const store = new WriterProfileStore({ cwd });
    const plan = await planWriterProfileMigration({
      cwd,
      sourcePath,
      format: 'yaml',
      profile: { id: 'author', name: 'Author', provenance: { source: 'legacy.yaml', license: 'author-owned' } },
    });
    await expect(applyWriterProfileMigration({ ...plan, id: 'wm-../../escape' })).rejects.toThrow();
    await expect(applyWriterProfileMigration({ ...plan, profileTemplate: { ...plan.profileTemplate, id: 'other' } })).rejects.toThrow();
    await expect(applyWriterProfileMigration({ ...plan, planSha256: digest('tampered') })).rejects.toThrow('plan integrity');
    await writeFile(sourcePath, `${legacyYaml}extra: true\n`);
    await expect(applyWriterProfileMigration(plan)).rejects.toThrow('changed after migration plan');
    await writeFile(sourcePath, legacyYaml);
    const applied = await applyWriterProfileMigration(plan);
    const current = await store.read('author');
    await store.save({ ...current, name: 'Changed elsewhere' }, current.revision);
    await expect(rollbackWriterProfileMigration(applied)).rejects.toThrow('changed after migration');
    const corruptPlan = await planWriterProfileMigration({
      cwd,
      sourcePath,
      format: 'yaml',
      profile: { id: 'corrupt', name: 'Corrupt', provenance: { source: 'legacy.yaml', license: 'author-owned' } },
    });
    const corrupt = await applyWriterProfileMigration(corruptPlan);
    await writeFile(corrupt.backupPath, '{ broken');
    await expect(rollbackWriterProfileMigration(corrupt)).rejects.toThrow('backup integrity');
  });

  it('clears managed migration backups on later profile updates and refuses arbitrary rollback paths', async () => {
    const { cwd, sourcePath } = await setup();
    const store = new WriterProfileStore({ cwd });
    const plan = await planWriterProfileMigration({
      cwd,
      sourcePath,
      format: 'yaml',
      profile: { id: 'author', name: 'Author', provenance: { source: 'legacy.yaml', license: 'author-owned' } },
    });
    const applied = await applyWriterProfileMigration(plan);
    await expect(access(applied.backupPath)).resolves.toBeUndefined();
    const current = await store.read('author');
    await store.save({ ...current, name: 'Normal update clears backups' }, current.revision);
    await expect(access(applied.backupPath)).rejects.toMatchObject({ code: 'ENOENT' });

    const outside = path.join(cwd, 'outside.json');
    await writeFile(outside, '{}');
    await expect(rollbackWriterProfileMigration({ ...applied, backupPath: outside, createdProfileSha256: digest(JSON.stringify(await store.read('author'))) }))
      .rejects.toThrow('outside the managed backup directory');
  });

  it('clears managed migration backups on profile deletion', async () => {
    const { cwd, sourcePath } = await setup();
    const store = new WriterProfileStore({ cwd });
    const plan = await planWriterProfileMigration({
      cwd,
      sourcePath,
      format: 'yaml',
      profile: { id: 'author', name: 'Author', provenance: { source: 'legacy.yaml', license: 'author-owned' } },
    });
    const applied = await applyWriterProfileMigration(plan);
    const current = await store.read('author');
    await store.delete('author', current.revision);
    await expect(access(applied.backupPath)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('removes the unique backup when migration save fails after backup creation', async () => {
    const { cwd, sourcePath } = await setup();
    const store = new WriterProfileStore({ cwd });
    const original = parseWriterProfile({
      schemaVersion: 1,
      id: 'author',
      version: '1.0.0',
      name: 'Original private author',
      provenance: { source: 'manual', license: 'author-owned' },
      samples: [],
      preferences: [],
    });
    await store.save(original, 0);
    const plan = await planWriterProfileMigration({
      cwd,
      sourcePath,
      format: 'yaml',
      profile: { id: 'author', name: 'Migrated', provenance: { source: 'legacy.yaml', license: 'author-owned' } },
    });
    const save = vi.spyOn(WriterProfileStore.prototype, 'save').mockRejectedValueOnce(new Error('simulated revision conflict'));
    try {
      await expect(applyWriterProfileMigration(plan)).rejects.toThrow('simulated revision conflict');
    } finally {
      save.mockRestore();
    }
    const backupDir = store.managedMigrationBackupDirectory('author');
    const leftovers = await readdir(backupDir).catch(error => {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw error;
    });
    expect(leftovers).toEqual([]);
  });
});
