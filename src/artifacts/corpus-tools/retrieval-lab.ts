/** Experimental hybrid corpus-retrieval benchmark. Never replaces research-query. @issue #2038 */

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { bm25Rank, tokenizeText } from '../fulltext.js';
import { loadGraphIndexFile } from '../index-reader.js';
import type { ArtifactIndex, MetadataEntry } from '../types.js';
import { runResearchQuery } from '../../research/query-cli.js';

export const RETRIEVAL_LAB_QUERY_SCHEMA = 'aiwg.corpus-retrieval-query/v1';
export const RETRIEVAL_LAB_CONCEPT_SCHEMA = 'aiwg.concept-scheme/v1';
export const RETRIEVAL_LAB_REPORT_SCHEMA = 'aiwg.corpus-retrieval-report/v1';
export const RETRIEVAL_LAB_STRATEGIES = ['research-query', 'direct-rg', 'vector', 'bm25', 'graph-ppr', 'hybrid-rrf'] as const;
export type RetrievalLabStrategy = typeof RETRIEVAL_LAB_STRATEGIES[number];

export interface RetrievalLabQuery {
  schema: typeof RETRIEVAL_LAB_QUERY_SCHEMA;
  id: string;
  question: string;
  expected_ids: string[];
  expected_evidence: string[];
}

export interface RetrievalConcept {
  id: string;
  prefLabel: string;
  altLabels?: string[];
  broader?: string[];
  narrower?: string[];
  related?: string[];
}

export interface RetrievalConceptScheme {
  schema: typeof RETRIEVAL_LAB_CONCEPT_SCHEMA;
  id: string;
  concepts: RetrievalConcept[];
}

export interface RetrievalLabHit {
  id: string;
  path: string;
  title: string;
  score: number;
  matched_terms: string[];
  graph_concepts: string[];
}

interface StrategyReport {
  metrics: { hit_at_1: number; hit_at_3: number; hit_at_5: number; mrr: number; p95_latency_ms: number };
  failures: Array<{ query_id: string; expected_ids: string[]; returned_ids: string[] }>;
}

export interface RetrievalLabReport {
  schema: typeof RETRIEVAL_LAB_REPORT_SCHEMA;
  status: 'complete';
  configuration: {
    graph: 'project';
    vector: 'local-feature-hash-v1';
    lexical: 'bm25';
    graph_walk: 'typed-ppr-specificity-restart';
    fusion: 'rrf-k60';
    concept_scheme_id: string;
    concept_scheme_hash: string;
    expected_concept_scheme_hash: string | null;
  };
  query_count: number;
  document_count: number;
  strategies: Record<RetrievalLabStrategy, StrategyReport>;
  queries: Array<{
    id: string;
    expected_ids: string[];
    results: Record<RetrievalLabStrategy, RetrievalLabHit[]>;
    source_selection: { confidence: number; dispersion: number };
    faithfulness: { passed: boolean; unsupported_top_ids: string[]; missing_expected_evidence: string[] };
  }>;
  adoption_gate: {
    replaces_current_query: false;
    baseline: 'research-query';
    quality_beats_baselines: boolean;
    acceptable_latency: boolean;
    clears_gate: boolean;
    decision: string;
  };
}

interface LabDocument {
  entry: MetadataEntry;
  id: string;
  body: string;
  text: string;
  concepts: string[];
  vector: number[];
}

const round = (value: number, digits = 6): number => {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
};

function stringArray(value: unknown, label: string, line: number): string[] {
  if (!Array.isArray(value) || value.length === 0 || value.some(item => typeof item !== 'string' || !item.trim())) {
    throw new Error(`Retrieval query line ${line}: ${label} must be a non-empty string array`);
  }
  return value;
}

export function parseRetrievalQueries(content: string): RetrievalLabQuery[] {
  const queries: RetrievalLabQuery[] = [];
  const ids = new Set<string>();
  for (const [offset, raw] of content.split(/\r?\n/).entries()) {
    if (!raw.trim()) continue;
    const line = offset + 1;
    let value: Record<string, unknown>;
    try { value = JSON.parse(raw) as Record<string, unknown>; }
    catch { throw new Error(`Retrieval query line ${line}: malformed JSON`); }
    if (value.schema !== RETRIEVAL_LAB_QUERY_SCHEMA) throw new Error(`Retrieval query line ${line}: unsupported schema`);
    if (typeof value.id !== 'string' || !value.id.trim() || ids.has(value.id)) throw new Error(`Retrieval query line ${line}: id must be unique and non-empty`);
    if (typeof value.question !== 'string' || !value.question.trim()) throw new Error(`Retrieval query line ${line}: question must be non-empty`);
    ids.add(value.id);
    queries.push({
      schema: RETRIEVAL_LAB_QUERY_SCHEMA,
      id: value.id,
      question: value.question,
      expected_ids: stringArray(value.expected_ids, 'expected_ids', line),
      expected_evidence: stringArray(value.expected_evidence, 'expected_evidence', line),
    });
  }
  if (!queries.length) throw new Error('Retrieval query fixture contains no queries');
  return queries;
}

function normalizedScheme(scheme: RetrievalConceptScheme): RetrievalConceptScheme {
  return {
    schema: RETRIEVAL_LAB_CONCEPT_SCHEMA,
    id: scheme.id,
    concepts: [...scheme.concepts].map(concept => ({
      id: concept.id,
      prefLabel: concept.prefLabel,
      ...(concept.altLabels?.length ? { altLabels: [...concept.altLabels].sort() } : {}),
      ...(concept.broader?.length ? { broader: [...concept.broader].sort() } : {}),
      ...(concept.narrower?.length ? { narrower: [...concept.narrower].sort() } : {}),
      ...(concept.related?.length ? { related: [...concept.related].sort() } : {}),
    })).sort((a, b) => a.id.localeCompare(b.id)),
  };
}

export function parseConceptScheme(content: string): { scheme: RetrievalConceptScheme; hash: string } {
  let value: RetrievalConceptScheme;
  try { value = JSON.parse(content) as RetrievalConceptScheme; }
  catch { throw new Error('Concept scheme is malformed JSON'); }
  if (value.schema !== RETRIEVAL_LAB_CONCEPT_SCHEMA || typeof value.id !== 'string' || !value.id || !Array.isArray(value.concepts) || !value.concepts.length) {
    throw new Error(`Concept scheme must use ${RETRIEVAL_LAB_CONCEPT_SCHEMA}`);
  }
  const ids = new Set<string>();
  for (const concept of value.concepts) {
    const normalizedId = concept?.id?.toLowerCase();
    if (!concept || typeof concept.id !== 'string' || !concept.id || typeof concept.prefLabel !== 'string' || !concept.prefLabel || ids.has(normalizedId)) {
      throw new Error('Concept scheme contains a malformed or duplicate concept');
    }
    ids.add(normalizedId);
    for (const relation of ['altLabels', 'broader', 'narrower', 'related'] as const) {
      if (concept[relation] !== undefined && (!Array.isArray(concept[relation]) || concept[relation]!.some(item => typeof item !== 'string'))) {
        throw new Error(`Concept ${concept.id} has malformed ${relation}`);
      }
    }
  }
  for (const concept of value.concepts) {
    for (const relation of ['broader', 'narrower', 'related'] as const) {
      for (const target of concept[relation] ?? []) if (!ids.has(target.toLowerCase())) throw new Error(`Concept ${concept.id} references unknown ${relation} target ${target}`);
    }
  }
  const scheme = normalizedScheme(value);
  return { scheme, hash: createHash('sha256').update(JSON.stringify(scheme)).digest('hex') };
}

function documentId(entry: MetadataEntry): string {
  const text = [entry.name, entry.title, entry.path].filter(Boolean).join(' ');
  return text.match(/\bREF-\d+\b/i)?.[0]?.toUpperCase() ?? path.basename(entry.path).replace(/\.[^.]+$/, '');
}

function isResearch(entry: MetadataEntry): boolean {
  const candidate = `${entry.type} ${entry.path}`.toLowerCase().replaceAll('\\', '/');
  return /research-ref|research-profile|research-view|research-synthesis|kb-page|\/research\/|\/kb\//.test(candidate);
}

function readBody(root: string, entry: MetadataEntry): string {
  try { return fs.readFileSync(path.resolve(root, entry.path), 'utf8'); }
  catch { return ''; }
}

function featureVector(text: string, dimensions = 128): number[] {
  const vector = new Array<number>(dimensions).fill(0);
  for (const token of tokenizeText(text)) {
    const digest = createHash('sha256').update(token).digest();
    const index = digest.readUInt16BE(0) % dimensions;
    vector[index] += (digest[2] & 1) ? 1 : -1;
  }
  const norm = Math.sqrt(vector.reduce((sum, item) => sum + item * item, 0));
  return norm ? vector.map(item => item / norm) : vector;
}

function cosine(left: number[], right: number[]): number {
  return left.reduce((sum, value, index) => sum + value * (right[index] ?? 0), 0);
}

function conceptText(concept: RetrievalConcept): string {
  return [concept.prefLabel, ...(concept.altLabels ?? [])].join(' ');
}

function loadDocuments(root: string, scheme: RetrievalConceptScheme): LabDocument[] {
  const index = loadGraphIndexFile<ArtifactIndex>(root, 'metadata.json', 'project');
  if (!index) throw new Error('Project corpus index is missing; run `aiwg index build --graph project`');
  const concepts = new Map(scheme.concepts.map(concept => [concept.id.toLowerCase(), concept]));
  return Object.values(index.entries).filter(isResearch).map(entry => {
    const body = readBody(root, entry);
    const documentConcepts = entry.tags.map(tag => tag.toLowerCase()).filter(tag => concepts.has(tag));
    const expanded = documentConcepts.map(id => conceptText(concepts.get(id)!)).join(' ');
    const text = [entry.title, entry.name ?? '', entry.summary, entry.tags.join(' '), expanded, body].join('\n');
    return { entry, id: documentId(entry), body, text, concepts: documentConcepts, vector: featureVector(text) };
  });
}

function matchedTerms(query: string, text: string): string[] {
  const available = new Set(tokenizeText(text));
  return [...new Set(tokenizeText(query))].filter(term => available.has(term)).sort();
}

function hit(document: LabDocument, score: number, query: string, graphConcepts: string[] = []): RetrievalLabHit {
  return { id: document.id, path: document.entry.path, title: document.entry.title, score: round(score), matched_terms: matchedTerms(query, document.text), graph_concepts: graphConcepts.sort() };
}

function directRank(documents: LabDocument[], query: string): RetrievalLabHit[] {
  const terms = [...new Set(tokenizeText(query))];
  return documents.map(document => ({ document, score: terms.reduce((sum, term) => sum + (document.text.toLowerCase().includes(term) ? 1 : 0), 0) }))
    .filter(item => item.score > 0).sort((a, b) => b.score - a.score || a.document.id.localeCompare(b.document.id))
    .map(item => hit(item.document, item.score / Math.max(1, terms.length), query));
}

function vectorRank(documents: LabDocument[], query: string): RetrievalLabHit[] {
  const queryVector = featureVector(query);
  return documents.map(document => ({ document, score: Math.max(0, cosine(queryVector, document.vector)) }))
    .filter(item => item.score > 0).sort((a, b) => b.score - a.score || a.document.id.localeCompare(b.document.id))
    .map(item => hit(item.document, item.score, query));
}

function lexicalRank(documents: LabDocument[], query: string): RetrievalLabHit[] {
  const byId = new Map(documents.map(document => [document.id, document]));
  return bm25Rank(documents.map(document => ({ id: document.id, text: document.text })), query)
    .map(item => hit(byId.get(item.id)!, item.score, query));
}

function graphRank(documents: LabDocument[], scheme: RetrievalConceptScheme, query: string, vector: RetrievalLabHit[], lexical: RetrievalLabHit[]): RetrievalLabHit[] {
  const concepts = new Map(scheme.concepts.map(concept => [concept.id.toLowerCase(), concept]));
  const documentById = new Map(documents.map(document => [document.id, document]));
  const restart = new Map<string, number>();
  for (const concept of concepts.values()) {
    const overlap = matchedTerms(query, conceptText(concept)).length;
    if (overlap) restart.set(concept.id.toLowerCase(), overlap);
  }
  for (const candidate of [...vector.slice(0, 5), ...lexical.slice(0, 5)]) {
    for (const concept of documentById.get(candidate.id)?.concepts ?? []) restart.set(concept, (restart.get(concept) ?? 0) + candidate.score * 0.25);
  }
  const totalRestart = [...restart.values()].reduce((sum, value) => sum + value, 0);
  if (!totalRestart) return [];
  for (const [id, value] of restart) restart.set(id, value / totalRestart);
  let scores = new Map(restart);
  const weights = { broader: 0.8, narrower: 1, related: 0.6 } as const;
  for (let iteration = 0; iteration < 20; iteration++) {
    const next = new Map<string, number>();
    for (const [id, value] of restart) next.set(id, value * 0.15);
    for (const [source, score] of scores) {
      const concept = concepts.get(source);
      if (!concept) continue;
      const edges = (Object.keys(weights) as Array<keyof typeof weights>).flatMap(type => (concept[type] ?? []).map(target => ({ target: target.toLowerCase(), weight: weights[type] })));
      const denominator = edges.reduce((sum, edge) => sum + edge.weight, 0);
      if (!denominator) { next.set(source, (next.get(source) ?? 0) + score * 0.85); continue; }
      for (const edge of edges) {
        const target = concepts.get(edge.target);
        const degree = (target?.broader?.length ?? 0) + (target?.narrower?.length ?? 0) + (target?.related?.length ?? 0);
        const specificity = 1 / Math.log2(2 + degree);
        next.set(edge.target, (next.get(edge.target) ?? 0) + score * 0.85 * (edge.weight / denominator) * specificity);
      }
    }
    scores = next;
  }
  return documents.map(document => {
    const contributing = document.concepts.filter(id => (scores.get(id) ?? 0) > 0);
    const score = contributing.reduce((sum, id) => sum + (scores.get(id) ?? 0), 0) / Math.max(1, document.concepts.length);
    return { document, score, contributing };
  }).filter(item => item.score > 0).sort((a, b) => b.score - a.score || a.document.id.localeCompare(b.document.id))
    .map(item => hit(item.document, item.score, query, item.contributing));
}

function rrf(lists: RetrievalLabHit[][], documents: LabDocument[], query: string): RetrievalLabHit[] {
  const scores = new Map<string, number>();
  for (const list of lists) list.forEach((item, rank) => scores.set(item.id, (scores.get(item.id) ?? 0) + 1 / (60 + rank + 1)));
  const byId = new Map(documents.map(document => [document.id, document]));
  return [...scores.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([id, score]) => {
    const document = byId.get(id)!;
    const graphConcepts = lists[2]?.find(item => item.id === id)?.graph_concepts ?? [];
    return hit(document, score, query, graphConcepts);
  });
}

function percentile(values: number[], percentileValue: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.ceil(sorted.length * percentileValue) - 1] ?? sorted[sorted.length - 1];
}

function strategyReport(queries: RetrievalLabQuery[], results: RetrievalLabHit[][], latencies: number[]): StrategyReport {
  const ranks = queries.map((query, index) => {
    const rank = results[index].findIndex(item => query.expected_ids.some(expected => expected.toLowerCase() === item.id.toLowerCase()));
    return rank < 0 ? null : rank + 1;
  });
  const at = (limit: number) => round(ranks.filter(rank => rank !== null && rank <= limit).length / queries.length);
  return {
    metrics: {
      hit_at_1: at(1), hit_at_3: at(3), hit_at_5: at(5),
      mrr: round(ranks.reduce<number>((sum, rank) => sum + (rank ? 1 / rank : 0), 0) / queries.length),
      p95_latency_ms: round(percentile(latencies, 0.95), 3),
    },
    failures: queries.map((query, index) => ({ query, results: results[index] })).filter(item =>
      !item.results.slice(0, 5).some(result => item.query.expected_ids.some(expected => expected.toLowerCase() === result.id.toLowerCase())))
      .map(item => ({ query_id: item.query.id, expected_ids: item.query.expected_ids, returned_ids: item.results.slice(0, 5).map(result => result.id) })),
  };
}

function selectionDiagnostics(results: RetrievalLabHit[]): { confidence: number; dispersion: number } {
  const scores = results.slice(0, 5).map(item => item.score).filter(score => score > 0);
  const total = scores.reduce((sum, score) => sum + score, 0);
  if (!total) return { confidence: 0, dispersion: 1 };
  const probabilities = scores.map(score => score / total);
  const entropy = -probabilities.reduce((sum, value) => sum + value * Math.log(value), 0);
  const maxEntropy = Math.log(Math.max(2, probabilities.length));
  return { confidence: round(probabilities[0]), dispersion: round(entropy / maxEntropy) };
}

export async function runRetrievalLab(options: {
  root: string;
  queriesPath: string;
  conceptsPath: string;
  expectedSchemeHash?: string;
  limit?: number;
  latencyCeilingMs?: number;
}): Promise<RetrievalLabReport> {
  const queries = parseRetrievalQueries(fs.readFileSync(options.queriesPath, 'utf8'));
  const { scheme, hash } = parseConceptScheme(fs.readFileSync(options.conceptsPath, 'utf8'));
  if (options.expectedSchemeHash && options.expectedSchemeHash.toLowerCase() !== hash) {
    throw new Error(`Concept scheme drift invalidated benchmark: expected ${options.expectedSchemeHash.toLowerCase()}, observed ${hash}`);
  }
  const documents = loadDocuments(options.root, scheme);
  if (!documents.length) throw new Error('Project corpus index contains no research documents');
  const limit = options.limit ?? 10;
  const matrix = Object.fromEntries(RETRIEVAL_LAB_STRATEGIES.map(strategy => [strategy, [] as RetrievalLabHit[][]])) as Record<RetrievalLabStrategy, RetrievalLabHit[][]>;
  const latencies = Object.fromEntries(RETRIEVAL_LAB_STRATEGIES.map(strategy => [strategy, [] as number[]])) as Record<RetrievalLabStrategy, number[]>;

  for (const query of queries) {
    let started = performance.now();
    const current = await runResearchQuery(options.root, { question: query.question, backend: 'local', graph: 'project', depth: 'thorough', maxSources: limit });
    matrix['research-query'].push(current.sources.map(source => ({ id: source.id, path: source.path, title: source.title, score: source.score, matched_terms: matchedTerms(query.question, [source.title, source.summary, source.tags.join(' ')].join(' ')), graph_concepts: [] })));
    latencies['research-query'].push(performance.now() - started);

    started = performance.now(); const direct = directRank(documents, query.question).slice(0, limit);
    latencies['direct-rg'].push(performance.now() - started); matrix['direct-rg'].push(direct);
    const hybridStarted = performance.now();
    started = hybridStarted; const vector = vectorRank(documents, query.question).slice(0, limit);
    latencies.vector.push(performance.now() - started); matrix.vector.push(vector);
    started = performance.now(); const lexical = lexicalRank(documents, query.question).slice(0, limit);
    latencies.bm25.push(performance.now() - started); matrix.bm25.push(lexical);
    started = performance.now(); const graph = graphRank(documents, scheme, query.question, vector, lexical).slice(0, limit);
    latencies['graph-ppr'].push(performance.now() - started); matrix['graph-ppr'].push(graph);
    const hybrid = rrf([vector, lexical, graph], documents, query.question).slice(0, limit);
    latencies['hybrid-rrf'].push(performance.now() - hybridStarted); matrix['hybrid-rrf'].push(hybrid);
  }

  const strategies = Object.fromEntries(RETRIEVAL_LAB_STRATEGIES.map(strategy => [strategy, strategyReport(queries, matrix[strategy], latencies[strategy])])) as Record<RetrievalLabStrategy, StrategyReport>;
  const hybrid = strategies['hybrid-rrf'].metrics;
  const baselines = [strategies['research-query'].metrics, strategies['direct-rg'].metrics];
  const qualityBeats = baselines.every(baseline => hybrid.hit_at_5 >= baseline.hit_at_5 && hybrid.mrr >= baseline.mrr)
    && baselines.some(baseline => hybrid.hit_at_5 > baseline.hit_at_5 || hybrid.mrr > baseline.mrr);
  const acceptableLatency = hybrid.p95_latency_ms <= (options.latencyCeilingMs ?? 250);
  const clears = qualityBeats && acceptableLatency;
  const documentById = new Map(documents.map(document => [document.id, document]));
  return {
    schema: RETRIEVAL_LAB_REPORT_SCHEMA,
    status: 'complete',
    configuration: {
      graph: 'project', vector: 'local-feature-hash-v1', lexical: 'bm25', graph_walk: 'typed-ppr-specificity-restart', fusion: 'rrf-k60',
      concept_scheme_id: scheme.id, concept_scheme_hash: hash, expected_concept_scheme_hash: options.expectedSchemeHash?.toLowerCase() ?? null,
    },
    query_count: queries.length,
    document_count: documents.length,
    strategies,
    queries: queries.map((query, index) => {
      const results = Object.fromEntries(RETRIEVAL_LAB_STRATEGIES.map(strategy => [strategy, matrix[strategy][index]])) as Record<RetrievalLabStrategy, RetrievalLabHit[]>;
      const top = results['hybrid-rrf'].slice(0, 5);
      const unsupported = top.filter(item => !item.matched_terms.length && !item.graph_concepts.length).map(item => item.id);
      const selectedText = top.map(item => documentById.get(item.id)?.text ?? '').join('\n').toLowerCase();
      const missingEvidence = query.expected_evidence.filter(evidence => !selectedText.includes(evidence.toLowerCase()));
      return {
        id: query.id, expected_ids: query.expected_ids, results,
        source_selection: selectionDiagnostics(results['hybrid-rrf']),
        faithfulness: { passed: unsupported.length === 0 && missingEvidence.length === 0, unsupported_top_ids: unsupported, missing_expected_evidence: missingEvidence },
      };
    }),
    adoption_gate: {
      replaces_current_query: false,
      baseline: 'research-query', quality_beats_baselines: qualityBeats, acceptable_latency: acceptableLatency, clears_gate: clears,
      decision: clears
        ? 'Candidate cleared the lab gate; current research-query remains unchanged pending an explicit adoption decision.'
        : 'HOLD: hybrid retrieval did not beat both baselines within the latency ceiling; current research-query remains unchanged.',
    },
  };
}

export function renderRetrievalLab(report: RetrievalLabReport): string {
  const lines = [
    `Corpus retrieval lab: ${report.query_count} queries / ${report.document_count} documents`,
    `Concept scheme: ${report.configuration.concept_scheme_id} (${report.configuration.concept_scheme_hash})`, '',
    'Strategy         Hit@1   Hit@3   Hit@5   MRR     p95 ms',
  ];
  for (const strategy of RETRIEVAL_LAB_STRATEGIES) {
    const metrics = report.strategies[strategy].metrics;
    lines.push(`${strategy.padEnd(16)} ${metrics.hit_at_1.toFixed(3)}   ${metrics.hit_at_3.toFixed(3)}   ${metrics.hit_at_5.toFixed(3)}   ${metrics.mrr.toFixed(3)}   ${metrics.p95_latency_ms.toFixed(3)}`);
  }
  lines.push('', `Decision: ${report.adoption_gate.decision}`);
  return `${lines.join('\n')}\n`;
}
