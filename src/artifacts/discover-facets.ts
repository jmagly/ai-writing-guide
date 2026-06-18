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
 * Fuse the curated facets into a scored result set (single pass, #1623).
 *
 * For every facet the query activates, each mapped capability present in the
 * candidate corpus is guaranteed a place in the results at no less than the
 * activation floor (injected if the lexical pass missed it, lifted if it
 * scored lower). Existing higher scores are preserved. The returned list is
 * re-sorted but NOT truncated — the caller applies its own `limit`.
 *
 * Pure and deterministic: no IO, no mutation of inputs.
 */
export function applyFacetFusion(
  scored: Array<{ entry: MetadataEntry; score: number }>,
  candidates: MetadataEntry[],
  phrase: string,
): Array<{ entry: MetadataEntry; score: number }> {
  // Map current results by a stable key for in-place lifting.
  const keyOf = (e: MetadataEntry): string => e.path || e.name || e.title;
  const byKey = new Map<string, { entry: MetadataEntry; score: number }>();
  for (const r of scored) byKey.set(keyOf(r.entry), r);

  for (const facet of DISCOVER_FACETS) {
    const floor = activationFloor(phrase, facet);
    if (floor <= 0) continue;
    for (const capability of facet.capabilities) {
      const match = candidates.find((c) => entryMatchesCapability(c, capability));
      if (!match) continue; // capability not installed/indexed in this workspace
      const key = keyOf(match);
      const existing = byKey.get(key);
      if (existing) {
        if (floor > existing.score) existing.score = floor;
      } else {
        const injected = { entry: match, score: floor };
        byKey.set(key, injected);
      }
    }
  }

  return Array.from(byKey.values()).sort((a, b) => b.score - a.score);
}
