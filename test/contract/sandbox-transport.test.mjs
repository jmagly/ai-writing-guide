import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SandboxTransport } from '../../tools/daemon/sandbox-transport.mjs';
import { SandboxRegistry } from '../../src/serve/sandbox-registry.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const transportFixtureDir = join(__dirname, '..', 'fixtures', 'sandbox-api', 'sandbox-transport');
const registryFixtureDir = join(__dirname, '..', 'fixtures', 'sandbox-api', 'sandbox-registry');
const endpoint = 'http://sandbox.test';

function loadFixture(dir, name) {
  return JSON.parse(readFileSync(join(dir, `${name}.json`), 'utf8'));
}

function responseFromFixture(fixture) {
  const headers = fixture.response.headers ?? {};
  if ('bodyText' in fixture.response) {
    return new Response(fixture.response.bodyText, { status: fixture.response.status, headers });
  }
  return Response.json(fixture.response.body ?? {}, { status: fixture.response.status, headers });
}

function installFetchReplay(fixtures) {
  const calls = [];
  const pending = fixtures.map((fixture) => ({ fixture, used: false }));

  const fetchMock = vi.fn(async (input, init = {}) => {
    const url = new URL(String(input));
    const method = (init.method ?? 'GET').toUpperCase();
    const path = `${url.pathname}${url.search}`;
    const match = pending.find((entry) => !entry.used
      && entry.fixture.request.method === method
      && entry.fixture.request.path === path);

    calls.push({ method, path, body: init.body ? JSON.parse(String(init.body)) : undefined });

    if (!match) {
      throw new Error(`Unexpected sandbox request: ${method} ${path}`);
    }

    match.used = true;
    return responseFromFixture(match.fixture);
  });

  vi.stubGlobal('fetch', fetchMock);
  return { calls, pending };
}

function waitForEvent(emitter, eventName) {
  return new Promise((resolve) => {
    emitter.once(eventName, resolve);
  });
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('SandboxTransport recorded REST contract', () => {
  it('submits tasks with the recorded manifest envelope', async () => {
    const submit = loadFixture(transportFixtureDir, 'task-submit');
    const { calls } = installFetchReplay([submit]);
    const transport = new SandboxTransport({
      httpEndpoint: endpoint,
      agentId: 'contract-agent',
      command: 'echo',
      args: ['aiwg-contract'],
    });

    const commandId = await transport.start();
    transport._stopLogPoll();

    expect(commandId).toBe(submit.response.body.task_id);
    expect(calls[0].method).toBe('POST');
    expect(calls[0].path).toBe('/api/v1/tasks');
    expect(calls[0].body.manifest_yaml).toContain('kind: Task');
    expect(calls[0].body.manifest_yaml).toContain('aiwg_transport: pty');
    expect(calls[0].body.manifest_yaml).toContain('prompt: "echo aiwg-contract"');
  });

  it('polls logs and status using the recorded task endpoints', async () => {
    vi.useFakeTimers();
    const submit = loadFixture(transportFixtureDir, 'task-submit');
    const logs = loadFixture(transportFixtureDir, 'task-logs');
    const completed = loadFixture(transportFixtureDir, 'task-status-completed');
    installFetchReplay([submit, logs, completed]);

    const transport = new SandboxTransport({
      httpEndpoint: endpoint,
      agentId: 'contract-agent',
      command: 'echo',
      args: ['aiwg-contract'],
    });

    const dataEvent = waitForEvent(transport, 'data');
    const exitEvent = waitForEvent(transport, 'exit');

    await transport.start();
    await vi.runOnlyPendingTimersAsync();

    await expect(dataEvent).resolves.toBe(logs.response.bodyText);
    await expect(exitEvent).resolves.toMatchObject({ exitCode: 0 });

    vi.useRealTimers();
  });

  it('reconnects to an existing running task', async () => {
    const running = loadFixture(transportFixtureDir, 'task-status-running');
    installFetchReplay([running]);

    const transport = new SandboxTransport({
      httpEndpoint: endpoint,
      agentId: 'contract-agent',
      command: 'bash',
    });

    const commandId = await transport.reconnect('task-contract-1');
    transport._stopLogPoll();

    expect(commandId).toBe('task-contract-1');
    expect(transport.isActive()).toBe(true);
  });

  it('sends stdin and stops through recorded task mutation endpoints', async () => {
    const stdin = loadFixture(transportFixtureDir, 'task-stdin');
    const deleted = loadFixture(transportFixtureDir, 'task-delete');
    const { calls } = installFetchReplay([stdin, deleted]);

    const transport = new SandboxTransport({
      httpEndpoint: endpoint,
      agentId: 'contract-agent',
      command: 'bash',
    });
    transport.taskId = 'task-contract-1';
    transport.commandId = 'task-contract-1';

    transport.write('input line\n');
    await Promise.resolve();
    await transport.stop();

    expect(calls.map((call) => `${call.method} ${call.path}`)).toEqual([
      'PATCH /api/v1/tasks/task-contract-1',
      'DELETE /api/v1/tasks/task-contract-1',
    ]);
    expect(calls[0].body).toEqual(stdin.request.body);
  });

  it('lists running sessions from the recorded task inventory endpoint', async () => {
    const list = loadFixture(transportFixtureDir, 'task-list-running');
    installFetchReplay([list]);

    const transport = new SandboxTransport({
      httpEndpoint: endpoint,
      agentId: 'contract-agent',
      command: 'bash',
    });

    await expect(transport.listSessions()).resolves.toEqual([
      {
        taskId: 'task-contract-1',
        name: 'pty-contract-agent',
        state: 'running',
        agentId: 'contract-agent',
      },
    ]);
  });

  it('fails loudly when a recorded endpoint drifts', async () => {
    const submit = loadFixture(transportFixtureDir, 'task-submit');
    submit.request.path = '/api/v1/tasks-drifted';
    installFetchReplay([submit]);

    const transport = new SandboxTransport({
      httpEndpoint: endpoint,
      agentId: 'contract-agent',
      command: 'echo',
      args: ['aiwg-contract'],
    });

    await expect(transport.start()).rejects.toThrow('Unexpected sandbox request: POST /api/v1/tasks');
  });
});

describe('SandboxRegistry recorded event contract', () => {
  it('accepts registration metadata and replays agent.sessions events', () => {
    const register = loadFixture(registryFixtureDir, 'register');
    const connected = loadFixture(registryFixtureDir, 'agent-connected-event');
    const sessions = loadFixture(registryFixtureDir, 'agent-sessions-event');
    const registry = new SandboxRegistry();

    const registration = registry.register(register.request.body);
    const connectedEvent = {
      ...connected.event,
      sandboxId: registration.sandbox_id,
    };
    const sessionsEvent = {
      ...sessions.event,
      sandboxId: registration.sandbox_id,
    };

    registry.handleEvent(connectedEvent);
    registry.handleEvent(sessionsEvent);

    const summary = registry.getSummary(registration.sandbox_id);
    expect(summary?.instanceId).toBe(register.request.body.instance_id);
    expect(summary?.agents[0]).toMatchObject({
      agentId: 'contract-agent',
      sessionCount: 1,
      sessions: sessions.event.sessions,
    });

    registry.shutdown();
  });
});
