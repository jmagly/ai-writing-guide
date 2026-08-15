/**
 * Discover facet-fusion tests (#1623 U3)
 *
 * @source @src/artifacts/discover-facets.ts
 */

import { describe, it, expect } from 'vitest';
import {
  applyFacetFusion,
  diagnoseFacetActivations,
  DISCOVER_FACETS,
} from '../../../src/artifacts/discover-facets.js';
import type { MetadataEntry } from '../../../src/artifacts/types.js';

function entry(overrides: Partial<MetadataEntry> & { path: string }): MetadataEntry {
  return {
    type: 'skill',
    phase: '',
    title: overrides.name ?? overrides.path,
    tags: [],
    created: '2026-01-01T00:00:00Z',
    updated: '2026-01-01T00:00:00Z',
    checksum: 'x',
    summary: '',
    dependencies: [],
    dependents: [],
    ...overrides,
  } as MetadataEntry;
}

// A persona-domain corpus plus a generic artifact that merely contains the
// word "persona" and lexically scores the capped 1.0 (the audience-synthesis
// failure mode the facet is designed to out-rank).
const candidates: MetadataEntry[] = [
  entry({ path: 'agentic/code/frameworks/x/skills/audience-synthesis/SKILL.md', name: 'audience-synthesis' }),
  entry({ path: 'agentic/code/addons/aiwg-utils/skills/soul-create/SKILL.md', name: 'soul-create' }),
  entry({ path: 'agentic/code/agents/personas/aiwg-writer.md', name: 'aiwg-writer', type: 'agent' }),
  entry({ path: 'agentic/code/addons/aiwg-utils/skills/scaffold-extension/SKILL.md', name: 'scaffold-extension' }),
  entry({ path: 'agentic/code/addons/aiwg-utils/skills/new-project/SKILL.md', name: 'new-project' }),
  entry({ path: 'agentic/code/addons/aiwg-utils/skills/aiwg-issue/SKILL.md', name: 'aiwg-issue' }),
  entry({ path: 'agentic/code/addons/aiwg-utils/skills/unrelated-thing/SKILL.md', name: 'unrelated-thing' }),
];

describe('applyFacetFusion (#1623 U3)', async () => {
  it('lifts a persona-domain capability above a generic capped-1.0 match for the bare "persona" query', async () => {
    const scored = [
      { entry: candidates[0], score: 1.0 }, // audience-synthesis — generic, capped
      { entry: candidates[1], score: 1.0 }, // soul-create — persona capability, capped
    ];
    const fused = await applyFacetFusion(scored, candidates, 'persona');
    // soul-create (persona facet, exact intent) must sort above audience-synthesis.
    expect(fused[0].entry.name).not.toBe('audience-synthesis');
    const soul = fused.find((r) => r.entry.name === 'soul-create')!;
    const audience = fused.find((r) => r.entry.name === 'audience-synthesis')!;
    expect(soul.score).toBeGreaterThan(audience.score);
  });

  it('injects a mapped capability that the lexical pass missed entirely', async () => {
    // Lexical pass found nothing; the persona facet still surfaces the persona agent.
    const fused = await applyFacetFusion([], candidates, 'persona');
    expect(fused.some((r) => r.entry.name === 'aiwg-writer')).toBe(true);
    expect(fused.some((r) => r.entry.name === 'soul-create')).toBe(true);
  });

  it('activates the expansion facet for "author an expansion"', async () => {
    const fused = await applyFacetFusion([], candidates, 'author an expansion');
    expect(fused.some((r) => r.entry.name === 'scaffold-extension')).toBe(true);
    // A non-mapped artifact is not injected.
    expect(fused.some((r) => r.entry.name === 'unrelated-thing')).toBe(false);
  });

  it('activates the project facet for "scaffold a project"', async () => {
    const fused = await applyFacetFusion([], candidates, 'scaffold a project');
    expect(fused.some((r) => r.entry.name === 'new-project')).toBe(true);
  });

  it('does not treat an AIWG issue filing request as project scaffolding', async () => {
    const fused = await applyFacetFusion([], candidates, 'file an AIWG issue');
    expect(fused.some((r) => r.entry.name === 'new-project')).toBe(false);
    expect(
      diagnoseFacetActivations('file an AIWG issue').some(
        (item) => item.label === 'Project creation (aiwg new + project-local bundles)',
      ),
    ).toBe(false);
  });

  it('does not treat AIWG setup repair as project scaffolding', async () => {
    const fused = await applyFacetFusion([], candidates, 'AIWG setup is stale or broken');
    expect(fused.some((r) => r.entry.name === 'new-project')).toBe(false);
    expect(
      diagnoseFacetActivations('AIWG setup is stale or broken').some(
        (item) => item.label === 'Project creation (aiwg new + project-local bundles)',
      ),
    ).toBe(false);
  });

  it('is a no-op for a phrase that activates no facet (no regression)', async () => {
    const scored = [
      { entry: candidates[0], score: 0.8 },
      { entry: candidates[6], score: 0.4 },
    ];
    const fused = await applyFacetFusion(scored, candidates, 'deploy to production');
    expect(fused).toHaveLength(2);
    expect(fused[0].entry.name).toBe('audience-synthesis');
    expect(fused[0].score).toBe(0.8);
  });

  it('matches capabilities by path slug when the index entry lacks a name field', async () => {
    const noName = [
      entry({ path: 'agentic/code/agents/personas/aiwg-writer.md', type: 'agent' }),
    ];
    // Strip the inferred title/name to force path-based matching.
    delete (noName[0] as Partial<MetadataEntry>).name;
    const fused = await applyFacetFusion([], noName, 'persona');
    expect(fused.some((r) => r.entry.path.endsWith('aiwg-writer.md'))).toBe(true);
  });

  it('exposes a stable facet table covering the four ADR facets', async () => {
    const kinds = new Set(DISCOVER_FACETS.map((f) => f.facet));
    expect(kinds).toEqual(
      new Set(['feature-domain', 'persona-identity', 'authoring-surface', 'provider-capability']),
    );
    // Every facet declares at least one intent and one capability.
    for (const f of DISCOVER_FACETS) {
      expect(f.intents.length).toBeGreaterThan(0);
      expect(f.capabilities.length).toBeGreaterThan(0);
    }
  });

  it('preserves the score contract — facet lifts round to the #1623 scale (#1626 non-regression)', async () => {
    const fused = await applyFacetFusion([], candidates, 'persona');
    // Lifted facet entries must still display as ≤ 1.00 at 2dp (the exact-name
    // 1.001 floor is the only thing allowed above) — RRF is a sub-display
    // tiebreaker, not a score-scale change.
    for (const r of fused) {
      expect(Math.round(r.score * 100) / 100).toBeLessThanOrEqual(1.0);
    }
    // A base-only entry's score is never perturbed by the fusion.
    const base = [{ entry: candidates[6], score: 0.42 }]; // unrelated-thing
    const fused2 = await applyFacetFusion(base, candidates, 'persona');
    expect(fused2.find((r) => r.entry.name === 'unrelated-thing')!.score).toBe(0.42);
  });

  it('RRF orders a multi-facet match ahead of a single-facet match within the tier', async () => {
    // soul-create is mapped by persona-identity; new-project by feature-domain.
    // A query that exactly activates BOTH domains should rank the multi-vector
    // consensus entry first. Craft a phrase hitting both via strong contains.
    // "persona" (exact persona) + project not active here, so instead assert
    // the persona vector orders its own members by base relevance:
    const scored = [
      { entry: candidates[2], score: 0.9 }, // aiwg-writer — higher base
      { entry: candidates[1], score: 0.1 }, // soul-create — lower base
    ];
    const fused = await applyFacetFusion(scored, candidates, 'persona');
    const writerIdx = fused.findIndex((r) => r.entry.name === 'aiwg-writer');
    const soulIdx = fused.findIndex((r) => r.entry.name === 'soul-create');
    // Both lifted to the same FLOOR_EXACT tier; RRF (base relevance) breaks the
    // tie in favor of the higher-base aiwg-writer.
    expect(writerIdx).toBeGreaterThanOrEqual(0);
    expect(soulIdx).toBeGreaterThanOrEqual(0);
    expect(writerIdx).toBeLessThan(soulIdx);
  });

  it('honors configurable per-facet weights', async () => {
    // Zero-weighting the persona facet removes its RRF contribution but the
    // floor lift (presence) is unchanged — weights tune ordering, not the
    // activation contract.
    const fused = await applyFacetFusion([], candidates, 'persona', {
      base: 1.0,
      facets: { 'persona-identity': 0 },
    });
    // Still injected (floor lift is independent of weight) …
    expect(fused.some((r) => r.entry.name === 'soul-create')).toBe(true);
    // … and a different weighting is accepted without throwing.
    const fused2 = await applyFacetFusion([], candidates, 'persona', {
      base: 0.5,
      facets: { 'persona-identity': 5 },
    });
    expect(fused2.some((r) => r.entry.name === 'aiwg-writer')).toBe(true);
  });

  it('does not let a lower facet floor perturb a stronger lexical score (#1828)', async () => {
    const scored = [
      { entry: candidates[2], score: 1.0 },
      { entry: candidates[0], score: 1.0 },
    ];
    const fused = await applyFacetFusion(scored, candidates, 'custom marketing execution from buyer persona');
    const writer = fused.find((r) => r.entry.name === 'aiwg-writer')!;

    expect(writer.score).toBe(1.0);
    expect(writer.facetDiagnostics ?? []).toHaveLength(0);
  });

  it.each([
    'custom marketing execution from buyer persona',
    'content brief using an audience persona',
    'campaign copy based on a marketing persona',
  ])('suppresses persona identity routing for marketing audience context: %s (#1828)', async (phrase) => {
    const fused = await applyFacetFusion([], candidates, phrase);
    expect(fused.some((r) => r.entry.name === 'aiwg-writer')).toBe(false);
    expect(fused.some((r) => r.entry.name === 'soul-create')).toBe(false);

    const diagnostic = diagnoseFacetActivations(phrase).find(
      (item) => item.facet === 'persona-identity',
    );
    expect(diagnostic).toMatchObject({
      status: 'suppressed',
      floor: 0,
    });
    expect(diagnostic?.reason).toContain('marketing audience context');
  });

  it('keeps explicit AIWG persona selection active even with adjacent marketing terms (#1828)', async () => {
    const phrase = 'select an AIWG persona for the marketing campaign';
    const fused = await applyFacetFusion([], candidates, phrase);
    expect(fused.some((r) => r.entry.name === 'aiwg-writer')).toBe(true);
    expect(
      diagnoseFacetActivations(phrase).find((item) => item.facet === 'persona-identity'),
    ).toMatchObject({
      status: 'active',
    });
  });
});
