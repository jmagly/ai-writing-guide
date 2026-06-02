/**
 * Lexical full-text ranking over artifact bodies (BM25).
 *
 * The artifact index stores only metadata + a 500-char summary per node
 * (see `MetadataEntry`), so `aiwg index query` is metadata-scoped. This
 * module adds a lexical full-text vector: `aiwg index query "..." --fulltext`
 * reads the candidate nodes' source bodies and ranks them with Okapi BM25.
 *
 * This is deliberately distinct from the semantic/embedding vector
 * (`embedding-index.ts`, `--semantic`): full-text is lexical recall (exact
 * term matches in the body), semantic is conceptual. Both are composable.
 *
 * No persisted inverted index is built — ranking reads candidate bodies at
 * query time. This keeps the on-disk index free of regenerable full-text
 * bloat (the anti-bloat posture of #1488) and stays a pure query-side
 * feature with no index-build change.
 *
 * @implements #1494
 * @tests @test/unit/artifacts/fulltext.test.ts
 */

/** A document to rank: an opaque id plus its searchable body text. */
export interface FullTextDoc {
  id: string;
  text: string;
}

/** A ranked hit: the doc id, its normalized score (top = 1.0), and which query terms matched. */
export interface FullTextHit {
  id: string;
  /** Normalized BM25 score in (0, 1]; the top hit is 1.0. */
  score: number;
  /** Raw (un-normalized) BM25 score — useful for thresholding/debugging. */
  rawScore: number;
  /** Distinct query terms that occurred in this doc's body. */
  matchedTerms: string[];
}

export interface Bm25Options {
  /** Term-frequency saturation. Higher → repeated terms keep mattering. Default 1.5. */
  k1?: number;
  /** Length normalization. 0 = none, 1 = full. Default 0.75. */
  b?: number;
}

/**
 * Stop-words dropped during tokenization. Kept intentionally small so a
 * user's domain nouns/verbs dominate. Mirrors the query-engine's set.
 */
const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'of', 'for', 'to', 'in', 'on',
  'with', 'into', 'from', 'is', 'are', 'be', 'i', 'we', 'my', 'it',
  'this', 'that', 'as', 'at', 'by', 'but',
]);

/**
 * Tokenize body/query text into lowercased terms. Splits on non-alphanumeric
 * (keeping intra-word hyphens), drops stop-words and single-char tokens.
 */
export function tokenizeText(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9-]+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

/**
 * Rank documents against a query using Okapi BM25.
 *
 * Returns only docs that matched at least one query term, sorted by score
 * descending. Scores are normalized so the top hit is 1.0 (BM25 is otherwise
 * unbounded), matching the 0–1 score convention the rest of the query surface
 * uses; `rawScore` carries the un-normalized value.
 */
export function bm25Rank(
  docs: FullTextDoc[],
  query: string,
  options: Bm25Options = {},
): FullTextHit[] {
  const k1 = options.k1 ?? 1.5;
  const b = options.b ?? 0.75;

  const queryTerms = Array.from(new Set(tokenizeText(query)));
  if (queryTerms.length === 0 || docs.length === 0) return [];
  const queryTermSet = new Set(queryTerms);

  // Per-doc term frequencies (restricted to query terms) + doc lengths.
  const N = docs.length;
  const tfByDoc: Array<Map<string, number>> = [];
  const lengths: number[] = [];
  const df = new Map<string, number>();
  let totalLen = 0;

  for (const doc of docs) {
    const tokens = tokenizeText(doc.text);
    lengths.push(tokens.length);
    totalLen += tokens.length;
    const tf = new Map<string, number>();
    for (const tok of tokens) {
      if (queryTermSet.has(tok)) tf.set(tok, (tf.get(tok) ?? 0) + 1);
    }
    tfByDoc.push(tf);
    for (const term of tf.keys()) df.set(term, (df.get(term) ?? 0) + 1);
  }

  const avgdl = totalLen / N || 1;

  // BM25+ IDF (always positive): ln(1 + (N - df + 0.5)/(df + 0.5)).
  const idf = (term: string): number => {
    const n = df.get(term) ?? 0;
    return Math.log(1 + (N - n + 0.5) / (n + 0.5));
  };

  const hits: FullTextHit[] = [];
  for (let i = 0; i < docs.length; i++) {
    const tf = tfByDoc[i];
    if (tf.size === 0) continue;
    const len = lengths[i];
    let score = 0;
    const matched: string[] = [];
    for (const term of queryTerms) {
      const f = tf.get(term);
      if (!f) continue;
      matched.push(term);
      const denom = f + k1 * (1 - b + (b * len) / avgdl);
      score += idf(term) * ((f * (k1 + 1)) / denom);
    }
    if (score > 0) hits.push({ id: docs[i].id, score, rawScore: score, matchedTerms: matched });
  }

  hits.sort((a, b2) => b2.rawScore - a.rawScore || a.id.localeCompare(b2.id));

  // Normalize so the top hit is 1.0 (preserve raw in rawScore).
  const max = hits.length ? hits[0].rawScore : 0;
  if (max > 0) {
    for (const h of hits) h.score = h.rawScore / max;
  }
  return hits;
}
