/**
 * Profile→REF edges as first-class graph data (#1501, reassigned from #1502).
 *
 * TS-native port of section9 `scripts/profiles/build_profile_edges.py`. Builds
 * the entity-profile → reference edge graph from `loadProfiles` (PROF-{P,O,G,F,S}
 * `corpus-refs`), reconciled against the citation graph so only edges to REFs
 * that actually exist in the corpus are kept (the source script emitted synthetic
 * `documentation/profiles/edges/` files; per the issue these are first-class
 * graph adjacency objects instead, reconcilable with the #727 graph backends).
 *
 * @source historical: profiles/build_profile_edges.py
 * @tests @test/unit/artifacts/profile-edges.test.ts
 */

import { loadProfiles, loadCorpus, type ProfileRecord } from '../corpus-views/ref-parser.js';

export interface ProfileEdge {
  profId: string;
  profileType: string; // person | org | group | funder | source
  ref: string;
}

export interface ProfileEdgeGraph {
  edges: ProfileEdge[];
  /** profId → { name, type, refs[] } */
  byProfile: Map<string, { name: string | null; type: string; refs: string[] }>;
  /** ref → profIds that link to it (profile in-degree) */
  byRef: Map<string, string[]>;
  /** refs cited by a profile's corpus-refs that have no corresponding ref doc. */
  danglingRefs: Array<{ profId: string; ref: string }>;
  stats: { profiles: number; edges: number; refsCovered: number };
}

/** Build the profile→REF edge graph, keeping only edges to REFs present in the corpus. */
export function buildProfileEdges(corpusRoot: string): ProfileEdgeGraph {
  const profiles: ProfileRecord[] = loadProfiles(corpusRoot);
  const knownRefs = new Set(loadCorpus(corpusRoot).records.map((r) => r.refId));

  const edges: ProfileEdge[] = [];
  const byProfile = new Map<string, { name: string | null; type: string; refs: string[] }>();
  const byRef = new Map<string, string[]>();
  const danglingRefs: Array<{ profId: string; ref: string }> = [];

  for (const p of profiles) {
    const type = p.type ?? 'unknown';
    const refs: string[] = [];
    for (const ref of p.corpusRefs) {
      if (!knownRefs.has(ref)) {
        danglingRefs.push({ profId: p.profId, ref });
        continue;
      }
      edges.push({ profId: p.profId, profileType: type, ref });
      refs.push(ref);
      (byRef.get(ref) ?? byRef.set(ref, []).get(ref)!).push(p.profId);
    }
    byProfile.set(p.profId, { name: p.name, type, refs });
  }

  return {
    edges,
    byProfile,
    byRef,
    danglingRefs,
    stats: { profiles: profiles.length, edges: edges.length, refsCovered: byRef.size },
  };
}

export function renderProfileEdges(g: ProfileEdgeGraph): string {
  const out: string[] = [];
  out.push('Profile→REF edge graph');
  out.push(`Profiles: ${g.stats.profiles}  Edges: ${g.stats.edges}  REFs covered: ${g.stats.refsCovered}  Dangling: ${g.danglingRefs.length}`);
  out.push('');
  // Top profiles by edge count.
  const topProfiles = [...g.byProfile.entries()].sort((a, b) => b[1].refs.length - a[1].refs.length).slice(0, 15);
  out.push('Top profiles by linked REFs:');
  for (const [profId, info] of topProfiles) {
    if (!info.refs.length) continue;
    out.push(`  ${profId} (${info.type})${info.name ? ` — ${info.name}` : ''}: ${info.refs.length}`);
  }
  out.push('');
  // Top REFs by profile in-degree.
  const topRefs = [...g.byRef.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 15);
  out.push('Top REFs by linked-profile count:');
  for (const [ref, profs] of topRefs) out.push(`  ${ref}: ${profs.length} profiles`);
  if (g.danglingRefs.length) {
    out.push('');
    out.push(`Dangling profile→REF edges (REF doc missing): ${g.danglingRefs.length}`);
    for (const d of g.danglingRefs.slice(0, 10)) out.push(`  ${d.profId} → ${d.ref}`);
  }
  return out.join('\n') + '\n';
}
