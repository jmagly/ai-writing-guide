/**
 * Dispatch router tests — v2 first, v1 fallback on 404, deprecation
 * capture on v1 path.
 *
 * @source @src/serve/dispatch-router.ts
 * @issue #1252 #1254 #1259
 */

import { describe, it, expect } from 'vitest';
import {
  routeDispatch,
  type DispatchRouterOptions,
  type V1DispatchPayload,
} from '../../../src/serve/dispatch-router.js';
import type { ExecutorRegistration } from '../../../src/serve/executor-registry.js';

function mkExecutor(overrides: Partial<ExecutorRegistration> = {}): ExecutorRegistration {
  return {
    executorId: 'exec-1',
    name: 'test',
    version: '1.0.0',
    specVersion: '1.0',
    transportEndpoints: { rest: 'https://exec.test', ws: 'wss://exec.test/ws' },
    capabilities: [],
    token: 'tok',
    connected: true,
    registeredAt: '2026-05-11T00:00:00Z',
    currentMissions: new Set(),
    ...overrides,
  };
}

interface FetchCall {
  url: string;
  init: RequestInit;
}

function makeStub(handler: (call: FetchCall) => Response | Promise<Response>): {
  fetch: typeof fetch;
  calls: FetchCall[];
} {
  const calls: FetchCall[] = [];
  const stub: typeof fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : (input as Request).url;
    const call: FetchCall = { url, init: init ?? {} };
    calls.push(call);
    return handler(call);
  };
  return { fetch: stub, calls };
}

const samplePayload: V1DispatchPayload = {
  mission_id: 'm-1',
  objective: 'Run the suite',
  completion: 'tests pass',
  long_running: false,
};

describe('routeDispatch — v2 happy path', () => {
  it('POSTs to the registered A2A instance when it differs from executorId', async () => {
    const { fetch: stub, calls } = makeStub(() =>
      new Response(
        JSON.stringify({ id: 'task-a', status: { state: 'submitted' } }),
        { status: 202, headers: { 'content-type': 'application/json' } }
      )
    );
    const opts: DispatchRouterOptions = { fetch: stub };
    const result = await routeDispatch(mkExecutor({ a2aInstanceId: 'inst-1' }), samplePayload, opts);
    expect(result.dispatchPath).toBe('v2');
    expect(result.missionId).toBe('m-1');
    expect(result.executorId).toBe('exec-1');
    expect(result.a2aInstanceId).toBe('inst-1');
    expect(result.task?.id).toBe('task-a');
    expect(calls[0]!.url).toBe('https://exec.test/agents/inst-1/v1/messages:send');
    const body = JSON.parse((calls[0]!.init.body as string) ?? '{}') as {
      message: { messageId: string; parts: { text?: string }[]; metadata: Record<string, unknown> };
    };
    expect(body.message.messageId).toBe('m-1');
    expect(body.message.parts[0]?.text).toBe('Run the suite');
    expect(body.message.metadata['completion']).toBe('tests pass');
    expect(body.message.metadata['long_running']).toBe(false);
  });

  it('falls back to executorId when no A2A instance id is known', async () => {
    const { fetch: stub, calls } = makeStub(() =>
      new Response(
        JSON.stringify({ id: 'task-a', status: { state: 'submitted' } }),
        { status: 202, headers: { 'content-type': 'application/json' } }
      )
    );
    const result = await routeDispatch(mkExecutor(), samplePayload, { fetch: stub });
    expect(result.a2aInstanceId).toBe('exec-1');
    expect(calls[0]!.url).toBe('https://exec.test/agents/exec-1/v1/messages:send');
  });

  it('lets a dispatch payload override the registered A2A instance id', async () => {
    const { fetch: stub, calls } = makeStub(() =>
      new Response(
        JSON.stringify({ id: 'task-a', status: { state: 'submitted' } }),
        { status: 202, headers: { 'content-type': 'application/json' } }
      )
    );
    const result = await routeDispatch(
      mkExecutor({ a2aInstanceId: 'registered-inst' }),
      { ...samplePayload, a2a_instance_id: 'payload-inst' },
      { fetch: stub }
    );
    expect(result.a2aInstanceId).toBe('payload-inst');
    expect(calls[0]!.url).toBe('https://exec.test/agents/payload-inst/v1/messages:send');
  });

  it('injects required A2A extensions on the v2 call', async () => {
    const { fetch: stub, calls } = makeStub(() =>
      new Response(
        JSON.stringify({ id: 't', status: { state: 'submitted' } }),
        { status: 202, headers: { 'content-type': 'application/json' } }
      )
    );
    await routeDispatch(mkExecutor(), samplePayload, { fetch: stub });
    const headers = calls[0]!.init.headers as Record<string, string>;
    expect(headers['a2a-extensions']).toContain('runtime/v1');
    expect(headers['a2a-extensions']).toContain('idempotency/v1');
  });

  it('surfaces idempotent replay flag', async () => {
    const { fetch: stub } = makeStub(() =>
      new Response(
        JSON.stringify({ id: 't', status: { state: 'submitted' } }),
        {
          status: 202,
          headers: { 'content-type': 'application/json', 'idempotent-replayed': 'true' },
        }
      )
    );
    const result = await routeDispatch(mkExecutor(), samplePayload, { fetch: stub });
    expect(result.idempotentReplayed).toBe(true);
  });
});

describe('routeDispatch — v1 fallback on 404', () => {
  it('falls back to /dispatch when v2 returns 404 and reports the fallback', async () => {
    const fallbackEvents: { executorId: string; reason: string }[] = [];
    let callCount = 0;
    const { fetch: stub, calls } = makeStub(() => {
      callCount++;
      if (callCount === 1) {
        return new Response(
          JSON.stringify({
            type: 'about:blank',
            title: 'Not found',
            code: 'route.not_found',
          }),
          { status: 404, headers: { 'content-type': 'application/problem+json' } }
        );
      }
      return new Response(
        JSON.stringify({ estimated_start: '2026-05-11T01:00:00Z' }),
        { status: 202, headers: { 'content-type': 'application/json' } }
      );
    });
    const result = await routeDispatch(mkExecutor(), samplePayload, {
      fetch: stub,
      onV1Fallback: (info) => fallbackEvents.push(info),
    });
    expect(result.dispatchPath).toBe('v1-fallback');
    expect(result.estimatedStart).toBe('2026-05-11T01:00:00Z');
    expect(calls).toHaveLength(2);
    expect(calls[0]!.url).toContain('/agents/exec-1/v1/messages:send');
    expect(calls[1]!.url).toBe('https://exec.test/dispatch');
    expect(fallbackEvents).toHaveLength(1);
    expect(fallbackEvents[0]!.executorId).toBe('exec-1');
    expect(fallbackEvents[0]!.reason).toMatch(/v2 endpoint returned 404/);
  });

  it('forceV1 skips v2 and goes straight to /dispatch', async () => {
    const { fetch: stub, calls } = makeStub(() =>
      new Response('{}', { status: 202, headers: { 'content-type': 'application/json' } })
    );
    const result = await routeDispatch(mkExecutor(), samplePayload, {
      fetch: stub,
      forceV1: true,
    });
    expect(result.dispatchPath).toBe('v1-fallback');
    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe('https://exec.test/dispatch');
  });

  it('captures Sunset header on v1 fallback path', async () => {
    const deprecations: Array<{ path: string; sunset?: string }> = [];
    let callCount = 0;
    const { fetch: stub } = makeStub(() => {
      callCount++;
      if (callCount === 1) {
        return new Response(JSON.stringify({ type: 'about:blank', title: 'Not found' }), {
          status: 404,
          headers: { 'content-type': 'application/problem+json' },
        });
      }
      return new Response('{}', {
        status: 202,
        headers: {
          'content-type': 'application/json',
          sunset: 'Sun, 09 May 2027 00:00:00 GMT',
          link: '<https://docs.example/v2>; rel="successor-version"',
        },
      });
    });
    const result = await routeDispatch(mkExecutor(), samplePayload, {
      fetch: stub,
      onDeprecation: (info) => deprecations.push({ path: info.path, sunset: info.sunset }),
    });
    expect(result.dispatchPath).toBe('v1-fallback');
    expect(deprecations.length).toBeGreaterThan(0);
    expect(deprecations.some((d) => d.sunset?.includes('2027'))).toBe(true);
  });
});

describe('routeDispatch — error propagation', () => {
  it('propagates non-404 A2AError without falling back', async () => {
    const { fetch: stub, calls } = makeStub(() =>
      new Response(
        JSON.stringify({
          type: 'about:blank',
          title: 'Invalid',
          code: 'request.invalid_params',
        }),
        { status: 400, headers: { 'content-type': 'application/problem+json' } }
      )
    );
    await expect(
      routeDispatch(mkExecutor(), samplePayload, { fetch: stub })
    ).rejects.toThrow(/Invalid|400/);
    expect(calls).toHaveLength(1); // No fallback attempted.
  });

  it('propagates v1 failure when v1 path is the only attempt', async () => {
    const { fetch: stub } = makeStub(() =>
      new Response('boom', { status: 500 })
    );
    await expect(
      routeDispatch(mkExecutor(), samplePayload, { fetch: stub, forceV1: true })
    ).rejects.toThrow(/v1 dispatch failed: 500/);
  });
});
