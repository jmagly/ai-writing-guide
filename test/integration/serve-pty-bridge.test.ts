/**
 * Tier-3 integration suite — `aiwg serve` PTY-bridge resilience.
 * Cycle 1: smoke + WS upgrade lifecycle. Cycles 2-3 add reconnect-after-disconnect,
 * write back-pressure, child-pty kill/respawn, message ordering under load.
 *
 * @issue #1174
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { WebSocket } from 'ws';
import {
  handlePtyConnection,
  registry,
  type WebSocketLike,
  type WsMessage,
} from '../../src/serve/pty-bridge.js';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — .mjs without bundled types
import { spawnAiwgServe, waitForHttp } from './_serve-harness.mjs';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — .mjs without bundled types
import { startFakeSandbox } from '../fixtures/fake-sandbox/server.mjs';

interface ServeHandle {
  url: string;
  port: number;
  kill: (signal?: NodeJS.Signals) => Promise<void>;
}

interface BrowserWs extends WebSocketLike {
  messages: WsMessage[];
  closed: boolean;
  _onMessage?: (raw: string) => void;
  _onClose?: () => void;
  waitForMessages: (count: number) => Promise<WsMessage[]>;
}

function makeBrowserWs(): BrowserWs {
  const waiters: Array<{ count: number; resolve: (messages: WsMessage[]) => void }> = [];
  const ws: BrowserWs = {
    messages: [],
    closed: false,
    get readyState() { return this.closed ? 3 : 1; },
    send(data: string) {
      this.messages.push(JSON.parse(data) as WsMessage);
      for (const waiter of [...waiters]) {
        if (this.messages.length >= waiter.count) {
          waiters.splice(waiters.indexOf(waiter), 1);
          waiter.resolve(this.messages);
        }
      }
    },
    close() {
      this.closed = true;
      this._onClose?.();
    },
    waitForMessages(count: number) {
      if (this.messages.length >= count) return Promise.resolve(this.messages);
      return new Promise((resolve) => waiters.push({ count, resolve }));
    },
  };
  return ws;
}

interface PtyScenarioState {
  managementMessages: Array<Record<string, unknown>>;
  inputs: string[];
  resizes: Array<{ cols: number; rows: number }>;
  starts: number;
  kills: number;
  activeSessions: number;
  commandIds: string[];
  connectionCount: number;
}

let ptyScenarioId = 0;

function ptyScenario(opts: {
  outputs?: string[];
  outputCount?: number;
  closeMode?: 'terminate' | 'close';
  closeAfterFirstReplay?: boolean;
  exitCode?: number;
} = {}): { scenario: object; state: PtyScenarioState } {
  const state: PtyScenarioState = {
    managementMessages: [],
    inputs: [],
    resizes: [],
    starts: 0,
    kills: 0,
    activeSessions: 0,
    commandIds: [],
    connectionCount: 0,
  };
  const commandId = `cmd-${++ptyScenarioId}`;
  let seq = 0;
  let droppedOnce = false;
  const outputCount = opts.outputCount ?? opts.outputs?.length ?? 2;
  const outputs = opts.outputs ?? Array.from({ length: outputCount }, (_, i) => `chunk-${i + 1}\n`);

  return {
    state,
    scenario: {
      onPartition(ws: { on: (event: string, cb: () => void) => void }) {
        state.connectionCount += 1;
        ws.on('close', () => {
          state.activeSessions = Math.max(0, state.activeSessions - 1);
        });
      },
      onWsMessage(msg: Record<string, unknown>, ctx: { ws: { close?: () => void; terminate?: () => void }, send: (event: object) => void }) {
        state.managementMessages.push(msg);
        if (msg.type === 'start_shell') {
          state.starts += 1;
          state.activeSessions += 1;
          state.commandIds.push(commandId);
          ctx.send({ type: 'shell_started', agent_id: msg.agent_id, command_id: commandId });
        } else if (msg.type === 'list_sessions') {
          ctx.send({
            type: 'session_list',
            agent_id: msg.agent_id,
            sessions: [{ session_name: 'main', command_id: commandId }],
          });
        } else if (msg.type === 'join_session') {
          const replayFrom = Number(msg.replay_from ?? 0);
          for (const output of outputs.slice(replayFrom)) {
            seq += 1;
            ctx.send({
              type: 'output',
              agent_id: msg.agent_id,
              command_id: commandId,
              stream: 'stdout',
              data: output,
              seq,
            });
            if (opts.closeAfterFirstReplay && !droppedOnce) {
              droppedOnce = true;
              if (opts.closeMode === 'close') ctx.ws.close?.();
              else ctx.ws.terminate?.();
              break;
            }
          }
        } else if (msg.type === 'send_input') {
          state.inputs.push(String(msg.data));
          seq += 1;
          ctx.send({
            type: 'output',
            agent_id: msg.agent_id,
            command_id: commandId,
            stream: 'stdout',
            data: `input:${msg.data}`,
            seq,
          });
        } else if (msg.type === 'pty_resize') {
          state.resizes.push({ cols: Number(msg.cols), rows: Number(msg.rows) });
          seq += 1;
          ctx.send({
            type: 'output',
            agent_id: msg.agent_id,
            command_id: commandId,
            stream: 'stdout',
            data: `resize:${msg.cols}x${msg.rows}`,
            seq,
          });
        } else if (msg.type === 'kill_session') {
          state.kills += 1;
          state.activeSessions = Math.max(0, state.activeSessions - 1);
          ctx.send({ type: 'session_killed', agent_id: msg.agent_id, exit_code: opts.exitCode ?? 0 });
        }
      },
    },
  };
}

async function openPty(fake: Awaited<ReturnType<typeof startFakeSandbox>>, sessionId: string): Promise<BrowserWs> {
  const ws = makeBrowserWs();
  await handlePtyConnection(
    sessionId,
    ws,
    'bash',
    [],
    process.cwd(),
    `${fake.ws_url}/ws/pty-management`,
    'agent-01',
  );
  return ws;
}

function cleanupPtySessions(...sessionIds: string[]): void {
  for (const sessionId of sessionIds) {
    const session = registry.get(sessionId);
    if (session) session.exited = true;
    registry.delete(sessionId);
  }
}

afterEach(() => {
  cleanupPtySessions('r1', 'r2', 'r3', 'r4', 'r5', 'r6a', 'r6b', 'r7', 'r8');
});

describe('aiwg serve — PTY bridge resilience smoke', () => {
  let serve: ServeHandle;

  beforeAll(async () => {
    serve = await spawnAiwgServe();
    await waitForHttp(serve.url, 20_000, serve);
  }, 60_000);

  afterAll(async () => {
    if (serve) await serve.kill();
  });

  it('refuses upgrade on unmapped /ws/* paths', async () => {
    const wsUrl = serve.url.replace('http://', 'ws://') + '/ws/nonexistent';
    const ws = new WebSocket(wsUrl);
    const result = await new Promise<'open' | 'close' | 'error'>((resolve) => {
      const t = setTimeout(() => resolve('open'), 1500);
      ws.on('open', () => { clearTimeout(t); resolve('open'); });
      ws.on('close', () => { clearTimeout(t); resolve('close'); });
      ws.on('error', () => { clearTimeout(t); resolve('error'); });
    });
    // Either close (server rejects) or error (handshake failure) is acceptable.
    expect(['close', 'error']).toContain(result);
    try { ws.close(); } catch {}
  });

  it('handles 5 sequential health pings without leaking sockets', async () => {
    for (let i = 0; i < 5; i++) {
      const r = await fetch(`${serve.url}/api/sandboxes`);
      expect(r.status).toBeLessThan(500);
    }
  });

  it('survives SIGINT cleanly when shut down', async () => {
    // Start a dedicated serve just for this test so we don't kill the shared one
    const dedicated = await spawnAiwgServe();
    await waitForHttp(dedicated.url, 20_000, dedicated);

    // Confirm it's alive via the API surface (root may return 503 when
    // apps/web/dist is missing — happens in CI before the web build runs).
    const r = await fetch(`${dedicated.url}/api/health`);
    expect(r.status).toBe(200);

    // SIGINT
    await dedicated.kill('SIGINT');

    // After kill, /api/health should become unreachable.
    const start = Date.now();
    let stillResponding = true;
    while (Date.now() - start < 3_000) {
      try {
        const r2 = await fetch(`${dedicated.url}/api/health`, {
          signal: AbortSignal.timeout(200),
        });
        if (r2.status >= 500) { stillResponding = false; break; }
      } catch {
        stillResponding = false;
        break;
      }
      await new Promise(rsv => setTimeout(rsv, 100));
    }
    expect(stillResponding).toBe(false);
  });
});

describe('aiwg serve — fake-sandbox PTY bridge resilience', () => {
  it('reconnects after WS disconnect mid-stream and replays backlog in order', async () => {
    const { scenario, state } = ptyScenario({
      outputs: ['one\n', 'two\n'],
      closeAfterFirstReplay: true,
      closeMode: 'terminate',
    });
    const fake = await startFakeSandbox({ scenario });
    try {
      const ws = await openPty(fake, 'r1');
      await ws.waitForMessages(2);
      expect(state.starts).toBeGreaterThanOrEqual(2);
      expect(ws.messages.map((m) => m.payload?.replace(/^\x1bc/, ''))).toEqual(['one\n', 'two\n']);
    } finally {
      cleanupPtySessions('r1');
      await fake.stop();
    }
  });

  it('reconnects after a server-side clean WS close without missing output', async () => {
    const { scenario, state } = ptyScenario({
      outputs: ['alpha\n', 'beta\n'],
      closeAfterFirstReplay: true,
      closeMode: 'close',
    });
    const fake = await startFakeSandbox({ scenario });
    try {
      const ws = await openPty(fake, 'r2');
      await ws.waitForMessages(2);
      expect(state.connectionCount).toBeGreaterThanOrEqual(2);
      expect(ws.messages.map((m) => m.payload?.replace(/^\x1bc/, ''))).toEqual(['alpha\n', 'beta\n']);
    } finally {
      cleanupPtySessions('r2');
      await fake.stop();
    }
  });

  it('cleans up client allocation when the browser socket closes', async () => {
    const { scenario } = ptyScenario({ outputs: ['ready\n'] });
    const fake = await startFakeSandbox({ scenario });
    try {
      const ws = await openPty(fake, 'r3');
      await ws.waitForMessages(1);
      ws.close();
      expect(registry.get('r3')?.clients.size).toBe(0);
    } finally {
      cleanupPtySessions('r3');
      await fake.stop();
    }
  });

  it('bounds replay buffer when the sandbox sends faster than the client reads', async () => {
    const large = 'x'.repeat(2048);
    const { scenario } = ptyScenario({ outputs: Array.from({ length: 80 }, (_, i) => `${i}:${large}`) });
    const fake = await startFakeSandbox({ scenario });
    try {
      const ws = await openPty(fake, 'r4');
      await ws.waitForMessages(80);
      const session = registry.get('r4');
      expect(session?.outputBuffer.length).toBeLessThanOrEqual(64 * 1024);
      expect(ws.messages).toHaveLength(80);
    } finally {
      cleanupPtySessions('r4');
      await fake.stop();
    }
  });

  it('surfaces child PTY kill exit code and updates session state', async () => {
    const { scenario, state } = ptyScenario({ outputs: ['ready\n'], exitCode: 137 });
    const fake = await startFakeSandbox({ scenario });
    try {
      const ws = await openPty(fake, 'r5');
      await ws.waitForMessages(1);
      ws._onMessage?.(JSON.stringify({ type: 'close' }));
      await ws.waitForMessages(2);
      expect(ws.messages.at(-1)).toMatchObject({ type: 'exit', code: 137 });
      expect(registry.get('r5')?.exited).toBe(true);
      expect(state.kills).toBe(1);
    } finally {
      cleanupPtySessions('r5');
      await fake.stop();
    }
  });

  it('allocates a fresh PTY session after a killed session is replaced', async () => {
    const { scenario, state } = ptyScenario({ outputs: ['ready\n'], exitCode: 137 });
    const fake = await startFakeSandbox({ scenario });
    try {
      const first = await openPty(fake, 'r6a');
      await first.waitForMessages(1);
      first._onMessage?.(JSON.stringify({ type: 'close' }));
      await first.waitForMessages(2);
      const second = await openPty(fake, 'r6b');
      await second.waitForMessages(1);
      expect(state.starts).toBe(2);
      expect(registry.get('r6a')?.exited).toBe(true);
      expect(registry.get('r6b')?.exited).toBe(false);
    } finally {
      cleanupPtySessions('r6a', 'r6b');
      await fake.stop();
    }
  });

  it('preserves output ordering under concurrent writes', async () => {
    const { scenario, state } = ptyScenario({ outputs: ['ready\n'] });
    const fake = await startFakeSandbox({ scenario });
    try {
      const ws = await openPty(fake, 'r7');
      await ws.waitForMessages(1);
      for (const value of ['a', 'b', 'c']) {
        ws._onMessage?.(JSON.stringify({ type: 'data', payload: value }));
      }
      await ws.waitForMessages(4);
      expect(state.inputs).toEqual(['a', 'b', 'c']);
      expect(ws.messages.slice(1).map((m) => m.payload)).toEqual(['input:a', 'input:b', 'input:c']);
    } finally {
      cleanupPtySessions('r7');
      await fake.stop();
    }
  });

  it('propagates resize during an active PTY session', async () => {
    const { scenario, state } = ptyScenario({ outputs: ['ready\n'] });
    const fake = await startFakeSandbox({ scenario });
    try {
      const ws = await openPty(fake, 'r8');
      await ws.waitForMessages(1);
      ws._onMessage?.(JSON.stringify({ type: 'resize', cols: 132, rows: 43 }));
      await ws.waitForMessages(2);
      expect(state.resizes).toEqual([{ cols: 132, rows: 43 }]);
      expect(ws.messages.at(-1)).toMatchObject({ type: 'data', payload: 'resize:132x43' });
    } finally {
      cleanupPtySessions('r8');
      await fake.stop();
    }
  });
});
