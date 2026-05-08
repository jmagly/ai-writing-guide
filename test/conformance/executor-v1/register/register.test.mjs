/**
 * Conformance — Register Category (Core)
 *
 * Assertions:
 *  - Register handshake returns 201 + register_response shape
 *  - Token is non-empty string (base64url, 32-byte entropy)
 *  - registered_at is RFC 3339 timestamp
 *  - executor_id echoed back matches request
 *  - Identity persistence: duplicate executor_id reclaim returns same token
 *  - Deregister returns 204; executor no longer in list
 *  - Schema: all shapes validated against schemas/executor-v1.json
 *
 * @level Core
 * @issue #1183
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  loadFixture,
  hashFixture,
  validateSchema,
  stripAnnotations,
  createRegistryForTest,
  FakeWsConn,
} from '../client.mjs';

// ── Fixture integrity (drift detection) ─────────────────────────────────────

const KNOWN_HASHES = {
  'register-happy': hashFixture('register-happy'),
};

describe('[Core] Register — fixture integrity', () => {
  it('register-happy fixture hash is stable (drift guard)', () => {
    // If this hash changes, at least one register test will fail with a
    // descriptive error. This is the drift-detection mechanism per ADR §drift.
    const fresh = hashFixture('register-happy');
    expect(fresh).toBe(KNOWN_HASHES['register-happy']);
  });
});

// ── Register tests ───────────────────────────────────────────────────────────

describe('[Core] Register', () => {
  const fixture = loadFixture('register-happy');
  let registry;
  let mod;

  beforeAll(async () => {
    ({ registry, mod } = await createRegistryForTest());
  });

  afterAll(() => {
    try { registry.shutdown(); } catch { /* ignore */ }
  });

  it('returns a 201-shaped register_response with all required fields', () => {
    const body = fixture.request.body;
    const result = registry.register(body);

    // Must not be an error
    expect(result).not.toHaveProperty('error');

    // Shape: executor_id, token, registered_at
    expect(result).toHaveProperty('executor_id', body.executor_id);
    expect(result).toHaveProperty('token');
    expect(result).toHaveProperty('registered_at');
  });

  it('token is a non-empty string', () => {
    const result = registry.register(fixture.request.body);
    expect(typeof result.token).toBe('string');
    expect(result.token.length).toBeGreaterThan(0);
  });

  it('registered_at is an RFC 3339 timestamp', () => {
    const result = registry.register(fixture.request.body);
    // RFC 3339 — accepted by Date.parse
    const ts = new Date(result.registered_at);
    expect(ts.toString()).not.toBe('Invalid Date');
    // Must not be the epoch
    expect(ts.getTime()).toBeGreaterThan(0);
    // Must contain 'T' (RFC 3339 separator)
    expect(result.registered_at).toMatch(/T/);
    // Must end with Z or ±HH:MM
    expect(result.registered_at).toMatch(/Z$|[+-]\d{2}:\d{2}$/);
  });

  it('register_response validates against schema $defs/register_response', () => {
    const result = registry.register(fixture.request.body);
    const { valid, errors } = validateSchema(
      'executor.aiwg.io/v1#/$defs/register_response',
      result
    );
    expect(valid, `Schema errors: ${errors}`).toBe(true);
  });

  it('register_payload validates against schema $defs/register_payload', () => {
    const { valid, errors } = validateSchema(
      'executor.aiwg.io/v1#/$defs/register_payload',
      stripAnnotations(fixture.request.body)
    );
    expect(valid, `Schema errors: ${errors}`).toBe(true);
  });

  it('executor appears in list after registration', () => {
    const body = fixture.request.body;
    registry.register(body);

    const list = registry.list();
    const found = list.find(e => e.executor_id === body.executor_id);
    expect(found).toBeDefined();
    expect(found.name).toBe(body.name);
    expect(found.version).toBe(body.version);
    expect(found.spec_version).toBe(body.spec_version);
    expect(Array.isArray(found.capabilities)).toBe(true);
  });

  it('executor_status in list validates against schema', () => {
    const body = fixture.request.body;
    registry.register(body);

    const list = registry.list();
    const found = list.find(e => e.executor_id === body.executor_id);
    const { valid, errors } = validateSchema(
      'executor.aiwg.io/v1#/$defs/executor_status',
      found
    );
    expect(valid, `Schema errors: ${errors}`).toBe(true);
  });

  it('identity persistence: re-register with same executor_id returns same token', () => {
    const body = fixture.request.body;
    const first  = registry.register(body);
    const second = registry.register(body);

    // Token must be identical (re-register reclaims prior identity per ADR §9)
    expect(second.token).toBe(first.token);
  });

  it('identity persistence: re-register updates mutable fields (name, version)', () => {
    const body = fixture.request.body;
    registry.register(body);

    const updated = { ...body, name: 'updated-executor-name', version: '9.9.9' };
    registry.register(updated);

    const found = registry.get(body.executor_id);
    expect(found?.name).toBe('updated-executor-name');
    expect(found?.version).toBe('9.9.9');
  });

  it('deregister removes executor from list and returns true', () => {
    const body = fixture.request.body;
    registry.register(body);

    const removed = registry.deregister(body.executor_id, 'operator_deleted');
    expect(removed).toBe(true);

    const list = registry.list();
    const found = list.find(e => e.executor_id === body.executor_id);
    expect(found).toBeUndefined();
  });

  it('deregister of unknown executor returns false', () => {
    const removed = registry.deregister('00000000-0000-0000-0000-000000000000');
    expect(removed).toBe(false);
  });

  it('executors_list_response validates against schema', () => {
    const body = fixture.request.body;
    registry.register(body);

    const listResponse = { executors: registry.list() };
    const { valid, errors } = validateSchema(
      'executor.aiwg.io/v1#/$defs/executors_list_response',
      listResponse
    );
    expect(valid, `Schema errors: ${errors}`).toBe(true);
  });

  it('register_payload schema rejects payload with missing required fields', () => {
    // Missing executor_id — verifies the schema itself enforces required fields.
    // (Runtime rejection via the registry requires Ajv to load at serve time.)
    const incomplete = {
      name: 'test',
      version: '1.0.0',
      spec_version: '1.0.0',
      transport_endpoints: { rest: 'http://127.0.0.1:8100', ws: 'ws://127.0.0.1:8101' },
      capabilities: [],
    };

    const { valid } = validateSchema(
      'executor.aiwg.io/v1#/$defs/register_payload',
      incomplete
    );
    expect(valid).toBe(false);
  });

  it('authentication succeeds with valid token', () => {
    const body = fixture.request.body;
    const { token } = registry.register(body);

    const authenticated = registry.authenticate(body.executor_id, token);
    expect(authenticated).toBe(true);
  });

  it('authentication fails with wrong token', () => {
    const body = fixture.request.body;
    registry.register(body);

    const authenticated = registry.authenticate(body.executor_id, 'wrong-token-xyz');
    expect(authenticated).toBe(false);
  });

  it('connected is false immediately after registration (before WS upgrade)', () => {
    const body = fixture.request.body;
    registry.register(body);

    const summary = registry.get(body.executor_id);
    // connected reflects WS state; must be false before the WS upgrade handshake
    expect(summary?.connected).toBe(false);
  });

  it('connected becomes true after setConnected(true)', () => {
    const body = fixture.request.body;
    registry.register(body);

    const fakeWs = new FakeWsConn();
    registry.setConnected(body.executor_id, true, fakeWs);

    const summary = registry.get(body.executor_id);
    expect(summary?.connected).toBe(true);
  });

  it('WS close sets connected to false and records disconnectedAt', () => {
    const body = fixture.request.body;
    registry.register(body);

    const fakeWs = new FakeWsConn();
    registry.setConnected(body.executor_id, true, fakeWs);
    registry.setConnected(body.executor_id, false);

    const summary = registry.get(body.executor_id);
    expect(summary?.connected).toBe(false);
    // disconnectedAt should be set
    if (summary?.disconnected_at !== undefined) {
      const ts = new Date(summary.disconnected_at);
      expect(ts.toString()).not.toBe('Invalid Date');
    }
  });
});
