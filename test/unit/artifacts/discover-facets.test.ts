/**
 * Discover facet-fusion tests (#1623 U3)
 *
 * @source @src/artifacts/discover-facets.ts
 */

import { describe, it, expect } from 'vitest';
import { applyFacetFusion, DISCOVER_FACETS } from '../../../src/artifacts/discover-facets.js';
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
  entry({ path: 'agentic/code/addons/aiwg-utils/skills/unrelated-thing/SKILL.md', name: 'unrelated-thing' }),
];

describe('applyFacetFusion (#1623 U3)', () => {
  it('lifts a persona-domain capability above a generic capped-1.0 match for the bare "persona" query', () => {
    const scored = [
      { entry: candidates[0], score: 1.0 }, // audience-synthesis — generic, capped
      { entry: candidates[1], score: 1.0 }, // soul-create — persona capability, capped
    ];
    const fused = applyFacetFusion(scored, candidates, 'persona');
    // soul-create (persona facet, exact intent) must sort above audience-synthesis.
    expect(fused[0].entry.name).not.toBe('audience-synthesis');
    const soul = fused.find((r) => r.entry.name === 'soul-create')!;
    const audience = fused.find((r) => r.entry.name === 'audience-synthesis')!;
    expect(soul.score).toBeGreaterThan(audience.score);
  });

  it('injects a mapped capability that the lexical pass missed entirely', () => {
    // Lexical pass found nothing; the persona facet still surfaces the persona agent.
    const fused = applyFacetFusion([], candidates, 'persona');
    expect(fused.some((r) => r.entry.name === 'aiwg-writer')).toBe(true);
    expect(fused.some((r) => r.entry.name === 'soul-create')).toBe(true);
  });

  it('activates the expansion facet for "author an expansion"', () => {
    const fused = applyFacetFusion([], candidates, 'author an expansion');
    expect(fused.some((r) => r.entry.name === 'scaffold-extension')).toBe(true);
    // A non-mapped artifact is not injected.
    expect(fused.some((r) => r.entry.name === 'unrelated-thing')).toBe(false);
  });

  it('activates the project facet for "scaffold a project"', () => {
    const fused = applyFacetFusion([], candidates, 'scaffold a project');
    expect(fused.some((r) => r.entry.name === 'new-project')).toBe(true);
  });

  it('is a no-op for a phrase that activates no facet (no regression)', () => {
    const scored = [
      { entry: candidates[0], score: 0.8 },
      { entry: candidates[5], score: 0.4 },
    ];
    const fused = applyFacetFusion(scored, candidates, 'deploy to production');
    expect(fused).toHaveLength(2);
    expect(fused[0].entry.name).toBe('audience-synthesis');
    expect(fused[0].score).toBe(0.8);
  });

  it('matches capabilities by path slug when the index entry lacks a name field', () => {
    const noName = [
      entry({ path: 'agentic/code/agents/personas/aiwg-writer.md', type: 'agent' }),
    ];
    // Strip the inferred title/name to force path-based matching.
    delete (noName[0] as Partial<MetadataEntry>).name;
    const fused = applyFacetFusion([], noName, 'persona');
    expect(fused.some((r) => r.entry.path.endsWith('aiwg-writer.md'))).toBe(true);
  });

  it('exposes a stable facet table covering the four ADR facets', () => {
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
});
