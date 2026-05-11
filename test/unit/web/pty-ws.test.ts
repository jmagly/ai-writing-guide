/**
 * Tests for the pty-ws/v1 browser client.
 *
 * @source @apps/web/src/lib/pty-ws.ts
 * @issue #1257
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import {
  PTY_WS_SUBPROTOCOL,
  PtyWsClient,
  appendQuery,
  decodeBase64Bytes,
  parseServerFrame,
  type BindingHelloFrame,
  type OutputFrame,
  type RoleAssignedFrame,
} from '../../../apps/web/src/lib/pty-ws.js';

// ── MockWebSocket ──────────────────────────────────────────────────────

class MockWebSocket {
  static instances: MockWebSocket[] = [];
  static OPEN = 1;
  static CLOSED = 3;

  readyState = 0;
  protocol = '';
  binaryType = '';
  url: string;
  protocols: string | string[];
  sent: string[] = [];
  onopen: ((this: WebSocket, ev: Event) => unknown) | null = null;
  onmessage: ((this: WebSocket, ev: MessageEvent) => unknown) | null = null;
  onclose: ((this: WebSocket, ev: CloseEvent) => unknown) | null = null;
  onerror: ((this: WebSocket, ev: Event) => unknown) | null = null;

  constructor(url: string | URL, protocols?: string | string[]) {
    this.url = typeof url === 'string' ? url : url.toString();
    this.protocols = protocols ?? '';
    MockWebSocket.instances.push(this);
  }

  send(data: string | ArrayBufferLike | Blob | ArrayBufferView): void {
    if (typeof data === 'string') this.sent.push(data);
    else this.sent.push(String(data));
  }

  close(code?: number, reason?: string): void {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.call(
      this as unknown as WebSocket,
      new CloseEvent('close', { code: code ?? 1000, reason: reason ?? '' })
    );
  }

  // Test helpers
  triggerOpen(echoProtocol: string = PTY_WS_SUBPROTOCOL): void {
    this.protocol = echoProtocol;
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.call(this as unknown as WebSocket, new Event('open'));
  }

  receive(frame: unknown): void {
    const data = typeof frame === 'string' ? frame : JSON.stringify(frame);
    this.onmessage?.call(
      this as unknown as WebSocket,
      new MessageEvent('message', { data })
    );
  }

  triggerClose(code = 1000, reason = ''): void {
    this.close(code, reason);
  }
}

beforeEach(() => {
  MockWebSocket.instances.length = 0;
});
afterEach(() => {
  MockWebSocket.instances.length = 0;
});

// Cast MockWebSocket → WebSocket for the client's WebSocketImpl prop.
const Impl = MockWebSocket as unknown as typeof WebSocket;

// ── parseServerFrame ──────────────────────────────────────────────────

describe('parseServerFrame', () => {
  it('parses known frame types', () => {
    const out: OutputFrame = { type: 'output', seq: 1, data: 'aGVsbG8=' };
    expect(parseServerFrame(JSON.stringify(out))).toEqual(out);
  });

  it('returns null for unknown types', () => {
    expect(parseServerFrame(JSON.stringify({ type: 'bogus' }))).toBeNull();
  });

  it('returns null for non-string or non-JSON input', () => {
    expect(parseServerFrame(123)).toBeNull();
    expect(parseServerFrame('not json')).toBeNull();
    expect(parseServerFrame(null)).toBeNull();
  });

  it('returns null when type is missing', () => {
    expect(parseServerFrame(JSON.stringify({ seq: 1, data: 'x' }))).toBeNull();
  });
});

// ── appendQuery + base64 helpers ──────────────────────────────────────

describe('appendQuery', () => {
  it('appends to a URL without query string', () => {
    expect(appendQuery('wss://h/p', 'k', 'v')).toBe('wss://h/p?k=v');
  });
  it('appends to a URL that already has a query', () => {
    expect(appendQuery('wss://h/p?a=1', 'k', 'v')).toBe('wss://h/p?a=1&k=v');
  });
  it('URI-encodes values', () => {
    expect(appendQuery('wss://h/p', 'token', 'a b/c=d')).toBe('wss://h/p?token=a%20b%2Fc%3Dd');
  });
});

describe('decodeBase64Bytes', () => {
  it('round-trips through base64', () => {
    const bytes = decodeBase64Bytes('aGVsbG8=');
    expect(Array.from(bytes)).toEqual([104, 101, 108, 108, 111]);
  });
});

// ── PtyWsClient ───────────────────────────────────────────────────────

describe('PtyWsClient', () => {
  it('requests pty-ws.v1 subprotocol and sends join verb on open', async () => {
    const client = new PtyWsClient({
      url: 'wss://exec/agents/a1/sessions/s1/attach',
      WebSocketImpl: Impl,
    });
    const connect = client.connect();
    const ws = MockWebSocket.instances[0]!;
    expect(ws.protocols).toEqual([PTY_WS_SUBPROTOCOL]);
    ws.triggerOpen();
    await connect;

    expect(ws.sent).toHaveLength(1);
    const join = JSON.parse(ws.sent[0]!);
    expect(join.verb).toBe('pty.join_session');
  });

  it('appends replay_from and token to the URL', () => {
    const client = new PtyWsClient({
      url: 'wss://exec/agents/a1/sessions/s1/attach',
      token: 'tok-abc',
      replayFrom: 42,
      WebSocketImpl: Impl,
    });
    void client.connect().catch(() => {});
    const ws = MockWebSocket.instances[0]!;
    expect(ws.url).toContain('replay_from=42');
    expect(ws.url).toContain('token=tok-abc');
  });

  it('rejects connect when server does not echo the subprotocol', async () => {
    const client = new PtyWsClient({
      url: 'wss://exec/a/s/attach',
      WebSocketImpl: Impl,
    });
    const connect = client.connect();
    const ws = MockWebSocket.instances[0]!;
    ws.triggerOpen('different-subprotocol');
    await expect(connect).rejects.toThrow(/subprotocol negotiation/i);
  });

  it('dispatches binding_hello via onOpen, updates role + sessionId', async () => {
    const client = new PtyWsClient({
      url: 'wss://exec/a/s/attach',
      WebSocketImpl: Impl,
    });
    let openHello: BindingHelloFrame | null = null;
    let lastRole = '';
    client.on({
      onOpen: (h) => {
        openHello = h;
      },
      onRoleChange: (r) => {
        lastRole = r;
      },
    });
    const connect = client.connect();
    const ws = MockWebSocket.instances[0]!;
    ws.triggerOpen();
    await connect;

    const hello: BindingHelloFrame = {
      type: 'binding_hello',
      session_id: 'sess-1',
      role: 'controller',
      seq: 1,
      cols: 80,
      rows: 24,
    };
    ws.receive(hello);
    expect(openHello).toEqual(hello);
    expect(client.getRole()).toBe('controller');
    expect(lastRole).toBe('controller');
  });

  it('tracks last seq from incoming frames', async () => {
    const client = new PtyWsClient({ url: 'wss://x/s', WebSocketImpl: Impl });
    const connect = client.connect();
    MockWebSocket.instances[0]!.triggerOpen();
    await connect;
    const ws = MockWebSocket.instances[0]!;
    ws.receive({ type: 'output', seq: 5, data: 'aGk=' });
    ws.receive({ type: 'output', seq: 12, data: 'eW8=' });
    expect(client.getLastSeq()).toBe(12);
  });

  it('forwards output frames via onOutput', async () => {
    const received: OutputFrame[] = [];
    const client = new PtyWsClient({ url: 'wss://x/s', WebSocketImpl: Impl });
    client.on({ onOutput: (f) => received.push(f) });
    const connect = client.connect();
    MockWebSocket.instances[0]!.triggerOpen();
    await connect;
    MockWebSocket.instances[0]!.receive({ type: 'output', seq: 1, data: 'aGVsbG8=' });
    expect(received).toHaveLength(1);
    expect(received[0]!.data).toBe('aGVsbG8=');
  });

  it('throws when sendInput is called as observer', async () => {
    const client = new PtyWsClient({ url: 'wss://x/s', WebSocketImpl: Impl });
    const connect = client.connect();
    MockWebSocket.instances[0]!.triggerOpen();
    await connect;
    MockWebSocket.instances[0]!.receive({
      type: 'binding_hello',
      session_id: 's',
      role: 'observer',
      seq: 1,
      cols: 80,
      rows: 24,
    } satisfies BindingHelloFrame);
    expect(() => client.sendInput('hello')).toThrow(/controller role/);
  });

  it('sendInput succeeds when role is controller and base64-encodes payload', async () => {
    const client = new PtyWsClient({ url: 'wss://x/s', WebSocketImpl: Impl });
    const connect = client.connect();
    MockWebSocket.instances[0]!.triggerOpen();
    await connect;
    MockWebSocket.instances[0]!.receive({
      type: 'binding_hello',
      session_id: 's',
      role: 'controller',
      seq: 1,
      cols: 80,
      rows: 24,
    } satisfies BindingHelloFrame);
    const ws = MockWebSocket.instances[0]!;
    const before = ws.sent.length;
    client.sendInput('hello');
    expect(ws.sent.length).toBe(before + 1);
    const v = JSON.parse(ws.sent[ws.sent.length - 1]!);
    expect(v.verb).toBe('pty.session_input');
    expect(v.data).toBe('aGVsbG8='); // base64('hello')
  });

  it('role_assigned flips role and fires onRoleChange', async () => {
    const transitions: string[] = [];
    const client = new PtyWsClient({ url: 'wss://x/s', WebSocketImpl: Impl });
    client.on({ onRoleChange: (r) => transitions.push(r) });
    const connect = client.connect();
    MockWebSocket.instances[0]!.triggerOpen();
    await connect;

    // Start as observer via hello.
    MockWebSocket.instances[0]!.receive({
      type: 'binding_hello',
      session_id: 's',
      role: 'observer',
      seq: 1,
      cols: 80,
      rows: 24,
    } satisfies BindingHelloFrame);
    // Then receive role_assigned promoting us.
    const ra: RoleAssignedFrame = {
      type: 'role_assigned',
      seq: 2,
      role: 'controller',
      reason: 'observer_promoted',
    };
    MockWebSocket.instances[0]!.receive(ra);
    expect(client.getRole()).toBe('controller');
    expect(transitions).toEqual(['observer', 'controller']);
  });

  it('emits onClosed when server sends closed frame', async () => {
    const closeds: Array<{ exit_code?: number; reason?: string }> = [];
    const client = new PtyWsClient({ url: 'wss://x/s', WebSocketImpl: Impl });
    client.on({
      onClosed: (f) => closeds.push({ ...(f.exit_code !== undefined ? { exit_code: f.exit_code } : {}), reason: f.reason ?? '' }),
    });
    const connect = client.connect();
    MockWebSocket.instances[0]!.triggerOpen();
    await connect;
    MockWebSocket.instances[0]!.receive({
      type: 'closed',
      seq: 10,
      exit_code: 0,
      reason: 'normal',
    });
    expect(closeds).toHaveLength(1);
    expect(closeds[0]!.exit_code).toBe(0);
    expect(closeds[0]!.reason).toBe('normal');
  });

  it('emits onClosed synthetically when the WebSocket closes without a closed frame', async () => {
    const closeds: Array<{ reason?: string }> = [];
    const client = new PtyWsClient({ url: 'wss://x/s', WebSocketImpl: Impl });
    client.on({ onClosed: (f) => closeds.push({ reason: f.reason ?? '' }) });
    const connect = client.connect();
    MockWebSocket.instances[0]!.triggerOpen();
    await connect;
    MockWebSocket.instances[0]!.triggerClose(1006, 'abnormal');
    expect(closeds).toHaveLength(1);
    expect(closeds[0]!.reason).toBe('abnormal');
  });

  it('verb senders surface a clear error when called before connect', () => {
    const client = new PtyWsClient({ url: 'wss://x/s', WebSocketImpl: Impl });
    expect(() => client.requestKeyframe()).toThrow(/not connected/);
  });
});
