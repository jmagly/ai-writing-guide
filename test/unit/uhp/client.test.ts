import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { UhpClient, canonicalUhpRequestDigest } from '../../../src/uhp/client.js';
import { UhpError } from '../../../src/uhp/errors.js';
import type { UhpEndpointProfile } from '../../../src/uhp/types.js';
import { UHP_VERSION } from '../../../src/uhp/types.js';

const fixtureRoot = join(process.cwd(), 'test/fixtures/uhp/2026-08-11');
const fixture = async (name: string) => JSON.parse(await readFile(join(fixtureRoot, name), 'utf8'));
const profile: UhpEndpointProfile = {
  endpoint: 'https://uhp.example', version: UHP_VERSION,
  credential: { source: 'env', name: 'UHP_TEST_TOKEN' }, experimental: true,
};

function responseJson(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), { ...init, headers: { 'Content-Type': 'application/json', 'UHP-Version': UHP_VERSION, ...init.headers } });
}

describe('UhpClient discovery and catalogues', () => {
  it('pins every request, keeps discovery unauthenticated, and accepts an empty harness list', async () => {
    const calls: Array<{ url: string; headers: Headers }> = [];
    const client = new UhpClient('test', profile, async (input, init) => {
      calls.push({ url: String(input), headers: new Headers(init?.headers) });
      return calls.length === 1 ? responseJson(await fixture('discovery.json')) : responseJson({ harnesses: [] });
    }, async () => 'super-secret');
    expect((await client.discover()).fixture_vendor_region).toBe('test');
    expect(await client.listHarnesses()).toEqual([]);
    expect(calls.every(call => call.headers.get('UHP-Version') === UHP_VERSION)).toBe(true);
    expect(calls[0]!.headers.get('Authorization')).toBeNull();
    expect(calls[1]!.headers.get('Authorization')).toBe('Bearer super-secret');
  });

  it('fails unsupported versions and contradictory conformance locally', async () => {
    const client = new UhpClient('test', profile, async () => responseJson({
      ...(await fixture('discovery.json')),
      versions: ['2099-01-01'], default_version: '2099-01-01',
    }), async () => 'secret');
    await expect(client.discover()).rejects.toMatchObject({ code: 'unsupported_protocol_version' });
  });
});

describe('UhpClient task identity and errors', () => {
  it('uses one stable idempotency key for identical canonical content', async () => {
    const keys: string[] = [];
    const client = new UhpClient('test', profile, async (_input, init) => {
      keys.push(new Headers(init?.headers).get('Idempotency-Key')!);
      return responseJson(await fixture('response.json'));
    }, async () => 'secret');
    const first = { input: 'same', metadata: { harness_id: 'chrn_fixture', z: 1, a: 2 } };
    const second = { metadata: { a: 2, z: 1, harness_id: 'chrn_fixture' }, input: 'same' };
    await client.createResponse(first);
    await client.createResponse(second);
    expect(keys[0]).toBe(keys[1]);
    expect(canonicalUhpRequestDigest(first)).toBe(canonicalUhpRequestDigest(second));
  });

  it('rejects reuse of an explicit key for changed task content', async () => {
    const client = new UhpClient('test', profile, async () => responseJson(await fixture('response.json')), async () => 'secret');
    await client.createResponse({ input: 'one' }, { idempotencyKey: 'fixed' });
    await expect(client.createResponse({ input: 'two' }, { idempotencyKey: 'fixed' })).rejects.toMatchObject({ code: 'idempotency_key_reused' });
  });

  it('retries ambiguous server failures with exactly the same idempotency key', async () => {
    const keys: string[] = [];
    let attempt = 0;
    const client = new UhpClient('test', { ...profile, limits: { maxRetries: 2 } }, async (_input, init) => {
      keys.push(new Headers(init?.headers).get('Idempotency-Key')!);
      attempt += 1;
      return attempt < 3
        ? responseJson({ error: { type: 'server_error', code: 'harness_unavailable', message: 'busy', param: null, detail: null } }, { status: 503 })
        : responseJson(await fixture('response.json'));
    }, async () => 'secret');
    expect((await client.createResponse({ input: 'retry safely' })).status).toBe('completed');
    expect(new Set(keys).size).toBe(1);
    expect(keys).toHaveLength(3);
  });

  it.each([
    [401, 'missing_credential', false], [401, 'invalid_credential', false],
    [404, 'harness_not_found', false], [404, 'response_not_found', false],
    [409, 'session_busy', true], [429, 'rate_limited', true],
    [429, 'quota_exhausted', false], [503, 'harness_unavailable', true],
  ])('maps HTTP %i / %s to a typed sanitized failure', async (status, code, retryable) => {
    const client = new UhpClient('test', profile, async () => responseJson({ error: { type: status === 401 ? 'authentication_error' : 'server_error', code, message: 'failure Bearer upstream-secret', param: null, detail: { token: 'upstream-secret' } } }, { status }), async () => 'upstream-secret');
    await expect(client.createResponse({ input: 'test' })).rejects.toMatchObject({ code, options: { retryable } });
    try { await client.createResponse({ input: 'test' }); } catch (error) { expect((error as Error).message).not.toContain('upstream-secret'); expect(JSON.stringify((error as UhpError).options.detail)).not.toContain('upstream-secret'); }
  });

  it('blocks a cross-origin redirect before forwarding credentials', async () => {
    const redirectProfile = { ...profile, trust: { allowRedirects: true, allowedHosts: ['uhp.example', 'evil.example'] } };
    const calls: string[] = [];
    const client = new UhpClient('test', redirectProfile, async (input) => {
      calls.push(String(input));
      return new Response('', { status: 307, headers: { Location: 'https://evil.example/v1/responses', 'UHP-Version': UHP_VERSION } });
    }, async () => 'secret');
    await expect(client.createResponse({ input: 'test' })).rejects.toMatchObject({ code: 'credential_redirect_blocked' });
    expect(calls).toHaveLength(1);
  });
});

describe('UhpClient continuation and cancellation', () => {
  it('preserves session harness identity for continuation', async () => {
    const requests: unknown[] = [];
    const stored = { ...(await fixture('response.json')), status: 'in_progress' };
    const client = new UhpClient('test', profile, async (_input, init) => {
      if (init?.method === 'POST') requests.push(JSON.parse(String(init.body)));
      return responseJson(init?.method === 'POST' ? await fixture('response.json') : stored);
    }, async () => 'secret');
    await client.continueResponse('resp_fixture', { input: 'continue' });
    expect(requests[0]).toMatchObject({ previous_response_id: 'resp_fixture', metadata: { harness_id: 'chrn_fixture' } });
    await expect(client.continueResponse('resp_fixture', { input: 'continue', metadata: { harness_id: 'chrn_other' } })).rejects.toMatchObject({ code: 'harness_mismatch' });
  });

  it('does not claim cancellation merely because a cancel request was sent', async () => {
    const running = { ...(await fixture('response.json')), status: 'in_progress' };
    const client = new UhpClient('test', profile, async () => responseJson(running), async () => 'secret');
    expect((await client.cancelResponse('resp_fixture')).status).toBe('in_progress');
  });

  it('uses a stored response as authoritative reconciliation after stream loss', async () => {
    let calls = 0;
    const client = new UhpClient('test', profile, async (_input, init) => {
      calls += 1;
      if (init?.method === 'POST') {
        return new Response('data: {"type":"response.created","sequence_number":0,"response":{"id":"resp_fixture","object":"response","created_at":1787600000,"status":"in_progress","model":"fixture","output":[],"metadata":{}}}\n\n', { headers: { 'Content-Type': 'text/event-stream', 'UHP-Version': UHP_VERSION } });
      }
      return responseJson(await fixture('response.json'));
    }, async () => 'secret');
    const consume = async () => { for await (const _event of client.streamResponse({ input: 'x' })) { /* consume */ } };
    await expect(consume()).rejects.toMatchObject({ code: 'missing_terminal_event', options: { remoteState: 'unknown' } });
    expect((await client.reconcileUnknownResponse('resp_fixture')).status).toBe('completed');
    expect(calls).toBe(2);
  });
});
