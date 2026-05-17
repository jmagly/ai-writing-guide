/**
 * A2AClient tests — sendMessage, getTask, cancelTask, push notification
 * config CRUD, AgentCard fetch, SSE subscribeToTask.
 *
 * Uses a fetch stub that mimics the executor's wire shape
 * (agentic-sandbox-executor/src/bindings/rest.rs).
 *
 * @source @src/a2a/client.ts
 * @issue #1252 #1254
 */

import { describe, it, expect } from 'vitest';

import {
  A2A_IDEMPOTENCY_V1,
  A2A_RUNTIME_V1,
  A2AClient,
  parseEventStream,
} from '../../../src/a2a/client.js';
import type { Task } from '../../../src/a2a/types.js';

interface FetchCall {
  url: string;
  init?: RequestInit;
}

function mkClient(handler: (call: FetchCall) => Response | Promise<Response>): {
  client: A2AClient;
  calls: FetchCall[];
} {
  const calls: FetchCall[] = [];
  const stub: typeof fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : (input as Request).url;
    const call: FetchCall = init ? { url, init } : { url };
    calls.push(call);
    return handler(call);
  };
  return {
    client: new A2AClient({
      baseUrl: 'https://exec.test',
      bearer: 'tok',
      instanceId: 'inst-1',
      fetch: stub,
    }),
    calls,
  };
}

const sampleTask: Task = {
  id: 'task-1',
  contextId: 'ctx-1',
  status: { state: 'submitted', timestamp: '2026-05-11T00:00:00Z' },
};

describe('A2AClient.sendMessage', () => {
  it('POSTs to /agents/{id}/v1/messages:send with runtime + idempotency extensions', async () => {
    const { client, calls } = mkClient(() =>
      new Response(JSON.stringify(sampleTask), {
        status: 202,
        headers: {
          'content-type': 'application/json',
          'a2a-extensions': `${A2A_RUNTIME_V1}, ${A2A_IDEMPOTENCY_V1}`,
        },
      })
    );
    const result = await client.sendMessage({
      messageId: 'msg-1',
      role: 'user',
      parts: [{ kind: 'text', text: 'hi' }],
    });
    expect(calls[0]!.url).toBe('https://exec.test/agents/inst-1/v1/messages:send');
    expect(calls[0]!.init!.method).toBe('POST');
    const headers = calls[0]!.init!.headers as Record<string, string>;
    expect(headers['a2a-extensions']).toContain('runtime/v1');
    expect(headers['a2a-extensions']).toContain('idempotency/v1');
    expect(result.task.id).toBe('task-1');
    expect(result.activatedExtensions).toHaveLength(2);
  });

  it('passes optional extensions through when configured', async () => {
    const calls: FetchCall[] = [];
    const stub: typeof fetch = async (input, init) => {
      const url = typeof input === 'string' ? input : (input as Request).url;
      const call: FetchCall = init ? { url, init } : { url };
      calls.push(call);
      return new Response(JSON.stringify(sampleTask), {
        status: 202,
        headers: { 'content-type': 'application/json' },
      });
    };
    const client = new A2AClient({
      baseUrl: 'https://exec.test',
      bearer: 'tok',
      instanceId: 'inst-1',
      optionalExtensions: ['hitl-prompt/v1'],
      fetch: stub,
    });
    await client.sendMessage({
      messageId: 'msg-1',
      role: 'user',
      parts: [{ kind: 'text', text: 'hi' }],
    });
    const headers = calls[0]!.init!.headers as Record<string, string>;
    expect(headers['a2a-extensions']).toContain('hitl-prompt/v1');
  });

  it('surfaces idempotent replays', async () => {
    const { client } = mkClient(() =>
      new Response(JSON.stringify(sampleTask), {
        status: 202,
        headers: { 'content-type': 'application/json', 'idempotent-replayed': 'true' },
      })
    );
    const result = await client.sendMessage({
      messageId: 'msg-1',
      role: 'user',
      parts: [{ kind: 'text', text: 'hi' }],
    });
    expect(result.idempotentReplayed).toBe(true);
  });
});

describe('A2AClient.getTask + cancelTask + listTasks', () => {
  it('getTask GETs the right path', async () => {
    const { client, calls } = mkClient(() =>
      new Response(JSON.stringify(sampleTask), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    );
    await client.getTask('task-1');
    expect(calls[0]!.url).toBe('https://exec.test/agents/inst-1/v1/tasks/task-1');
    expect(calls[0]!.init!.method).toBe('GET');
  });

  it('cancelTask POSTs to /cancel with extensions', async () => {
    const { client, calls } = mkClient(() =>
      new Response(JSON.stringify({ ...sampleTask, status: { state: 'canceled' } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    );
    const result = await client.cancelTask('task-1');
    expect(calls[0]!.url).toBe('https://exec.test/agents/inst-1/v1/tasks/task-1/cancel');
    const headers = calls[0]!.init!.headers as Record<string, string>;
    expect(headers['a2a-extensions']).toBeDefined();
    expect(result.status.state).toBe('canceled');
  });

  it('listTasks passes state + limit', async () => {
    const { client, calls } = mkClient(() =>
      new Response(JSON.stringify({ tasks: [sampleTask] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    );
    const tasks = await client.listTasks({ state: 'working', limit: 25 });
    expect(calls[0]!.url).toContain('state=working');
    expect(calls[0]!.url).toContain('limit=25');
    expect(tasks).toHaveLength(1);
  });
});

describe('A2AClient push notification configs', () => {
  it('createPushNotificationConfig POSTs and returns the assigned id', async () => {
    const { client, calls } = mkClient(() =>
      new Response(JSON.stringify({ configId: 'cfg-1', url: 'https://hook', secret: 's' }), {
        status: 201,
        headers: { 'content-type': 'application/json' },
      })
    );
    const cfg = await client.createPushNotificationConfig('task-1', {
      url: 'https://hook',
      secret: 's',
    });
    expect(calls[0]!.url).toBe(
      'https://exec.test/agents/inst-1/v1/tasks/task-1/pushNotificationConfigs'
    );
    expect(cfg.configId).toBe('cfg-1');
  });

  it('deletePushNotificationConfig DELETEs the right path', async () => {
    const { client, calls } = mkClient(
      () => new Response(null, { status: 204 })
    );
    await client.deletePushNotificationConfig('task-1', 'cfg-1');
    expect(calls[0]!.url).toBe(
      'https://exec.test/agents/inst-1/v1/tasks/task-1/pushNotificationConfigs/cfg-1'
    );
    expect(calls[0]!.init!.method).toBe('DELETE');
  });
});

describe('A2AClient.getAgentCard', () => {
  it('GETs the well-known path', async () => {
    const card = {
      protocolVersion: '0.3.0',
      name: 'agent',
      url: 'https://exec.test',
      version: '1.0.0',
    };
    const { client, calls } = mkClient(() =>
      new Response(JSON.stringify(card), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    );
    const got = await client.getAgentCard();
    expect(calls[0]!.url).toBe('https://exec.test/agents/inst-1/.well-known/agent-card.json');
    expect(got.name).toBe('agent');
  });

  it('falls back to extendedAgentCard when the well-known card is absent', async () => {
    const card = {
      protocolVersion: '0.3.0',
      name: 'agent',
      url: 'https://exec.test',
      version: '1.0.0',
    };
    const { client, calls } = mkClient((call) => {
      if (call.url.endsWith('/.well-known/agent-card.json')) {
        return new Response(JSON.stringify({ title: 'Not found' }), {
          status: 404,
          headers: { 'content-type': 'application/problem+json' },
        });
      }
      return new Response(JSON.stringify(card), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });
    const got = await client.getAgentCard();
    expect(got.name).toBe('agent');
    expect(calls.map((c) => c.url)).toEqual([
      'https://exec.test/agents/inst-1/.well-known/agent-card.json',
      'https://exec.test/agents/inst-1/v1/extendedAgentCard',
    ]);
  });
});

describe('A2AClient.getExtendedAgentCard', () => {
  it('GETs the current extendedAgentCard path', async () => {
    const card = {
      protocolVersion: '0.3.0',
      name: 'extended',
      url: 'https://exec.test',
      version: '1.0.0',
    };
    const { client, calls } = mkClient(() =>
      new Response(JSON.stringify(card), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    );
    const got = await client.getExtendedAgentCard();
    expect(calls[0]!.url).toBe('https://exec.test/agents/inst-1/v1/extendedAgentCard');
    expect(got.name).toBe('extended');
  });

  it('falls back to the legacy /v1/card path', async () => {
    const card = {
      protocolVersion: '0.3.0',
      name: 'legacy',
      url: 'https://exec.test',
      version: '1.0.0',
    };
    const { client, calls } = mkClient((call) => {
      if (call.url.endsWith('/v1/extendedAgentCard')) {
        return new Response(JSON.stringify({ title: 'Not found' }), {
          status: 404,
          headers: { 'content-type': 'application/problem+json' },
        });
      }
      return new Response(JSON.stringify(card), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });
    const got = await client.getExtendedAgentCard();
    expect(got.name).toBe('legacy');
    expect(calls.map((c) => c.url)).toEqual([
      'https://exec.test/agents/inst-1/v1/extendedAgentCard',
      'https://exec.test/agents/inst-1/v1/card',
    ]);
  });
});

describe('SSE parseEventStream', () => {
  function makeStream(chunks: string[]): ReadableStream<Uint8Array> {
    const encoder = new TextEncoder();
    return new ReadableStream({
      start(controller) {
        for (const c of chunks) controller.enqueue(encoder.encode(c));
        controller.close();
      },
    });
  }

  it('parses single-frame event with kind + data', async () => {
    const stream = makeStream([
      'event: status-update\n',
      'data: {"kind":"status-update","taskId":"t1","status":{"state":"working"}}\n\n',
    ]);
    const frames: unknown[] = [];
    for await (const f of parseEventStream(stream)) frames.push(f);
    expect(frames).toHaveLength(1);
    expect((frames[0] as { event: string }).event).toBe('status-update');
  });

  it('parses multi-line data field', async () => {
    const stream = makeStream([
      'event: x\ndata: {"a":1,\ndata: "b":"c"}\n\n',
    ]);
    const frames: unknown[] = [];
    for await (const f of parseEventStream(stream)) frames.push(f);
    expect(frames).toHaveLength(1);
    expect((frames[0] as { data: string }).data).toBe('{"a":1,\n"b":"c"}');
  });

  it('skips comment lines starting with :', async () => {
    const stream = makeStream([
      ': heartbeat\n',
      'event: ping\ndata: {}\n\n',
    ]);
    const frames: unknown[] = [];
    for await (const f of parseEventStream(stream)) frames.push(f);
    expect(frames).toHaveLength(1);
  });
});

describe('A2AClient.subscribeToTask', () => {
  it('iterates StreamEvent frames from an SSE response', async () => {
    const sseBody =
      'event: task-state\n' +
      'data: {"kind":"task-state","task":{"id":"t1","status":{"state":"working"}}}\n\n' +
      'event: status-update\n' +
      'data: {"kind":"status-update","taskId":"t1","status":{"state":"completed"},"final":true}\n\n';
    const stub: typeof fetch = async () =>
      new Response(sseBody, {
        status: 200,
        headers: { 'content-type': 'text/event-stream' },
      });
    const client = new A2AClient({
      baseUrl: 'https://exec.test',
      bearer: 'tok',
      instanceId: 'inst-1',
      fetch: stub,
    });
    const events: unknown[] = [];
    for await (const evt of client.subscribeToTask('t1')) {
      events.push(evt);
    }
    expect(events).toHaveLength(2);
    expect((events[0] as { kind: string }).kind).toBe('task-state');
    expect((events[1] as { kind: string; final?: boolean }).final).toBe(true);
  });
});
