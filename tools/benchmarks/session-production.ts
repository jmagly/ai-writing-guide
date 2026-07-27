#!/usr/bin/env -S npx tsx

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { cpus, freemem, platform, release, totalmem } from 'node:os';
import { performance } from 'node:perf_hooks';
import { resolve } from 'node:path';
import {
  CandidateExtractionService,
  IncrementalSessionImporter,
  SESSION_CONTRACT_VERSION,
  SessionRepository,
  StructuralCandidateExtractor,
  type ProviderRecord,
  type SessionSource,
  type SessionSourceAdapter,
} from '../../src/sessions/index.js';

const config = {
  contractVersion: '1.0.0',
  generatorVersion: '1.0.0',
  seed: Number(process.env.AIWG_SESSION_BENCH_SEED ?? 1932),
  eventCount: Number(process.env.AIWG_SESSION_BENCH_EVENTS ?? 10_000),
  iterations: Number(process.env.AIWG_SESSION_BENCH_ITERATIONS ?? 15),
  batchSize: Number(process.env.AIWG_SESSION_BENCH_BATCH ?? 500),
  budgets: {
    lexicalP95Ms: Number(process.env.AIWG_SESSION_BENCH_SEARCH_P95_MS ?? 2_000),
    metadataP95Ms: Number(process.env.AIWG_SESSION_BENCH_METADATA_P95_MS ?? 500),
    minimumImportRecordsPerSecond: Number(
      process.env.AIWG_SESSION_BENCH_IMPORT_RPS ?? 100,
    ),
    maximumHeapGrowthBytes: Number(
      process.env.AIWG_SESSION_BENCH_HEAP_BYTES ?? 512 * 1024 * 1024,
    ),
  },
};

const require = createRequire(import.meta.url);
let sqliteVersion: string;
try {
  require('better-sqlite3');
  sqliteVersion = JSON.parse(
    readFileSync(resolve('node_modules/better-sqlite3/package.json'), 'utf8'),
  ).version;
} catch {
  throw new Error(
    'production session benchmark requires the optional better-sqlite3 backend',
  );
}

if (!Number.isSafeInteger(config.eventCount) || config.eventCount < 1_100) {
  throw new Error('AIWG_SESSION_BENCH_EVENTS must be an integer of at least 1,100');
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
  const metadataSamples = measure(config.iterations, () => {
    const result = repository.listSessions({
      workspaceId: 'benchmark',
      limit: 25,
      offset: 0,
    });
    if (result.items.length !== 25) throw new Error('metadata benchmark returned incomplete page');
  });
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
    boundedFailure,
  };
  const gates = {
    lexicalP95: metrics.lexical.p95Ms <= config.budgets.lexicalP95Ms,
    metadataP95: metrics.metadata.p95Ms <= config.budgets.metadataP95Ms,
    importThroughput:
      metrics.import.recordsPerSecond >= config.budgets.minimumImportRecordsPerSecond,
    peakMemory:
      metrics.memory.heapGrowthBytes <= config.budgets.maximumHeapGrowthBytes,
    boundedFailure,
  };
  const result = {
    contractVersion: '1.0.0',
    benchmark: 'session-production-path',
    status: Object.values(gates).every(Boolean) ? 'pass' : 'fail',
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
  };
  mkdirSync(resolve('test-results'), { recursive: true });
  const output = resolve('test-results/session-performance.json');
  writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify(result, null, 2));
  if (result.status !== 'pass') process.exitCode = 1;
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
