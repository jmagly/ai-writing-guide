/**
 * MC queue-tail bridge — cycle 1 smoke tests.
 *
 * Covers the cycle-1 contract surface: payload shape, backoff math, atomic
 * writeback, queued-mission extraction, and clean start/stop. Cycle 2 will
 * extend with real dispatch + retry tests; cycle 3 will add WS event mapping
 * tests.
 *
 * @source @tools/mc-bridge/queue-tailer.mjs
 * @issue #1182
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  backoffMs,
  buildDispatchPayload,
  discoverSessions,
  queuedMissions,
  readSession,
  startQueueTailer,
  writeSessionAtomic,
} from '../../../tools/mc-bridge/queue-tailer.mjs';

describe('queue-tailer', () => {
  let root;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mc-bridge-test-'));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  describe('backoffMs', () => {
    it('returns base on first attempt', () => {
      expect(backoffMs(1, 500)).toBe(500);
    });

    it('doubles per attempt', () => {
      expect(backoffMs(2, 500)).toBe(1000);
      expect(backoffMs(3, 500)).toBe(2000);
      expect(backoffMs(4, 500)).toBe(4000);
    });

    it('caps at 30 000 ms', () => {
      expect(backoffMs(20, 500)).toBe(30_000);
    });
  });

  describe('buildDispatchPayload', () => {
    it('maps a minimal mission to the v1 wire shape', () => {
      const payload = buildDispatchPayload(
        { id: 'm-1', objective: 'echo hi' },
        { sessionId: 'mc-s' },
      );
      expect(payload).toMatchObject({
        mission_id: 'm-1',
        objective: 'echo hi',
        long_running: false,
        executor_filter: { executor_id: null, capabilities: [], agent_id: null },
        metadata: { mc_session_id: 'mc-s', mode: 'direct', priority: 'normal' },
      });
    });

    it('flows through target agent + capability filters when set', () => {
      const payload = buildDispatchPayload(
        {
          id: 'm-2',
          objective: 'test run',
          completion: 'tests pass',
          longRunning: true,
          targetExecutorId: 'sandbox-01',
          targetAgentId: 'agent-01',
          requiredCapabilities: ['isolation:vm'],
          mode: 'pty-orchestrator',
          priority: 'high',
          metadata: { issue: 1182 },
        },
        { sessionId: 'mc-s2' },
      );
      expect(payload.executor_filter).toEqual({
        executor_id: 'sandbox-01',
        capabilities: ['isolation:vm'],
        agent_id: 'agent-01',
      });
      expect(payload.completion).toBe('tests pass');
      expect(payload.long_running).toBe(true);
      expect(payload.metadata).toEqual({
        mc_session_id: 'mc-s2',
        mode: 'pty-orchestrator',
        priority: 'high',
        issue: 1182,
      });
    });
  });

  describe('queuedMissions', () => {
    it('returns only missions with status="queued"', () => {
      const session = {
        id: 'mc-s',
        missions: [
          { id: 'a', status: 'queued', objective: 'x' },
          { id: 'b', status: 'running', objective: 'y' },
          { id: 'c', status: 'done', objective: 'z' },
          { id: 'd', status: 'queued', objective: 'w' },
        ],
      };
      const out = queuedMissions(session);
      expect(out).toHaveLength(2);
      expect(out.map(x => x.mission.id)).toEqual(['a', 'd']);
      expect(out.every(x => x.sessionId === 'mc-s')).toBe(true);
    });

    it('returns [] for a session with no missions array', () => {
      expect(queuedMissions({ id: 'x' })).toEqual([]);
      expect(queuedMissions(null)).toEqual([]);
    });
  });

  describe('discoverSessions', () => {
    it('returns [] when sessions dir does not exist', async () => {
      expect(await discoverSessions(root)).toEqual([]);
    });

    it('finds session.json files under sessions/', async () => {
      const sDir = join(root, 'sessions');
      await mkdir(join(sDir, 'mc-a'), { recursive: true });
      await mkdir(join(sDir, 'mc-b'), { recursive: true });
      await writeFile(join(sDir, 'mc-a', 'session.json'), '{"id":"mc-a"}');
      await writeFile(join(sDir, 'mc-b', 'session.json'), '{"id":"mc-b"}');

      const paths = await discoverSessions(root);
      expect(paths).toHaveLength(2);
      expect(paths.every(p => p.endsWith('/session.json'))).toBe(true);
    });
  });

  describe('readSession', () => {
    it('returns null for missing file', async () => {
      expect(await readSession(join(root, 'absent.json'))).toBeNull();
    });

    it('returns null for unparseable file (transient mid-write)', async () => {
      const p = join(root, 'partial.json');
      await writeFile(p, '{"id":"x",');
      expect(await readSession(p)).toBeNull();
    });

    it('parses a valid session.json', async () => {
      const p = join(root, 'ok.json');
      await writeFile(p, JSON.stringify({ id: 'mc-x', missions: [] }));
      expect(await readSession(p)).toEqual({ id: 'mc-x', missions: [] });
    });
  });

  describe('writeSessionAtomic', () => {
    it('writes via temp+rename and stamps updatedAt', async () => {
      const p = join(root, 'sub/dir/session.json');
      const session = { id: 'mc-y', missions: [], updatedAt: 'old' };
      await writeSessionAtomic(p, session);
      const raw = JSON.parse(await readFile(p, 'utf-8'));
      expect(raw.id).toBe('mc-y');
      expect(raw.updatedAt).not.toBe('old');
      expect(new Date(raw.updatedAt).toString()).not.toBe('Invalid Date');
    });
  });

  describe('startQueueTailer', () => {
    it('starts, performs an initial sweep, and stops cleanly', async () => {
      const sDir = join(root, 'sessions');
      await mkdir(join(sDir, 'mc-z'), { recursive: true });
      await writeFile(
        join(sDir, 'mc-z', 'session.json'),
        JSON.stringify({
          id: 'mc-z',
          missions: [{ id: 'm-z1', status: 'queued', objective: 'hello' }],
        }),
      );

      const events = [];
      const handle = await startQueueTailer({
        aiwgServeUrl: 'http://127.0.0.1:7337',
        watchDir: root,
        logger: (msg, meta) => events.push({ msg, meta }),
      });

      expect(events.some(e => e.msg === 'queue-tailer:start')).toBe(true);
      const dispatchCandidate = events.find(e => e.msg === 'queue-tailer:would-dispatch');
      expect(dispatchCandidate).toBeDefined();
      expect(dispatchCandidate.meta.missionId).toBe('m-z1');
      expect(dispatchCandidate.meta.sessionId).toBe('mc-z');
      expect(dispatchCandidate.meta.endpoint).toContain('/api/v1/sessions/mc-z/dispatch');

      await handle.stop();
      expect(events.some(e => e.msg === 'queue-tailer:stop')).toBe(true);

      // Stop should be idempotent
      await handle.stop();
    });

    it('honours an external AbortSignal', async () => {
      const ac = new AbortController();
      const events = [];
      const handle = await startQueueTailer({
        watchDir: root,
        signal: ac.signal,
        logger: (msg, meta) => events.push({ msg, meta }),
      });
      ac.abort();
      // Allow the abort listener to fire
      await new Promise(r => setTimeout(r, 20));
      expect(events.some(e => e.msg === 'queue-tailer:stop')).toBe(true);
      await handle.stop();
    });
  });
});
