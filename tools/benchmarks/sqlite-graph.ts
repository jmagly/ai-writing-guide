import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { SqliteGraphBackend } from '../../src/artifacts/backends/sqlite-backend.js';

const nodeCount = positiveInteger(process.env.AIWG_SQLITE_GRAPH_NODES, 10_000);
const queryCount = positiveInteger(process.env.AIWG_SQLITE_GRAPH_QUERIES, 1_000);
const batches = 20;
const sourceFiles = [
  'src/artifacts/backends/sqlite-backend.ts',
  'tools/benchmarks/sqlite-graph.ts',
] as const;
const root = mkdtempSync(join(tmpdir(), 'aiwg-sqlite-graph-benchmark-'));
const dbPath = join(root, 'graph.db');
const backend = new SqliteGraphBackend(dbPath, { busyTimeoutMs: 5_000 });

try {
  const cpuBefore = process.cpuUsage();
  const rssBefore = process.memoryUsage().rss;
  const delays: number[] = [];
  const writeLatencies: number[] = [];
  let logicalBytes = 0;
  const started = performance.now();
  for (let batch = 0; batch < batches; batch++) {
    const batchStarted = performance.now();
    const timerStarted = performance.now();
    const timer = new Promise<number>(resolve => setTimeout(
      () => resolve(performance.now() - timerStarted),
      0,
    ));
    const start = Math.floor((nodeCount * batch) / batches);
    const end = Math.floor((nodeCount * (batch + 1)) / batches);
    for (let index = start; index < end; index++) {
      const id = `node-${index}`;
      const attrs = {
        type: index % 2 ? 'odd' : 'even',
        phase: `phase-${index % 4}`,
      };
      backend.addNode(id, attrs);
      logicalBytes += Buffer.byteLength(JSON.stringify({ id, attrs }));
      if (index > 0) {
        const source = `node-${index - 1}`;
        backend.addEdge(source, id, 'next');
        logicalBytes += Buffer.byteLength(JSON.stringify({ source, target: id, type: 'next' }));
      }
    }
    writeLatencies.push(performance.now() - batchStarted);
    delays.push(await timer);
  }
  const writeMs = performance.now() - started;

  const expectedQueries: string[] = [];
  const observedQueries: string[] = [];
  const expectedTraversals: string[] = [];
  const observedTraversals: string[] = [];
  const queryLatencies: number[] = [];
  const queryStarted = performance.now();
  for (let index = 0; index < queryCount; index++) {
    const operationStarted = performance.now();
    const type = index % 2 ? 'odd' : 'even';
    const phase = `phase-${index % 4}`;
    const query = backend.queryNodes({ type, phase }).sort();
    const startNode = index % Math.max(1, nodeCount - 10);
    const traversal = backend.traverse(`node-${startNode}`, 'out', 10, 'next')
      .map(row => `${row.id}:${row.depth}`);
    queryLatencies.push(performance.now() - operationStarted);
    observedQueries.push(`${index}:${query.join(',')}`);
    observedTraversals.push(`${index}:${traversal.join(',')}`);
    expectedQueries.push(`${index}:${expectedQueryIds(nodeCount, type, phase).join(',')}`);
    expectedTraversals.push(`${index}:${expectedTraversal(nodeCount, startNode, 10).join(',')}`);
  }
  const queryMs = performance.now() - queryStarted;
  const walBytes = optionalSize(`${dbPath}-wal`);
  const wal = backend.walMetrics();
  backend.checkpoint('TRUNCATE');

  delays.sort((a, b) => a - b);
  writeLatencies.sort((a, b) => a - b);
  queryLatencies.sort((a, b) => a - b);
  const expectedDigest = digestJson({
    nodes: nodeCount,
    edges: Math.max(0, nodeCount - 1),
    queries: expectedQueries,
    traversals: expectedTraversals,
  });
  const observedDigest = digestJson({
    nodes: backend.nodeCount(),
    edges: backend.edgeCount(),
    queries: observedQueries,
    traversals: observedTraversals,
  });
  const now = new Date();
  const cpu = process.cpuUsage(cpuBefore);
  const repoRoot = process.cwd();
  const databaseBytes = statSync(dbPath).size;
  const evidence = {
    schemaVersion: 'aiwg.sqlite-graph-benchmark/v1',
    evidenceId: 'sqlite-local-reference-v1',
    observedAt: now.toISOString(),
    validUntil: new Date(now.getTime() + 90 * 86_400_000).toISOString(),
    subject: {
      branch: gitValue('rev-parse', '--abbrev-ref', 'HEAD'),
      commit: gitValue('rev-parse', 'HEAD'),
      sourceFiles,
      sourceDigest: digestSources(repoRoot, sourceFiles),
    },
    runtime: { node: process.version, platform: process.platform, arch: process.arch },
    sqlite: {
      engineVersion: backend.engineVersion(),
      bindingVersion: (await import('better-sqlite3/package.json', { with: { type: 'json' } })).default.version,
      journalMode: backend.journalMode(),
      schemaVersion: backend.schemaVersion(),
    },
    corpus: { nodes: nodeCount, edges: Math.max(0, nodeCount - 1), queries: queryCount },
    verification: {
      valid: expectedDigest === observedDigest,
      expectedNodes: nodeCount,
      observedNodes: backend.nodeCount(),
      expectedEdges: Math.max(0, nodeCount - 1),
      observedEdges: backend.edgeCount(),
      queryChecks: queryCount,
      traversalChecks: queryCount,
      expectedDigest,
      observedDigest,
    },
    measured: {
      writeMs: round(writeMs),
      writesPerSecond: round((nodeCount * 2 - 1) / (writeMs / 1_000)),
      writeLatencyMs: percentiles(writeLatencies),
      queryMs: round(queryMs),
      queryPairsPerSecond: round(queryCount / (queryMs / 1_000)),
      queryLatencyMs: percentiles(queryLatencies),
      eventLoopDelayMsP50: round(percentile(delays, 0.50)),
      eventLoopDelayMsP95: round(percentile(delays, 0.95)),
      eventLoopDelayMsP99: round(percentile(delays, 0.99)),
      eventLoopDelayMsMax: round(delays.at(-1) ?? 0),
      databaseBytes,
      walBytes,
      writeAmplification: round((databaseBytes + walBytes) / Math.max(logicalBytes, 1)),
      lockWaits: wal.busy,
      poolSaturation: null,
      migrationMs: null,
      recoveryMs: null,
      transportOverheadMs: null,
      walBusy: wal.busy,
      walFrames: wal.logFrames,
      checkpointedFrames: wal.checkpointedFrames,
      cpuUserMicros: cpu.user,
      cpuSystemMicros: cpu.system,
      rssBytes: Math.max(rssBefore, process.memoryUsage().rss),
    },
    interpretation: 'Reference-host observation only; not a universal support limit.',
  };
  if (!evidence.verification.valid) throw new Error('SQLite benchmark correctness parity failed');
  const serialized = `${JSON.stringify(evidence, null, 2)}\n`;
  const output = process.env.AIWG_STORAGE_BENCHMARK_OUTPUT;
  if (output) writeAtomically(resolve(output), serialized);
  console.log(serialized.trimEnd());
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

function percentiles(sorted: number[]) {
  return {
    p50: round(percentile(sorted, 0.50)),
    p95: round(percentile(sorted, 0.95)),
    p99: round(percentile(sorted, 0.99)),
  };
}

function expectedQueryIds(count: number, type: string, phase: string): string[] {
  const ids: string[] = [];
  for (let index = 0; index < count; index++) {
    if ((index % 2 ? 'odd' : 'even') === type && `phase-${index % 4}` === phase) ids.push(`node-${index}`);
  }
  return ids.sort();
}

function expectedTraversal(count: number, start: number, depth: number): string[] {
  const result: string[] = [];
  for (let offset = 1; offset <= depth && start + offset < count; offset++) {
    result.push(`node-${start + offset}:${offset}`);
  }
  return result;
}

function digestJson(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function digestSources(repoRoot: string, files: readonly string[]): string {
  const hash = createHash('sha256');
  for (const file of [...files].sort()) hash.update(file).update('\0').update(readFileSync(resolve(repoRoot, file))).update('\0');
  return hash.digest('hex');
}

function gitValue(...args: string[]): string {
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

function optionalSize(path: string): number {
  try { return statSync(path).size; } catch { return 0; }
}

function writeAtomically(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}`;
  writeFileSync(temporary, content, { encoding: 'utf8', mode: 0o600 });
  renameSync(temporary, path);
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
