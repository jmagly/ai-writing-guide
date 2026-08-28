#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFileSync, realpathSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REGISTRY_SCHEMA = 'aiwg.storage-benchmark-claims/v1';
const EVIDENCE_SCHEMA = 'aiwg.sqlite-graph-benchmark/v1';

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
  assert(evidence.schemaVersion === EVIDENCE_SCHEMA, `${claim.id}: unsupported evidence schema`);
  assert(evidence.evidenceId === claim.id, `${claim.id}: evidence id mismatch`);
  assert(evidence.verification?.valid === true, `${claim.id}: correctness verification is not valid`);
  assert(evidence.verification.expectedDigest === evidence.verification.observedDigest, `${claim.id}: correctness digest mismatch`);
  assert(evidence.verification.expectedNodes === evidence.verification.observedNodes, `${claim.id}: node-count mismatch`);
  assert(evidence.verification.expectedEdges === evidence.verification.observedEdges, `${claim.id}: edge-count mismatch`);
  assert(Number.isInteger(evidence.verification.queryChecks) && evidence.verification.queryChecks > 0, `${claim.id}: query parity is absent`);
  assert(Number.isInteger(evidence.verification.traversalChecks) && evidence.verification.traversalChecks > 0, `${claim.id}: traversal parity is absent`);
  assert(Array.isArray(evidence.subject?.sourceFiles) && evidence.subject.sourceFiles.length > 0, `${claim.id}: source scope is absent`);
  assert(JSON.stringify(evidence.subject.sourceFiles) === JSON.stringify(claim.sourceFiles), `${claim.id}: source scope differs from registry`);
  assert(evidence.subject.sourceDigest === digestSources(root, claim.sourceFiles), `${claim.id}: evidence is stale for current benchmark sources`);
  assert(/^[0-9a-f]{40}$/.test(evidence.subject.commit), `${claim.id}: commit provenance is invalid`);

  const observedAt = Date.parse(evidence.observedAt);
  const validUntil = Date.parse(evidence.validUntil);
  assert(Number.isFinite(observedAt) && Number.isFinite(validUntil), `${claim.id}: evidence timestamps are invalid`);
  assert(observedAt <= now.getTime() + 300_000, `${claim.id}: evidence timestamp is in the future`);
  assert(validUntil > observedAt && now.getTime() <= validUntil, `${claim.id}: evidence has expired`);
  assert(validUntil - observedAt <= claim.maxAgeDays * 86_400_000, `${claim.id}: evidence validity exceeds policy`);
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

function integer(value) { return Number(value).toLocaleString('en-US', { maximumFractionDigits: 0 }); }
function decimal(value) { return Number(value).toLocaleString('en-US', { maximumFractionDigits: 2 }); }
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
