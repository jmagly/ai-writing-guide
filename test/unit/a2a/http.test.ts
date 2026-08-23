/**
 * A2AHttpClient tests — bearer injection, A2A-Extensions header,
 * Idempotent-Replayed surfacing, RFC 7807 parsing, deprecation telemetry.
 *
 * @source @src/a2a/http.ts
 * @issue #1252 #1254 #1259
 */

import { describe, it, expect } from 'vitest';
import { A2AError, A2AHttpClient, type DeprecationInfo } from '../../../src/a2a/http.js';

interface FetchCall {
  url: string;
  init?: RequestInit;
}

function makeFetchStub(handler: (call: FetchCall) => Promise<Response> | Response): {
  fetch: typeof fetch;
  calls: FetchCall[];
} {
  const calls: FetchCall[] = [];
  const stub: typeof fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : (input as Request).url;
    const call: FetchCall = init ? { url, init } : { url };
    calls.push(call);
    return handler(call);
  };
  return { fetch: stub, calls };
}

describe('A2AHttpClient', () => {
  it('injects bearer auth on every request', async () => {
    const { fetch: stub, calls } = makeFetchStub(() =>
      new Response('{"ok":true}', { status: 200, headers: { 'content-type': 'application/json' } })
    );
    const http = new A2AHttpClient({ baseUrl: 'https://x.test', bearer: 'sekrit', fetch: stub });
    await http.request('/v1/thing');
    const headers = calls[0]!.init!.headers as Record<string, string>;
    expect(headers['authorization']).toBe('Bearer sekrit');
  });

  it('injects default A2A-Extensions on mutating methods only', async () => {
    const { fetch: stub, calls } = makeFetchStub(() =>
      new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } })
    );
    const http = new A2AHttpClient({
      baseUrl: 'https://x.test',
      bearer: 't',
      fetch: stub,
      defaultExtensions: ['ext/a/v1', 'ext/b/v1'],
    });
    await http.request('/v1/get', { method: 'GET' });
    await http.request('/v1/post', { method: 'POST', body: {} });

    const getHeaders = calls[0]!.init!.headers as Record<string, string>;
    const postHeaders = calls[1]!.init!.headers as Record<string, string>;
    expect(getHeaders['a2a-extensions']).toBeUndefined();
    expect(postHeaders['a2a-extensions']).toBe('ext/a/v1, ext/b/v1');
  });

  it('per-call extensions override defaults', async () => {
    const { fetch: stub, calls } = makeFetchStub(() =>
      new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } })
    );
    const http = new A2AHttpClient({
      baseUrl: 'https://x.test',
      bearer: 't',
      fetch: stub,
      defaultExtensions: ['ext/default/v1'],
    });
    await http.request('/v1/post', {
      method: 'POST',
      body: {},
      extensions: ['ext/override/v1'],
    });
    const headers = calls[0]!.init!.headers as Record<string, string>;
    expect(headers['a2a-extensions']).toBe('ext/override/v1');
  });

  it('surfaces Idempotent-Replayed: true', async () => {
    const { fetch: stub } = makeFetchStub(() =>
      new Response('{"ok":true}', {
        status: 202,
        headers: { 'content-type': 'application/json', 'idempotent-replayed': 'true' },
      })
    );
    const http = new A2AHttpClient({ baseUrl: 'https://x.test', bearer: 't', fetch: stub });
    const resp = await http.request('/v1/x', { method: 'POST', body: {} });
    expect(resp.idempotentReplayed).toBe(true);
  });

  it('parses echoed A2A-Extensions on the response', async () => {
    const { fetch: stub } = makeFetchStub(() =>
      new Response('{}', {
        status: 200,
        headers: { 'content-type': 'application/json', 'a2a-extensions': 'ext/a/v1, ext/b/v1' },
      })
    );
    const http = new A2AHttpClient({ baseUrl: 'https://x.test', bearer: 't', fetch: stub });
    const resp = await http.request('/v1/x', { method: 'POST', body: {} });
    expect(resp.activatedExtensions).toEqual(['ext/a/v1', 'ext/b/v1']);
  });

  it('warns when an expected extension is not echoed', async () => {
    const missing: { expected: string[]; echoed: string[]; path: string }[] = [];
    const { fetch: stub } = makeFetchStub(() =>
      new Response('{}', {
        status: 200,
        headers: { 'content-type': 'application/json', 'a2a-extensions': 'ext/a/v1' },
      })
    );
    const http = new A2AHttpClient({
      baseUrl: 'https://x.test',
      bearer: 't',
      fetch: stub,
      defaultExtensions: ['ext/a/v1', 'ext/b/v1'],
      onExtensionEchoMissing: (expected, echoed, path) => missing.push({ expected, echoed, path }),
    });
    await http.request('/v1/x', { method: 'POST', body: {} });
    expect(missing.length).toBe(1);
    expect(missing[0]!.echoed).toEqual(['ext/a/v1']);
    expect(missing[0]!.path).toBe('/v1/x');
  });

  it('parses RFC 7807 problem+json into A2AError', async () => {
    const { fetch: stub } = makeFetchStub(() =>
      new Response(
        JSON.stringify({
          type: 'https://errors.example/invalid-params',
          title: 'Invalid params',
          detail: 'message field required',
          code: 'request.invalid_params',
        }),
        { status: 400, headers: { 'content-type': 'application/problem+json' } }
      )
    );
    const http = new A2AHttpClient({ baseUrl: 'https://x.test', bearer: 't', fetch: stub });
    await expect(http.request('/v1/x', { method: 'POST', body: {} })).rejects.toThrow(A2AError);
    try {
      await http.request('/v1/x', { method: 'POST', body: {} });
    } catch (err) {
      const e = err as A2AError;
      expect(e.status).toBe(400);
      expect(e.problem.code).toBe('request.invalid_params');
      expect(e.path).toBe('/v1/x');
    }
  });

  it('enforces 1.0 headers and successful response media type', async () => {
    const { fetch: stub, calls } = makeFetchStub(() =>
      new Response('{"ok":true}', {
        status: 200,
        headers: { 'content-type': 'application/a2a+json' },
      })
    );
    const http = new A2AHttpClient({
      baseUrl: 'https://x.test', bearer: 't', fetch: stub, protocolVersion: '1.0',
    });
    await http.request('/message:send', { method: 'POST', body: {} });
    const headers = calls[0]!.init!.headers as Record<string, string>;
    expect(headers).toMatchObject({
      'a2a-version': '1.0',
      accept: 'application/a2a+json',
      'content-type': 'application/a2a+json',
    });

    const invalid = new A2AHttpClient({
      baseUrl: 'https://x.test',
      bearer: 't',
      protocolVersion: '1.0',
      fetch: async () => new Response('{}', { headers: { 'content-type': 'application/json' } }),
    });
    await expect(invalid.request('/tasks/t')).rejects.toMatchObject({
      category: 'transport',
      problem: { code: 'aiwg.invalid_content_type' },
    });
  });

  it('classifies version, authorization, application, and transport failures separately', async () => {
    const responseFor = (status: number, body: object) => new A2AHttpClient({
      baseUrl: 'https://x.test',
      bearer: 't',
      fetch: async () => new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/problem+json' },
      }),
    });
    await expect(responseFor(400, {
      type: 'https://a2a-protocol.org/errors/version-not-supported',
      title: 'Version unsupported',
    }).request('/x')).rejects.toMatchObject({ category: 'negotiation' });
    await expect(responseFor(401, { title: 'Unauthorized' }).request('/x'))
      .rejects.toMatchObject({ category: 'authorization' });
    await expect(responseFor(422, { title: 'Invalid' }).request('/x'))
      .rejects.toMatchObject({ category: 'application' });
    const transport = new A2AHttpClient({
      baseUrl: 'https://x.test',
      bearer: 't',
      fetch: async () => { throw new TypeError('connection reset'); },
    });
    await expect(transport.request('/x')).rejects.toMatchObject({ category: 'transport', status: 0 });
  });

  it('captures Sunset / Deprecated / Link successor-version', async () => {
    const captured: DeprecationInfo[] = [];
    const { fetch: stub } = makeFetchStub(() =>
      new Response('{}', {
        status: 200,
        headers: {
          'content-type': 'application/json',
          sunset: 'Sun, 09 May 2027 00:00:00 GMT',
          deprecated: 'true',
          link: '<https://docs.example/migration>; rel="successor-version"',
        },
      })
    );
    const http = new A2AHttpClient({
      baseUrl: 'https://x.test',
      bearer: 't',
      fetch: stub,
      onDeprecation: (d) => captured.push(d),
    });
    const resp = await http.request('/api/v1/legacy');
    expect(resp.deprecation).toBeDefined();
    expect(captured.length).toBe(1);
    expect(captured[0]!.sunset).toBe('Sun, 09 May 2027 00:00:00 GMT');
    expect(captured[0]!.successor).toBe('https://docs.example/migration');
  });

  it('dedupes deprecation logs per (path, sunset) pair', async () => {
    const captured: DeprecationInfo[] = [];
    const { fetch: stub } = makeFetchStub(() =>
      new Response('{}', {
        status: 200,
        headers: {
          'content-type': 'application/json',
          sunset: 'Sun, 09 May 2027 00:00:00 GMT',
        },
      })
    );
    const http = new A2AHttpClient({
      baseUrl: 'https://x.test',
      bearer: 't',
      fetch: stub,
      onDeprecation: (d) => captured.push(d),
    });
    await http.request('/api/v1/legacy');
    await http.request('/api/v1/legacy');
    await http.request('/api/v1/legacy');
    expect(captured.length).toBe(1);
  });

  it('AIWG_FAIL_ON_DEPRECATED throws on first hit', async () => {
    const { fetch: stub } = makeFetchStub(() =>
      new Response('{}', {
        status: 200,
        headers: { 'content-type': 'application/json', sunset: 'Sun, 09 May 2027 00:00:00 GMT' },
      })
    );
    const http = new A2AHttpClient({
      baseUrl: 'https://x.test',
      bearer: 't',
      fetch: stub,
      failOnDeprecated: true,
    });
    await expect(http.request('/api/v1/legacy')).rejects.toThrow(/AIWG_FAIL_ON_DEPRECATED/);
  });
});
