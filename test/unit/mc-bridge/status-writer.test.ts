/**
 * status-writer — atomic mission-status updates with per-session mutex.
 *
 * @source @tools/mc-bridge/status-writer.mjs
 * @issue #1182 (cycle 2)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — .mjs module without bundled types
import {
  applyStatusUpdate,
  applyStatusUpdatesBatched,
} from '../../../tools/mc-bridge/status-writer.mjs';

describe('applyStatusUpdate', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'status-writer-test-'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  async function seedSession(missions: Array<Record<string, unknown>>) {
    const path = join(dir, 'session.json');
    await writeFile(
      path,
      JSON.stringify({ id: 'mc-test', state: 'active', missions, updatedAt: 'seed' }),
    );
    return path;
  }

  it('updates a mission status and stamps updatedAt', async () => {
    const path = await seedSession([
      { id: 'm-1', status: 'queued', objective: 'one' },
      { id: 'm-2', status: 'queued', objective: 'two' },
    ]);
    const res = await applyStatusUpdate(path, {
      missionId: 'm-1',
      status: 'assigned',
      patch: { executorId: 'exec-x' },
    });
    expect(res.outcome).toBe('updated');
    const updated = JSON.parse(await readFile(path, 'utf-8'));
    expect(updated.missions[0].status).toBe('assigned');
    expect(updated.missions[0].executorId).toBe('exec-x');
    expect(updated.missions[1].status).toBe('queued'); // untouched
    expect(updated.updatedAt).not.toBe('seed');
  });

  it('returns missing-session when the file does not exist', async () => {
    const res = await applyStatusUpdate(join(dir, 'absent.json'), {
      missionId: 'm-1',
      status: 'assigned',
    });
    expect(res.outcome).toBe('missing-session');
  });

  it('returns missing-mission when the mission id is not found', async () => {
    const path = await seedSession([{ id: 'm-1', status: 'queued' }]);
    const res = await applyStatusUpdate(path, { missionId: 'm-99', status: 'assigned' });
    expect(res.outcome).toBe('missing-mission');
  });

  it('returns stale when transitionFrom does not match', async () => {
    const path = await seedSession([{ id: 'm-1', status: 'running' }]);
    const res = await applyStatusUpdate(path, {
      missionId: 'm-1',
      status: 'assigned',
      transitionFrom: 'queued',
    });
    expect(res.outcome).toBe('stale');
    const onDisk = JSON.parse(await readFile(path, 'utf-8'));
    expect(onDisk.missions[0].status).toBe('running'); // not clobbered
  });

  it('serializes concurrent updates to the same session', async () => {
    const path = await seedSession([
      { id: 'm-a', status: 'queued', objective: 'a' },
      { id: 'm-b', status: 'queued', objective: 'b' },
      { id: 'm-c', status: 'queued', objective: 'c' },
    ]);

    // Three concurrent updates — they MUST serialize so the writes don't
    // clobber each other. Each one reads, mutates one mission, writes.
    await Promise.all([
      applyStatusUpdate(path, { missionId: 'm-a', status: 'assigned' }),
      applyStatusUpdate(path, { missionId: 'm-b', status: 'assigned' }),
      applyStatusUpdate(path, { missionId: 'm-c', status: 'assigned' }),
    ]);

    const final = JSON.parse(await readFile(path, 'utf-8'));
    expect(final.missions.map((m: { status: string }) => m.status)).toEqual([
      'assigned',
      'assigned',
      'assigned',
    ]);
  });
});

describe('applyStatusUpdatesBatched', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'status-writer-test-'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('applies multiple updates in one write and reports applied + missing', async () => {
    const path = join(dir, 'session.json');
    await writeFile(
      path,
      JSON.stringify({
        id: 'mc',
        missions: [
          { id: 'm-1', status: 'queued' },
          { id: 'm-2', status: 'queued' },
        ],
      }),
    );

    const res = await applyStatusUpdatesBatched(path, [
      { missionId: 'm-1', status: 'failed', patch: { failureReason: 'r' } },
      { missionId: 'm-2', status: 'assigned' },
      { missionId: 'm-99', status: 'assigned' }, // missing
    ]);

    expect(res.outcome).toBe('updated');
    expect(res.applied).toEqual(['m-1', 'm-2']);
    expect(res.missing).toEqual(['m-99']);

    const final = JSON.parse(await readFile(path, 'utf-8'));
    expect(final.missions[0].status).toBe('failed');
    expect(final.missions[0].failureReason).toBe('r');
    expect(final.missions[1].status).toBe('assigned');
  });

  it('returns missing-session when the file is absent', async () => {
    const res = await applyStatusUpdatesBatched(join(dir, 'no.json'), [
      { missionId: 'm-1', status: 'failed' },
    ]);
    expect(res.outcome).toBe('missing-session');
    expect(res.missing).toEqual(['m-1']);
  });
});
