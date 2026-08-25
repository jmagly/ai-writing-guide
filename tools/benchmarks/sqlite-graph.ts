import { mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { SqliteGraphBackend } from '../../src/artifacts/backends/sqlite-backend.js';

const nodeCount = positiveInteger(process.env.AIWG_SQLITE_GRAPH_NODES, 10_000);
const queryCount = positiveInteger(process.env.AIWG_SQLITE_GRAPH_QUERIES, 1_000);
const batches = 20;
const root = mkdtempSync(join(tmpdir(), 'aiwg-sqlite-graph-benchmark-'));
const dbPath = join(root, 'graph.db');
const backend = new SqliteGraphBackend(dbPath, { busyTimeoutMs: 5_000 });

try {
  const delays: number[] = [];
  const started = performance.now();
  for (let batch = 0; batch < batches; batch++) {
    const timerStarted = performance.now();
    const timer = new Promise<number>(resolve => setTimeout(
      () => resolve(performance.now() - timerStarted),
      0,
    ));
    const start = Math.floor((nodeCount * batch) / batches);
    const end = Math.floor((nodeCount * (batch + 1)) / batches);
    for (let index = start; index < end; index++) {
      backend.addNode(`node-${index}`, {
        type: index % 2 ? 'odd' : 'even',
        phase: `phase-${index % 4}`,
      });
      if (index > 0) backend.addEdge(`node-${index - 1}`, `node-${index}`, 'next');
    }
    delays.push(await timer);
  }
  const writeMs = performance.now() - started;

  const queryStarted = performance.now();
  for (let index = 0; index < queryCount; index++) {
    backend.queryNodes({ type: index % 2 ? 'odd' : 'even', phase: `phase-${index % 4}` });
    backend.traverse(`node-${index % Math.max(1, nodeCount - 10)}`, 'out', 10, 'next');
  }
  const queryMs = performance.now() - queryStarted;
  backend.checkpoint('TRUNCATE');

  delays.sort((a, b) => a - b);
  const evidence = {
    schemaVersion: 'aiwg.sqlite-graph-benchmark/v1',
    observedAt: new Date().toISOString(),
    runtime: { node: process.version, platform: process.platform, arch: process.arch },
    sqlite: {
      engineVersion: backend.engineVersion(),
      bindingVersion: (await import('better-sqlite3/package.json', { with: { type: 'json' } })).default.version,
      journalMode: backend.journalMode(),
      schemaVersion: backend.schemaVersion(),
    },
    corpus: { nodes: nodeCount, edges: backend.edgeCount(), queries: queryCount },
    measured: {
      writeMs: round(writeMs),
      writesPerSecond: round((nodeCount * 2 - 1) / (writeMs / 1_000)),
      queryMs: round(queryMs),
      queryPairsPerSecond: round(queryCount / (queryMs / 1_000)),
      eventLoopDelayMsP50: round(percentile(delays, 0.50)),
      eventLoopDelayMsP95: round(percentile(delays, 0.95)),
      eventLoopDelayMsMax: round(delays.at(-1) ?? 0),
      databaseBytes: statSync(dbPath).size,
    },
    interpretation: 'Reference-host observation only; not a universal support limit.',
  };
  console.log(JSON.stringify(evidence, null, 2));
} finally {
  backend.close();
  rmSync(root, { recursive: true, force: true });
}

function positiveInteger(raw: string | undefined, fallback: number): number {
  if (raw === undefined) return fallback;
  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed) || parsed < 1) throw new Error(`expected positive integer, received ${raw}`);
  return parsed;
}

function percentile(sorted: number[], quantile: number): number {
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * quantile))] ?? 0;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
