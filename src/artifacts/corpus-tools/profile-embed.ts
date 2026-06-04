/**
 * Profile text embeddings → researcher similarity + collaboration prediction (#1501).
 *
 * The #1501 "node2vec embeddings" slot, implemented (per operator decision) by
 * reusing the text-embedding backend (#1493) instead of a heavy graph-embedding
 * stack: each person profile is embedded from its name + the titles of its
 * corpus-refs, then cosine similarity gives nearest researchers and
 * collaboration link-prediction (highly-similar people who have NOT co-authored —
 * corpus-refs overlap is the co-authorship proxy).
 *
 * Opt-in: requires `@xenova/transformers` (and `hnswlib-node` is not needed here —
 * similarity is an in-memory cosine over the ~hundreds of person profiles).
 * Degrades gracefully when the optional dep is absent.
 *
 * @source historical: profiles/graph_embeddings.py (node2vec → text-embedding here)
 * @tests @test/unit/artifacts/profile-embed.test.ts
 */

import { loadProfiles, loadCorpus } from '../corpus-views/ref-parser.js';
import { checkEmbeddingDeps, DEFAULT_EMBEDDING_MODEL } from '../embedding-index.js';

export interface ProfileEmbeddings {
  profIds: string[];
  names: (string | null)[];
  vectors: number[][];
  /** profId index → set of its corpus-refs (co-authorship proxy). */
  refs: Set<string>[];
}

export interface SimilarHit {
  profId: string;
  name: string | null;
  score: number;
}

export interface CollabPrediction {
  a: string;
  b: string;
  score: number;
}

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  // Vectors are L2-normalized at embed time (normalize: true), so dot == cosine.
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
}

/**
 * Build text embeddings for person profiles. Text = profile name + the titles of
 * its corpus-refs. Requires `@xenova/transformers`; throws a clear error when absent.
 */
export async function buildProfileEmbeddings(
  corpusRoot: string,
  model: string = DEFAULT_EMBEDDING_MODEL,
): Promise<ProfileEmbeddings> {
  const deps = await checkEmbeddingDeps();
  if (!deps.available) {
    throw new Error(`profile embeddings need optional deps: ${deps.missing.join(', ')} (npm install @xenova/transformers)`);
  }
  const titleByRef = new Map<string, string>();
  for (const r of loadCorpus(corpusRoot).records) titleByRef.set(r.refId, r.title);

  const people = loadProfiles(corpusRoot).filter((p) => (p.type ?? '') === 'person');
  const profIds: string[] = [];
  const names: (string | null)[] = [];
  const texts: string[] = [];
  const refs: Set<string>[] = [];
  for (const p of people) {
    const titles = p.corpusRefs.map((r) => titleByRef.get(r)).filter(Boolean) as string[];
    // Skip profiles with no usable text signal.
    const text = `${p.name ?? p.profId}. ${titles.join('. ')}`.trim();
    if (!titles.length && !p.name) continue;
    profIds.push(p.profId);
    names.push(p.name);
    texts.push(text);
    refs.push(new Set(p.corpusRefs));
  }

  const transformersMod = await (new Function('m', 'return import(m)'))('@xenova/transformers');
  const embed = await transformersMod.pipeline('feature-extraction', model);
  const vectors: number[][] = [];
  for (const t of texts) {
    const res = await embed(t, { pooling: 'mean', normalize: true });
    vectors.push(Array.from(res.data as Float32Array));
  }
  return { profIds, names, vectors, refs };
}

/** Nearest researchers to a profile by embedding cosine (excludes self). */
export function profileSimilar(emb: ProfileEmbeddings, profId: string, topK = 10): SimilarHit[] {
  const i = emb.profIds.indexOf(profId);
  if (i === -1) throw new Error(`profile '${profId}' not in the embedding set`);
  const hits: SimilarHit[] = [];
  for (let j = 0; j < emb.profIds.length; j++) {
    if (j === i) continue;
    hits.push({ profId: emb.profIds[j], name: emb.names[j], score: cosine(emb.vectors[i], emb.vectors[j]) });
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, topK);
}

/**
 * Collaboration link-prediction: pairs of people with embedding similarity ≥
 * threshold who share NO corpus-refs (i.e. have not co-authored). Ranked desc.
 */
export function collaborationPredictions(emb: ProfileEmbeddings, threshold = 0.8, limit = 50): CollabPrediction[] {
  const preds: CollabPrediction[] = [];
  for (let i = 0; i < emb.profIds.length; i++) {
    for (let j = i + 1; j < emb.profIds.length; j++) {
      // Already co-authored if their corpus-refs intersect.
      let shared = false;
      for (const r of emb.refs[i]) if (emb.refs[j].has(r)) { shared = true; break; }
      if (shared) continue;
      const score = cosine(emb.vectors[i], emb.vectors[j]);
      if (score >= threshold) preds.push({ a: emb.profIds[i], b: emb.profIds[j], score });
    }
  }
  return preds.sort((x, y) => y.score - x.score).slice(0, limit);
}

export function renderSimilar(profId: string, hits: SimilarHit[]): string {
  const out = [`Researchers similar to ${profId} (${hits.length}):`, ''];
  for (const h of hits) out.push(`  ${h.score.toFixed(3)}  ${h.profId}${h.name ? ` — ${h.name}` : ''}`);
  return out.join('\n') + '\n';
}

export function renderCollabPredictions(preds: CollabPrediction[], threshold: number): string {
  const out = [`Collaboration predictions (cosine ≥ ${threshold}, not yet co-authored): ${preds.length}`, ''];
  for (const p of preds) out.push(`  ${p.score.toFixed(3)}  ${p.a} ↔ ${p.b}`);
  return out.join('\n') + '\n';
}
