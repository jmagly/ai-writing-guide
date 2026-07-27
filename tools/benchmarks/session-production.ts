#!/usr/bin/env -S npx tsx

import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { cpus, freemem, platform, release, totalmem } from 'node:os';
import { performance } from 'node:perf_hooks';
import { resolve } from 'node:path';
import {
  CandidateExtractionService,
  IncrementalSessionImporter,
  SESSION_CONTRACT_VERSION,
  SessionRepository,
  SessionSearchService,
  StructuralCandidateExtractor,
  type ImportCheckpoint,
  type NormalizedImportBatch,
  type ProviderRecord,
  type SessionRepositoryPort,
  type SessionSemanticBackend,
  type SessionSource,
  type SessionSourceAdapter,
} from '../../src/sessions/index.js';

const output = resolve('test-results/session-performance.json');
const startedAt = new Date().toISOString();
const phases: Array<{ name: string; status: string; elapsedMs: number }> = [];
let activePhase = 'environment';
let benchmarkFinished = false;

const config = {
  contractVersion: '1.0.0',
  generatorVersion: '1.0.0',
  seed: Number(process.env.AIWG_SESSION_BENCH_SEED ?? 1932),
  eventCount: Number(process.env.AIWG_SESSION_BENCH_EVENTS ?? 10_000),
  iterations: Number(process.env.AIWG_SESSION_BENCH_ITERATIONS ?? 15),
  batchSize: Number(process.env.AIWG_SESSION_BENCH_BATCH ?? 500),
  timeoutMs: Number(process.env.AIWG_SESSION_BENCH_TIMEOUT_MS ?? 45 * 60 * 1_000),
  budgets: {
    lexicalP95Ms: Number(process.env.AIWG_SESSION_BENCH_SEARCH_P95_MS ?? 2_000),
    metadataP95Ms: Number(process.env.AIWG_SESSION_BENCH_METADATA_P95_MS ?? 500),
    minimumImportRecordsPerSecond: Number(
      process.env.AIWG_SESSION_BENCH_IMPORT_RPS ?? 100,
    ),
    maximumHeapGrowthBytes: Number(
      process.env.AIWG_SESSION_BENCH_HEAP_BYTES ?? 512 * 1024 * 1024,
    ),
    maximumRssBytes: Number(
      process.env.AIWG_SESSION_BENCH_RSS_BYTES ?? 3 * 1024 * 1024 * 1024,
    ),
    hybridP95Ms: Number(process.env.AIWG_SESSION_BENCH_HYBRID_P95_MS ?? 2_500),
    maximumBackpressureLead: Number(
      process.env.AIWG_SESSION_BENCH_BACKPRESSURE_LEAD ?? 500,
    ),
  },
};

mkdirSync(resolve('test-results'), { recursive: true });
persist({
  contractVersion: '1.0.0',
  benchmark: 'session-production-path',
  status: 'running',
  startedAt,
  activePhase,
  config,
  phases,
});
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    if (!benchmarkFinished) {
      persistFailure(`benchmark interrupted by ${signal}`);
      process.exit(1);
    }
  });
}
const timeout = setTimeout(() => {
  persistFailure(`benchmark exceeded ${config.timeoutMs}ms timeout`);
  process.exit(1);
}, config.timeoutMs);
timeout.unref();

const require = createRequire(import.meta.url);
let sqliteVersion: string;
try {
  require('better-sqlite3');
  sqliteVersion = JSON.parse(
    readFileSync(resolve('node_modules/better-sqlite3/package.json'), 'utf8'),
  ).version;
} catch {
  fail('production session benchmark requires the optional better-sqlite3 backend');
}

if (!Number.isSafeInteger(config.eventCount) || config.eventCount < 1_100) {
  fail('AIWG_SESSION_BENCH_EVENTS must be an integer of at least 1,100');
}

const records = function* (): Generator<ProviderRecord> {
  for (let index = 0; index < config.eventCount; index += 1) {
    yield {
      nativeSessionId: `session-${index % 25}`,
      nativeEventId: `event-${index}`,
      sequence: Math.floor(index / 25),
      kind: 'message',
      role: index % 2 ? 'assistant' : 'user',
      occurredAt: new Date(1_700_000_000_000 + index * 1_000).toISOString(),
      text: index % 100 === 0
        ? `Decision: benchmark needle ${index}`
        : `ordinary benchmark event ${index}`,
      rawReference: { locatorClass: 'generated-benchmark', sequence: index },
    };
  }
};

const adapter: SessionSourceAdapter = {
  provider: 'generic',
  adapterVersion: '1.0.0',
  disposition: 'implemented',
  supportedOperations: ['inspect', 'stream'],
  acquisitionModes: ['generated'],
  async *discover() {},
  async inspect() {
    return {
      sourceSchemaVersion: '1.0.0',
      consistency: 'complete',
      operationalState: 'available',
    };
  },
  async *stream(_source, cursor) {
    const start = Number(cursor?.value ?? 0);
    let index = 0;
    for (const record of records()) {
      if (index++ >= start) yield record;
    }
  },
};

const source: SessionSource = {
  contractVersion: SESSION_CONTRACT_VERSION,
  sourceId: `benchmark-${config.seed}`,
  provider: 'generic',
  providerProfile: 'production-benchmark',
  locatorClass: 'generated-benchmark',
  redactedLocator: '<generated-benchmark>',
  adapterVersion: '1.0.0',
  sourceSchemaVersion: '1.0.0',
  disposition: 'implemented',
  operationalState: 'available',
  consistency: 'complete',
  authorizedAt: '2026-07-27T00:00:00.000Z',
  extensions: { 'native.generic': { generatorVersion: config.generatorVersion } },
};

const repository = new SessionRepository();
let peakHeapBytes = process.memoryUsage().heapUsed;
let peakRssBytes = process.memoryUsage().rss;
const sampler = setInterval(() => {
  peakHeapBytes = Math.max(peakHeapBytes, process.memoryUsage().heapUsed);
  peakRssBytes = Math.max(peakRssBytes, process.memoryUsage().rss);
}, 5);
const baselineHeapBytes = process.memoryUsage().heapUsed;

try {
  beginPhase('import');
  const importStarted = performance.now();
  const receipts = await new IncrementalSessionImporter(repository).import({
    source,
    selectedSource: {
      provider: 'generic',
      sourceId: source.sourceId,
      locator: '<generated-benchmark>',
      locatorClass: 'generated-benchmark',
      authorizedScope: { workspaceId: 'benchmark', allowedRoots: ['/benchmark'] },
    },
    adapter,
    workspaceId: 'benchmark',
    policyVersion: '1.0.0',
    limits: {
      batchSize: config.batchSize,
      maxRecords: config.eventCount,
      maxTotalBytes: 1024 * 1024 * 1024,
    },
  });
  const importMs = performance.now() - importStarted;
  const inserted = receipts.reduce((sum, receipt) => sum + receipt.eventsInserted, 0);
  if (inserted !== config.eventCount) {
    throw new Error(`production importer inserted ${inserted}/${config.eventCount} events`);
  }
  completePhase('import', importStarted);

  beginPhase('lexical');
  const lexicalStarted = performance.now();
  const lexicalSamples = measure(config.iterations, () => {
    const result = repository.search({
      query: 'needle',
      workspaceId: 'benchmark',
      providers: ['generic'],
      limit: 50,
    });
    const expectedHits = Math.min(50, Math.ceil(config.eventCount / 100));
    if (result.items.length !== expectedHits) {
      throw new Error(
        `lexical benchmark returned ${result.items.length}/${expectedHits} expected hits`,
      );
    }
  });
  completePhase('lexical', lexicalStarted);
  beginPhase('metadata');
  const metadataStarted = performance.now();
  const metadataSamples = measure(config.iterations, () => {
    const result = repository.listSessions({
      workspaceId: 'benchmark',
      limit: 25,
      offset: 0,
    });
    if (result.items.length !== 25) throw new Error('metadata benchmark returned incomplete page');
  });
  completePhase('metadata', metadataStarted);

  beginPhase('hybrid');
  const hybridPhaseStarted = performance.now();
  const hybridBackend: SessionSemanticBackend = {
    id: 'deterministic-local-benchmark',
    requiresNetwork: false,
    requiresModel: false,
    async rank(request) {
      return request.documents.map((document, index) => ({
        eventId: document.eventId,
        score: 1 - index / Math.max(1, request.documents.length),
      }));
    },
  };
  const searchService = new SessionSearchService(repository);
  const hybridOptions = {
    query: 'needle',
    workspaceId: 'benchmark',
    providers: ['generic'],
    limit: 50,
  };
  const hybridSamples: number[] = [];
  for (let index = 0; index < config.iterations; index += 1) {
    const hybridStarted = performance.now();
    const preview = searchService.preview(hybridOptions, hybridBackend);
    const result = await searchService.search({
      options: hybridOptions,
      mode: 'hybrid',
      backend: hybridBackend,
      authorization: { approved: true, operationId: preview.operationId },
    });
    if (result.items.length === 0) throw new Error('hybrid benchmark returned no hits');
    hybridSamples.push(performance.now() - hybridStarted);
  }
  completePhase('hybrid', hybridPhaseStarted);

  beginPhase('extraction');
  const extractionDocuments = repository.authorizedSearchDocuments({
    workspaceId: 'benchmark',
    limit: 500,
  });
  const extractionStarted = performance.now();
  const extracted = await new CandidateExtractionService({
    saveCandidates: (candidates) => [...candidates],
  }).extract({
    documents: extractionDocuments,
    extractor: new StructuralCandidateExtractor(),
    policy: {
      version: '1.0.0',
      projectScope: 'benchmark',
      temporalScope: 'source-event',
      minimumConfidence: 0.5,
    },
  });
  const extractionMs = performance.now() - extractionStarted;
  completePhase('extraction', extractionStarted);

  beginPhase('bounded-failure');
  const boundedStarted = performance.now();
  let boundedFailure = false;
  const boundedRepository = new SessionRepository();
  try {
    await new IncrementalSessionImporter(boundedRepository).import({
      source: { ...source, sourceId: `${source.sourceId}-bounded` },
      selectedSource: {
        provider: 'generic',
        sourceId: `${source.sourceId}-bounded`,
        locator: '<generated-benchmark>',
        locatorClass: 'generated-benchmark',
        authorizedScope: { workspaceId: 'benchmark', allowedRoots: ['/benchmark'] },
      },
      adapter,
      workspaceId: 'benchmark',
      policyVersion: '1.0.0',
      limits: { maxRecords: 10, batchSize: 500 },
    });
  } catch (error) {
    boundedFailure = typeof error === 'object' && error !== null
      && 'code' in error && error.code === 'RESOURCE_LIMIT_EXCEEDED';
  } finally {
    boundedRepository.close();
  }
  completePhase('bounded-failure', boundedStarted);

  beginPhase('backpressure');
  let produced = 0;
  let persisted = 0;
  let maximumLead = 0;
  const slowRepository = new SessionRepository();
  const slowPort: SessionRepositoryPort = {
    applyImport(batch: NormalizedImportBatch, checkpoint: ImportCheckpoint, publish?: boolean) {
      const until = performance.now() + 1;
      while (performance.now() < until) { /* deliberate downstream pressure */ }
      const receipt = slowRepository.applyImport(batch, checkpoint, publish);
      persisted += batch.events.length;
      maximumLead = Math.max(maximumLead, produced - persisted);
      return receipt;
    },
    getCheckpoint: (...args) => slowRepository.getCheckpoint(...args),
    commitStagedImports: (...args) => slowRepository.commitStagedImports(...args),
  };
  const backpressureAdapter: SessionSourceAdapter = {
    ...adapter,
    async *stream() {
      for (let index = 0; index < config.batchSize * 3; index += 1) {
        produced += 1;
        maximumLead = Math.max(maximumLead, produced - persisted);
        yield {
          nativeSessionId: 'backpressure',
          nativeEventId: `backpressure-${index}`,
          sequence: index,
          kind: 'message',
          role: 'assistant',
          text: `bounded backpressure ${index}`,
          rawReference: { locatorClass: 'generated-benchmark', sequence: index },
        };
      }
    },
  };
  const backpressureStarted = performance.now();
  try {
    await new IncrementalSessionImporter(slowPort).import({
      source: { ...source, sourceId: `${source.sourceId}-backpressure` },
      selectedSource: {
        provider: 'generic',
        sourceId: `${source.sourceId}-backpressure`,
        locator: '<generated-benchmark>',
        locatorClass: 'generated-benchmark',
        authorizedScope: { workspaceId: 'benchmark', allowedRoots: ['/benchmark'] },
      },
      adapter: backpressureAdapter,
      workspaceId: 'benchmark',
      policyVersion: '1.0.0',
      limits: {
        maxRecords: config.batchSize * 3,
        batchSize: config.batchSize,
        maxTotalBytes: 1024 * 1024 * 1024,
      },
    });
  } finally {
    slowRepository.close();
  }
  const backpressureMs = performance.now() - backpressureStarted;
  completePhase('backpressure', backpressureStarted);

  clearInterval(sampler);
  peakHeapBytes = Math.max(peakHeapBytes, process.memoryUsage().heapUsed);
  peakRssBytes = Math.max(peakRssBytes, process.memoryUsage().rss);
  const packageJson = JSON.parse(readFileSync(resolve('package.json'), 'utf8')) as {
    version: string;
  };
  const metrics = {
    import: {
      milliseconds: round(importMs),
      recordsPerSecond: round(config.eventCount / (importMs / 1_000)),
      batches: receipts.length,
    },
    lexical: summarize(lexicalSamples),
    metadata: summarize(metadataSamples),
    hybrid: summarize(hybridSamples),
    extraction: {
      milliseconds: round(extractionMs),
      documents: extractionDocuments.length,
      candidates: extracted.length,
    },
    memory: {
      baselineHeapBytes,
      peakHeapBytes,
      heapGrowthBytes: peakHeapBytes - baselineHeapBytes,
      peakRssBytes,
    },
    backpressure: {
      milliseconds: round(backpressureMs),
      records: produced,
      maximumLead,
      slowDownstreamDelayMsPerBatch: 1,
    },
    boundedFailure,
  };
  const gates = {
    lexicalP95: metrics.lexical.p95Ms <= config.budgets.lexicalP95Ms,
    metadataP95: metrics.metadata.p95Ms <= config.budgets.metadataP95Ms,
    importThroughput:
      metrics.import.recordsPerSecond >= config.budgets.minimumImportRecordsPerSecond,
    peakMemory:
      metrics.memory.heapGrowthBytes <= config.budgets.maximumHeapGrowthBytes,
    peakRss: metrics.memory.peakRssBytes <= config.budgets.maximumRssBytes,
    hybridP95: metrics.hybrid.p95Ms <= config.budgets.hybridP95Ms,
    backpressure:
      metrics.backpressure.maximumLead <= config.budgets.maximumBackpressureLead,
    boundedFailure,
  };
  const result = {
    contractVersion: '1.0.0',
    benchmark: 'session-production-path',
    status: Object.values(gates).every(Boolean) ? 'pass' : 'fail',
    startedAt,
    completedAt: new Date().toISOString(),
    config,
    command: 'npm run benchmark:sessions',
    machine: {
      platform: platform(),
      release: release(),
      node: process.version,
      cpu: cpus()[0]?.model ?? 'unknown',
      cpuCount: cpus().length,
      totalMemoryBytes: totalmem(),
      freeMemoryBytes: freemem(),
    },
    dependencies: {
      aiwg: packageJson.version,
      betterSqlite3: sqliteVersion,
    },
    metrics,
    gates,
    phases,
  };
  benchmarkFinished = true;
  clearTimeout(timeout);
  persist(result);
  console.log(JSON.stringify(result, null, 2));
  if (result.status !== 'pass') process.exitCode = 1;
} catch (error) {
  clearTimeout(timeout);
  persistFailure(error instanceof Error ? error.message : String(error));
  throw error;
} finally {
  clearInterval(sampler);
  repository.close();
}

function measure(iterations: number, operation: () => void): number[] {
  const samples: number[] = [];
  for (let index = 0; index < iterations; index += 1) {
    const started = performance.now();
    operation();
    samples.push(performance.now() - started);
  }
  return samples;
}

function summarize(samples: number[]) {
  const ordered = [...samples].sort((left, right) => left - right);
  return {
    iterations: ordered.length,
    p50Ms: round(percentile(ordered, 0.5)),
    p95Ms: round(percentile(ordered, 0.95)),
    maxMs: round(ordered.at(-1) ?? 0),
    rawMs: samples.map(round),
  };
}

function percentile(ordered: number[], fraction: number): number {
  return ordered[Math.min(ordered.length - 1, Math.ceil(ordered.length * fraction) - 1)] ?? 0;
}

function round(value: number): number {
  return Number(value.toFixed(2));
}

function beginPhase(name: string): void {
  activePhase = name;
  persist({
    contractVersion: '1.0.0',
    benchmark: 'session-production-path',
    status: 'running',
    startedAt,
    activePhase,
    config,
    phases,
  });
}

function completePhase(name: string, phaseStarted: number): void {
  phases.push({
    name,
    status: 'pass',
    elapsedMs: round(performance.now() - phaseStarted),
  });
  beginPhase('between-phases');
}

function persist(value: unknown): void {
  const temporary = `${output}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`);
  renameSync(temporary, output);
}

function persistFailure(message: string): void {
  benchmarkFinished = true;
  persist({
    contractVersion: '1.0.0',
    benchmark: 'session-production-path',
    status: 'fail',
    startedAt,
    completedAt: new Date().toISOString(),
    activePhase,
    failure: message,
    config,
    phases: [
      ...phases,
      { name: activePhase, status: 'fail', elapsedMs: 0 },
    ],
  });
}

function fail(message: string): never {
  persistFailure(message);
  throw new Error(message);
}
