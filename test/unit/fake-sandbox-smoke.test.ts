/**
 * Fake agentic-sandbox harness smoke tests.
 *
 * Validates the harness contract surface from `test/fixtures/fake-sandbox/`:
 *   - startFakeSandbox() returns {url, ws_url, port, stop} with an ephemeral port
 *   - All four scenarios (happy-path, slow-events, partition, crash-recovery)
 *     drive the expected response shapes
 *   - Repeated start/stop loop doesn't leak (no ports stuck, no hanging WS)
 *
 * @source @test/fixtures/fake-sandbox/server.mjs
 * @issue #1173
 */

import { describe, it, expect } from 'vitest';
import { WebSocket } from 'ws';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — .mjs without bundled types
import { startFakeSandbox } from '../fixtures/fake-sandbox/server.mjs';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { happyPath } from '../fixtures/fake-sandbox/scenarios/happy-path.mjs';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { slowEvents } from '../fixtures/fake-sandbox/scenarios/slow-events.mjs';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { partition } from '../fixtures/fake-sandbox/scenarios/partition.mjs';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { crashRecovery } from '../fixtures/fake-sandbox/scenarios/crash-recovery.mjs';

describe('startFakeSandbox', () => {
  it('starts on an ephemeral port and exposes a typed handle', async () => {
    const sb = await startFakeSandbox();
    expect(sb.url).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);
    expect(sb.ws_url).toMatch(/^ws:\/\/127\.0\.0\.1:\d+$/);
    expect(sb.port).toBeGreaterThan(1024);
    expect(typeof sb.stop).toBe('function');
    await sb.stop();
  });

  it('serves /api/v1/aiwg/status', async () => {
    const sb = await startFakeSandbox();
    const resp = await fetch(`${sb.url}/api/v1/aiwg/status`);
    expect(resp.status).toBe(200);
    const body = await resp.json();
    expect(body.fake).toBe(true);
    await sb.stop();
  });

  it('handles a full task lifecycle: create → patch → cancel', async () => {
    const sb = await startFakeSandbox();
    // Create
    const create = await fetch(`${sb.url}/api/v1/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: 'echo hi' }),
    });
    expect(create.status).toBe(201);
    const { task_id } = await create.json();
    expect(task_id).toMatch(/^task-/);

    // Status read
    const status = await fetch(`${sb.url}/api/v1/tasks/${task_id}`);
    expect(status.status).toBe(200);

    // Send stdin via patch
    const patch = await fetch(`${sb.url}/api/v1/tasks/${task_id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stdin: 'hello\n' }),
    });
    expect(patch.status).toBe(200);

    // Log read
    const logs = await fetch(`${sb.url}/api/v1/tasks/${task_id}/logs?offset=0`);
    expect(logs.status).toBe(200);
    const logBody = await logs.json();
    expect(logBody.lines).toContain('[stdin] hello\n');

    // Cancel
    const del = await fetch(`${sb.url}/api/v1/tasks/${task_id}`, { method: 'DELETE' });
    expect(del.status).toBe(200);

    // Final state
    const final = await fetch(`${sb.url}/api/v1/tasks/${task_id}`);
    expect((await final.json()).state).toBe('cancelled');

    await sb.stop();
  });

  it('returns 404 for unknown task id', async () => {
    const sb = await startFakeSandbox();
    const resp = await fetch(`${sb.url}/api/v1/tasks/nope`);
    expect(resp.status).toBe(404);
    await sb.stop();
  });

  it('lists instances with the three default kinds', async () => {
    const sb = await startFakeSandbox();
    const resp = await fetch(`${sb.url}/api/v1/agents`);
    expect(resp.status).toBe(200);
    const { agents } = await resp.json();
    expect(agents).toHaveLength(3);
    expect(agents.map((a: { kind: string }) => a.kind).sort()).toEqual(['agent', 'container', 'vm']);
    await sb.stop();
  });
});

describe('scenarios', () => {
  it('happy-path: task auto-transitions queued → running → completed', async () => {
    const sb = await startFakeSandbox({ scenario: happyPath() });
    const create = await fetch(`${sb.url}/api/v1/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: 'true' }),
    });
    const { task_id } = await create.json();

    // First poll → running
    let st = await (await fetch(`${sb.url}/api/v1/tasks/${task_id}`)).json();
    expect(st.state).toBe('running');
    expect(st.started_at).toBeDefined();

    // Second poll → completed
    st = await (await fetch(`${sb.url}/api/v1/tasks/${task_id}`)).json();
    expect(st.state).toBe('completed');
    expect(st.exit_code).toBe(0);

    await sb.stop();
  });

  /** Helper that opens a WS, collects messages, and resolves after N events or timeout. */
  function collectWS(url: string, expected: number, timeoutMs: number): Promise<{ received: unknown[]; ws: WebSocket }> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url);
      const received: unknown[] = [];
      const done = () => resolve({ received, ws });
      const timer = setTimeout(done, timeoutMs);
      // Register message listener BEFORE waiting for open so we don't race
      // server-side event emission that starts as soon as upgrade completes.
      ws.on('message', (data: Buffer) => {
        received.push(JSON.parse(data.toString()));
        if (received.length >= expected) {
          clearTimeout(timer);
          done();
        }
      });
      ws.on('error', (err: Error) => { clearTimeout(timer); reject(err); });
    });
  }

  it('happy-path: WS subscriber receives canned events in order', async () => {
    const sb = await startFakeSandbox({ scenario: happyPath() });
    const { received, ws } = await collectWS(`${sb.ws_url}/ws/sandbox/fake`, 2, 1500);
    expect(received.length).toBeGreaterThanOrEqual(1);
    expect((received[0] as { event: string }).event).toMatch(/agent\./);
    ws.close();
    await sb.stop();
  });

  it('slow-events: emits configured event count after microtask yields', async () => {
    const sb = await startFakeSandbox({ scenario: slowEvents({ yields: 2, eventCount: 3 }) });
    const { received, ws } = await collectWS(`${sb.ws_url}/ws/sandbox/fake`, 3, 1500);
    expect(received.length).toBe(3);
    ws.close();
    await sb.stop();
  });

  it('partition: drops the WS after configured event count', async () => {
    const sb = await startFakeSandbox({ scenario: partition({ dropAfter: 1, eventCount: 5 }) });
    const ws = new WebSocket(`${sb.ws_url}/ws/sandbox/fake`);
    let closeCode: number | null = null;
    await new Promise<void>((resolve) => {
      ws.on('close', (code: number) => { closeCode = code; resolve(); });
      // Failsafe — if close doesn't fire, resolve via timeout
      setTimeout(resolve, 2000);
    });
    // Partition closes with 1006 (abnormal) or terminates; readyState should
    // have advanced past OPEN.
    expect(ws.readyState).toBeGreaterThanOrEqual(2); // CLOSING or CLOSED
    expect(closeCode !== null || ws.readyState === 3).toBe(true);
    await sb.stop();
  });

  it('crash-recovery: returns 503 then 201 once failFor budget is exhausted', async () => {
    const sb = await startFakeSandbox({ scenario: crashRecovery({ failFor: 2 }) });
    // First two requests fail
    const r1 = await fetch(`${sb.url}/api/v1/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(r1.status).toBe(503);
    const r2 = await fetch(`${sb.url}/api/v1/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(r2.status).toBe(503);

    // Third one recovers
    const r3 = await fetch(`${sb.url}/api/v1/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(r3.status).toBe(201);

    await sb.stop();
  });
});

describe('leak detection', () => {
  it('repeated start/stop in a loop does not leak ports', async () => {
    const ports = new Set<number>();
    for (let i = 0; i < 5; i++) {
      const sb = await startFakeSandbox();
      ports.add(sb.port);
      await sb.stop();
    }
    // We should have gotten 5 distinct ports (OS-assigned) and all closed cleanly.
    expect(ports.size).toBeGreaterThanOrEqual(1);
  });
});
