/**
 * MC bridge end-to-end integration test.
 *
 * Spins up a fake `aiwg serve` (HTTP /api/v1/sessions/:id/dispatch + WS
 * /ws/executors/:id) using ws + node:http, queues an MC mission to disk,
 * starts the bridge, and asserts the full lifecycle reaches `done`:
 *
 *   queued → assigned (POST 202) → running (mission.started) → done (mission.completed)
 *
 * @source @tools/mc-bridge/queue-tailer.mjs
 * @issue #1182 (cycle 3)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:http';
import type { Server, IncomingMessage } from 'node:http';
import type { AddressInfo } from 'node:net';
import { WebSocketServer, WebSocket } from 'ws';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — .mjs module without bundled types
import { startQueueTailer } from '../../tools/mc-bridge/queue-tailer.mjs';

interface FakeServeHandle {
  httpUrl: string;
  port: number;
  /** Send an executor event to the connected client. Throws if no client. */
  sendEvent: (event: Record<string, unknown>) => void;
  /** Wait for the executor WS to connect. */
  awaitExecutorConnection: (ms?: number) => Promise<void>;
  stop: () => Promise<void>;
  dispatches: Array<{ sessionId: string; body: unknown }>;
}

async function startFakeServe(executorId: string): Promise<FakeServeHandle> {
  const dispatches: Array<{ sessionId: string; body: unknown }> = [];
  let executorSocket: WebSocket | null = null;
  let resolveConnect: (() => void) | null = null;
  const connectPromise = new Promise<void>(r => { resolveConnect = r; });

  // HTTP server with dispatch endpoint
  const httpServer: Server = createServer((req, res) => {
    if (req.method === 'POST' && /^\/api\/v1\/sessions\/[^/]+\/dispatch$/.test(req.url || '')) {
      const sessionId = decodeURIComponent((req.url || '').split('/')[4]);
      let body = '';
      req.on('data', c => { body += c; });
      req.on('end', () => {
        let parsed: unknown = null;
        try { parsed = JSON.parse(body); } catch {}
        dispatches.push({ sessionId, body: parsed });
        const missionId = (parsed as { mission_id?: string })?.mission_id || '';
        res.writeHead(202, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          mission_id: missionId,
          executor_id: executorId,
          status: 'assigned',
          estimated_start: new Date().toISOString(),
        }));
      });
      return;
    }
    res.writeHead(404);
    res.end();
  });

  // WS server on the same HTTP server
  const wss = new WebSocketServer({ noServer: true });
  httpServer.on('upgrade', (req: IncomingMessage, socket, head) => {
    const url = req.url || '';
    const m = url.match(/^\/ws\/executors\/([^/?]+)/);
    if (!m) {
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, ws => {
      executorSocket = ws;
      ws.on('close', () => { executorSocket = null; });
      resolveConnect?.();
      resolveConnect = null;
    });
  });

  await new Promise<void>(r => httpServer.listen(0, '127.0.0.1', r));
  const port = (httpServer.address() as AddressInfo).port;

  return {
    httpUrl: `http://127.0.0.1:${port}`,
    port,
    dispatches,
    sendEvent: (event) => {
      if (!executorSocket) throw new Error('no executor connected yet');
      executorSocket.send(JSON.stringify(event));
    },
    awaitExecutorConnection: (ms = 2000) =>
      Promise.race([
        connectPromise,
        new Promise<void>((_, reject) =>
          setTimeout(() => reject(new Error(`no executor connection within ${ms}ms`)), ms),
        ),
      ]),
    stop: async () => {
      try { executorSocket?.close(); } catch {}
      wss.close();
      await new Promise<void>(r => httpServer.close(() => r()));
    },
  };
}

async function waitFor<T>(
  pred: () => T | undefined | Promise<T | undefined>,
  timeoutMs = 3000,
  intervalMs = 25,
): Promise<NonNullable<T>> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const v = await pred();
    if (v) return v as NonNullable<T>;
    if (Date.now() > deadline) {
      throw new Error(`waitFor: predicate did not resolve within ${timeoutMs}ms`);
    }
    await new Promise(r => setTimeout(r, intervalMs));
  }
}

describe('mc-bridge end-to-end flow', () => {
  let mcRoot: string;
  let serve: FakeServeHandle;

  beforeEach(async () => {
    mcRoot = await mkdtemp(join(tmpdir(), 'mc-bridge-e2e-'));
    serve = await startFakeServe('exec-e2e');
  });

  afterEach(async () => {
    await serve.stop();
    await rm(mcRoot, { recursive: true, force: true });
  });

  it('queued → assigned → running → done via real HTTP + WS', async () => {
    // Stand up an MC session with one queued mission
    const sessDir = join(mcRoot, 'sessions', 'mc-e2e');
    await mkdir(sessDir, { recursive: true });
    const sessionPath = join(sessDir, 'session.json');
    await writeFile(
      sessionPath,
      JSON.stringify({
        id: 'mc-e2e',
        state: 'active',
        missions: [{ id: 'm-e2e-1', status: 'queued', objective: 'echo hi' }],
      }),
    );

    const events: Array<{ msg: string; meta?: Record<string, unknown> }> = [];
    const handle = await startQueueTailer({
      aiwgServeUrl: serve.httpUrl,
      watchDir: mcRoot,
      // Use the real WebSocket (Node 22+ has it as a global; if not, ws.WebSocket works too)
      WebSocketImpl: WebSocket,
      logger: (msg: string, meta?: Record<string, unknown>) => events.push({ msg, meta }),
    });

    // Dispatch should land within a few hundred ms
    const dispatched = await waitFor(
      () => events.find(e => e.msg === 'queue-tailer:dispatched'),
      3000,
    );
    expect(dispatched.meta!.missionId).toBe('m-e2e-1');
    expect(dispatched.meta!.executorId).toBe('exec-e2e');
    expect(serve.dispatches).toHaveLength(1);
    expect(serve.dispatches[0].sessionId).toBe('mc-e2e');

    // session.json must show assigned now
    let snap = JSON.parse(await readFile(sessionPath, 'utf-8'));
    expect(snap.missions[0].status).toBe('assigned');
    expect(snap.missions[0].executorId).toBe('exec-e2e');

    // Bridge should have opened the executor WS by now
    await serve.awaitExecutorConnection(2000);

    // Push mission.started → expect status flip to running
    serve.sendEvent({
      event: 'mission.started',
      executor_id: 'exec-e2e',
      mission_id: 'm-e2e-1',
      ts: '2026-05-12T00:00:00Z',
      data: { agent_runtime: 'claude-code', pty_session_id: 'pty-1' },
    });

    await waitFor(async () => {
      const s = JSON.parse(await readFile(sessionPath, 'utf-8'));
      return s.missions[0].status === 'running' ? s : undefined;
    }, 3000);
    snap = JSON.parse(await readFile(sessionPath, 'utf-8'));
    expect(snap.missions[0].agentRuntime).toBe('claude-code');
    expect(snap.missions[0].ptySessionId).toBe('pty-1');

    // Push mission.completed → expect status flip to done
    serve.sendEvent({
      event: 'mission.completed',
      executor_id: 'exec-e2e',
      mission_id: 'm-e2e-1',
      ts: '2026-05-12T00:00:01Z',
      data: { exit_code: 0, summary: 'ok' },
    });

    await waitFor(async () => {
      const s = JSON.parse(await readFile(sessionPath, 'utf-8'));
      return s.missions[0].status === 'done' ? s : undefined;
    }, 3000);
    snap = JSON.parse(await readFile(sessionPath, 'utf-8'));
    expect(snap.missions[0].exitCode).toBe(0);
    expect(snap.missions[0].summary).toBe('ok');

    await handle.stop();
  });

  it('mission.failed event flips status to failed with reason+exit_code', async () => {
    const sessDir = join(mcRoot, 'sessions', 'mc-fail');
    await mkdir(sessDir, { recursive: true });
    const sessionPath = join(sessDir, 'session.json');
    await writeFile(
      sessionPath,
      JSON.stringify({
        id: 'mc-fail',
        missions: [{ id: 'm-fail-1', status: 'queued', objective: 'will fail' }],
      }),
    );

    const events: Array<{ msg: string }> = [];
    const handle = await startQueueTailer({
      aiwgServeUrl: serve.httpUrl,
      watchDir: mcRoot,
      WebSocketImpl: WebSocket,
      logger: (msg: string) => events.push({ msg }),
    });

    await waitFor(() => events.find(e => e.msg === 'queue-tailer:dispatched'), 3000);
    await serve.awaitExecutorConnection(2000);

    serve.sendEvent({
      event: 'mission.failed',
      executor_id: 'exec-e2e',
      mission_id: 'm-fail-1',
      ts: '2026-05-12T00:00:02Z',
      data: { reason: 'non_zero_exit', error: 'agent crash', exit_code: 139 },
    });

    await waitFor(async () => {
      const s = JSON.parse(await readFile(sessionPath, 'utf-8'));
      return s.missions[0].status === 'failed' ? s : undefined;
    }, 3000);
    const snap = JSON.parse(await readFile(sessionPath, 'utf-8'));
    expect(snap.missions[0].failureReason).toBe('non_zero_exit');
    expect(snap.missions[0].failureMessage).toBe('agent crash');
    expect(snap.missions[0].exitCode).toBe(139);

    await handle.stop();
  });
});
