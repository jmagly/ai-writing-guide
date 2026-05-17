// AgentCard fetch + signature verification with a TTL cache.
// Closes the runtime side of #1253; the JCS / JWS / verify primitives are in
// `src/a2a/{jcs,jws}.ts`.
//
// Per A2A §8, agents publish their card at
//   /agents/{instanceId}/.well-known/agent-card.json
// Sandbox v2 also exposes the authenticated extended card at
//   /agents/{instanceId}/v1/extendedAgentCard
// with a legacy fallback at
//   /agents/{instanceId}/v1/card.
// The card declares required + optional extensions, supported transports,
// and skills.

import { loadJwkSet, verifyAgentCardSignature, type JwkSet } from './jws.js';
import type { AgentCard } from './types.js';

export interface FetchAgentCardOptions {
  /** Pre-loaded JWKS — preferred when the JWKS path is known up-front. */
  jwks?: JwkSet;
  /** File path or URL to the JWKS. Resolved if `jwks` is not set and
   *  verification is requested. */
  jwksSource?: string;
  /** Bearer token, if the card endpoint requires one. */
  bearer?: string;
  /** Skip JWS verification (NOT recommended; reserved for bootstrap flows). */
  skipVerify?: boolean;
  /** Custom fetch implementation. */
  fetch?: typeof fetch;
  /** AbortSignal. */
  signal?: AbortSignal;
}

export interface VerifiedAgentCard {
  card: AgentCard;
  /** RFC 3339 timestamp of when this card was fetched and verified. */
  verifiedAt: string;
  /** The `kid` from the JWS header used to verify; undefined when skipVerify. */
  kid?: string;
  /** Raw bytes of the card as served (preserved for re-verification). */
  raw: string;
}

const DEFAULT_TTL_MS = 5 * 60 * 1000;

interface CachedEntry {
  verified: VerifiedAgentCard;
  expiresAt: number;
}

export class AgentCardCache {
  private readonly ttlMs: number;
  private readonly entries = new Map<string, CachedEntry>();

  constructor(ttlMs: number = DEFAULT_TTL_MS) {
    this.ttlMs = ttlMs;
  }

  get(key: string): VerifiedAgentCard | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (Date.now() >= entry.expiresAt) {
      this.entries.delete(key);
      return undefined;
    }
    return entry.verified;
  }

  set(key: string, verified: VerifiedAgentCard): void {
    this.entries.set(key, { verified, expiresAt: Date.now() + this.ttlMs });
  }

  /** Invalidate a single instance (call this on `instance state change` events). */
  invalidate(key: string): void {
    this.entries.delete(key);
  }

  clear(): void {
    this.entries.clear();
  }

  size(): number {
    return this.entries.size;
  }
}

/**
 * Fetch + verify an AgentCard. Bypasses any cache the caller may have.
 * Throws on fetch failure or signature mismatch.
 */
export async function fetchAgentCard(
  host: string,
  instanceId: string,
  opts: FetchAgentCardOptions = {}
): Promise<VerifiedAgentCard> {
  const fetchImpl = opts.fetch ?? fetch;
  const base = host.replace(/\/+$/, '');
  const encoded = encodeURIComponent(instanceId);
  const urls = [
    `${base}/agents/${encoded}/.well-known/agent-card.json`,
    `${base}/agents/${encoded}/v1/extendedAgentCard`,
    `${base}/agents/${encoded}/v1/card`,
  ];
  const headers: Record<string, string> = { accept: 'application/json' };
  if (opts.bearer) headers.authorization = `Bearer ${opts.bearer}`;

  const init: RequestInit = { method: 'GET', headers };
  if (opts.signal) init.signal = opts.signal;
  let url = urls[0];
  let resp: Response | undefined;
  for (const candidate of urls) {
    const candidateResp = await fetchImpl(candidate, init);
    if (candidateResp.status === 404 && candidate !== urls[urls.length - 1]) {
      continue;
    }
    url = candidate;
    resp = candidateResp;
    break;
  }
  if (!resp || resp.status !== 200) {
    throw new Error(`fetchAgentCard: ${url} returned ${resp?.status ?? 'no response'}`);
  }
  const raw = await resp.text();
  let card: AgentCard;
  try {
    card = JSON.parse(raw) as AgentCard;
  } catch (err) {
    throw new Error(`fetchAgentCard: invalid JSON from ${url}: ${(err as Error).message}`);
  }

  if (opts.skipVerify) {
    return { card, raw, verifiedAt: new Date().toISOString() };
  }

  let jwks = opts.jwks;
  if (!jwks) {
    if (!opts.jwksSource) {
      throw new Error('fetchAgentCard: provide `jwks` or `jwksSource` for verification');
    }
    jwks = await loadJwks(opts.jwksSource, fetchImpl, opts.signal);
  }

  // Pull the kid before verifying (verify throws on mismatch).
  const kid = (card.signatures?.[0]?.header?.['kid'] as string | undefined) ?? undefined;
  verifyAgentCardSignature(raw, jwks);
  const verified: VerifiedAgentCard = {
    card,
    raw,
    verifiedAt: new Date().toISOString(),
  };
  if (kid !== undefined) verified.kid = kid;
  return verified;
}

/**
 * Cache-aware variant: returns the cached entry when fresh, otherwise
 * fetches and stores. Cache key is `${host}|${instanceId}`.
 */
export async function fetchAgentCardCached(
  cache: AgentCardCache,
  host: string,
  instanceId: string,
  opts: FetchAgentCardOptions = {}
): Promise<VerifiedAgentCard> {
  const key = `${host}|${instanceId}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const verified = await fetchAgentCard(host, instanceId, opts);
  cache.set(key, verified);
  return verified;
}

async function loadJwks(
  source: string,
  fetchImpl: typeof fetch,
  signal: AbortSignal | undefined
): Promise<JwkSet> {
  if (/^https?:\/\//i.test(source)) {
    const init: RequestInit = { method: 'GET' };
    if (signal) init.signal = signal;
    const resp = await fetchImpl(source, init);
    if (resp.status !== 200) throw new Error(`loadJwks: ${source} returned ${resp.status}`);
    return loadJwkSet(await resp.text());
  }
  const { readFile } = await import('node:fs/promises');
  const text = await readFile(source, 'utf8');
  return loadJwkSet(text);
}

/**
 * Extract the required-set extension URIs from an AgentCard.
 * Used by A2AClient to know which `A2A-Extensions: <URI>` values to inject
 * on every mutating call (#1254).
 */
export function requiredExtensionUris(card: AgentCard): string[] {
  return (card.capabilities?.extensions ?? [])
    .filter((e) => e.required === true)
    .map((e) => e.uri);
}
