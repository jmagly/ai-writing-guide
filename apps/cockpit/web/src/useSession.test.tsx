import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { sessionTargetFromAttachUrl, stripTerminalAutoResponses, useSession } from './useSession';

const terminalWrites = vi.hoisted(() => [] as string[]);

vi.mock('@xterm/xterm', () => ({
  Terminal: class {
    options: Record<string, unknown>;
    cols = 80;
    rows = 24;
    constructor(options: Record<string, unknown>) { this.options = options; }
    loadAddon() {}
    onData(_fn: (data: string) => void) {}
    onResize(_fn: (size: { cols: number; rows: number }) => void) {}
    open() {}
    write(data: Uint8Array | string) {
      terminalWrites.push(typeof data === 'string' ? data : new TextDecoder().decode(data));
    }
    reset() { terminalWrites.length = 0; }
    dispose() {}
  },
}));

vi.mock('@xterm/addon-fit', () => ({
  FitAddon: class { fit() {} },
}));

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
  terminalWrites.length = 0;
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

describe('sessionTargetFromAttachUrl', () => {
  it('parses executor attach URLs into explicit injection targets', () => {
    expect(sessionTargetFromAttachUrl('ws://x/agents/inst%201/sessions/sess%2F1/attach')).toEqual({
      instanceId: 'inst 1',
      sessionId: 'sess/1',
    });
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
    expect(JSON.parse(current.sent[0])).toEqual({ op: 'pty.join_session', payload: { role: 'observer', replay_from: 0 } });
    expect(result.current.state.role).toBe('observer');
  });

  it('requests a bounded ring replay on fresh attach joins (#1744)', () => {
    const { result } = renderHook(() => useSession());
    act(() => { result.current.attach('ws://x/session', false, 'observer'); });
    const ws = MockWS.instances[0];

    act(() => { ws.emit('message', { data: JSON.stringify({ op: 'binding_hello' }) }); });

    expect(JSON.parse(ws.sent[0])).toEqual({ op: 'pty.join_session', payload: { role: 'observer', replay_from: 0 } });
    expect(ws.url).toBe('ws://x/session');
  });

  it('paints replayed prior output from the joined stream on a fresh attach (#1744)', () => {
    const { result } = renderHook(() => useSession());
    const host = document.createElement('div');
    document.body.appendChild(host);
    act(() => { result.current.openTerminal(host); });

    act(() => { result.current.attach('ws://x/session', false, 'observer'); });
    const ws = MockWS.instances[0];
    act(() => {
      ws.emit('message', { data: JSON.stringify({ op: 'binding_hello' }) });
      ws.emit('message', { data: JSON.stringify({ op: 'output', seq: 8, payload: { data: btoa('prior output') } }) });
    });

    expect(terminalWrites.join('')).toContain('prior output');
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

  it('reattaches for replay immediately and requests replay_from in the join payload', () => {
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
    expect(replay.url).toBe('ws://x/session');

    act(() => { replay.emit('message', { data: JSON.stringify({ op: 'binding_hello' }) }); });
    expect(JSON.parse(replay.sent[0])).toEqual({ op: 'pty.join_session', payload: { role: 'controller', replay_from: 12 } });
  });

  it('requests a keyframe when a controller socket opens but stays silent (#1746)', () => {
    const { result } = renderHook(() => useSession());
    const host = document.createElement('div');
    document.body.appendChild(host);
    act(() => { result.current.openTerminal(host); });
    act(() => { result.current.attach('ws://x/session', false, 'controller'); });
    const ws = MockWS.instances[0];

    act(() => {
      ws.emit('open');
      ws.emit('message', { data: JSON.stringify({ op: 'binding_hello' }) });
      ws.emit('message', { data: JSON.stringify({ op: 'role_assigned', payload: { role: 'controller' } }) });
      vi.advanceTimersByTime(2000);
    });
    expect(terminalWrites.join('')).toContain('[attached — no output yet]');

    act(() => {
      vi.advanceTimersByTime(4000);
    });

    expect(terminalWrites.join('')).toContain('[attached — no output after 4s; requesting repaint]');
    expect(ws.sent.map((s) => JSON.parse(s)).filter((m) => m.op === 'pty.request_keyframe')).toHaveLength(1);
    expect(MockWS.instances).toHaveLength(1);
  });

  it('reconnects once with replay_from zero when an observer socket stays silent (#1746)', () => {
    const { result } = renderHook(() => useSession());
    const host = document.createElement('div');
    document.body.appendChild(host);
    act(() => { result.current.openTerminal(host); });
    act(() => { result.current.attach('ws://x/session', false, 'observer'); });
    const first = MockWS.instances[0];

    act(() => {
      first.emit('open');
      first.emit('message', { data: JSON.stringify({ op: 'binding_hello' }) });
      first.emit('message', { data: JSON.stringify({ op: 'role_assigned', payload: { role: 'observer' } }) });
      vi.advanceTimersByTime(4000);
    });

    expect(terminalWrites.join('')).toContain('[attached — no output after 4s; requesting repaint]');
    expect(MockWS.instances).toHaveLength(2);
    const replay = MockWS.instances[1];
    act(() => { replay.emit('message', { data: JSON.stringify({ op: 'binding_hello' }) }); });
    expect(JSON.parse(replay.sent[0])).toEqual({ op: 'pty.join_session', payload: { role: 'observer', replay_from: 0 } });
  });

  it('does not recover when the first frame arrives before the deadline (#1746)', () => {
    const { result } = renderHook(() => useSession());
    const host = document.createElement('div');
    document.body.appendChild(host);
    act(() => { result.current.openTerminal(host); });
    act(() => { result.current.attach('ws://x/session', false, 'controller'); });
    const ws = MockWS.instances[0];

    act(() => {
      ws.emit('open');
      ws.emit('message', { data: JSON.stringify({ op: 'role_assigned', payload: { role: 'controller' } }) });
      vi.advanceTimersByTime(1000);
      ws.emit('message', { data: JSON.stringify({ op: 'output', seq: 1, payload: { data: btoa('ready') } }) });
      vi.advanceTimersByTime(4000);
    });

    expect(terminalWrites.join('')).toContain('ready');
    expect(terminalWrites.join('')).not.toContain('no output after');
    expect(terminalWrites.join('')).not.toContain('no output yet');
    expect(ws.sent.map((s) => JSON.parse(s)).filter((m) => m.op === 'pty.request_keyframe')).toHaveLength(0);
    expect(MockWS.instances).toHaveLength(1);
  });

  it('cleans up the first-frame deadline on user detach (#1746)', () => {
    const { result } = renderHook(() => useSession());
    const host = document.createElement('div');
    document.body.appendChild(host);
    act(() => { result.current.openTerminal(host); });
    act(() => { result.current.attach('ws://x/session', false, 'controller'); });
    const ws = MockWS.instances[0];

    act(() => {
      ws.emit('open');
      ws.emit('message', { data: JSON.stringify({ op: 'role_assigned', payload: { role: 'controller' } }) });
      result.current.detach();
      vi.advanceTimersByTime(4000);
    });

    expect(terminalWrites.join('')).not.toContain('no output after');
    expect(terminalWrites.join('')).not.toContain('no output yet');
    expect(ws.sent.map((s) => JSON.parse(s)).filter((m) => m.op === 'pty.request_keyframe')).toHaveLength(0);
    expect(MockWS.instances).toHaveLength(1);
  });

  it('refuses targeted input when the requested session does not match the attached socket', () => {
    const { result } = renderHook(() => useSession());
    const host = document.createElement('div');
    document.body.appendChild(host);
    act(() => { result.current.openTerminal(host); });
    act(() => { result.current.attach('ws://x/agents/inst-a/sessions/sess-a/attach', false, 'controller'); });
    const ws = MockWS.instances[0];

    act(() => {
      ws.emit('open');
      ws.emit('message', { data: JSON.stringify({ op: 'role_assigned', payload: { role: 'controller' } }) });
    });

    let sent = true;
    act(() => {
      sent = result.current.sendInput('rm -rf /', { instanceId: 'inst-b', sessionId: 'sess-b' });
    });

    expect(sent).toBe(false);
    expect(ws.sent.map((s) => JSON.parse(s)).filter((m) => m.op === 'pty.session_input')).toHaveLength(0);
    expect(terminalWrites.join('')).toContain('inject refused: target inst-b:sess-b does not match attached session inst-a:sess-a');
  });
});
