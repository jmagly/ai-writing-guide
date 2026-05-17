import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SandboxTransport } from '../../../tools/daemon/sandbox-transport.mjs';

type FetchCall = { url: string; init?: RequestInit };

function jsonResponse(body: unknown, init: { ok?: boolean; status?: number } = {}): Response {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response;
}

function textResponse(body: string, init: { ok?: boolean; status?: number } = {}): Response {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: async () => JSON.parse(body),
    text: async () => body,
  } as Response;
}

describe('SandboxTransport', () => {
  let calls: FetchCall[];

  beforeEach(() => {
    calls = [];
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  function stubFetch(handler: (url: string, init?: RequestInit) => Response | Promise<Response>) {
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      return handler(url, init);
    }));
  }

  it('starts a PTY task, polls logs, and emits data plus terminal exit', async () => {
    const transport = new SandboxTransport({
      httpEndpoint: 'http://sandbox.test/',
      agentId: 'agent-1',
      command: 'codex',
      args: ['run'],
    });
    const data: string[] = [];
    const exits: Array<{ exitCode: number; signal?: string }> = [];
    transport.on('data', (chunk) => data.push(chunk));
    transport.on('exit', (event) => exits.push(event));

    let logServed = false;
    stubFetch((url, init) => {
      if (url === 'http://sandbox.test/api/v1/tasks' && init?.method === 'POST') {
        return jsonResponse({ task_id: 'task-1' }, { status: 201 });
      }
      if (url.includes('/logs?offset=0') && !logServed) {
        logServed = true;
        return textResponse('hello');
      }
      if (url.endsWith('/api/v1/tasks/task-1')) {
        return jsonResponse({ state: logServed ? 'completed' : 'running' });
      }
      return textResponse('');
    });

    await expect(transport.start()).resolves.toBe('task-1');
    await vi.runOnlyPendingTimersAsync();

    expect(data).toEqual(['hello']);
    expect(exits).toEqual([{ exitCode: 0, signal: undefined }]);
    expect(transport.isActive()).toBe(false);
  });

  it('emits and rethrows task submission errors', async () => {
    const transport = new SandboxTransport({
      httpEndpoint: 'http://sandbox.test',
      agentId: 'agent-1',
      command: 'codex',
    });
    const errors: Error[] = [];
    transport.on('error', (err) => errors.push(err));

    stubFetch(() => textResponse('bad manifest', { ok: false, status: 422 }));

    await expect(transport.start()).rejects.toThrow('Task submission failed: 422 bad manifest');
    expect(errors[0]?.message).toBe('Task submission failed: 422 bad manifest');
  });

  it('reconnect emits exit immediately for terminal remote tasks', async () => {
    const transport = new SandboxTransport({
      httpEndpoint: 'http://sandbox.test',
      agentId: 'agent-1',
      command: 'codex',
    });
    const exits: Array<{ exitCode: number }> = [];
    transport.on('exit', (event) => exits.push(event));

    stubFetch(() => jsonResponse({ state: 'failed' }));

    await expect(transport.reconnect('task-failed')).resolves.toBe('task-failed');
    expect(exits).toEqual([{ exitCode: 1 }]);
  });

  it('sends stdin with PATCH and ignores writes before a command is active', async () => {
    const transport = new SandboxTransport({
      httpEndpoint: 'http://sandbox.test',
      agentId: 'agent-1',
      command: 'codex',
    });
    stubFetch(() => jsonResponse({ task_id: 'task-1' }, { status: 201 }));

    transport.write('ignored');
    await transport.start();
    transport.write('yes\n');

    const patch = calls.find((call) => call.init?.method === 'PATCH');
    expect(patch?.url).toBe('http://sandbox.test/api/v1/tasks/task-1');
    expect(JSON.parse(String(patch?.init?.body))).toEqual({ stdin: 'yes\n' });
  });

  it('updates resize dimensions without issuing network control calls', async () => {
    const transport = new SandboxTransport({
      httpEndpoint: 'http://sandbox.test',
      agentId: 'agent-1',
      command: 'codex',
    });
    stubFetch(() => jsonResponse({ task_id: 'task-1' }, { status: 201 }));

    await transport.start();
    transport.resize(132, 43);

    expect(transport.cols).toBe(132);
    expect(transport.rows).toBe(43);
    expect(calls.filter((call) => call.init?.method === 'PATCH')).toHaveLength(0);
  });

  it('stop is idempotent and cancels the remote task once', async () => {
    const transport = new SandboxTransport({
      httpEndpoint: 'http://sandbox.test',
      agentId: 'agent-1',
      command: 'codex',
    });
    const exits: Array<{ exitCode: number; signal?: string }> = [];
    transport.on('exit', (event) => exits.push(event));
    stubFetch(() => jsonResponse({ task_id: 'task-1' }, { status: 201 }));

    await transport.start();
    await transport.stop();
    await transport.stop();

    const deletes = calls.filter((call) => call.init?.method === 'DELETE');
    expect(deletes).toHaveLength(1);
    expect(exits).toEqual([{ exitCode: 0, signal: 'SIGTERM' }]);
  });
});
