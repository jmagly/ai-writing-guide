/**
 * dispatch-client — POST + retry/backoff + typed outcome tests.
 *
 * @source @tools/mc-bridge/dispatch-client.mjs
 * @issue #1182 (cycle 2)
 */

import { describe, it, expect } from 'vitest';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — .mjs module without bundled types
import {
  classifyStatus,
  reasonForStatus,
  dispatchMission,
  sleep,
} from '../../../tools/mc-bridge/dispatch-client.mjs';

const PAYLOAD = {
  mission_id: 'm-1',
  objective: 'echo hi',
  long_running: false,
  executor_filter: { executor_id: null, capabilities: [], agent_id: null },
};

describe('classifyStatus', () => {
  it('treats 2xx as accepted', () => {
    expect(classifyStatus(200)).toBe('accepted');
    expect(classifyStatus(202)).toBe('accepted');
    expect(classifyStatus(204)).toBe('accepted');
  });

  it('treats 5xx + 503 as retryable', () => {
    expect(classifyStatus(500)).toBe('retryable');
    expect(classifyStatus(502)).toBe('retryable');
    expect(classifyStatus(503)).toBe('retryable');
    expect(classifyStatus(504)).toBe('retryable');
  });

  it('treats 4xx as terminal', () => {
    expect(classifyStatus(400)).toBe('terminal');
    expect(classifyStatus(401)).toBe('terminal');
    expect(classifyStatus(404)).toBe('terminal');
    expect(classifyStatus(422)).toBe('terminal');
  });
});

describe('reasonForStatus', () => {
  it('maps known HTTP codes to short reasons', () => {
    expect(reasonForStatus(400)).toBe('invalid_request');
    expect(reasonForStatus(401)).toBe('unauthorized');
    expect(reasonForStatus(403)).toBe('unauthorized');
    expect(reasonForStatus(404)).toBe('executor_not_found');
    expect(reasonForStatus(422)).toBe('idempotency_key_reused');
    expect(reasonForStatus(503)).toBe('no_executor_available');
  });

  it('falls back to the provided default for unknown codes', () => {
    expect(reasonForStatus(418, 'dispatch_error')).toBe('dispatch_error');
    expect(reasonForStatus(999)).toBe('client_error');
  });
});

describe('sleep', () => {
  it('resolves after the given delay', async () => {
    const start = Date.now();
    await sleep(15);
    expect(Date.now() - start).toBeGreaterThanOrEqual(10);
  });

  it('resolves immediately on an already-aborted signal', async () => {
    const ac = new AbortController();
    ac.abort();
    const start = Date.now();
    await sleep(1000, ac.signal);
    expect(Date.now() - start).toBeLessThan(50);
  });

  it('resolves on abort during the wait', async () => {
    const ac = new AbortController();
    const p = sleep(5000, ac.signal);
    setTimeout(() => ac.abort(), 5);
    const start = Date.now();
    await p;
    expect(Date.now() - start).toBeLessThan(200);
  });
});

interface FetchCall {
  url: string;
  init?: RequestInit;
}

function makeFetch(handler: (call: FetchCall) => Promise<Response> | Response): {
  fetch: typeof fetch;
  calls: FetchCall[];
} {
  const calls: FetchCall[] = [];
  const fetchImpl = (async (url: string, init?: RequestInit) => {
    const call: FetchCall = { url: String(url), init };
    calls.push(call);
    return handler(call);
  }) as unknown as typeof fetch;
  return { fetch: fetchImpl, calls };
}

describe('dispatchMission', () => {
  it('returns accepted on 202 with executor_id', async () => {
    const { fetch: fetchImpl, calls } = makeFetch(() =>
      new Response(JSON.stringify({ executor_id: 'exec-1', estimated_start: 't' }), {
        status: 202,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const out = await dispatchMission(
      { aiwgServeUrl: 'http://serve:7337', fetchImpl },
      'sess-1',
      PAYLOAD,
    );
    expect(out.outcome).toBe('accepted');
    expect(out.executorId).toBe('exec-1');
    expect(out.attempts).toBe(1);
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe('http://serve:7337/api/v1/sessions/sess-1/dispatch');
    expect(calls[0].init?.method).toBe('POST');
  });

  it('returns failed terminal on 400 with detail message', async () => {
    const { fetch: fetchImpl } = makeFetch(() =>
      new Response(JSON.stringify({ detail: 'mission_id missing' }), { status: 400 }),
    );
    const out = await dispatchMission(
      { aiwgServeUrl: 'http://serve:7337', fetchImpl, maxAttempts: 5 },
      'sess-1',
      PAYLOAD,
    );
    expect(out.outcome).toBe('failed');
    expect(out.reason).toBe('invalid_request');
    expect(out.message).toContain('mission_id missing');
    expect(out.attempts).toBe(1); // no retry on 4xx
  });

  it('retries on 5xx and succeeds when the executor recovers', async () => {
    let n = 0;
    const { fetch: fetchImpl, calls } = makeFetch(() => {
      n++;
      if (n < 3) return new Response('{}', { status: 503 });
      return new Response(JSON.stringify({ executor_id: 'exec-late' }), {
        status: 202,
        headers: { 'Content-Type': 'application/json' },
      });
    });
    const out = await dispatchMission(
      { aiwgServeUrl: 'http://serve:7337', fetchImpl, retryBaseMs: 2, maxAttempts: 5 },
      'sess-1',
      PAYLOAD,
    );
    expect(out.outcome).toBe('accepted');
    expect(out.executorId).toBe('exec-late');
    expect(out.attempts).toBe(3);
    expect(calls).toHaveLength(3);
  });

  it('exhausts retries on persistent 5xx and reports last status', async () => {
    const { fetch: fetchImpl, calls } = makeFetch(() =>
      new Response(JSON.stringify({ error: 'no_executor_available' }), { status: 503 }),
    );
    const out = await dispatchMission(
      { aiwgServeUrl: 'http://serve:7337', fetchImpl, retryBaseMs: 1, maxAttempts: 3 },
      'sess-1',
      PAYLOAD,
    );
    expect(out.outcome).toBe('failed');
    expect(out.reason).toBe('no_executor_available');
    expect(out.attempts).toBe(3);
    expect(calls).toHaveLength(3);
  });

  it('classifies network errors as retryable and gives up as "unreachable"', async () => {
    const { fetch: fetchImpl, calls } = makeFetch(() => {
      throw new Error('ECONNREFUSED');
    });
    const out = await dispatchMission(
      { aiwgServeUrl: 'http://nowhere:7337', fetchImpl, retryBaseMs: 1, maxAttempts: 2 },
      'sess-1',
      PAYLOAD,
    );
    expect(out.outcome).toBe('failed');
    expect(out.reason).toBe('unreachable');
    expect(out.attempts).toBe(2);
    expect(calls).toHaveLength(2);
  });

  it('aborts cleanly when the signal fires mid-backoff', async () => {
    const ac = new AbortController();
    const { fetch: fetchImpl } = makeFetch(() =>
      new Response('{}', { status: 503 }),
    );
    const p = dispatchMission(
      { aiwgServeUrl: 'http://serve:7337', fetchImpl, retryBaseMs: 5000, maxAttempts: 5 },
      'sess-1',
      PAYLOAD,
      ac.signal,
    );
    setTimeout(() => ac.abort(), 20);
    const out = await p;
    expect(out.outcome).toBe('failed');
    expect(out.reason).toBe('aborted');
  });
});
