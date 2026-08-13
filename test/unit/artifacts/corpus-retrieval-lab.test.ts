/** @issue #2038 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ArtifactIndex, MetadataEntry } from '../../../src/artifacts/types.js';
import {
  parseConceptScheme,
  parseRetrievalQueries,
  RETRIEVAL_LAB_STRATEGIES,
  runRetrievalLab,
} from '../../../src/artifacts/corpus-tools/retrieval-lab.js';
import { corpusMain } from '../../../src/artifacts/corpus-tools/cli.js';

const fixtureRoot = path.resolve(import.meta.dirname, '../../fixtures/artifacts');
const queriesPath = path.join(fixtureRoot, 'corpus-retrieval-lab-queries.jsonl');
const conceptsPath = path.join(fixtureRoot, 'corpus-retrieval-lab-concepts.json');

function entry(id: string, title: string, tags: string[], summary: string): MetadataEntry {
  return {
    path: `.aiwg/research/findings/${id}.md`, type: 'research-ref', phase: 'research', title, name: id,
    tags, created: '2026-08-13T00:00:00Z', updated: '2026-08-13T00:00:00Z', checksum: id.toLowerCase(),
    summary, dependencies: [], dependents: [],
  };
}

describe('experimental corpus retrieval lab', () => {
  let root: string;
  let log: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'aiwg-retrieval-lab-'));
    log = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const entries = [
      entry('REF-101', 'Provider Context Attribution', ['context-budget'], 'Provider context token attribution separates memory, rules, skills, agents, and bridge files.'),
      entry('REF-102', 'Persistent Memory Firewall', ['memory-firewall', 'security'], 'Persistent memory poisoning requires quarantine and changed-file review.'),
      entry('REF-103', 'Hybrid Corpus Retrieval', ['hybrid-retrieval', 'rank-fusion'], 'BM25 lexical, vector, typed concept graph, and RRF rank fusion improve narrow source selection.'),
      entry('REF-104', 'Broad Research Operations', ['security'], 'General research workflow guidance without retrieval implementation detail.'),
    ];
    const index: ArtifactIndex = {
      version: '1.0.0', builtAt: '2026-08-13T00:00:00Z', buildTimeMs: 1,
      entries: Object.fromEntries(entries.map(item => [item.path, item])),
    };
    const indexDir = path.join(root, '.aiwg', '.index', 'project');
    fs.mkdirSync(indexDir, { recursive: true });
    fs.writeFileSync(path.join(indexDir, 'metadata.json'), JSON.stringify(index));
    for (const item of entries) {
      const target = path.join(root, item.path);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, `# ${item.title}\n\n${item.summary}\n`);
    }
  });

  afterEach(() => {
    log.mockRestore();
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('validates versioned query and concept fixtures deterministically', () => {
    const queries = parseRetrievalQueries(fs.readFileSync(queriesPath, 'utf8'));
    expect(queries).toHaveLength(3);
    const first = parseConceptScheme(fs.readFileSync(conceptsPath, 'utf8'));
    const second = parseConceptScheme(fs.readFileSync(conceptsPath, 'utf8'));
    expect(first.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(first.hash).toBe(second.hash);
    expect(() => parseRetrievalQueries(`${fs.readFileSync(queriesPath, 'utf8')}\n${fs.readFileSync(queriesPath, 'utf8')}`)).toThrow(/unique/);
  });

  it('benchmarks both baselines and every hybrid component without replacing research-query', async () => {
    const report = await runRetrievalLab({ root, queriesPath, conceptsPath, latencyCeilingMs: 1_000 });
    expect(Object.keys(report.strategies)).toEqual([...RETRIEVAL_LAB_STRATEGIES]);
    expect(report).toMatchObject({
      status: 'complete', query_count: 3, document_count: 4,
      configuration: {
        vector: 'local-feature-hash-v1', lexical: 'bm25',
        graph_walk: 'typed-ppr-specificity-restart', fusion: 'rrf-k60',
      },
      adoption_gate: { replaces_current_query: false, baseline: 'research-query' },
    });
    expect(report.strategies['research-query'].metrics.hit_at_5).toBe(1);
    expect(report.strategies['direct-rg'].metrics.hit_at_5).toBe(1);
    expect(report.strategies['graph-ppr'].metrics.hit_at_5).toBe(1);
    expect(report.strategies['hybrid-rrf'].metrics.hit_at_5).toBe(1);
    expect(report.queries.every(query => query.results['graph-ppr'][0]?.graph_concepts.length)).toBe(true);
    expect(report.queries.every(query => query.source_selection.confidence > 0)).toBe(true);
    expect(report.queries.every(query => query.source_selection.dispersion >= 0)).toBe(true);
    expect(report.queries.every(query => query.faithfulness.passed)).toBe(true);
    expect(report.adoption_gate.decision).toMatch(/current research-query remains unchanged/);
  });

  it('invalidates stale concept-scheme benchmarks before ranking', async () => {
    await expect(runRetrievalLab({
      root, queriesPath, conceptsPath, expectedSchemeHash: '0'.repeat(64),
    })).rejects.toThrow(/Concept scheme drift invalidated benchmark/);
  });

  it('routes the public local benchmark through aiwg corpus', async () => {
    await corpusMain([
      'retrieval-lab', '--queries', queriesPath, '--concepts', conceptsPath, '--json',
    ], root);
    const output = log.mock.calls.map(call => String(call[0])).join('');
    expect(JSON.parse(output)).toMatchObject({ schema: 'aiwg.corpus-retrieval-report/v1', query_count: 3 });
  });
});
