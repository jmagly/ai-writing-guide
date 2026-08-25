import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { applyMigration, discoverMigration, resumeMigration, rollbackMigration, verifyMigration } from '../../../tools/mission-protocol/migrate.mjs';

async function workspace(states = ['running', 'paused', 'completed', 'failed', 'aborted', 'incomplete']) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'aiwg-mission-migration-'));
  const sessions = path.join(root, '.aiwg/ralph-external/mc/sessions');
  await mkdir(sessions, { recursive: true });
  const originals = new Map<string, Buffer>();
  for (const [index, state] of states.entries()) {
    const target = path.join(sessions, `s-${index}.mission.json`);
    const bytes = Buffer.from(JSON.stringify({ id: `mission-${index}`, objective: `fixture ${state}`, status: state, vendor: { retained: true } }));
    await writeFile(target, bytes); originals.set(target, bytes);
  }
  return { root, originals };
}

describe('Mission workspace migration', () => {
  it('discovers versions, transforms, disk needs, and unknowns without mission content', async () => {
    const { root } = await workspace(['running']);
    const corrupt = path.join(root, '.aiwg/ralph-external/mc/sessions/corrupt.mission.json');
    await writeFile(corrupt, '{secret objective');
    const report = await discoverMigration(root);
    expect(report).toMatchObject({ targetVersion: 'mission.aiwg.io/v1', contentExcluded: true });
    expect(report.requiredBytes).toBeGreaterThan(0);
    expect(JSON.stringify(report)).not.toContain('secret objective');
    expect(report.files).toEqual(expect.arrayContaining([expect.objectContaining({ path: expect.stringContaining('corrupt'), action: 'fail-closed', unknowns: ['invalid JSON'] })]));
  });

  it('applies atomically, verifies all lifecycle states, is idempotent, and restores exact bytes', async () => {
    const { root, originals } = await workspace();
    const manifest = await applyMigration({ root, targetVersion: 'mission.aiwg.io/v1', id: 'states' });
    expect(manifest.state).toBe('applied');
    expect(manifest.entries).toHaveLength(6);
    expect((await verifyMigration({ root, id: 'states' })).valid).toBe(true);
    expect((await applyMigration({ root, targetVersion: 'mission.aiwg.io/v1', id: 'states' })).state).toBe('applied');
    expect((await resumeMigration({ root, id: 'states' })).state).toBe('applied');
    for (const target of originals.keys()) expect(JSON.parse(await readFile(target, 'utf8')).apiVersion).toBe('mission.aiwg.io/v1');
    expect((await rollbackMigration({ root, id: 'states' })).state).toBe('rolled-back');
    for (const [target, bytes] of originals) expect(await readFile(target)).toEqual(bytes);
  });

  it('resumes deterministically after interruption and fails closed on unknown majors', async () => {
    const { root } = await workspace(['running', 'completed']);
    await expect(applyMigration({ root, targetVersion: 'mission.aiwg.io/v1', id: 'resume', interruptAfter: 1 })).rejects.toThrow(/resume/);
    expect((await resumeMigration({ root, id: 'resume' })).state).toBe('applied');
    const future = await workspace(['running']);
    const target = [...future.originals.keys()][0];
    await writeFile(target, JSON.stringify({ apiVersion: 'mission.aiwg.io/v2', id: 'future', objective: 'future' }));
    await expect(applyMigration({ root: future.root, targetVersion: 'mission.aiwg.io/v1', id: 'future' })).rejects.toThrow(/fails closed/);
  });

  it('requires an explicit supported target before creating migration state', async () => {
    const { root } = await workspace(['running']);
    await expect(applyMigration({ root })).rejects.toThrow(/requires --target/);
    await expect(applyMigration({ root, targetVersion: 'mission.aiwg.io/v1', id: '../escape' })).rejects.toThrow(/Migration id/);
  });
});
