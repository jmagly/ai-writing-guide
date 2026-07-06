import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { stripTerminalAutoResponses, useSession } from './useSession';

// Minimal WebSocket double: records every constructed socket and lets the test
// drive open/close/message. Mirrors the readiness-race timing (#1669).
class MockWS {
  static instances: MockWS[] = [];
  url: string;
  sent: string[] = [];
  private listeners: Record<string, ((e: unknown) => void)[]> = {};
  constructor(url: string) { this.url = url; MockWS.instances.push(this); }
  addEventListener(type: string, fn: (e: unknown) => void) { (this.listeners[type] ||= []).push(fn); }
  send(data: string) { this.sent.push(data); }
  close() { /* no-op; the test drives 'close' explicitly */ }
  emit(type: string, e: unknown = {}) { (this.listeners[type] || []).forEach((fn) => fn(e)); }
}

beforeEach(() => {
  MockWS.instances = [];
  (globalThis as unknown as { WebSocket: unknown }).WebSocket = MockWS as unknown;
  vi.useFakeTimers();
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe('stripTerminalAutoResponses', () => {
  it('drops OSC color query replies without dropping real input', () => {
    const data = '\x1b]10;rgb:cdcd/d3d3/dede\x07ls\x1b]11;rgb:0a0a/0c0c/1010\x1b\\\r';
    expect(stripTerminalAutoResponses(data)).toBe('ls\r');
  });

  it('drops terminal identity/status replies', () => {
    expect(stripTerminalAutoResponses('\x1b[?1;2chello\x1b[0n\x1b[12;40R')).toBe('hello');
  });
});

describe('useSession — retry through the PTY-readiness window (#1669)', () => {
  it('reconnects on an early empty close instead of giving up', () => {
    const { result } = renderHook(() => useSession());
    act(() => { result.current.attach('ws://x/attach', false, 'controller'); });
    expect(MockWS.instances).toHaveLength(1);

    // First socket opens, then closes with zero frames (agent PTY not ready yet).
    act(() => { MockWS.instances[0].emit('open'); MockWS.instances[0].emit('close'); });
    // No reconnect yet (waits the backoff)...
    expect(MockWS.instances).toHaveLength(1);
    // ...then a fresh socket is opened to retry.
    act(() => { vi.advanceTimersByTime(1300); });
    expect(MockWS.instances).toHaveLength(2);
  });

  it('counts a failing socket once even though it fires both error and close', () => {
    const { result } = renderHook(() => useSession());
    act(() => { result.current.attach('ws://x/attach', false, 'controller'); });
    // A real failing WebSocket dispatches BOTH 'error' and 'close'; that must
    // burn only one retry slot, not two (otherwise the budget halves silently).
    act(() => { MockWS.instances[0].emit('open'); MockWS.instances[0].emit('error'); MockWS.instances[0].emit('close'); });
    act(() => { vi.advanceTimersByTime(1300); });
    expect(MockWS.instances).toHaveLength(2);
  });

  it('stops retrying once the first frame arrives (real stream established)', () => {
    const { result } = renderHook(() => useSession());
    act(() => { result.current.attach('ws://x/attach', false, 'controller'); });

    // Reach the second attempt, then this socket actually streams a frame.
    act(() => { MockWS.instances[0].emit('open'); MockWS.instances[0].emit('close'); });
    act(() => { vi.advanceTimersByTime(1300); });
    const live = MockWS.instances[1];
    act(() => {
      live.emit('open');
      live.emit('message', { data: JSON.stringify({ op: 'binding_hello' }) });
      live.emit('message', { data: JSON.stringify({ op: 'output', seq: 1, payload: { data: btoa('hi') } }) });
    });
    // A later close after streaming must NOT spawn another socket.
    act(() => { live.emit('close'); vi.advanceTimersByTime(5000); });
    expect(MockWS.instances).toHaveLength(2);
  });

  it('gives up after the retry budget and does not reconnect forever', () => {
    const { result } = renderHook(() => useSession());
    act(() => { result.current.attach('ws://x/attach', false, 'controller'); });
    // Every attempt closes empty; after the budget it stops creating sockets.
    for (let i = 0; i < 10; i += 1) {
      act(() => { MockWS.instances[MockWS.instances.length - 1].emit('open'); MockWS.instances[MockWS.instances.length - 1].emit('close'); });
      act(() => { vi.advanceTimersByTime(1300); });
    }
    // 1 initial + 6 retries = 7 sockets, then it stops.
    expect(MockWS.instances.length).toBeLessThanOrEqual(7);
  });

  it('ignores stale socket messages after switching sessions', () => {
    const { result } = renderHook(() => useSession());
    act(() => { result.current.attach('ws://x/agents/i/sessions/old/attach', false, 'controller'); });
    const old = MockWS.instances[0];
    act(() => { result.current.attach('ws://x/agents/i/sessions/new/attach', false, 'observer'); });
    const current = MockWS.instances[1];

    act(() => {
      old.emit('open');
      old.emit('message', { data: JSON.stringify({ op: 'binding_hello' }) });
      old.emit('message', { data: JSON.stringify({ op: 'role_assigned', payload: { role: 'controller' } }) });
      old.emit('close');
    });
    expect(old.sent).toEqual([]);
    expect(result.current.state.url).toBe('ws://x/agents/i/sessions/new/attach');
    expect(result.current.state.role).toBeNull();

    act(() => {
      current.emit('open');
      current.emit('message', { data: JSON.stringify({ op: 'binding_hello' }) });
      current.emit('message', { data: JSON.stringify({ op: 'role_assigned', payload: { role: 'observer' } }) });
    });
    expect(JSON.parse(current.sent[0])).toEqual({ op: 'pty.join_session', payload: { role: 'observer' } });
    expect(result.current.state.role).toBe('observer');
  });

  it('does not let a stale close clear the active controller role', () => {
    const { result } = renderHook(() => useSession());
    act(() => { result.current.attach('ws://x/old', false, 'observer'); });
    const old = MockWS.instances[0];
    act(() => { result.current.attach('ws://x/new', false, 'controller'); });
    const current = MockWS.instances[1];

    act(() => {
      current.emit('open');
      current.emit('message', { data: JSON.stringify({ op: 'role_assigned', payload: { role: 'controller' } }) });
    });
    expect(result.current.state.role).toBe('controller');

    act(() => { old.emit('close'); });
    expect(result.current.state.url).toBe('ws://x/new');
    expect(result.current.state.attached).toBe(true);
    expect(result.current.state.role).toBe('controller');
  });

  it('reattaches for replay immediately and asks the active socket for replay_from', () => {
    const { result } = renderHook(() => useSession());
    act(() => { result.current.attach('ws://x/session', false, 'controller'); });
    const first = MockWS.instances[0];
    act(() => {
      first.emit('open');
      first.emit('message', { data: JSON.stringify({ op: 'output', seq: 12, payload: { data: btoa('ready') } }) });
    });

    act(() => { result.current.replay('ws://x/session', 'controller'); });
    expect(MockWS.instances).toHaveLength(2);
    const replay = MockWS.instances[1];
    expect(replay.url).toBe('ws://x/session?replay_from=12');

    act(() => { replay.emit('message', { data: JSON.stringify({ op: 'binding_hello' }) }); });
    expect(JSON.parse(replay.sent[0])).toEqual({ op: 'pty.join_session', payload: { role: 'controller', replay_from: 12 } });
  });
});
