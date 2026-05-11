/**
 * JCS (RFC 8785) + JWS Ed25519 verification tests.
 *
 * Test vectors mirror agentic-sandbox-conformance internal/spec/jws_test.go
 * to confirm cross-language interop with the Rust executor's AgentCard signer.
 *
 * @source @src/a2a/jcs.ts
 * @source @src/a2a/jws.ts
 * @issue #1253
 */

import { describe, it, expect } from 'vitest';
import {
  createPrivateKey,
  generateKeyPairSync,
  sign as cryptoSign,
} from 'node:crypto';

import {
  canonicalizeJson,
  canonicalizeJsonBytes,
  canonicalizeJsonString,
} from '../../../src/a2a/jcs.js';
import {
  findJwkByKid,
  jwkThumbprint,
  loadJwkSet,
  verifyAgentCardSignature,
  verifyJwsCompact,
  type Jwk,
} from '../../../src/a2a/jws.js';

// Generate an Ed25519 keypair and return (JWK, raw 32-byte priv seed).
// Node exports raw Ed25519 keys via "jwk" format so we can lift x directly.
function makeKeypair(kid: string): { jwk: Jwk; priv: ReturnType<typeof createPrivateKey> } {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const pubJwk = publicKey.export({ format: 'jwk' }) as { x: string };
  const jwk: Jwk = {
    kty: 'OKP',
    crv: 'Ed25519',
    x: pubJwk.x,
    kid,
    alg: 'EdDSA',
  };
  return { jwk, priv: privateKey };
}

function b64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Produce a non-detached JWS Compact (same shape as the Rust signer):
// header = {"alg":"EdDSA","kid":kid}, payload = exact bytes provided.
function signCompact(priv: ReturnType<typeof createPrivateKey>, kid: string, payload: Uint8Array): string {
  const hdr = JSON.stringify({ alg: 'EdDSA', kid });
  const h = b64url(Buffer.from(hdr, 'utf8'));
  const p = b64url(Buffer.from(payload));
  const signingInput = Buffer.from(h + '.' + p, 'utf8');
  const sig = cryptoSign(null, signingInput, priv);
  return h + '.' + p + '.' + b64url(sig);
}

describe('JCS canonicalization', () => {
  it('produces deterministic output regardless of key order', () => {
    const a = canonicalizeJsonString(JSON.parse('{"b":2,"a":1,"nested":{"y":[1,2,3],"x":"hi"}}'));
    const b = canonicalizeJsonString(JSON.parse('{"a":1,"nested":{"x":"hi","y":[1,2,3]},"b":2}'));
    expect(a).toBe(b);
    expect(a).toBe('{"a":1,"b":2,"nested":{"x":"hi","y":[1,2,3]}}');
  });

  it('escapes control chars and quotes per RFC 8785 §3.2.2.2', () => {
    const out = canonicalizeJsonString(JSON.parse('{"s":"line1\\nline2\\t\\"quoted\\"","ctrl":"ab"}'));
    expect(out).toBe('{"ctrl":"ab","s":"line1\\nline2\\t\\"quoted\\""}');
  });

  it('handles the AgentCard shape with executor-style fields', () => {
    const cardJson = `{
      "protocolVersion": "0.3.0",
      "name": "agent-01",
      "url": "https://agent-01.example.test",
      "preferredTransport": "JSONRPC",
      "version": "2.0.0",
      "capabilities": {
        "streaming": true,
        "pushNotifications": true,
        "extensions": [
          { "uri": "https://agentic-sandbox.aiwg.io/extensions/runtime/v1", "required": true },
          { "uri": "https://agentic-sandbox.aiwg.io/extensions/idempotency/v1", "required": true }
        ]
      },
      "skills": [{"id":"echo","name":"Echo","tags":["demo"]}],
      "supportedInterfaces": [
        { "url": "https://agent-01.example.test", "transport": "JSONRPC" }
      ]
    }`;
    const out = canonicalizeJsonString(JSON.parse(cardJson));
    expect(out).not.toMatch(/\s/);
    // keys sorted: 'capabilities' before 'name'
    expect(out.indexOf('"capabilities"')).toBeLessThan(out.indexOf('"name"'));
    // idempotent
    expect(canonicalizeJsonString(JSON.parse(out))).toBe(out);
  });

  it('canonicalizeJsonBytes accepts Uint8Array input', () => {
    const input = new TextEncoder().encode('{"b":2,"a":1}');
    const out = new TextDecoder().decode(canonicalizeJsonBytes(input));
    expect(out).toBe('{"a":1,"b":2}');
  });

  it('rejects non-finite numbers', () => {
    expect(() => canonicalizeJson(NaN as unknown as null)).toThrow(/non-finite/);
  });
});

describe('JWS Compact Ed25519', () => {
  it('round-trips signed payload', () => {
    const { jwk, priv } = makeKeypair('test-kid-1');
    const payload = new TextEncoder().encode('{"hello":"world","n":42}');
    const jws = signCompact(priv, 'test-kid-1', payload);
    expect(() => verifyJwsCompact(jws, payload, jwk)).not.toThrow();
  });

  it('rejects tampered signature', () => {
    const { jwk, priv } = makeKeypair('test-kid-2');
    const payload = new TextEncoder().encode('{"a":1}');
    const jws = signCompact(priv, 'test-kid-2', payload);
    const parts = jws.split('.') as [string, string, string];
    const sig = Buffer.from(parts[2].replace(/-/g, '+').replace(/_/g, '/'), 'base64');
    const middle = Math.floor(sig.length / 2);
    sig[middle] = (sig[middle] as number) ^ 0x01;
    parts[2] = sig.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const tampered = parts.join('.');
    expect(() => verifyJwsCompact(tampered, payload, jwk)).toThrow(/signature verification failed/i);
  });

  it('rejects mismatched expected payload', () => {
    const { jwk, priv } = makeKeypair('test-kid-3');
    const payload = new TextEncoder().encode('{"a":1}');
    const jws = signCompact(priv, 'test-kid-3', payload);
    const wrong = new TextEncoder().encode('{"a":2}');
    expect(() => verifyJwsCompact(jws, wrong, jwk)).toThrow(/payload does not match/);
  });

  it('rejects unsupported alg', () => {
    const { jwk } = makeKeypair('k');
    const h = b64url(Buffer.from(JSON.stringify({ alg: 'RS256', kid: 'k' }), 'utf8'));
    const p = b64url(Buffer.from('payload', 'utf8'));
    const s = b64url(Buffer.from('sig', 'utf8'));
    const jws = h + '.' + p + '.' + s;
    expect(() => verifyJwsCompact(jws, new TextEncoder().encode('payload'), jwk)).toThrow(
      /unsupported JWS alg/
    );
  });

  it('rejects malformed compact (wrong segment count)', () => {
    const { jwk } = makeKeypair('k');
    expect(() => verifyJwsCompact('only.two', null, jwk)).toThrow(/3 segments/);
  });
});

describe('JWKS parsing + lookup', () => {
  it('loads a JWKS and looks up by kid', () => {
    const k1 = makeKeypair('k1').jwk;
    const k2 = makeKeypair('k2').jwk;
    const set = loadJwkSet(JSON.stringify({ keys: [k1, k2] }));
    expect(set.keys.length).toBe(2);
    expect(findJwkByKid(set, 'k2')?.kid).toBe('k2');
    expect(findJwkByKid(set, 'unknown')).toBeNull();
  });

  it('rejects empty JWKS', () => {
    expect(() => loadJwkSet('{"keys":[]}')).toThrow(/no keys/);
  });

  it('computes a stable thumbprint for Ed25519 keys', () => {
    const { jwk } = makeKeypair('tp');
    const tp1 = jwkThumbprint(jwk);
    const tp2 = jwkThumbprint(jwk);
    expect(tp1).toBe(tp2);
    expect(tp1.length).toBeGreaterThan(0);
  });
});

describe('verifyAgentCardSignature', () => {
  it('verifies a card signed over the JCS canonical form', () => {
    const { jwk, priv } = makeKeypair('card-key-1');
    const card: Record<string, unknown> = {
      protocolVersion: '0.3.0',
      name: 'agent-test',
      url: 'https://test.example/',
      capabilities: { streaming: true },
    };
    const canonical = canonicalizeJson(card as never);
    const jws = signCompact(priv, 'card-key-1', canonical);
    card['signatures'] = [
      { header: { alg: 'EdDSA', kid: 'card-key-1' }, signature: jws },
    ];
    const signedJson = JSON.stringify(card);
    expect(() => verifyAgentCardSignature(signedJson, { keys: [jwk] })).not.toThrow();

    // Tamper a top-level field.
    const tampered = { ...card, name: 'agent-MUTATED' } as Record<string, unknown>;
    expect(() => verifyAgentCardSignature(JSON.stringify(tampered), { keys: [jwk] })).toThrow(
      /payload does not match|signature verification failed/i
    );
  });

  it('rejects a card with no signatures field', () => {
    const card = '{"protocolVersion":"0.3.0","name":"x"}';
    expect(() =>
      verifyAgentCardSignature(card, { keys: [{ kty: 'OKP', crv: 'Ed25519', x: '', kid: 'k' }] })
    ).toThrow(/no 'signatures'/);
  });

  it('rejects when kid is not in JWKS', () => {
    const { priv } = makeKeypair('signer');
    const other = makeKeypair('other').jwk;
    const card: Record<string, unknown> = { name: 'x' };
    const canonical = canonicalizeJson(card as never);
    const jws = signCompact(priv, 'unknown-kid', canonical);
    card['signatures'] = [{ header: { alg: 'EdDSA', kid: 'unknown-kid' }, signature: jws }];
    expect(() =>
      verifyAgentCardSignature(JSON.stringify(card), { keys: [other] })
    ).toThrow(/no JWK matches kid/);
  });
});
