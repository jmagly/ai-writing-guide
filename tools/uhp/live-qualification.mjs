#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { UhpClient, UHP_VERSION, resolveUhpProfile } from '../../dist/src/uhp/index.js';

function option(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function required(name) {
  const value = option(name);
  if (!value) throw new Error(`Missing required ${name}.`);
  return value;
}

async function main() {
  if (process.env.AIWG_UHP_LIVE !== '1') {
    console.log(JSON.stringify({ schemaVersion: 'uhp-qualification.aiwg.io/v1', status: 'skipped', reason: 'AIWG_UHP_LIVE is not 1', costSensitiveOptIn: false, protocolVersion: UHP_VERSION }, null, 2));
    return;
  }
  const image = required('--image');
  if (!/@sha256:[a-f0-9]{64}$/i.test(image)) throw new Error('--image must use an immutable @sha256 digest.');
  const container = required('--container');
  if (!/^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/.test(container)) throw new Error('--container must be a simple Docker container name or id.');
  const inspected = JSON.parse(execFileSync('docker', ['inspect', container], { encoding: 'utf8', maxBuffer: 2 * 1024 * 1024 }))[0];
  if (!inspected?.State?.Running) throw new Error(`HarnessRouter container '${container}' is not running.`);
  if (inspected?.Config?.Image !== image) throw new Error(`Container image '${String(inspected?.Config?.Image)}' does not match requested digest-pinned image.`);
  const profileName = required('--profile');
  const configPath = path.resolve(option('--config') ?? '.aiwg/aiwg.config');
  const config = JSON.parse(await readFile(configPath, 'utf8'));
  const profile = resolveUhpProfile(config.uhp, profileName);
  const startedAt = new Date().toISOString();
  const client = new UhpClient(profileName, profile);
  const discovery = await client.discover();
  const harnesses = await client.listHarnesses();
  const models = await client.listModels(profile.defaultHarness);
  const allowCost = process.argv.includes('--allow-cost');
  let response;
  if (allowCost) response = await client.createResponse({ input: option('--prompt') ?? 'Return the exact word: qualified', model: profile.defaultModel, metadata: profile.defaultHarness ? { harness_id: profile.defaultHarness } : {} });
  const finishedAt = new Date().toISOString();
  console.log(JSON.stringify({
    schemaVersion: 'uhp-qualification.aiwg.io/v1', status: 'completed', interoperabilityScope: 'AIWG experimental UHP client interoperability; not server conformance',
    image, container, containerImageId: inspected.Image, protocolVersion: UHP_VERSION, advertisedVersions: discovery.versions,
    profile: profileName, harness: profile.defaultHarness ?? harnesses[0]?.id ?? null,
    model: profile.defaultModel ?? null, modelCatalogueObserved: Boolean(models),
    startedAt, finishedAt, costSensitiveOptIn: allowCost,
    task: allowCost ? { responseId: response?.id, status: response?.status } : { status: 'skipped', reason: '--allow-cost not supplied' },
  }, null, 2));
}

main().catch(error => {
  console.error(JSON.stringify({ schemaVersion: 'uhp-qualification.aiwg.io/v1', status: 'failed', protocolVersion: UHP_VERSION, error: error.message }, null, 2));
  process.exitCode = 1;
});
