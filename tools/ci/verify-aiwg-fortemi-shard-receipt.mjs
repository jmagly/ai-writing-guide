#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import Ajv2020 from 'ajv/dist/2020.js';

import {
  getKnowledgeShardContractReceipt,
  unpackTarGz,
  validateFullV1ShardArchive,
  validateShardArchive,
} from '@fortemi/core';
import { aiwgFortemiIndexToKnowledgeShardWithReport } from '@fortemi/core/aiwg-index-shard';

const require = createRequire(import.meta.url);
const root = resolve(import.meta.dirname, '..', '..');
const fixtureRoot = resolve(root, 'test', 'fixtures', 'fortemi-shard');
const receiptPath = resolve(fixtureRoot, 'aiwg-core-v1.receipt.json');
const receipt = JSON.parse(readFileSync(receiptPath, 'utf8'));
const receiptSchemaPath = resolve(
  root,
  'schemas',
  'artifacts',
  'aiwg-fortemi-shard-receipt.v1.schema.json',
);
const receiptSchema = JSON.parse(readFileSync(receiptSchemaPath, 'utf8'));
const fullReceiptPath = resolve(fixtureRoot, 'aiwg-full-v1.consumer.receipt.json');
const fullReceipt = JSON.parse(readFileSync(fullReceiptPath, 'utf8'));
const packageLock = require(resolve(root, 'package-lock.json'));
const corePackage = require('@fortemi/core/package.json');

function fail(message) {
  throw new Error(`AIWG Fortemi shard receipt: ${message}`);
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? root,
    env: { ...process.env, ...options.env },
    encoding: 'utf8',
    stdio: options.capture ? 'pipe' : 'inherit',
  });
  if (result.status !== 0) {
    fail(`${command} ${args.join(' ')} failed with exit ${result.status ?? 'unknown'}`);
  }
  return result.stdout?.trim() ?? '';
}

function runBytes(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: options.cwd ?? root, encoding: null });
  if (result.status !== 0) fail(`${command} ${args.join(' ')} failed with exit ${result.status ?? 'unknown'}`);
  return result.stdout;
}

if (receipt.schema_version !== 'aiwg.fortemi.shard-receipt.v1') {
  fail(`unsupported receipt schema ${receipt.schema_version}`);
}
const ajv = new Ajv2020({ allErrors: true, strict: false });
const validateReceipt = ajv.compile(receiptSchema);
if (!validateReceipt(receipt)) {
  fail(`receipt schema validation failed: ${ajv.errorsText(validateReceipt.errors)}`);
}
if (corePackage.version !== receipt.converter.package.version) {
  fail(`installed Core ${corePackage.version} does not match receipt`);
}
const lockedCore = packageLock.packages?.['node_modules/@fortemi/core'];
if (lockedCore?.version !== receipt.converter.package.version) {
  fail(`locked Core ${lockedCore?.version ?? 'missing'} does not match receipt`);
}
if (lockedCore?.integrity !== receipt.converter.package.integrity) {
  fail('locked Core registry integrity does not match receipt');
}
const authority = getKnowledgeShardContractReceipt();
if (authority.source.commit !== receipt.authority.commit) fail('Core authority commit does not match receipt');
if (authority.source.contractSha256 !== receipt.authority.contract_sha256) fail('Core contract digest does not match receipt');
if (authority.knowledgeShard.schemaVersion !== receipt.authority.schema_version) fail('Core schema version does not match receipt');
if (authority.schemaBundle.sha256 !== receipt.authority.schema_bundle_sha256) fail('Core schema bundle digest does not match receipt');

const producerCommit = run('git', ['rev-parse', `${receipt.producer.commit}^{commit}`], { capture: true });
if (producerCommit !== receipt.producer.commit) fail('producer commit is unavailable');
// The receipt describes the immutable producer revision, not whichever later
// AIWG release happens to verify it. Resolve package identity from that commit
// so routine version bumps cannot invalidate otherwise unchanged provenance.
const producerPackage = JSON.parse(run('git', ['show', `${producerCommit}:package.json`], { capture: true }));
if (producerPackage.name !== receipt.producer.package.name) {
  fail(`producer package name ${producerPackage.name ?? 'missing'} does not match receipt`);
}
if (producerPackage.version !== receipt.producer.package.version) {
  fail(`producer package version ${producerPackage.version ?? 'missing'} does not match receipt`);
}
const sourceAuthorityCommit = run(
  'git',
  ['rev-parse', `${receipt.producer.source_contract.authority_commit}^{commit}`],
  { capture: true },
);
if (sourceAuthorityCommit !== receipt.producer.source_contract.authority_commit) {
  fail('AIWG source-contract authority commit is unavailable');
}
if (
  sha256(runBytes('git', [
    'show',
    `${sourceAuthorityCommit}:${receipt.producer.source_contract.path}`,
  ])) !== receipt.producer.source_contract.schema_sha256
) {
  fail('AIWG source-contract schema does not match its authority commit');
}
if (
  sha256(runBytes('git', [
    'show',
    `${producerCommit}:${receipt.producer.source_contract.path}`,
  ])) !== receipt.producer.source_contract.schema_sha256
) {
  fail('AIWG producer does not consume the pinned source-contract schema');
}

const archivePath = resolve(root, receipt.archive.path);
const archive = new Uint8Array(readFileSync(archivePath));
if (sha256(archive) !== receipt.archive.sha256) fail('archive SHA-256 mismatch');
if (sha256(runBytes('git', ['show', `${receipt.producer.commit}:${receipt.archive.path}`])) !== receipt.archive.sha256) {
  fail('archive digest does not match immutable producer commit');
}
if (archive.byteLength !== receipt.archive.bytes) fail('archive byte count mismatch');
const validation = validateShardArchive(archive);
if (!validation.valid) fail(`archive validation failed: ${validation.errors.join('; ')}`);
const files = unpackTarGz(archive);
const manifest = JSON.parse(new TextDecoder().decode(files.get('manifest.json')));
for (const [key, expected] of Object.entries(receipt.archive.manifest)) {
  if (JSON.stringify(manifest[key]) !== JSON.stringify(expected)) {
    fail(`manifest ${key} does not match receipt`);
  }
}
if (receipt.capability_loss_report.portable !== true) fail('receipt is not portable');
if (receipt.capability_loss_report.losses.length !== 0) fail('receipt declares losses');

if (fullReceipt.schema_version !== 'aiwg.fortemi.full-v1-consumer-receipt.v1') {
  fail(`unsupported full-v1 receipt schema ${fullReceipt.schema_version}`);
}
if (fullReceipt.converter.entrypoint !== '@fortemi/core/aiwg-index-shard') {
  fail('full-v1 receipt does not name the public package entry point');
}
if (corePackage.exports?.['./aiwg-index-shard'] === undefined) {
  fail('installed Core package does not export the full-v1 entry point');
}
if (corePackage.version !== fullReceipt.converter.package.version) {
  fail(`installed Core ${corePackage.version} does not match full-v1 receipt`);
}
if (lockedCore?.version !== fullReceipt.converter.package.version) {
  fail(`locked Core ${lockedCore?.version ?? 'missing'} does not match full-v1 receipt`);
}
if (lockedCore?.integrity !== fullReceipt.converter.package.integrity) {
  fail('locked Core registry integrity does not match full-v1 receipt');
}
if (
  fullReceipt.authority.contract_revision !== '20' ||
  fullReceipt.authority.schema_version !== '2.0.0'
) {
  fail('full-v1 receipt does not pin the released schema-2 authority');
}

const consumerCommit = run('git', ['rev-parse', `${fullReceipt.consumer.commit}^{commit}`], { capture: true });
if (consumerCommit !== fullReceipt.consumer.commit) fail('full-v1 consumer commit is unavailable');
const consumerPackage = JSON.parse(run('git', ['show', `${consumerCommit}:package.json`], { capture: true }));
if (consumerPackage.name !== fullReceipt.consumer.package.name) {
  fail(`full-v1 consumer package name ${consumerPackage.name ?? 'missing'} does not match receipt`);
}
if (consumerPackage.version !== fullReceipt.consumer.package.version) {
  fail(`full-v1 consumer package version ${consumerPackage.version ?? 'missing'} does not match receipt`);
}

const sourcePath = resolve(root, fullReceipt.source.path);
const sourceBytes = readFileSync(sourcePath);
if (sha256(sourceBytes) !== fullReceipt.source.sha256) fail('full-v1 source SHA-256 mismatch');
if (
  sha256(runBytes('git', ['show', `${consumerCommit}:${fullReceipt.source.path}`])) !==
  fullReceipt.source.sha256
) {
  fail('full-v1 source digest does not match immutable consumer commit');
}
const fullArchivePath = resolve(root, fullReceipt.archive.path);
const fullArchive = new Uint8Array(readFileSync(fullArchivePath));
if (sha256(fullArchive) !== fullReceipt.archive.sha256) fail('full-v1 archive SHA-256 mismatch');
if (
  sha256(runBytes('git', ['show', `${consumerCommit}:${fullReceipt.archive.path}`])) !==
  fullReceipt.archive.sha256
) {
  fail('full-v1 archive digest does not match immutable consumer commit');
}
if (fullArchive.byteLength !== fullReceipt.archive.bytes) fail('full-v1 archive byte count mismatch');

const fullValidation = await validateFullV1ShardArchive(fullArchive);
if (!fullValidation.valid) {
  fail(`full-v1 archive validation failed: ${fullValidation.errors.join('; ')}`);
}
const fullFiles = unpackTarGz(fullArchive);
const fullManifestBytes = fullFiles.get('manifest.json');
if (!fullManifestBytes) fail('full-v1 archive has no manifest');
const fullManifest = JSON.parse(new TextDecoder().decode(fullManifestBytes));
if (fullManifest.format !== fullReceipt.archive.manifest.format) fail('full-v1 manifest format mismatch');
if (fullManifest.version !== fullReceipt.archive.manifest.version) fail('full-v1 manifest version mismatch');
if (fullManifest.profile !== fullReceipt.archive.manifest.profile) fail('full-v1 manifest profile mismatch');
if (fullManifest.components.length !== fullReceipt.archive.manifest.components) {
  fail('full-v1 manifest component count mismatch');
}
if (new Set(fullManifest.components).size !== 33) fail('full-v1 manifest components are not unique');
if (sha256(fullManifestBytes) !== fullReceipt.archive.manifest.manifest_sha256) {
  fail('full-v1 manifest SHA-256 mismatch');
}

const fullSource = JSON.parse(sourceBytes.toString('utf8'));
const conversionOptions = {
  createdAt: '2026-07-22T12:00:00.000Z',
  matricVersion: '2026.7.13-candidate',
};
const generated = await aiwgFortemiIndexToKnowledgeShardWithReport(fullSource, conversionOptions);
const repeated = await aiwgFortemiIndexToKnowledgeShardWithReport(fullSource, conversionOptions);
if (!generated.success || !generated.lossless || generated.losses.length !== 0) {
  fail('full-v1 conversion is not successful and lossless');
}
if (sha256(generated.archive) !== fullReceipt.archive.sha256) {
  fail('full-v1 regeneration does not match receipt archive');
}
if (sha256(repeated.archive) !== fullReceipt.archive.sha256) {
  fail('repeated full-v1 regeneration is not deterministic');
}
if (JSON.stringify(repeated.receipt) !== JSON.stringify(generated.receipt)) {
  fail('repeated full-v1 conversion receipt is not deterministic');
}
if (generated.receipt.schema_version !== fullReceipt.conversion.schema_version) {
  fail('full-v1 conversion receipt schema mismatch');
}
if (generated.receipt.source_schema_version !== fullReceipt.conversion.source_schema_version) {
  fail('full-v1 source schema mismatch');
}
if (generated.receipt.authority_commit !== fullReceipt.authority.commit) {
  fail('full-v1 authority commit mismatch');
}
if (generated.receipt.authority_contract_sha256 !== fullReceipt.authority.contract_sha256) {
  fail('full-v1 authority contract digest mismatch');
}
if (generated.receipt.authority_schema_bundle_sha256 !== fullReceipt.authority.schema_bundle_sha256) {
  fail('full-v1 authority schema bundle digest mismatch');
}
if (generated.receipt.manifest_sha256 !== fullReceipt.archive.manifest.manifest_sha256) {
  fail('full-v1 conversion manifest digest mismatch');
}
if (generated.receipt.contract_valid !== fullReceipt.conversion.contract_valid) {
  fail('full-v1 conversion contract status mismatch');
}
if (fullReceipt.conversion.lossless !== true || fullReceipt.conversion.losses.length !== 0) {
  fail('full-v1 consumer receipt declares conversion loss');
}
if (
  fullReceipt.advertisement.advertised !== false ||
  fullReceipt.advertisement.default_profile !== 'core-v1'
) {
  fail('full-v1 consumer receipt overstates the advertised AIWG profile');
}

const serverFlag = process.argv.indexOf('--server-checkout');
if (serverFlag >= 0) {
  const checkout = process.argv[serverFlag + 1];
  if (!checkout) fail('--server-checkout requires a path');
  const actualCommit = run('git', ['rev-parse', 'HEAD'], { cwd: checkout, capture: true });
  if (actualCommit !== receipt.consumers.fortemi.commit) {
    fail(`Fortemi checkout ${actualCommit} does not match receipt`);
  }
  if (run('git', ['status', '--porcelain'], { cwd: checkout, capture: true })) {
    fail('Fortemi checkout is not clean before native receipt verification');
  }

  const implementationCommit = run('git', ['rev-parse', 'HEAD^'], {
    cwd: checkout,
    capture: true,
  });
  if (implementationCommit !== receipt.consumers.fortemi.implementation_commit) {
    fail('Fortemi receipt commit is not directly based on the declared implementation commit');
  }
  const verifyConsumerArtifact = (reference, label) => {
    const artifactPath = resolve(checkout, reference.path);
    const bytes = readFileSync(artifactPath);
    if (sha256(bytes) !== reference.sha256) {
      fail(`${label} SHA-256 mismatch`);
    }
    if (reference.bytes !== undefined && bytes.byteLength !== reference.bytes) {
      fail(`${label} byte count mismatch`);
    }
    if (
      sha256(runBytes('git', ['show', `${actualCommit}:${reference.path}`], { cwd: checkout })) !==
      reference.sha256
    ) {
      fail(`${label} does not match immutable Fortemi consumer commit`);
    }
    return bytes;
  };

  const serverFixture = verifyConsumerArtifact(
    receipt.consumers.fortemi.fixture,
    'Fortemi fixture',
  );
  if (sha256(serverFixture) !== receipt.archive.sha256) {
    fail('Fortemi fixture does not match the immutable AIWG producer archive');
  }
  const producerReceipt = JSON.parse(
    verifyConsumerArtifact(
      receipt.consumers.fortemi.producer_receipt,
      'Fortemi producer receipt',
    ).toString('utf8'),
  );
  if (
    producerReceipt.producer?.commit !== receipt.producer.commit ||
    producerReceipt.converter?.commit !== receipt.converter.commit ||
    producerReceipt.fixture?.sha256 !== receipt.archive.sha256
  ) {
    fail('Fortemi producer receipt does not bind the integrated producer, converter, and archive');
  }
  const cellReceipt = JSON.parse(
    verifyConsumerArtifact(
      receipt.consumers.fortemi.cell_receipt,
      'Fortemi cell receipt',
    ).toString('utf8'),
  );
  if (
    cellReceipt.status !== 'consumer-conformance-passed' ||
    cellReceipt.cell !== 'aiwg-core-v1-to-fortemi' ||
    cellReceipt.producer?.commit !== receipt.producer.commit ||
    cellReceipt.consumer?.baseCommit !== receipt.consumers.fortemi.implementation_commit ||
    cellReceipt.fixture?.sha256 !== receipt.archive.sha256 ||
    cellReceipt.claimBoundary?.profile !== receipt.claim_boundary.profile
  ) {
    fail('Fortemi cell receipt does not bind the declared core-v1 consumer evidence');
  }
  run(
    'cargo',
    [
      'test',
      '-p',
      'matric-api',
      '--bin',
      'matric-api',
      'aiwg_core_v1_current_fixture',
      '--',
      '--nocapture',
    ],
    {
      cwd: checkout,
      env: {
        DATABASE_URL: process.env.DATABASE_URL ?? 'postgres://matric:matric@localhost/matric',
      },
    },
  );
  if (run('git', ['status', '--porcelain'], { cwd: checkout, capture: true })) {
    fail('Fortemi checkout is not clean after native receipt verification');
  }
}

console.log(JSON.stringify({
  receipt: receiptPath,
  archiveSha256: receipt.archive.sha256,
  profile: manifest.profile,
  schemaVersion: manifest.version,
  fullV1Receipt: fullReceiptPath,
  fullV1ArchiveSha256: fullReceipt.archive.sha256,
  fullV1Profile: fullManifest.profile,
  fullV1SchemaVersion: fullManifest.version,
  fullV1Advertised: fullReceipt.advertisement.advertised,
  corePackage: corePackage.version,
  serverVerified: serverFlag >= 0,
}, null, 2));
