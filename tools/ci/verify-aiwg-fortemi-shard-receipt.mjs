#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

import { unpackTarGz, validateShardArchive } from '@fortemi/core';

const require = createRequire(import.meta.url);
const root = resolve(import.meta.dirname, '..', '..');
const fixtureRoot = resolve(root, 'test', 'fixtures', 'fortemi-shard');
const receiptPath = resolve(fixtureRoot, 'aiwg-core-v1.receipt.json');
const receipt = JSON.parse(readFileSync(receiptPath, 'utf8'));
const packageJson = require(resolve(root, 'package.json'));
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

if (receipt.schema_version !== 'aiwg.fortemi.shard-receipt.v1') {
  fail(`unsupported receipt schema ${receipt.schema_version}`);
}
if (packageJson.version !== receipt.producer.package.version) {
  fail(`AIWG package version ${packageJson.version} does not match receipt`);
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

const archivePath = resolve(root, receipt.archive.path);
const archive = new Uint8Array(readFileSync(archivePath));
if (sha256(archive) !== receipt.archive.sha256) fail('archive SHA-256 mismatch');
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

const serverFlag = process.argv.indexOf('--server-checkout');
if (serverFlag >= 0) {
  const checkout = process.argv[serverFlag + 1];
  if (!checkout) fail('--server-checkout requires a path');
  const actualCommit = run('git', ['rev-parse', 'HEAD'], { cwd: checkout, capture: true });
  if (actualCommit !== receipt.consumers.fortemi.commit) {
    fail(`Fortemi checkout ${actualCommit} does not match receipt`);
  }
  if (run('git', ['status', '--porcelain'], { cwd: checkout, capture: true })) {
    fail('Fortemi checkout is not clean before applying the receipt harness');
  }
  const patchPath = resolve(fixtureRoot, receipt.consumers.fortemi.harness.path);
  if (sha256(readFileSync(patchPath)) !== receipt.consumers.fortemi.harness.sha256) {
    fail('Fortemi consumer harness SHA-256 mismatch');
  }
  run('git', ['apply', '--check', patchPath], { cwd: checkout });
  run('git', ['apply', patchPath], { cwd: checkout });
  run(
    'cargo',
    ['test', '-p', 'matric-api', 'aiwg_core_v1_external_fixture_clean_import_reexport', '--', '--nocapture'],
    {
      cwd: checkout,
      env: {
        AIWG_SHARD_FIXTURE: archivePath,
        DATABASE_URL: process.env.DATABASE_URL ?? 'postgres://matric:matric@localhost/matric',
      },
    },
  );
  run(
    'cargo',
    ['test', '-p', 'matric-api', 'shard_core_v1_server_export_clean_import_preserves_semantic_state', '--', '--nocapture'],
    {
      cwd: checkout,
      env: {
        DATABASE_URL: process.env.DATABASE_URL ?? 'postgres://matric:matric@localhost/matric',
      },
    },
  );
}

console.log(JSON.stringify({
  receipt: receiptPath,
  archiveSha256: receipt.archive.sha256,
  profile: manifest.profile,
  schemaVersion: manifest.version,
  corePackage: corePackage.version,
  serverVerified: serverFlag >= 0,
}, null, 2));
