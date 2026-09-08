#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolveProjectAiwgDir } from '../../src/config/project-artifacts-runtime.mjs';
import { createProtocol } from '../../agentic/code/addons/testing-quality/lib/profiles.mjs';
import { inventoryWorkspace, sampleFrame } from '../../agentic/code/addons/testing-quality/lib/inventory.mjs';
import { validateContract } from '../../agentic/code/addons/testing-quality/lib/contracts.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const id = `${new Date().toISOString().replace(/[:.]/g, '-')}-${crypto.randomUUID()}`;
const destination = path.join(resolveProjectAiwgDir(root), 'testing/conformance-audit', id);
await fs.mkdir(destination, { recursive: true });
const save = async (name, value) => fs.writeFile(path.join(destination, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });

// The ownership gate reads configured globs and imported runner APIs. Preserve
// its failures; a lane declaration is not actual runner registration evidence.
try { execFileSync(process.execPath, ['tools/testing/check-test-registration.mjs'], { cwd: root, stdio: 'inherit' }); }
catch (error) {
  await save('ownership-failure.json', { status: error.status ?? null, message: 'Runner ownership gate failed; no prior report was reused.' });
  throw new Error(`Runner ownership failed; inspect ${destination}/ownership-failure.json`);
}
const ownership = JSON.parse(await fs.readFile(path.join(root, 'test-results/test-registration.json'), 'utf8'));
await save('runner-ownership.json', ownership);
if (!ownership.files?.length || ownership.errors.length) throw new Error(`Resolve runner ownership errors first; evidence: ${destination}`);

const protocol = await createProtocol(root, { platform: 'javascript-vitest', name: 'aiwg-root-test-audit', system: 'Root runtime, framework and Ralph testing lanes; app-local and live-system qualification remain separate.' });
protocol.metadata.description = 'Source-file audit and reproducible review sample. Lane recipes are recorded, not executed by this command.';
protocol.spec.source.include = ['src/**/*.{ts,mjs,js}', 'tools/**/*.{ts,mjs,js}', 'schemas/**/*.json', 'agentic/code/frameworks/*/src/**/*.{ts,mjs,js}', 'agentic/code/addons/testing-quality/lib/*.mjs'];
protocol.spec.source.exclude.push('test-results/**', '**/fixtures/**');
protocol.spec.tests = { include: ownership.files.map(record => record.file), exclude: ['test-results/**', '**/fixtures/**'] };
const areas = new Map();
const lanes = new Map();
for (const record of ownership.files) {
  const area = record.file.startsWith('test/') ? record.file.split('/')[1] : record.file.startsWith('tools/') ? 'tool-tests' : 'framework-tests';
  if (!areas.has(area)) areas.set(area, []);
  areas.get(area).push(record.file);
  for (const owner of record.lanes) {
    if (!lanes.has(owner.id)) lanes.set(owner.id, { ...owner, files: [] });
    lanes.get(owner.id).files.push(record.file);
  }
}
protocol.spec.areas = [...areas].map(([id, include]) => ({ id, include }));
protocol.spec.lanes = [...lanes.values()].map(lane => {
  const id = lane.id.replace(/[^a-z0-9-]/gi, '-');
  const definition = {
    id, runner: lane.id === 'node' ? 'node' : 'vitest', include: lane.files, exclude: [], required: !lane.live,
    command: { argv: lane.id === 'node' ? ['node', '--test', '--test-reporter=tap', ...lane.files] : ['node', 'node_modules/vitest/vitest.mjs', 'run', '--config', lane.id, '--reporter=json', `--outputFile=test-results/conformance-audit/{runId}/${id}.json`], timeoutMs: 1800000 },
    result: lane.id === 'node' ? { format: 'node-tap' } : { format: 'vitest', path: `test-results/conformance-audit/{runId}/${id}.json` },
    negativeControls: [],
  };
  if (lane.id !== 'node') definition.discovery = {
    command: { argv: ['node', 'node_modules/vitest/vitest.mjs', 'list', '--config', lane.id, `--json=test-results/conformance-audit/{runId}/${id}-discovery.json`], timeoutMs: 300000 },
    result: { format: 'vitest', path: `test-results/conformance-audit/{runId}/${id}-discovery.json` },
  };
  return definition;
});
protocol.spec.configFiles = [...lanes.keys()].filter(file => file !== 'node').concat(['config/test-lanes.mjs', 'package.json', '.gitea/workflows/ci.yml', 'node_modules/vitest/package.json']);
protocol.spec.research = { paths: [], allowWeb: false };
await validateContract(protocol, 'conformance-protocol.v1');
await save('protocol.json', protocol);
const inventory = await inventoryWorkspace(root, protocol);
await save('inventory.json', inventory);
if (!inventory.spec.complete) { process.exitCode = 2; throw new Error(`Inventory has unresolved diagnostics: ${destination}/inventory.json`); }
const sample = sampleFrame(inventory.spec.files.filter(file => file.role === 'test').map(file => ({
  id: file.path, area: file.areas[0], path: file.path, hash: file.hash,
})), { seed: 'aiwg-release-2026.9.6-review', size: 20, populationHash: inventory.spec.snapshotHash });
await save('sample.json', sample);
await fs.writeFile(path.join(destination, 'README.md'),
  `# AIWG source-file testing audit\n\n${inventory.spec.counts.testFiles} test files; ${inventory.spec.counts.sourceFiles} source files.\n\n` +
  'Areas describe test directories, not inferred semantic quality. The fixed-seed sample selects up to 20 files per area, using a census for smaller areas.\n\n' +
  'This command does not execute lanes or certify tests. Runner registration, execution, whole-scope semantic review, coverage and attributable controls remain separate requirements. App/package-local tests and live-system qualification are outside this root audit.\n');
console.log(`Source-file audit and sample: ${destination}`);
