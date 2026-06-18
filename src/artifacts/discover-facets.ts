/**
 * Discover facets — curated feature→capability fusion layer (#1623).
 *
 * The capability index (hybrid BM25 + dense) is near-optimal for a ~400-item
 * corpus, but bare domain words ("persona", "expansion") and feature-intent
 * phrases ("author an expansion", "scaffold a project") have weak lexical
 * scent: generic artifacts that merely contain the word out-rank the artifacts
 * that actually OWN the feature. This module adds a small, curated set of
 * **facets** that map feature intents to their owning capabilities and fuses
 * that signal into the single-pass `aiwg discover` ranking (reciprocal-rank
 * spirit: a second ranker combined by max-floor + injection).
 *
 * This is the *single-pass fused* form the ADR ships for #1623. The parallel
 * multi-vector fan-out over these same facets is the deferred #1626 work — the
 * facet table here is the shared contract both consume, so #1626 reuses
 * `DISCOVER_FACETS` rather than redefining domains.
 *
 * Design notes:
 *  - Facets are *curated*, not learned — appropriate at this corpus size and
 *    portable across all 10 providers (no embedding store, no fine-tuned
 *    router). See `.aiwg/architecture/adr-steward-feature-discoverability.md`.
 *  - Mapped capabilities are matched against an entry's canonical `name`
 *    (falling back to the path basename / parent-dir slug), so the table lists
 *    names — not paths — and survives bundle moves.
 *  - Activation strength tiers the score floor so an exact domain-word query
 *    ("persona") sorts the owning domain to the very top (above generic
 *    capped-at-1.0 substring matches, mirroring the exact-name 1.001 floor in
 *    query-engine), while looser token-overlap activations apply a gentler
 *    floor that lifts the domain into the top-K without dominating.
 *
 * @implements #1623 (U3)
 */

import type { MetadataEntry } from './types.js';

export type FacetKind =
  | 'feature-domain'
  | 'persona-identity'
  | 'authoring-surface'
  | 'provider-capability';

export interface FacetEntry {
  /** Which facet this entry belongs to (for fan-out weighting in #1626). */
  facet: FacetKind;
  /** Human label for diagnostics / `aiwg index status` surfacing. */
  label: string;
  /**
   * Lowercase intent phrases. A query activates this entry when it exactly
   * equals an intent, contains one (or is contained by one), or — for
   * multi-word intents — overlaps a majority of the intent's tokens.
   */
  intents: string[];
  /**
   * Canonical capability names this intent maps to (matched against
   * `entry.name`, then path basename / parent-dir slug).
   */
  capabilities: string[];
}

/**
 * The curated facet table. Kept deliberately small and legible — it is a
 * routing index, not a knowledge base. Guarded by the discover acceptance
 * test (canonical phrases must rank their targets top-3) and the
 * metadata-completeness lint (empty triggers cannot recur).
 */
export const DISCOVER_FACETS: FacetEntry[] = [
  {
    facet: 'authoring-surface',
    label: 'Expansion authoring (extension / addon / framework)',
    intents: [
      'expansion',
      'author an expansion',
      'build an expansion',
      'create an expansion',
      'new expansion',
      'build an extension',
      'create an extension',
      'author an extension',
      'create an addon',
      'author an addon',
      'build an addon',
      'scaffold a framework',
      'author a framework',
      'create a framework',
      'extension authoring',
      'addon authoring',
      'framework authoring',
    ],
    capabilities: ['scaffold-extension', 'scaffold-addon', 'scaffold-framework'],
  },
  {
    facet: 'persona-identity',
    label: 'Persona / SOUL identity (author and select)',
    intents: [
      'persona',
      'soul',
      'identity',
      'create a persona',
      'author a soul',
      'make an identity profile',
      'new persona',
      'generate soul',
      'select a persona',
      'choose a persona',
      'switch persona',
      'pick an identity',
      'character sheet',
      'persona authoring',
    ],
    capabilities: [
      'soul-create',
      'soul-apply',
      'soul-enable',
      'aiwg-writer',
      'aiwg-orchestrator',
      'aiwg-reviewer',
      'aiwg-security',
      'aiwg-finder',
      'aiwg-steward',
      'mc-conductor',
    ],
  },
  {
    facet: 'feature-domain',
    label: 'Project creation (aiwg new + project-local bundles)',
    intents: [
      'scaffold a project',
      'create a project',
      'new project',
      'aiwg new',
      'project scaffolding',
      'project-local bundle',
      'start a project',
      'bootstrap a project',
    ],
    capabilities: ['new-project', 'new-bundle'],
  },
  {
    facet: 'provider-capability',
    label: 'Provider capability routing (native vs emulated)',
    intents: [
      'provider support',
      'does my provider support',
      'native support',
      'provider capability',
      'what does my provider support',
      'emulation fallback',
      'is this supported natively',
    ],
    capabilities: ['steward', 'aiwg-steward'],
  },
];

/** Normalize a phrase/name for comparison (lowercase, collapse separators). */
function norm(s: string): string {
  return s.toLowerCase().replace(/[\s_-]+/g, ' ').trim();
}

/** The score floor a facet activation guarantees for its capabilities. */
const FLOOR_EXACT = 1.0005; // above generic capped-1.0, below exact-name 1.001
const FLOOR_STRONG = 0.9; // substring either direction
const FLOOR_OVERLAP = 0.6; // majority token overlap on a multi-word intent

/**
 * Compute the strongest activation floor for `phrase` against a facet entry.
 * Returns 0 when the entry does not activate.
 */
function activationFloor(phrase: string, entry: FacetEntry): number {
  const p = norm(phrase);
  if (!p) return 0;
  const pTokens = p.split(' ').filter(Boolean);
  let best = 0;
  for (const raw of entry.intents) {
    const intent = norm(raw);
    if (!intent) continue;
    if (p === intent) return FLOOR_EXACT; // can't beat exact
    if (p.includes(intent) || intent.includes(p)) {
      best = Math.max(best, FLOOR_STRONG);
      continue;
    }
    const iTokens = intent.split(' ').filter(Boolean);
    if (iTokens.length > 1 && pTokens.length > 0) {
      const hits = iTokens.filter((t) => pTokens.includes(t)).length;
      if (hits >= Math.ceil(iTokens.length / 2)) {
        best = Math.max(best, FLOOR_OVERLAP);
      }
    }
  }
  return best;
}

/** Does a candidate entry correspond to a mapped capability name? */
function entryMatchesCapability(entry: MetadataEntry, capability: string): boolean {
  const cap = norm(capability);
  if (entry.name && norm(entry.name) === cap) return true;
  // Fall back to path-derived identity (skills: <name>/SKILL.md; agents: <name>.md).
  const path = entry.path || '';
  const base = path.replace(/\\/g, '/').split('/').filter(Boolean);
  if (base.length === 0) return false;
  const file = base[base.length - 1];
  const parent = base.length >= 2 ? base[base.length - 2] : '';
  if (file === 'SKILL.md') return norm(parent) === cap;
  return norm(file.replace(/\.[^.]+$/, '')) === cap;
}

/**
 * Per-facet (and base-ranker) weights for the RRF fusion (#1626). Tunable so
 * operators can bias the fan-out — e.g. dial down provider-capability when a
 * project never asks provider questions. Defaults preserve the #1623 ranking.
 */
export interface FacetWeights {
  /** Weight of the base lexical ranker in the fusion. */
  base: number;
  /** Per-facet-kind weights (missing kinds default to 1.0). */
  facets: Partial<Record<FacetKind, number>>;
}

export const DEFAULT_FACET_WEIGHTS: FacetWeights = {
  base: 1.0,
  facets: {
    'feature-domain': 1.0,
    'persona-identity': 1.0,
    'authoring-surface': 1.0,
    // Provider-capability is a narrower router target — weight it slightly
    // lower so it informs ties without dominating feature/persona queries.
    'provider-capability': 0.75,
  },
};

/** Standard reciprocal-rank-fusion damping constant. */
const RRF_K = 60;
/**
 * Scale that maps an RRF consensus value (~0..0.05) into a sub-display
 * tiebreaker (~0..5e-7). It reorders entries WITHIN an activation-floor tier
 * by cross-vector consensus without perturbing the 2-decimal `score` the CLI
 * emits — so the #1623 score contract (and discover value-assertions) hold.
 */
const RRF_TIEBREAK_SCALE = 1e-5;

interface FacetVector {
  facet: FacetEntry;
  floor: number;
  /** Mapped capabilities present in the corpus, ranked best-first. */
  ranked: MetadataEntry[];
}

const keyOf = (e: MetadataEntry): string => e.path || e.name || e.title;

/**
 * Rank one facet's mapped, present capabilities for `phrase` — a single
 * "vector" in the multi-vector fan-out (#1626). Returns null when the facet
 * does not activate. Async so the caller can fan out across vectors in
 * parallel via Promise.all; the work itself is CPU-bound and deterministic.
 */
async function rankFacetVector(
  facet: FacetEntry,
  phrase: string,
  candidates: MetadataEntry[],
  baseScoreOf: (e: MetadataEntry) => number,
): Promise<FacetVector | null> {
  const floor = activationFloor(phrase, facet);
  if (floor <= 0) return null;
  const matched: MetadataEntry[] = [];
  const seen = new Set<string>();
  for (const cap of facet.capabilities) {
    const m = candidates.find((c) => entryMatchesCapability(c, cap));
    if (!m) continue;
    const k = keyOf(m);
    if (seen.has(k)) continue;
    seen.add(k);
    matched.push(m);
  }
  // Within the vector, the most lexically-relevant owning capability leads —
  // this is the per-vector ranking RRF consumes.
  matched.sort((a, b) => baseScoreOf(b) - baseScoreOf(a));
  return { facet, floor, ranked: matched };
}

/**
 * Multi-vector facet fan-out + reciprocal-rank fusion (#1623 single-pass →
 * #1626 parallel fan-out). Fans out across the curated facet vectors in
 * parallel, fuses them with the base lexical ranker via RRF, and lifts each
 * facet-matched capability to its activation floor so it out-ranks generic
 * artifacts that merely mention the domain word.
 *
 * The fused result is a SUPERSET of the #1623 single-pass behavior (ADR
 * contract): facet-matched entries are guaranteed a place at no less than the
 * activation floor (injected if the lexical pass missed them), base-only
 * entries keep their lexical score, and RRF consensus orders entries within a
 * floor tier (so multi-facet / more-relevant capabilities sort first) without
 * changing the emitted 2-decimal score. Per-facet weighting is configurable.
 *
 * The returned list is re-sorted but NOT truncated — the caller applies limit.
 * Pure/deterministic: no IO, no mutation of inputs.
 */
export async function applyFacetFusion(
  scored: Array<{ entry: MetadataEntry; score: number }>,
  candidates: MetadataEntry[],
  phrase: string,
  weights: FacetWeights = DEFAULT_FACET_WEIGHTS,
): Promise<Array<{ entry: MetadataEntry; score: number }>> {
  const baseScore = new Map<string, number>();
  for (const r of scored) baseScore.set(keyOf(r.entry), r.score);
  const baseScoreOf = (e: MetadataEntry): number => baseScore.get(keyOf(e)) ?? 0;

  // Fan out across the facet vectors in parallel.
  const vectors = (
    await Promise.all(DISCOVER_FACETS.map((f) => rankFacetVector(f, phrase, candidates, baseScoreOf)))
  ).filter((v): v is FacetVector => v !== null);

  // RRF: combine the base ranker (the already-ordered `scored` list) with each
  // facet vector by reciprocal rank. `rrf` drives intra-tier ordering; the
  // floor lift preserves the #1623 contract.
  const rrf = new Map<string, number>();
  const bestFloor = new Map<string, number>();
  const matchedEntry = new Map<string, MetadataEntry>();

  scored.forEach((r, i) => {
    const k = keyOf(r.entry);
    rrf.set(k, (rrf.get(k) ?? 0) + weights.base / (RRF_K + i + 1));
  });
  for (const v of vectors) {
    const w = weights.facets[v.facet.facet] ?? 1.0;
    v.ranked.forEach((e, i) => {
      const k = keyOf(e);
      rrf.set(k, (rrf.get(k) ?? 0) + w / (RRF_K + i + 1));
      bestFloor.set(k, Math.max(bestFloor.get(k) ?? 0, v.floor));
      matchedEntry.set(k, e);
    });
  }

  const out = new Map<string, { entry: MetadataEntry; score: number }>();
  for (const r of scored) out.set(keyOf(r.entry), { entry: r.entry, score: r.score });
  for (const [k, floor] of bestFloor) {
    const entry = matchedEntry.get(k)!;
    const tiebreak = (rrf.get(k) ?? 0) * RRF_TIEBREAK_SCALE;
    const lifted = Math.max(baseScoreOf(entry), floor) + tiebreak;
    const existing = out.get(k);
    if (existing) existing.score = Math.max(existing.score, lifted);
    else out.set(k, { entry, score: lifted });
  }

  return Array.from(out.values()).sort((a, b) => b.score - a.score);
}
