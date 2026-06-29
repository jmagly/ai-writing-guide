import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSession } from './useSession';

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
});
