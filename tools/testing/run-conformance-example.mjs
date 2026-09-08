#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { inspectRestoration } from './conformance-example-state.mjs';
import { resolveProjectAiwgDir } from '../../src/config/project-artifacts-runtime.mjs';
import { artifact, digest, validateContract } from '../../agentic/code/addons/testing-quality/lib/contracts.mjs';
import { inventoryWorkspace, sampleFrame } from '../../agentic/code/addons/testing-quality/lib/inventory.mjs';
import { collectEvidence } from '../../agentic/code/addons/testing-quality/lib/collector.mjs';
import { collectControls } from '../../agentic/code/addons/testing-quality/lib/controls.mjs';
import { createPlan } from '../../agentic/code/addons/testing-quality/lib/normalization.mjs';
import { assessConformance } from '../../agentic/code/addons/testing-quality/lib/assessment.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const protocolPath = 'config/testing/conformance-example.json';
const reviewPath = 'config/testing/conformance-example.review.json';
const read = async file => JSON.parse(await fs.readFile(path.join(root, file), 'utf8'));
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');

// This entry point mutates one reviewed source file temporarily. Serialize runs
// before reading source, and never remove another invocation's lock.
const lock = path.join(root, 'test-results/conformance-example.lock');
await fs.mkdir(path.dirname(lock), { recursive: true });
try { await fs.mkdir(lock); }
catch (error) {
  if (error.code === 'EEXIST') throw new Error(`Conformance example already running or interrupted: inspect ${lock}`);
  throw error;
}

const runId = `${new Date().toISOString().replace(/[:.]/g, '-')}-${crypto.randomUUID()}`;
const relative = `test-results/conformance-example/${runId}`;
const directory = path.join(root, relative);
const canonical = path.join(resolveProjectAiwgDir(root), 'testing/conformance-example', runId);
await fs.mkdir(directory, { recursive: true });
const save = async (name, value) => fs.writeFile(path.join(directory, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
let controlSource;
let controlBefore;
let controlMode;
let controlRestored = true;
let passed = false;
try {
  const review = await read(reviewPath);
  if (review.version !== 1 || !review.reviewer || !Array.isArray(review.files) || !review.bindings) {
    throw new Error('Invalid reviewed example manifest; perform semantic review before updating it.');
  }
  // Bind an existing review to its reviewed bytes. Never regenerate these pins
  // from the current tree and call that a fresh semantic review.
  for (const [file, expected] of Object.entries(review.bindings)) {
    if (!/^[a-f0-9]{64}$/.test(expected) || sha256(await fs.readFile(path.join(root, file))) !== expected) {
      throw new Error(`Semantic review is stale for ${file}; review the change and update its recorded binding.`);
    }
  }
  const protocol = JSON.parse(JSON.stringify(await read(protocolPath)).replaceAll('{evidenceDir}', relative));
  const lane = protocol.spec.lanes[0];
  const control = review.control;
  controlSource = control.path;
  controlBefore = await fs.readFile(path.join(root, controlSource), 'utf8');
  controlMode = (await fs.lstat(path.join(root, controlSource))).mode & 0o777;
  if (controlBefore.split(control.from).length !== 2) throw new Error('Reviewed source mutation must match exactly once.');
  const plan = await createPlan(root, [{ path: controlSource, content: controlBefore.replace(control.from, control.to) }], {
    purpose: 'Prove partial target failure cannot be accepted as a killed multi-target negative control.',
  });
  await save('mutation-plan.json', plan);
  lane.negativeControls = [{
    id: 'all-targets-must-fail', description: control.description,
    changePlan: `${relative}/mutation-plan.json`, command: lane.command, result: lane.result,
    testIds: control.cases.map(name => JSON.stringify([lane.id, review.files[0].path, name])),
  }];
  await validateContract(protocol, 'conformance-protocol.v1');
  await save('protocol.json', protocol);
  const inventory = await inventoryWorkspace(root, protocol);
  await save('inventory.json', inventory);
  if (!inventory.spec.complete) throw new Error(`Incomplete inventory: ${JSON.stringify(inventory.spec.diagnostics)}`);
  for (const file of inventory.spec.files.filter(file => file.isSource || file.role === 'test')) {
    if (review.bindings[file.path] !== file.hash) throw new Error(`Missing current semantic-review binding: ${file.path}`);
  }
  const sample = sampleFrame(inventory.spec.files.filter(file => file.role === 'test').map(file => ({
    id: file.path, area: file.areas[0], path: file.path, hash: file.hash,
  })), { seed: 'aiwg-conformance-example-v1', size: 20, populationHash: inventory.spec.snapshotHash });
  await save('sample.json', sample);
  const discovery = await collectEvidence(root, protocol, { mode: 'discovery', outputDir: `${relative}/discovery` });
  await save('discovery.json', discovery);
  const execution = await collectEvidence(root, protocol, { mode: 'execution', outputDir: `${relative}/execution` });
  await save('execution.json', execution);
  for (const id of lane.negativeControls[0].testIds) {
    if (!execution.spec.lanes[0].normalized.cases.some(test => test.id === id && test.status === 'passed')) {
      throw new Error(`Reviewed control case is absent or not passing in actual runner evidence: ${id}`);
    }
  }
  const reviews = artifact('TestConformanceReview', {
    root, protocolHash: digest(protocol), snapshotHash: inventory.spec.snapshotHash,
    reviewer: review.reviewer, files: review.files.map(file => ({ ...file, hash: review.bindings[file.path] })),
  });
  await validateContract(reviews, 'test-review.v1');
  await save('reviews.json', reviews);
  controlRestored = false;
  const controls = await collectControls(root, protocol, { evidence: execution, outputDir: `${relative}/controls` });
  controlRestored = controls.spec.sourceRestored === true;
  await save('controls.json', controls);
  const assessment = await assessConformance(root, protocol, { inventory, evidence: [discovery, execution, controls], reviews });
  await save('assessment.json', assessment);
  const report = `# AIWG conformance example: ${assessment.spec.status}\n\n` +
    `Scope: ${inventory.spec.counts.testFiles} reviewed test file; this is not repository-wide certification.\n\n` +
    assessment.spec.gates.map(gate => `- **${gate.status} — ${gate.id}**: ${gate.message}`).join('\n') +
    '\n\n' + assessment.spec.limitations.map(value => `- ${value}`).join('\n') + '\n';
  await fs.writeFile(path.join(directory, 'report.md'), report, { flag: 'wx' });
  if (assessment.spec.status !== 'conformant') throw new Error(`Conformance ${assessment.spec.status}; inspect ${relative}/report.md`);
  passed = true;
} catch (error) {
  await save('failure.json', { message: error.message });
  process.exitCode = 1;
  console.error(error.message);
} finally {
  // collectControls owns restoration and its journals. Do not overwrite drift
  // here: a failed restore needs its receipt and explicit recovery.
  const restoration = await inspectRestoration(
    controlSource ? path.join(root, controlSource) : '',
    controlBefore === undefined ? undefined : { content: controlBefore, mode: controlMode }, controlRestored,
  );
  const restored = restoration.sourceRestored;
  if (!restored) { process.exitCode = 1; console.error('Source restoration is incomplete; preserve the lock and inspect control receipts.'); }
  await save('run.json', { runId, passed: passed && restored, sourceRestored: restored, restorationDiagnostics: restoration.diagnostics, workspaceEvidence: relative, canonicalEvidence: canonical });
  await fs.mkdir(path.dirname(canonical), { recursive: true });
  await fs.cp(directory, canonical, { recursive: true, errorOnExist: true, force: false });
  if (restored) await fs.rmdir(lock);
  console.log(`Conformance evidence: ${canonical}`);
}
