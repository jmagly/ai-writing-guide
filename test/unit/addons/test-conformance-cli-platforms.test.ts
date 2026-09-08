import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
const cli = path.resolve('agentic/code/addons/testing-quality/commands/test-conformance.mjs');
const adapter = path.resolve('agentic/code/addons/testing-quality/adapters/pytest_reporter.py');
const nodeModules = path.resolve('node_modules');
const python = process.env.TEST_CONFORMANCE_PYTHON || 'python3';
const pythonReady = spawnSync(python, ['-c', 'import pytest']).status === 0;
let root: string, external: string;
beforeEach(async () => { root = await fs.mkdtemp(path.join(os.tmpdir(), 'conformance-cli-target-')); external = await fs.mkdtemp(path.join(os.tmpdir(), 'conformance-cli-cwd-')); });
afterEach(async () => { await fs.rm(root, { recursive: true, force: true }); await fs.rm(external, { recursive: true, force: true }); });
async function write(file: string, text: string) { await fs.mkdir(path.dirname(path.join(root, file)), { recursive: true }); await fs.writeFile(path.join(root, file), text); }
function run(command: string, args: string[] = [], status = 0) {
  const child = spawnSync(process.execPath, [cli, command, '--root', root, ...args], { cwd: external, encoding: 'utf8', timeout: 30000, maxBuffer: 4 * 1024 * 1024 });
  expect({ status: child.status, stderr: child.stderr }).toEqual({ status, stderr: '' });
  return JSON.parse(child.stdout);
}

async function qualify(platform: string) {
  const isPython = platform === 'python-pytest';
  const source = isPython ? 'src/boundary.py' : 'src/boundary.js';
  const broken = isPython ? 'def positive(n):\n    return n >= 0\n' : 'export const positive = n => n >= 0;';
  const fixed = isPython ? 'def positive(n):\n    return n > 0\n' : 'export const positive = n => n > 0;';
  await write(source, broken);
  if (isPython) {
    await write('pytest.ini', '[pytest]\ntestpaths = tests\n');
    await write('tests/test_boundary.py', `import pytest\nfrom src.boundary import positive\n@pytest.mark.parametrize('value,want',[(0,False),(1,True)])\ndef test_boundary(value,want):\n    assert positive(value) is want\n`);
    await write('.aiwg/testing/conformance/adapters/pytest_reporter.py', await fs.readFile(adapter, 'utf8'));
  } else {
    await fs.symlink(nodeModules, path.join(root, 'node_modules'), 'dir');
    await write('package.json', '{"type":"module"}');
    await write('vitest.config.mjs', 'export default {test:{include:["tests/**/*.test.js"]}};');
    await write('tests/boundary.test.js', `import {test,expect} from 'vitest';\nimport {positive} from '../src/boundary.js';\nfor (const [value,want] of [[0,false],[1,true]]) test('boundary '+value,()=>expect(positive(value)).toBe(want));`);
  }
  const protocol = run('init', ['--platform', platform]);
  if (isPython) {
    const lane = protocol.spec.lanes[0];
    for (const command of [lane.command, lane.discovery.command]) { command.argv[0] = python; command.env = { PYTHONPATH: root, PYTEST_DISABLE_PLUGIN_AUTOLOAD: '1', PYTHONDONTWRITEBYTECODE: '1' }; }
    lane.versionCommand[0] = python;
    await write('.aiwg/testing/conformance.yaml', JSON.stringify(protocol));
  }
  run('inventory', ['--output', '.aiwg/testing/initial-inventory.json']);
  const discovery = run('collect', ['--mode', 'discovery', '--output', '.aiwg/testing/discovery.json']);
  const sample = run('sample', ['--inventory', '.aiwg/testing/initial-inventory.json', '--evidence', '.aiwg/testing/discovery.json', '--unit', 'registered-case', '--seed', 'repair-qualification', '--size', '2']);
  expect(sample.spec.areas[0].sampled).toBe(2);
  expect(discovery.spec.lanes[0].normalized.cases).toHaveLength(2);
  const failure = run('collect', ['--output', '.aiwg/testing/before-repair.json'], 2);
  expect(failure.spec.lanes[0].normalized.summary.failed).toBe(1);
  await write('.aiwg/testing/changes.json', JSON.stringify({ purpose: 'Repair boundary behavior; preserve the existing oracle', edits: [{ path: source, content: fixed }] }));
  const plan = run('plan', ['--changes', '.aiwg/testing/changes.json', '--output', '.aiwg/testing/repair-plan.json']);
  expect(await fs.readFile(path.join(root, source), 'utf8')).toBe(broken);
  expect(plan.spec.changes[0].before.content).toBe(broken);
  const applied = run('apply', ['--plan', '.aiwg/testing/repair-plan.json', '--receipt', '.aiwg/testing/repair-receipt.json']);
  expect(await fs.readFile(path.join(root, source), 'utf8')).toBe(fixed);
  const repaired = run('collect', ['--output', '.aiwg/testing/after-repair.json']);
  expect(repaired.spec.lanes[0].normalized.summary.passed).toBe(2);
  run('rollback', ['--receipt', applied.spec.receiptPath]);
  expect(await fs.readFile(path.join(root, source), 'utf8')).toBe(broken);
  expect(run('collect', [], 2).spec.lanes[0].normalized.summary.failed).toBe(1);
  expect(await fs.readdir(external)).toEqual([]);
}

describe('public direct CLI from external cwd', () => {
  it('qualifies Vitest init/inventory/discovery/sample and semantic repair/apply/rollback', () => qualify('javascript-vitest'), 60000);
  it.skipIf(!pythonReady)('qualifies existing pytest init/inventory/discovery/sample and semantic repair/apply/rollback', () => qualify('python-pytest'), 60000);
});
