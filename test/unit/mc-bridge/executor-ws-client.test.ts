/**
 * executor-ws-client tests — URL building, event→status mapping, reconnect.
 *
 * @source @tools/mc-bridge/executor-ws-client.mjs
 * @issue #1182 (cycle 3)
 */

import { describe, it, expect } from 'vitest';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — .mjs module without bundled types
import {
  buildWsUrl,
  reconnectDelay,
  eventToStatusUpdate,
  startExecutorWS,
} from '../../../tools/mc-bridge/executor-ws-client.mjs';

describe('buildWsUrl', () => {
  it('rewrites http → ws', () => {
    expect(buildWsUrl('http://localhost:7337', 'exec-1')).toBe(
      'ws://localhost:7337/ws/executors/exec-1',
    );
  });

  it('rewrites https → wss', () => {
    expect(buildWsUrl('https://aiwg.example.com', 'exec-1')).toBe(
      'wss://aiwg.example.com/ws/executors/exec-1',
    );
  });

  it('strips trailing slashes from the base URL', () => {
    expect(buildWsUrl('http://localhost:7337///', 'exec-1')).toBe(
      'ws://localhost:7337/ws/executors/exec-1',
    );
  });

  it('appends ?token= when provided', () => {
    expect(buildWsUrl('http://localhost:7337', 'exec-1', 'tkn-abc')).toBe(
      'ws://localhost:7337/ws/executors/exec-1?token=tkn-abc',
    );
  });

  it('URL-encodes executor ids + tokens with special chars', () => {
    expect(buildWsUrl('http://h', 'exec/with slash', 'a+b/c')).toBe(
      'ws://h/ws/executors/exec%2Fwith%20slash?token=a%2Bb%2Fc',
    );
  });
});

describe('reconnectDelay', () => {
  it('starts at base on attempt 1', () => {
    expect(reconnectDelay(1, 1000, 30000)).toBe(1000);
  });

  it('doubles each attempt up to cap', () => {
    expect(reconnectDelay(2, 1000, 30000)).toBe(2000);
    expect(reconnectDelay(5, 1000, 30000)).toBe(16000);
    expect(reconnectDelay(6, 1000, 30000)).toBe(30000); // capped
    expect(reconnectDelay(20, 1000, 30000)).toBe(30000);
  });

  it('treats attempt 0 the same as attempt 1', () => {
    expect(reconnectDelay(0, 1000, 30000)).toBe(1000);
  });
});

describe('eventToStatusUpdate', () => {
  const base = {
    executor_id: 'exec-1',
    mission_id: 'm-1',
    ts: '2026-05-12T00:00:00Z',
  };

  it('returns null for log-only events', () => {
    expect(eventToStatusUpdate({ ...base, event: 'mission.assigned' })).toBeNull();
    expect(eventToStatusUpdate({ ...base, event: 'mission.progress' })).toBeNull();
    expect(eventToStatusUpdate({ ...base, event: 'mission.reconnected' })).toBeNull();
    expect(eventToStatusUpdate({ event: 'executor.resync', executor_id: 'e', ts: 't' } as never)).toBeNull();
  });

  it('maps mission.started → running with agent_runtime + pty_session_id', () => {
    const out = eventToStatusUpdate({
      ...base,
      event: 'mission.started',
      data: { agent_runtime: 'claude-code', pty_session_id: 'pty-1' },
    });
    expect(out).toEqual({
      missionId: 'm-1',
      status: 'running',
      transitionFrom: 'assigned',
      patch: {
        startedAt: '2026-05-12T00:00:00Z',
        agentRuntime: 'claude-code',
        ptySessionId: 'pty-1',
      },
    });
  });

  it('maps mission.hitl_required → hitl_required with prompt + hitl_id', () => {
    const out = eventToStatusUpdate({
      ...base,
      event: 'mission.hitl_required',
      data: { hitl_id: 'h-1', prompt: 'Approve?', context: 'detail' },
    });
    expect(out!.status).toBe('hitl_required');
    expect(out!.patch).toMatchObject({
      hitlId: 'h-1',
      hitlPrompt: 'Approve?',
      hitlContext: 'detail',
    });
  });

  it('maps mission.hitl_responded → running with transitionFrom guard', () => {
    const out = eventToStatusUpdate({
      ...base,
      event: 'mission.hitl_responded',
      data: { hitl_id: 'h-1', text: 'y' },
    });
    expect(out!.status).toBe('running');
    expect(out!.transitionFrom).toBe('hitl_required');
    expect(out!.patch.hitlResponse).toBe('y');
  });

  it('maps mission.suspended → suspended with checkpoint_id + reason', () => {
    const out = eventToStatusUpdate({
      ...base,
      event: 'mission.suspended',
      data: { checkpoint_id: 'ck-1', reason: 'mgmt_server_shutdown' },
    });
    expect(out!.status).toBe('suspended');
    expect(out!.patch).toMatchObject({
      checkpointId: 'ck-1',
      suspendReason: 'mgmt_server_shutdown',
    });
  });

  it('maps mission.resumed → running', () => {
    const out = eventToStatusUpdate({
      ...base,
      event: 'mission.resumed',
      data: { resumed_from: 'suspended' },
    });
    expect(out!.status).toBe('running');
    expect(out!.patch.resumedFrom).toBe('suspended');
  });

  it('maps mission.completed → done with exit_code + summary', () => {
    const out = eventToStatusUpdate({
      ...base,
      event: 'mission.completed',
      data: { exit_code: 0, summary: 'ok' },
    });
    expect(out!.status).toBe('done');
    expect(out!.patch).toMatchObject({ exitCode: 0, summary: 'ok' });
  });

  it('maps mission.failed → failed with reason + error', () => {
    const out = eventToStatusUpdate({
      ...base,
      event: 'mission.failed',
      data: { reason: 'non_zero_exit', error: 'segfault', exit_code: 139 },
    });
    expect(out!.status).toBe('failed');
    expect(out!.patch).toMatchObject({
      failureReason: 'non_zero_exit',
      failureMessage: 'segfault',
      exitCode: 139,
    });
  });

  it('maps mission.aborted → aborted with aborted_by + reason', () => {
    const out = eventToStatusUpdate({
      ...base,
      event: 'mission.aborted',
      data: { aborted_by: 'operator', reason: 'kill_session via dashboard' },
    });
    expect(out!.status).toBe('aborted');
    expect(out!.patch).toMatchObject({
      abortedBy: 'operator',
      abortReason: 'kill_session via dashboard',
    });
  });

  it('returns null for unknown event types', () => {
    expect(eventToStatusUpdate({ ...base, event: 'unknown.thing' } as never)).toBeNull();
    expect(eventToStatusUpdate(null as never)).toBeNull();
    expect(eventToStatusUpdate({} as never)).toBeNull();
  });
});

describe('startExecutorWS', () => {
  // Minimal in-process WebSocket stub. We control open/message/close from tests.
  class FakeWS {
    static instances: FakeWS[] = [];
    listeners: Record<string, Array<(evt: unknown) => void>> = {};
    closed = false;
    constructor(public url: string) {
      FakeWS.instances.push(this);
    }
    addEventListener(name: string, cb: (evt: unknown) => void) {
      (this.listeners[name] ||= []).push(cb);
    }
    dispatch(name: string, evt: unknown = {}) {
      for (const cb of this.listeners[name] || []) cb(evt);
    }
    close() {
      if (this.closed) return;
      this.closed = true;
      this.dispatch('close', { code: 1000, reason: 'shutdown' });
    }
  }

  it('opens, delivers parsed messages to onEvent, and closes on stop()', async () => {
    FakeWS.instances.length = 0;
    const events: unknown[] = [];
    const states: string[] = [];
    const handle = startExecutorWS({
      aiwgServeUrl: 'http://serve',
      executorId: 'exec-1',
      WebSocketImpl: FakeWS as never,
      onEvent: (e: unknown) => { events.push(e); },
      onState: (s: string) => { states.push(s); },
    });
    expect(FakeWS.instances).toHaveLength(1);
    const ws = FakeWS.instances[0];
    expect(ws.url).toBe('ws://serve/ws/executors/exec-1');

    ws.dispatch('open');
    await handle.ready;
    expect(states).toContain('opened');

    ws.dispatch('message', { data: JSON.stringify({ event: 'mission.started', executor_id: 'exec-1', mission_id: 'm-1', ts: 't', data: {} }) });
    expect(events).toHaveLength(1);

    // Bad JSON is logged, not thrown
    ws.dispatch('message', { data: '{broken' });
    expect(events).toHaveLength(1);

    await handle.stop();
    expect(ws.closed).toBe(true);
  });

  it('reconnects after close (when not stopped)', async () => {
    FakeWS.instances.length = 0;
    const stateLog: string[] = [];
    const handle = startExecutorWS({
      aiwgServeUrl: 'http://serve',
      executorId: 'exec-r',
      WebSocketImpl: FakeWS as never,
      onEvent: () => {},
      onState: (s: string) => { stateLog.push(s); },
      reconnectBaseMs: 1,
      reconnectMaxMs: 5,
    });

    // First socket
    FakeWS.instances[0].dispatch('open');
    await handle.ready;
    // Server-initiated close → should reconnect
    FakeWS.instances[0].dispatch('close', { code: 1006 });

    // Wait briefly for the reconnect timer (set to 1ms)
    await new Promise(r => setTimeout(r, 20));
    expect(FakeWS.instances.length).toBeGreaterThanOrEqual(2);

    await handle.stop();
  });

  it('respects AbortSignal and does not reconnect after stop', async () => {
    FakeWS.instances.length = 0;
    const ac = new AbortController();
    startExecutorWS({
      aiwgServeUrl: 'http://serve',
      executorId: 'exec-a',
      WebSocketImpl: FakeWS as never,
      onEvent: () => {},
      signal: ac.signal,
      reconnectBaseMs: 1,
      reconnectMaxMs: 5,
    });
    FakeWS.instances[0].dispatch('open');
    ac.abort();
    FakeWS.instances[0].dispatch('close', { code: 1006 });
    await new Promise(r => setTimeout(r, 25));
    // No new socket created post-abort
    expect(FakeWS.instances).toHaveLength(1);
  });
});
