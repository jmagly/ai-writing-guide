// JWS Compact (RFC 7515) verification with EdDSA / Ed25519 support.
// TypeScript port of agentic-sandbox-conformance/internal/spec/jws.go.
//
// The Rust signer (`agent_card::sign_agent_card` in agentic-sandbox) produces
// non-detached JWS: the middle segment IS the base64url-encoded canonical
// payload bytes. `verifyJwsCompact` cross-checks that against an
// independently-canonicalized `expectedPayload` when provided.

import { createHash, createPublicKey, verify as cryptoVerify } from 'node:crypto';

import { canonicalizeJson, type JsonValue } from './jcs.js';

export interface Jwk {
  kty: string;
  crv?: string;
  x?: string;
  kid?: string;
  alg?: string;
  use?: string;
}

export interface JwkSet {
  keys: Jwk[];
}

export function findJwkByKid(set: JwkSet | null | undefined, kid: string): Jwk | null {
  if (!set) return null;
  for (const k of set.keys) if (k.kid === kid) return k;
  return null;
}

// RFC 7638 thumbprint for OKP keys: SHA-256 over the canonical
// { crv, kty, x } object, base64url-encoded.
export function jwkThumbprint(jwk: Jwk): string {
  if (jwk.kty !== 'OKP') {
    throw new Error(`thumbprint: unsupported kty ${jwk.kty}`);
  }
  if (!jwk.crv || !jwk.x) throw new Error('thumbprint: OKP key missing crv/x');
  const canon = canonicalizeJson({ crv: jwk.crv, kty: jwk.kty, x: jwk.x } as JsonValue);
  const sum = createHash('sha256').update(canon).digest();
  return base64UrlEncode(sum);
}

export function loadJwkSet(json: string): JwkSet {
  const parsed = JSON.parse(json) as unknown;
  if (
    !parsed ||
    typeof parsed !== 'object' ||
    !Array.isArray((parsed as { keys?: unknown }).keys)
  ) {
    throw new Error('JWKS: missing keys array');
  }
  const set = parsed as JwkSet;
  if (set.keys.length === 0) throw new Error('JWKS contains no keys');
  return set;
}

interface ProtectedHeader {
  alg: string;
  kid?: string;
  typ?: string;
}

// VerifyJwsCompact verifies a JWS Compact serialization.
//
// If `expectedPayload` is provided, the embedded payload bytes must match it
// (constant-time compare). This is how the AgentCard verifier guarantees that
// the JCS-canonicalized bytes the harness computed match what was signed.
//
// Throws on any verification failure with a descriptive message.
export function verifyJwsCompact(
  jws: string,
  expectedPayload: Uint8Array | null,
  jwk: Jwk
): void {
  if (!jwk) throw new Error('verifyJwsCompact: nil JWK');
  const parts = jws.split('.');
  if (parts.length !== 3) {
    throw new Error(`verifyJwsCompact: expected 3 segments, got ${parts.length}`);
  }
  const [headerB64, payloadB64, sigB64] = parts as [string, string, string];

  let header: ProtectedHeader;
  try {
    const headerRaw = base64UrlDecode(headerB64);
    header = JSON.parse(new TextDecoder('utf-8').decode(headerRaw)) as ProtectedHeader;
  } catch (err) {
    throw new Error(`verifyJwsCompact: parse header: ${(err as Error).message}`);
  }

  let payload: Uint8Array;
  let sig: Uint8Array;
  try {
    payload = base64UrlDecode(payloadB64);
    sig = base64UrlDecode(sigB64);
  } catch (err) {
    throw new Error(`verifyJwsCompact: decode segments: ${(err as Error).message}`);
  }

  if (expectedPayload !== null) {
    if (!constantTimeEqual(payload, expectedPayload)) {
      throw new Error(
        `JWS payload does not match expected canonical bytes (got ${payload.length} bytes, want ${expectedPayload.length})`
      );
    }
  }

  const signingInput = new TextEncoder().encode(headerB64 + '.' + payloadB64);

  if (header.alg !== 'EdDSA') {
    throw new Error(`unsupported JWS alg ${header.alg} (only EdDSA supported)`);
  }
  if (jwk.kty !== 'OKP' || jwk.crv !== 'Ed25519') {
    throw new Error(
      `EdDSA: JWK is not OKP/Ed25519 (kty=${jwk.kty} crv=${jwk.crv ?? '?'})`
    );
  }
  if (!jwk.x) throw new Error('EdDSA: JWK missing x');
  const pubRaw = base64UrlDecode(jwk.x);
  if (pubRaw.length !== 32) {
    throw new Error(`EdDSA: public key wrong length ${pubRaw.length} (want 32)`);
  }
  // Node's crypto requires SPKI-wrapped Ed25519 keys. Build one from the raw
  // 32-byte X coordinate.
  const spki = wrapEd25519Spki(pubRaw);
  const key = createPublicKey({ key: spki, format: 'der', type: 'spki' });
  const ok = cryptoVerify(null, signingInput, key, sig);
  if (!ok) throw new Error('EdDSA signature verification failed');
}

// VerifyAgentCardSignature is the high-level helper: extracts signatures[0],
// strips the `signatures` field from a deep clone, JCS-canonicalizes the rest,
// looks up the JWK by kid, and verifies via verifyJwsCompact.
//
// `cardJson` is the raw JSON bytes (or string) of the AgentCard as served.
export function verifyAgentCardSignature(
  cardJson: string | Uint8Array,
  jwks: JwkSet
): void {
  const text =
    typeof cardJson === 'string' ? cardJson : new TextDecoder('utf-8').decode(cardJson);
  if (!text || text.length === 0) {
    throw new Error('verifyAgentCardSignature: empty card body');
  }
  let card: Record<string, JsonValue>;
  try {
    card = JSON.parse(text) as Record<string, JsonValue>;
  } catch (err) {
    throw new Error(`parse card JSON: ${(err as Error).message}`);
  }

  const sigsRaw = card['signatures'];
  if (sigsRaw === undefined) throw new Error("agent card has no 'signatures' field");
  if (!Array.isArray(sigsRaw) || sigsRaw.length === 0) {
    throw new Error("agent card 'signatures' is empty or not an array");
  }
  const first = sigsRaw[0] as Record<string, JsonValue> | null;
  if (!first || typeof first !== 'object') {
    throw new Error('signatures[0] is not an object');
  }
  const compact = first['signature'];
  if (typeof compact !== 'string' || !compact) {
    throw new Error('signatures[0].signature missing or not a string');
  }
  const hdr = first['header'];
  if (!hdr || typeof hdr !== 'object' || Array.isArray(hdr)) {
    throw new Error('signatures[0].header missing');
  }
  const kid = (hdr as Record<string, JsonValue>)['kid'];
  if (typeof kid !== 'string' || !kid) {
    throw new Error('signatures[0].header.kid missing');
  }

  const jwk = findJwkByKid(jwks, kid);
  if (!jwk) throw new Error(`no JWK matches kid=${kid}`);

  // Build the unsigned form.
  const unsigned: Record<string, JsonValue> = {};
  for (const [k, v] of Object.entries(card)) {
    if (k === 'signatures') continue;
    unsigned[k] = v;
  }
  const canonical = canonicalizeJson(unsigned as JsonValue);
  verifyJwsCompact(compact, canonical, jwk);
}

// ---------- internal helpers ----------

function base64UrlDecode(input: string): Uint8Array {
  // Convert base64url -> base64 and pad.
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
  return new Uint8Array(Buffer.from(b64 + pad, 'base64'));
}

function base64UrlEncode(bytes: Uint8Array): string {
  return Buffer.from(bytes)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= (a[i] as number) ^ (b[i] as number);
  }
  return diff === 0;
}

// SPKI wrapper for raw 32-byte Ed25519 public keys.
// SubjectPublicKeyInfo ::= SEQUENCE {
//   algorithm   AlgorithmIdentifier (id-Ed25519 = 1.3.101.112),
//   subjectPublicKey BIT STRING (raw 32 bytes),
// }
// Pre-computed prefix (12 bytes): 30 2a 30 05 06 03 2b 65 70 03 21 00
const ED25519_SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex');

function wrapEd25519Spki(raw: Uint8Array): Buffer {
  if (raw.length !== 32) throw new Error('Ed25519 raw key must be 32 bytes');
  return Buffer.concat([ED25519_SPKI_PREFIX, Buffer.from(raw)]);
}
