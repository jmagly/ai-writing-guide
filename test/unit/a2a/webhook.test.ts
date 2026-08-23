/**
 * Tests for the A2A push-notification webhook receiver.
 *
 * @source @src/a2a/webhook.ts
 * @issue #1256
 */

import { describe, it, expect } from 'vitest';
import { createHmac } from 'node:crypto';

import {
  parseSignatureHeader,
  verifyWebhookSignature,
  IdempotencyCache,
  PushSecretRegistry,
  handleWebhook,
} from '../../../src/a2a/webhook.js';

// ── helpers ────────────────────────────────────────────────────────────

function signBody(body: Buffer | string, secret: string, ts: number): string {
  const payload = `${ts}.${typeof body === 'string' ? body : body.toString('utf8')}`;
  const mac = createHmac('sha256', secret).update(payload).digest('hex');
  return `t=${ts},v1=${mac}`;
}

// ── parseSignatureHeader ──────────────────────────────────────────────

describe('parseSignatureHeader', () => {
  it('parses t and v1 fields', () => {
    const parsed = parseSignatureHeader('t=1700000000,v1=deadbeef');
    expect(parsed).toEqual({ timestamp: 1700000000, v1: ['deadbeef'] });
  });

  it('accepts multiple v1 entries (key rotation)', () => {
    const parsed = parseSignatureHeader('t=1700000000,v1=aa,v1=bb');
    expect(parsed).toEqual({ timestamp: 1700000000, v1: ['aa', 'bb'] });
  });

  it('ignores unknown keys for forward compat', () => {
    const parsed = parseSignatureHeader('t=1700000000,v1=aa,v2=future');
    expect(parsed).toEqual({ timestamp: 1700000000, v1: ['aa'] });
  });

  it('returns null on malformed input', () => {
    expect(parseSignatureHeader('garbage')).toBeNull();
    expect(parseSignatureHeader('t=notanumber,v1=aa')).toBeNull();
    expect(parseSignatureHeader('t=1,v1=NOT_HEX')).toBeNull();
  });

  it('returns null without t or v1', () => {
    expect(parseSignatureHeader('v1=aa')).toBeNull();
    expect(parseSignatureHeader('t=1700000000')).toBeNull();
  });
});

// ── verifyWebhookSignature ────────────────────────────────────────────

describe('verifyWebhookSignature', () => {
  const secret = 'super-secret-key-32-bytes';
  const ts = Math.floor(Date.now() / 1000);
  const body = Buffer.from('{"event":"task-state","task":{"id":"t1"}}', 'utf8');
  const lookupSecret = () => secret;

  it('accepts a correctly signed body', async () => {
    const sig = signBody(body, secret, ts);
    const result = await verifyWebhookSignature(sig, body, 'cfg-1', { lookupSecret });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.timestamp).toBe(ts);
  });

  it('rejects a tampered body', async () => {
    const sig = signBody(body, secret, ts);
    const tampered = Buffer.from('{"event":"task-state","task":{"id":"t9"}}', 'utf8');
    const result = await verifyWebhookSignature(sig, tampered, 'cfg-1', { lookupSecret });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('signature_mismatch');
  });

  it('rejects a signature signed with a different secret', async () => {
    const sig = signBody(body, 'wrong-secret', ts);
    const result = await verifyWebhookSignature(sig, body, 'cfg-1', { lookupSecret });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('signature_mismatch');
  });

  it('rejects a timestamp outside the tolerance window', async () => {
    const stale = ts - 3600; // 1 hour ago
    const sig = signBody(body, secret, stale);
    const result = await verifyWebhookSignature(sig, body, 'cfg-1', {
      lookupSecret,
      toleranceSeconds: 300,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('timestamp_skew');
  });

  it('accepts a timestamp within tolerance', async () => {
    const recent = ts - 200; // 3.3 minutes ago, within 5 minute tolerance
    const sig = signBody(body, secret, recent);
    const result = await verifyWebhookSignature(sig, body, 'cfg-1', {
      lookupSecret,
      toleranceSeconds: 300,
    });
    expect(result.ok).toBe(true);
  });

  it('rejects when the signature header is missing', async () => {
    const result = await verifyWebhookSignature(undefined, body, 'cfg-1', { lookupSecret });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('signature_missing');
  });

  it('rejects when the configId has no registered secret', async () => {
    const sig = signBody(body, secret, ts);
    const result = await verifyWebhookSignature(sig, body, 'cfg-unknown', {
      lookupSecret: () => null,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('secret_unknown');
  });

  it('accepts a multi-v1 header where any signature matches (key rotation)', async () => {
    const oldMac = createHmac('sha256', 'old-secret').update(`${ts}.${body}`).digest('hex');
    const newMac = createHmac('sha256', secret).update(`${ts}.${body}`).digest('hex');
    const sig = `t=${ts},v1=${oldMac},v1=${newMac}`;
    const result = await verifyWebhookSignature(sig, body, 'cfg-1', { lookupSecret });
    expect(result.ok).toBe(true);
  });
});

// ── IdempotencyCache ──────────────────────────────────────────────────

describe('IdempotencyCache', () => {
  it('returns true for first sighting, false thereafter', () => {
    const cache = new IdempotencyCache(100);
    expect(cache.markFresh('evt-1')).toBe(true);
    expect(cache.markFresh('evt-1')).toBe(false);
    expect(cache.markFresh('evt-1')).toBe(false);
  });

  it('treats distinct ids independently', () => {
    const cache = new IdempotencyCache(100);
    expect(cache.markFresh('a')).toBe(true);
    expect(cache.markFresh('b')).toBe(true);
    expect(cache.markFresh('a')).toBe(false);
    expect(cache.markFresh('b')).toBe(false);
  });

  it('evicts oldest entries when capacity exceeded', () => {
    const cache = new IdempotencyCache(16); // capacity floor is 16
    for (let i = 0; i < 20; i++) {
      cache.markFresh(`id-${i}`);
    }
    // Earliest entries are now evicted and would be considered fresh again.
    expect(cache.markFresh('id-0')).toBe(true);
    // Recent entries are still cached.
    expect(cache.markFresh('id-19')).toBe(false);
  });
});

// ── handleWebhook ─────────────────────────────────────────────────────

describe('handleWebhook', () => {
  const secret = 'webhook-secret-32-bytes-long-abc';
  const ts = Math.floor(Date.now() / 1000);

  function setup() {
    const registry = new PushSecretRegistry();
    registry.register({
      configId: 'cfg-1',
      secret,
      missionId: 'm-1',
      taskId: 't-1',
    });
    const routed: Array<{ configId: string; event: unknown }> = [];
    return {
      registry,
      idempotency: new IdempotencyCache(),
      route: (entry: { configId: string }, event: unknown) => {
        routed.push({ configId: entry.configId, event });
      },
      routed,
    };
  }

  it('happy path: signed payload, fresh event-id, returns 200', async () => {
    const ctx = setup();
    const bodyStr = '{"kind":"task-state","task":{"id":"t-1","status":{"state":"working"}}}';
    const body = Buffer.from(bodyStr, 'utf8');
    const sig = signBody(body, secret, ts);
    const result = await handleWebhook('cfg-1', body, sig, 'evt-1', ctx);
    expect(result.status).toBe(200);
    expect(result.body['ok']).toBe(true);
    expect(ctx.routed).toHaveLength(1);
  });

  it('returns 400 when configId is missing', async () => {
    const ctx = setup();
    const result = await handleWebhook('', Buffer.from('{}'), 't=1,v1=aa', 'evt-1', ctx);
    expect(result.status).toBe(400);
    expect(result.body['code']).toBe('aiwg.webhook_config_missing');
  });

  it('returns 400 when event-id is missing', async () => {
    const ctx = setup();
    const result = await handleWebhook('cfg-1', Buffer.from('{}'), 't=1,v1=aa', undefined, ctx);
    expect(result.status).toBe(400);
    expect(result.body['code']).toBe('aiwg.webhook_event_id_missing');
  });

  it('returns 401 on bad signature', async () => {
    const ctx = setup();
    const result = await handleWebhook(
      'cfg-1',
      Buffer.from('{}'),
      `t=${ts},v1=deadbeef`,
      'evt-1',
      ctx
    );
    expect(result.status).toBe(401);
    expect(result.body['code']).toBe('aiwg.webhook_signature_mismatch');
  });

  it('returns 404 when configId is unknown', async () => {
    const ctx = setup();
    const body = Buffer.from('{}', 'utf8');
    const sig = signBody(body, secret, ts);
    const result = await handleWebhook('cfg-unknown', body, sig, 'evt-1', ctx);
    expect(result.status).toBe(404);
    expect(result.body['code']).toBe('aiwg.webhook_secret_unknown');
  });

  it('returns 401 with timestamp_skew code for stale timestamps', async () => {
    const ctx = setup();
    const stale = ts - 3600;
    const body = Buffer.from('{}', 'utf8');
    const sig = signBody(body, secret, stale);
    const result = await handleWebhook('cfg-1', body, sig, 'evt-1', ctx);
    expect(result.status).toBe(401);
    expect(result.body['code']).toBe('aiwg.webhook_timestamp_skew');
  });

  it('dedupes by event-id: second delivery returns 200 deduped=true', async () => {
    const ctx = setup();
    const bodyStr = '{"kind":"status-update","taskId":"t-1","status":{"state":"working"}}';
    const body = Buffer.from(bodyStr, 'utf8');
    const sig = signBody(body, secret, ts);
    const first = await handleWebhook('cfg-1', body, sig, 'evt-dup', ctx);
    expect(first.status).toBe(200);
    expect(first.body['deduped']).toBeUndefined();
    const second = await handleWebhook('cfg-1', body, sig, 'evt-dup', ctx);
    expect(second.status).toBe(200);
    expect(second.body['deduped']).toBe(true);
    expect(ctx.routed).toHaveLength(1);
  });

  it('accepts a signed 1.0 wrapper only with the 1.0 media type', async () => {
    const registry = new PushSecretRegistry();
    registry.register({ configId: 'cfg-v1', secret, taskId: 't-v1', protocolVersion: '1.0' });
    const routed: unknown[] = [];
    const ctx = {
      registry,
      idempotency: new IdempotencyCache(),
      route: (_entry: unknown, event: unknown) => { routed.push(event); },
      contentType: 'application/a2a+json; charset=utf-8',
    };
    const body = Buffer.from(JSON.stringify({
      statusUpdate: {
        taskId: 't-v1',
        contextId: 'ctx-v1',
        status: { state: 'TASK_STATE_WORKING' },
      },
    }));
    const sig = signBody(body, secret, ts);
    const result = await handleWebhook('cfg-v1', body, sig, 'evt-v1', ctx);
    expect(result.status).toBe(200);
    expect(routed).toEqual([expect.objectContaining({ type: 'status', protocolVersion: '1.0' })]);

    const wrongMedia = await handleWebhook('cfg-v1', body, sig, 'evt-v1-media', {
      ...ctx,
      contentType: 'application/json',
    });
    expect(wrongMedia.status).toBe(415);
  });

  it('rejects invalid 1.0 unions and cross-task events without consuming the event id', async () => {
    const registry = new PushSecretRegistry();
    registry.register({ configId: 'cfg-v1', secret, taskId: 't-v1', protocolVersion: '1.0' });
    const ctx = {
      registry,
      idempotency: new IdempotencyCache(),
      route: () => undefined,
      contentType: 'application/a2a+json',
    };
    const invalid = Buffer.from(JSON.stringify({
      task: { id: 't-v1', status: { state: 'TASK_STATE_WORKING' } },
      message: { messageId: 'm', role: 'ROLE_AGENT', parts: [{ text: 'x' }] },
    }));
    expect((await handleWebhook('cfg-v1', invalid, signBody(invalid, secret, ts), 'evt-retry', ctx)).status)
      .toBe(400);

    const valid = Buffer.from(JSON.stringify({
      task: { id: 't-v1', status: { state: 'TASK_STATE_WORKING' } },
    }));
    expect((await handleWebhook('cfg-v1', valid, signBody(valid, secret, ts), 'evt-retry', ctx)).status)
      .toBe(200);

    const crossTask = Buffer.from(JSON.stringify({
      statusUpdate: {
        taskId: 'other', contextId: 'ctx-v1', status: { state: 'TASK_STATE_WORKING' },
      },
    }));
    const result = await handleWebhook(
      'cfg-v1', crossTask, signBody(crossTask, secret, ts), 'evt-cross', ctx
    );
    expect(result.status).toBe(400);
    expect(result.body['code']).toBe('aiwg.webhook_event_invalid');
  });

  it('rejects a valid task event attributed to a different configured owner', async () => {
    const registry = new PushSecretRegistry();
    registry.register({
      configId: 'cfg-owner',
      secret,
      taskId: 't-owner',
      protocolVersion: '1.0',
      taskOwner: 'tenant-a',
    });
    const body = Buffer.from(JSON.stringify({
      task: {
        id: 't-owner',
        status: { state: 'TASK_STATE_WORKING' },
        metadata: { tenant_id: 'tenant-b' },
      },
    }));
    const result = await handleWebhook(
      'cfg-owner', body, signBody(body, secret, ts), 'evt-owner', {
        registry,
        idempotency: new IdempotencyCache(),
        route: () => undefined,
        contentType: 'Application/A2A+JSON',
      }
    );
    expect(result.status).toBe(400);
    expect(result.body['code']).toBe('aiwg.webhook_event_invalid');
    expect(result.body['detail']).toMatch(/tenant-b.*tenant-a/);
  });

  it('scopes duplicate ids by config and returns retryable conflict for concurrent delivery', async () => {
    const registry = new PushSecretRegistry();
    registry.register({ configId: 'cfg-a', secret, taskId: 't-1' });
    registry.register({ configId: 'cfg-b', secret, taskId: 't-1' });
    let releaseRoute!: () => void;
    const routeGate = new Promise<void>((resolve) => { releaseRoute = resolve; });
    const idempotency = new IdempotencyCache();
    const body = Buffer.from('{"kind":"status-update","taskId":"t-1","status":{"state":"working"}}');
    const sig = signBody(body, secret, ts);
    const first = handleWebhook('cfg-a', body, sig, 'shared', {
      registry,
      idempotency,
      route: async () => routeGate,
    });
    await Promise.resolve();
    const concurrent = await handleWebhook('cfg-a', body, sig, 'shared', {
      registry,
      idempotency,
      route: () => undefined,
    });
    expect(concurrent.status).toBe(409);
    releaseRoute();
    expect((await first).status).toBe(200);
    expect((await handleWebhook('cfg-b', body, sig, 'shared', {
      registry,
      idempotency,
      route: () => undefined,
    })).status).toBe(200);
  });

  it('returns 400 when body is not JSON', async () => {
    const ctx = setup();
    const body = Buffer.from('not json at all', 'utf8');
    const sig = signBody(body, secret, ts);
    const result = await handleWebhook('cfg-1', body, sig, 'evt-1', ctx);
    expect(result.status).toBe(400);
    expect(result.body['code']).toBe('aiwg.webhook_body_not_json');
  });

  it('returns 500 when the route callback throws', async () => {
    const registry = new PushSecretRegistry();
    registry.register({ configId: 'cfg-1', secret, missionId: 'm-1' });
    const failingCtx = {
      registry,
      idempotency: new IdempotencyCache(),
      route: () => {
        throw new Error('mission state not initialized');
      },
    };
    const body = Buffer.from('{"kind":"status-update","taskId":"t-1","status":{"state":"working"}}', 'utf8');
    const sig = signBody(body, secret, ts);
    const result = await handleWebhook('cfg-1', body, sig, 'evt-route-fail', failingCtx);
    expect(result.status).toBe(500);
    expect(result.body['code']).toBe('aiwg.webhook_route_failed');
  });
});
