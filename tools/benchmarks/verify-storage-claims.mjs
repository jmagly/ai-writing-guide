#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFileSync, realpathSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REGISTRY_SCHEMA = 'aiwg.storage-benchmark-claims/v1';
const SQLITE_EVIDENCE_SCHEMA = 'aiwg.sqlite-graph-benchmark/v1';
const SERVER_EVIDENCE_SCHEMA = 'aiwg.storage-server-benchmark/v1';
const QUALIFICATION_SCHEMA = 'aiwg.storage-qualification/v1';
const RESOURCE_METRICS = [
  'databaseBytes', 'writeAmplification', 'walBytes', 'lockWaits', 'poolSaturation',
  'migrationMs', 'recoveryMs', 'transportOverheadMs', 'cpuUserMicros', 'cpuSystemMicros', 'rssBytes',
];

export function verifyStorageBenchmarkClaims(root = process.cwd(), now = new Date()) {
  const registryPath = resolveWithin(root, 'docs/storage/evidence/claims.v1.json');
  const registry = parseJson(registryPath);
  assert(registry.schemaVersion === REGISTRY_SCHEMA, `unsupported claim registry schema: ${String(registry.schemaVersion)}`);
  assert(Array.isArray(registry.claims) && registry.claims.length > 0, 'benchmark claim registry must contain at least one claim');

  const seen = new Set();
  for (const claim of registry.claims) {
    assert(typeof claim.id === 'string' && claim.id.length > 0, 'benchmark claim is missing id');
    assert(!seen.has(claim.id), `duplicate benchmark claim id: ${claim.id}`);
    seen.add(claim.id);
    const evidence = parseJson(resolveWithin(root, claim.evidence));
    validateEvidence(root, claim, evidence, now);
    validateDocument(root, claim, evidence);
  }
  return { schemaVersion: REGISTRY_SCHEMA, valid: true, claims: [...seen].sort() };
}

function validateEvidence(root, claim, evidence, now) {
  assert(evidence.evidenceId === claim.id, `${claim.id}: evidence id mismatch`);
  validateProvenance(root, claim, evidence, now);
  if (evidence.schemaVersion === SQLITE_EVIDENCE_SCHEMA) validateSqliteEvidence(claim, evidence);
  else if (evidence.schemaVersion === SERVER_EVIDENCE_SCHEMA) validateServerEvidence(claim, evidence);
  else throw new Error(`${claim.id}: unsupported evidence schema`);
}

function validateProvenance(root, claim, evidence, now) {
  assert(Array.isArray(evidence.subject?.sourceFiles) && evidence.subject.sourceFiles.length > 0, `${claim.id}: source scope is absent`);
  assert(JSON.stringify(evidence.subject.sourceFiles) === JSON.stringify(claim.sourceFiles), `${claim.id}: source scope differs from registry`);
  assert(evidence.subject.sourceDigest === digestSources(root, claim.sourceFiles), `${claim.id}: evidence is stale for current benchmark sources`);
  assert(evidence.subject.branch === 'main', `${claim.id}: evidence was not observed from main`);
  assert(/^[0-9a-f]{40}$/.test(evidence.subject.commit), `${claim.id}: commit provenance is invalid`);

  const observedAt = Date.parse(evidence.observedAt);
  const validUntil = Date.parse(evidence.validUntil);
  assert(Number.isFinite(observedAt) && Number.isFinite(validUntil), `${claim.id}: evidence timestamps are invalid`);
  assert(observedAt <= now.getTime() + 300_000, `${claim.id}: evidence timestamp is in the future`);
  assert(validUntil > observedAt && now.getTime() <= validUntil, `${claim.id}: evidence has expired`);
  assert(Number.isInteger(claim.maxAgeDays) && claim.maxAgeDays > 0, `${claim.id}: freshness policy is invalid`);
  assert(validUntil - observedAt <= claim.maxAgeDays * 86_400_000, `${claim.id}: evidence validity exceeds policy`);
}

function validateSqliteEvidence(claim, evidence) {
  assert(evidence.verification?.valid === true, `${claim.id}: correctness verification is not valid`);
  assert(evidence.verification.expectedDigest === evidence.verification.observedDigest, `${claim.id}: correctness digest mismatch`);
  assert(evidence.verification.expectedNodes === evidence.verification.observedNodes, `${claim.id}: node-count mismatch`);
  assert(evidence.verification.expectedEdges === evidence.verification.observedEdges, `${claim.id}: edge-count mismatch`);
  assert(Number.isInteger(evidence.verification.queryChecks) && evidence.verification.queryChecks > 0, `${claim.id}: query parity is absent`);
  assert(Number.isInteger(evidence.verification.traversalChecks) && evidence.verification.traversalChecks > 0, `${claim.id}: traversal parity is absent`);
  validateResourceMetrics(claim.id, evidence.measured);
}

function validateServerEvidence(claim, evidence) {
  const qualification = evidence.qualification;
  const scope = qualification?.scope;
  const verification = qualification?.verification;
  assert(qualification?.schemaVersion === QUALIFICATION_SCHEMA, `${claim.id}: qualification schema is invalid`);
  assert(/^[0-9a-f]{64}$/.test(qualification.runId), `${claim.id}: qualification run id is invalid`);
  assert(scope?.backend === claim.backend, `${claim.id}: backend scope mismatch`);
  assert(scope?.branch === evidence.subject.branch && scope?.commit === evidence.subject.commit, `${claim.id}: qualification provenance mismatch`);
  assert(nonempty(scope?.datasetId), `${claim.id}: qualification dataset is absent`);
  assert(scope?.declaredRecords === scope?.observedRecords && Number.isInteger(scope?.observedRecords) && scope.observedRecords > 0, `${claim.id}: record scope mismatch`);
  assert(scope?.operations === scope?.observedOperations && Number.isInteger(scope?.observedOperations) && scope.observedOperations > 0, `${claim.id}: operation scope mismatch`);
  assert(Number.isInteger(scope?.readers) && scope.readers > 0 && Number.isInteger(scope?.writers) && scope.writers > 0, `${claim.id}: concurrency scope is invalid`);
  assert(verification?.valid === true, `${claim.id}: correctness verification is not valid`);
  assert(verification.expectedDigest === verification.observedDigest, `${claim.id}: correctness digest mismatch`);
  for (const field of ['missing', 'unexpected', 'corrupt']) assert(Array.isArray(verification[field]) && verification[field].length === 0, `${claim.id}: ${field} records were reported`);
  assert(Date.parse(qualification.startedAt) <= Date.parse(qualification.completedAt), `${claim.id}: qualification interval is invalid`);
  assert(qualification.completedAt === evidence.observedAt, `${claim.id}: evidence timestamp does not match qualification completion`);

  const latency = qualification.latencyMs;
  assert(nonnegativeFinite(latency?.p50) && nonnegativeFinite(latency?.p95) && nonnegativeFinite(latency?.p99), `${claim.id}: latency metrics are invalid`);
  assert(latency.p50 <= latency.p95 && latency.p95 <= latency.p99, `${claim.id}: latency percentiles are unordered`);
  assert(typeof qualification.throughputPerSecond === 'number' && Number.isFinite(qualification.throughputPerSecond) && qualification.throughputPerSecond > 0, `${claim.id}: throughput is invalid`);
  for (const field of ['errors', 'retries']) assert(Number.isInteger(qualification[field]) && qualification[field] >= 0, `${claim.id}: ${field} is invalid`);
  for (const field of ['errorRate', 'retryRate']) assert(nonnegativeFinite(qualification[field]) && qualification[field] <= 1, `${claim.id}: ${field} is invalid`);
  assert(approximatelyEqual(qualification.errorRate, qualification.errors / scope.observedOperations), `${claim.id}: error rate does not match observed operations`);
  assert(approximatelyEqual(qualification.retryRate, qualification.retries / scope.observedOperations), `${claim.id}: retry rate does not match observed operations`);
  validateResourceMetrics(claim.id, qualification.resources);
  assert(Array.isArray(claim.requiredMetrics) && claim.requiredMetrics.length > 0, `${claim.id}: required server metrics are absent`);
  assert(new Set(claim.requiredMetrics).size === claim.requiredMetrics.length, `${claim.id}: required server metrics contain duplicates`);
  for (const metric of claim.requiredMetrics) {
    assert(RESOURCE_METRICS.includes(metric), `${claim.id}: unknown required metric ${metric}`);
    assert(nonnegativeFinite(qualification.resources?.[metric]), `${claim.id}: required metric ${metric} is unavailable`);
  }

  const effects = qualification.sideEffectSummary;
  assert(Array.isArray(effects) && effects.length > 0, `${claim.id}: side-effect summary is absent`);
  assert(effects.every(item => ['committed', 'replayed'].includes(item.outcome) && Number.isInteger(item.count) && item.count > 0), `${claim.id}: side-effect summary is invalid`);
  assert(effects.reduce((sum, item) => sum + item.count, 0) === scope.observedOperations, `${claim.id}: side-effect count mismatch`);
  assert(Number.isInteger(evidence.testGate?.passed) && evidence.testGate.passed > 0, `${claim.id}: live gate did not pass`);
  assert(evidence.testGate.failed === 0, `${claim.id}: live gate reports failures`);
  assert(Number.isInteger(evidence.testGate.skipped) && evidence.testGate.skipped >= 0, `${claim.id}: live gate skip count is invalid`);
  assert(Array.isArray(evidence.testGate.coverage) && evidence.testGate.coverage.length === evidence.testGate.passed, `${claim.id}: live gate coverage does not match pass count`);
  if (evidence.testGate.skipped > 0) assert(Array.isArray(evidence.testGate.skippedCoverage) && evidence.testGate.skippedCoverage.length === evidence.testGate.skipped, `${claim.id}: skipped coverage does not match skip count`);

  assert(evidence.server?.engine === 'postgresql' && nonempty(evidence.server.engineVersion), `${claim.id}: PostgreSQL version is absent`);
  assert(nonempty(evidence.runtime?.node) && nonempty(evidence.runtime?.platform) && nonempty(evidence.runtime?.arch), `${claim.id}: runtime provenance is incomplete`);
  assert(nonempty(evidence.server.accessMode) && nonempty(evidence.server.containerImage), `${claim.id}: server identity is incomplete`);
  assert(/^sha256:[0-9a-f]{64}$/.test(evidence.server.containerDigest), `${claim.id}: server image digest is invalid`);
  if (evidence.server.accessMode === 'direct') {
    assert(claim.backend === 'postgres-direct', `${claim.id}: direct access mode does not match backend`);
    assert(evidence.server.driver?.name === 'pg' && nonempty(evidence.server.driver.version), `${claim.id}: direct driver provenance is absent`);
  } else {
    assert(claim.backend === 'postgres-postgrest', `${claim.id}: PostgREST access mode does not match backend`);
    assert(evidence.server.accessMode === 'postgrest' && nonempty(evidence.server.transportVersion), `${claim.id}: transport provenance is absent`);
  }
  assert(nonempty(evidence.interpretation), `${claim.id}: evidence interpretation is absent`);
}

function validateResourceMetrics(id, metrics) {
  for (const metric of RESOURCE_METRICS) {
    const value = metrics?.[metric];
    assert(value === null || nonnegativeFinite(value), `${id}: resource metric ${metric} is missing or invalid`);
  }
}

function validateDocument(root, claim, evidence) {
  const document = readFileSync(resolveWithin(root, claim.document), 'utf8');
  const start = `<!-- aiwg-storage-benchmark-claim:${claim.id}:start -->`;
  const end = `<!-- aiwg-storage-benchmark-claim:${claim.id}:end -->`;
  assert(document.split(start).length === 2 && document.split(end).length === 2, `${claim.id}: document must contain exactly one evidence block`);
  const actual = document.slice(document.indexOf(start), document.indexOf(end) + end.length);
  const expected = renderClaim(claim.id, evidence);
  assert(actual === expected, `${claim.id}: documented measurements do not match current evidence`);
}

export function renderClaim(id, evidence) {
  return evidence.schemaVersion === SERVER_EVIDENCE_SCHEMA
    ? renderServerClaim(id, evidence)
    : renderSqliteClaim(id, evidence);
}

function renderSqliteClaim(id, evidence) {
  const measured = evidence.measured;
  const writeLatency = measured.writeLatencyMs;
  const queryLatency = measured.queryLatencyMs;
  return [
    `<!-- aiwg-storage-benchmark-claim:${id}:start -->`,
    `A ${evidence.observedAt.slice(0, 10)} reference-host qualification on ${evidence.runtime.platform} ${evidence.runtime.arch}, Node ${evidence.runtime.node.replace(/^v/, '')}, better-sqlite3 ${evidence.sqlite.bindingVersion}, and SQLite ${evidence.sqlite.engineVersion} produced:`,
    '',
    '| Nodes / edges | Write throughput | Query + traversal pairs | Write latency p50/p95/p99 | Query latency p50/p95/p99 | Event-loop delay p95 | DB / peak WAL bytes |',
    '| ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
    `| ${integer(evidence.corpus.nodes)} / ${integer(evidence.corpus.edges)} | ${integer(Math.round(measured.writesPerSecond))} ops/s | ${integer(Math.round(measured.queryPairsPerSecond))} pairs/s | ${decimal(writeLatency.p50)} / ${decimal(writeLatency.p95)} / ${decimal(writeLatency.p99)} ms | ${decimal(queryLatency.p50)} / ${decimal(queryLatency.p95)} / ${decimal(queryLatency.p99)} ms | ${decimal(measured.eventLoopDelayMsP95)} ms | ${integer(measured.databaseBytes)} / ${integer(measured.walBytes)} |`,
    '',
    `Evidence: [${evidence.evidenceId}](../storage/evidence/${evidence.evidenceId}.json). The release gate rejects this claim when its correctness digest, source digest, freshness window, or rendered values no longer match.`,
    `<!-- aiwg-storage-benchmark-claim:${id}:end -->`,
  ].join('\n');
}

function renderServerClaim(id, evidence) {
  const report = evidence.qualification;
  const scope = report.scope;
  const resources = report.resources;
  const serverLabel = evidence.server.accessMode === 'direct'
    ? `PostgreSQL ${evidence.server.engineVersion} via pg ${evidence.server.driver.version}`
    : `PostgreSQL ${evidence.server.engineVersion} via PostgREST ${evidence.server.transportVersion}`;
  const coverage = evidence.testGate.skipped === 0
    ? `${evidence.testGate.passed} live tests passed with no skips.`
    : `${evidence.testGate.passed} live tests passed; ${evidence.testGate.skipped} authenticated-RLS test was skipped because this loopback run had no JWT authority.`;
  return [
    `<!-- aiwg-storage-benchmark-claim:${id}:start -->`,
    `A ${evidence.observedAt.slice(0, 10)} disposable loopback reference-host qualification on ${evidence.runtime.platform} ${evidence.runtime.arch}, Node ${evidence.runtime.node.replace(/^v/, '')}, and ${serverLabel} produced:`,
    '',
    '| Records / readers / writers | Throughput | Latency p50/p95/p99 | Errors / retries | DB / WAL bytes | Write amplification | Pool saturation | HTTP overhead |',
    '| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
    `| ${integer(scope.observedRecords)} / ${integer(scope.readers)} / ${integer(scope.writers)} | ${decimal(report.throughputPerSecond)} ops/s | ${decimal(report.latencyMs.p50)} / ${decimal(report.latencyMs.p95)} / ${decimal(report.latencyMs.p99)} ms | ${integer(report.errors)} / ${integer(report.retries)} | ${optionalInteger(resources.databaseBytes)} / ${optionalInteger(resources.walBytes)} | ${optionalDecimal(resources.writeAmplification)} | ${optionalDecimal(resources.poolSaturation)} | ${optionalDecimal(resources.transportOverheadMs, ' ms')} |`,
    '',
    `${coverage} This is a reference-host envelope, not production or remote-service certification.`,
    '',
    `Evidence: [${evidence.evidenceId}](evidence/${evidence.evidenceId}.json). The release gate rejects this claim when correctness, scope, source digest, required metrics, freshness, or rendered values no longer match.`,
    `<!-- aiwg-storage-benchmark-claim:${id}:end -->`,
  ].join('\n');
}

function digestSources(root, files) {
  const hash = createHash('sha256');
  for (const file of [...files].sort()) hash.update(file).update('\0').update(readFileSync(resolveWithin(root, file))).update('\0');
  return hash.digest('hex');
}

function resolveWithin(root, path) {
  assert(typeof path === 'string' && path.length > 0, 'registry path must be a non-empty string');
  const canonicalRoot = realpathSync(root);
  const candidate = resolve(canonicalRoot, path);
  const relation = relative(canonicalRoot, candidate);
  assert(relation !== '..' && !relation.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`), `path escapes repository root: ${path}`);
  return candidate;
}

function parseJson(path) {
  try { return JSON.parse(readFileSync(path, 'utf8')); }
  catch (error) { throw new Error(`cannot parse ${path}: ${error instanceof Error ? error.message : String(error)}`); }
}

function nonempty(value) { return typeof value === 'string' && value.length > 0; }
function nonnegativeFinite(value) { return typeof value === 'number' && Number.isFinite(value) && value >= 0; }
function approximatelyEqual(left, right) { return Math.abs(left - right) <= Number.EPSILON * Math.max(1, Math.abs(left), Math.abs(right)) * 4; }
function integer(value) { return Number(value).toLocaleString('en-US', { maximumFractionDigits: 0 }); }
function decimal(value) { return Number(value).toLocaleString('en-US', { maximumFractionDigits: 2 }); }
function optionalInteger(value) { return value === null ? 'n/a' : integer(value); }
function optionalDecimal(value, suffix = '') { return value === null ? 'n/a' : `${decimal(value)}${suffix}`; }
function assert(condition, message) { if (!condition) throw new Error(message); }

const invokedPath = process.argv[1] ? realpathSync(process.argv[1]) : '';
if (invokedPath === realpathSync(fileURLToPath(import.meta.url))) {
  try {
    const result = verifyStorageBenchmarkClaims(process.argv[2] ?? process.cwd());
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } catch (error) {
    process.stderr.write(`storage benchmark claim gate failed: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
