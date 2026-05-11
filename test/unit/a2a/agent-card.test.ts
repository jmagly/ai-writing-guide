/**
 * AgentCard fetch + cache tests.
 *
 * @source @src/a2a/agent-card.ts
 * @issue #1253
 */

import { describe, it, expect } from 'vitest';
import {
  generateKeyPairSync,
  sign as cryptoSign,
} from 'node:crypto';

import {
  AgentCardCache,
  fetchAgentCard,
  fetchAgentCardCached,
  requiredExtensionUris,
} from '../../../src/a2a/agent-card.js';
import { canonicalizeJson } from '../../../src/a2a/jcs.js';
import type { Jwk, JwkSet } from '../../../src/a2a/jws.js';
import type { AgentCard, JsonValue } from '../../../src/a2a/types.js';

function makeKeypair(kid: string): { jwk: Jwk; sign: (payload: Uint8Array) => string } {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const pubJwk = publicKey.export({ format: 'jwk' }) as { x: string };
  const jwk: Jwk = { kty: 'OKP', crv: 'Ed25519', x: pubJwk.x, kid, alg: 'EdDSA' };
  function b64url(buf: Buffer): string {
    return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  return {
    jwk,
    sign: (payload) => {
      const hdr = JSON.stringify({ alg: 'EdDSA', kid });
      const h = b64url(Buffer.from(hdr));
      const p = b64url(Buffer.from(payload));
      const signingInput = Buffer.from(h + '.' + p);
      const sig = cryptoSign(null, signingInput, privateKey);
      return h + '.' + p + '.' + b64url(sig);
    },
  };
}

function makeSignedCard(jwk: Jwk, sign: (p: Uint8Array) => string, extra: Record<string, JsonValue> = {}): string {
  const card: Record<string, JsonValue> = {
    protocolVersion: '0.3.0',
    name: 'agent-x',
    url: 'https://exec.test',
    version: '1.0.0',
    capabilities: {
      streaming: true,
      extensions: [
        { uri: 'https://agentic-sandbox.aiwg.io/extensions/runtime/v1', required: true },
        { uri: 'https://agentic-sandbox.aiwg.io/extensions/idempotency/v1', required: true },
        { uri: 'https://agentic-sandbox.aiwg.io/extensions/hitl-prompt/v1', required: false },
      ],
    },
    ...extra,
  };
  const canon = canonicalizeJson(card as JsonValue);
  const jws = sign(canon);
  card['signatures'] = [
    { header: { alg: 'EdDSA', kid: jwk.kid }, signature: jws } as unknown as JsonValue,
  ];
  return JSON.stringify(card);
}

describe('fetchAgentCard', () => {
  it('fetches and verifies a signed card with the supplied JWKS', async () => {
    const { jwk, sign } = makeKeypair('k1');
    const signedJson = makeSignedCard(jwk, sign);
    const stub: typeof fetch = async () =>
      new Response(signedJson, { status: 200, headers: { 'content-type': 'application/json' } });
    const verified = await fetchAgentCard('https://exec.test', 'inst-1', {
      jwks: { keys: [jwk] } as JwkSet,
      fetch: stub,
    });
    expect(verified.card.name).toBe('agent-x');
    expect(verified.kid).toBe('k1');
    expect(verified.verifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('throws when the card is tampered after signing', async () => {
    const { jwk, sign } = makeKeypair('k2');
    const signed = JSON.parse(makeSignedCard(jwk, sign)) as Record<string, unknown>;
    signed['name'] = 'agent-MUTATED';
    const tampered = JSON.stringify(signed);
    const stub: typeof fetch = async () =>
      new Response(tampered, { status: 200, headers: { 'content-type': 'application/json' } });
    await expect(
      fetchAgentCard('https://exec.test', 'inst-1', {
        jwks: { keys: [jwk] } as JwkSet,
        fetch: stub,
      })
    ).rejects.toThrow(/payload does not match|signature verification failed/i);
  });

  it('throws when the kid is not in the JWKS', async () => {
    const { jwk: signer, sign } = makeKeypair('signer');
    const { jwk: other } = makeKeypair('other');
    const signedJson = makeSignedCard(signer, sign);
    const stub: typeof fetch = async () =>
      new Response(signedJson, { status: 200, headers: { 'content-type': 'application/json' } });
    await expect(
      fetchAgentCard('https://exec.test', 'inst-1', {
        jwks: { keys: [other] } as JwkSet,
        fetch: stub,
      })
    ).rejects.toThrow(/no JWK matches kid/);
  });

  it('skipVerify returns the card without checking signatures', async () => {
    const card: AgentCard = {
      protocolVersion: '0.3.0',
      name: 'unsigned',
      url: 'https://exec.test',
      version: '1.0.0',
    };
    const stub: typeof fetch = async () =>
      new Response(JSON.stringify(card), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    const verified = await fetchAgentCard('https://exec.test', 'inst-1', {
      skipVerify: true,
      fetch: stub,
    });
    expect(verified.card.name).toBe('unsigned');
    expect(verified.kid).toBeUndefined();
  });

  it('throws on non-200 responses', async () => {
    const stub: typeof fetch = async () => new Response('not found', { status: 404 });
    await expect(
      fetchAgentCard('https://exec.test', 'inst-1', { skipVerify: true, fetch: stub })
    ).rejects.toThrow(/returned 404/);
  });
});

describe('AgentCardCache', () => {
  it('returns cached entries within TTL', async () => {
    const cache = new AgentCardCache(10_000);
    const { jwk, sign } = makeKeypair('cache-k');
    const signedJson = makeSignedCard(jwk, sign);
    let calls = 0;
    const stub: typeof fetch = async () => {
      calls++;
      return new Response(signedJson, {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    };
    await fetchAgentCardCached(cache, 'https://exec.test', 'inst-1', {
      jwks: { keys: [jwk] } as JwkSet,
      fetch: stub,
    });
    await fetchAgentCardCached(cache, 'https://exec.test', 'inst-1', {
      jwks: { keys: [jwk] } as JwkSet,
      fetch: stub,
    });
    expect(calls).toBe(1);
  });

  it('refetches after explicit invalidate', async () => {
    const cache = new AgentCardCache(10_000);
    const { jwk, sign } = makeKeypair('cache-k');
    const signedJson = makeSignedCard(jwk, sign);
    let calls = 0;
    const stub: typeof fetch = async () => {
      calls++;
      return new Response(signedJson, {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    };
    await fetchAgentCardCached(cache, 'https://exec.test', 'inst-1', {
      jwks: { keys: [jwk] } as JwkSet,
      fetch: stub,
    });
    cache.invalidate('https://exec.test|inst-1');
    await fetchAgentCardCached(cache, 'https://exec.test', 'inst-1', {
      jwks: { keys: [jwk] } as JwkSet,
      fetch: stub,
    });
    expect(calls).toBe(2);
  });

  it('expires entries after TTL', async () => {
    const cache = new AgentCardCache(1); // 1ms
    const { jwk, sign } = makeKeypair('cache-k');
    const signedJson = makeSignedCard(jwk, sign);
    let calls = 0;
    const stub: typeof fetch = async () => {
      calls++;
      return new Response(signedJson, {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    };
    await fetchAgentCardCached(cache, 'https://exec.test', 'inst-1', {
      jwks: { keys: [jwk] } as JwkSet,
      fetch: stub,
    });
    await new Promise((r) => setTimeout(r, 5));
    await fetchAgentCardCached(cache, 'https://exec.test', 'inst-1', {
      jwks: { keys: [jwk] } as JwkSet,
      fetch: stub,
    });
    expect(calls).toBe(2);
  });
});

describe('requiredExtensionUris', () => {
  it('returns only required: true extensions', () => {
    const card: AgentCard = {
      protocolVersion: '0.3.0',
      name: 'x',
      url: 'https://x',
      version: '1',
      capabilities: {
        extensions: [
          { uri: 'a', required: true },
          { uri: 'b', required: false },
          { uri: 'c', required: true },
        ],
      },
    };
    expect(requiredExtensionUris(card)).toEqual(['a', 'c']);
  });

  it('returns [] when capabilities/extensions absent', () => {
    expect(requiredExtensionUris({ protocolVersion: '0', name: 'x', url: '', version: '' })).toEqual([]);
  });
});
