import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
// @ts-expect-error Native addon module.
import { createProtocol } from '../../../agentic/code/addons/testing-quality/lib/profiles.mjs';
// @ts-expect-error Native addon module.
import { collectEvidence, verifyReceipt } from '../../../agentic/code/addons/testing-quality/lib/collector.mjs';
// @ts-expect-error Native addon module.
import { addonRoot } from '../../../agentic/code/addons/testing-quality/lib/contracts.mjs';

const python = process.env.TEST_CONFORMANCE_PYTHON || 'python3';
const pythonReady = spawnSync(python, ['-c', 'import pytest'], { encoding: 'utf8' }).status === 0;
let root: string;
beforeEach(async () => { root = await fs.mkdtemp(path.join(os.tmpdir(), 'conformance-lifecycle-')); });
afterEach(async () => { await fs.rm(root, { recursive: true, force: true }); });
async function write(relative: string, text: string) { const file = path.join(root, relative); await fs.mkdir(path.dirname(file), { recursive: true }); await fs.writeFile(file, text); }
async function lifecycle(protocol: any, source: string, broken: string, marker: string) {
  const discovery = await collectEvidence(root, protocol, { mode: 'discovery' });
  expect(discovery.spec.lanes[0].process.exitCode).toBe(0);
  expect(discovery.spec.lanes[0].normalized.complete).toBe(true);
  expect(discovery.spec.lanes[0].normalized.cases).toHaveLength(2);
  expect(discovery.spec.lanes[0].normalized.cases.every((c: any) => c.status === 'unknown')).toBe(true);
  await expect(fs.stat(path.join(root, marker))).rejects.toMatchObject({ code: 'ENOENT' });
  const execution = await collectEvidence(root, protocol);
  expect(execution.spec.lanes[0].process.exitCode).toBe(0);
  expect(execution.spec.lanes[0].normalized.summary.passed).toBe(2);
  expect(execution.spec.lanes[0].normalized.cases.map((c: any) => c.id).sort()).toEqual(discovery.spec.lanes[0].normalized.cases.map((c: any) => c.id).sort());
  expect(await verifyReceipt(root, protocol, execution)).toEqual([]);
  await write(source, broken);
  expect((await verifyReceipt(root, protocol, execution)).some((e: any) => e.code === 'STALE_RECEIPT')).toBe(true);
  const failed = await collectEvidence(root, protocol);
  expect(failed.spec.lanes[0].process.exitCode).toBe(1);
  expect(failed.spec.lanes[0].normalized.summary.failed).toBeGreaterThan(0);
}

describe('real registered-versus-executed platform qualification', () => {
  it('qualifies installed Vitest collection, execution, stale evidence and an actual SUT defect', async () => {
    await fs.symlink(path.resolve('node_modules'), path.join(root, 'node_modules'), 'dir');
    await write('package.json', '{"type":"module"}');
    await write('vitest.config.mjs', 'export default {test:{include:["test/**/*.test.js"]}};');
    await write('src/positive.js', 'export const positive = n => n > 0;');
    await write('test/positive.test.js', `import {test,expect,describe} from 'vitest';
import fs from 'node:fs'; import {positive} from '../src/positive.js';
describe('positive',()=>{ for (const [n,want] of [[0,false],[1,true]]) test('boundary '+n,()=>{fs.writeFileSync('body-ran','yes'); expect(positive(n)).toBe(want);}); });`);
    const protocol = await createProtocol(root, { platform: 'javascript-vitest' });
    await lifecycle(protocol, 'src/positive.js', 'export const positive = n => n >= 0;', 'body-ran');
  }, 30000);

  it.skipIf(!pythonReady)('qualifies existing pytest hooks collection and execution without installing dependencies', async () => {
    await write('pytest.ini', '[pytest]\ntestpaths = tests\n');
    await write('src/positive.py', 'def positive(n):\n    return n > 0\n');
    await write('tests/test_positive.py', `import pytest\nfrom pathlib import Path\nfrom src.positive import positive\n@pytest.mark.parametrize('value,want', [(0, False), (1, True)])\ndef test_boundary(value, want):\n    Path('body-ran').write_text('yes')\n    assert positive(value) is want\n`);
    const destination = '.aiwg/testing/conformance/adapters/pytest_reporter.py';
    await write(destination, await fs.readFile(path.join(addonRoot, 'adapters/pytest_reporter.py'), 'utf8'));
    const protocol = await createProtocol(root, { platform: 'python-pytest' });
    const lane = protocol.spec.lanes[0];
    for (const command of [lane.command, lane.discovery.command]) {
      command.argv[0] = python;
      command.env = { PYTHONPATH: root, PYTEST_DISABLE_PLUGIN_AUTOLOAD: '1', PYTHONDONTWRITEBYTECODE: '1' };
    }
    lane.versionCommand[0] = python;
    await lifecycle(protocol, 'src/positive.py', 'def positive(n):\n    return n >= 0\n', 'body-ran');
  }, 30000);
  it.skipIf(!pythonReady)('retains pytest skip, setup/teardown failures and collection errors', async () => {
    await write('pytest.ini', '[pytest]\ntestpaths = tests\n');
    await write('tests/test_phases.py', `import pytest
@pytest.fixture
def bad_setup():
    raise RuntimeError('setup broke')
@pytest.fixture
def bad_teardown():
    yield
    raise RuntimeError('teardown broke')
def test_setup(bad_setup):
    assert False

def test_teardown(bad_teardown):
    assert True
@pytest.mark.skip(reason='explicit qualification skip')
def test_skip():
    assert False
`);
    const destination = '.aiwg/testing/conformance/adapters/pytest_reporter.py';
    await write(destination, await fs.readFile(path.join(addonRoot, 'adapters/pytest_reporter.py'), 'utf8'));
    const protocol = await createProtocol(root, { platform: 'python-pytest' });
    const lane = protocol.spec.lanes[0];
    for (const command of [lane.command, lane.discovery.command]) {
      command.argv[0] = python;
      command.env = { PYTHONPATH: root, PYTEST_DISABLE_PLUGIN_AUTOLOAD: '1', PYTHONDONTWRITEBYTECODE: '1' };
    }
    lane.versionCommand[0] = python;
    const execution = await collectEvidence(root, protocol);
    expect(execution.spec.lanes[0].normalized.complete).toBe(true);
    expect(execution.spec.lanes[0].normalized.summary).toMatchObject({ total: 3, failed: 2, skipped: 1, passed: 0 });
    await write('tests/test_broken_import.py', 'raise RuntimeError("collection broke")\n');
    const collection = await collectEvidence(root, protocol, { mode: 'discovery' });
    expect(collection.spec.lanes[0].normalized.complete).toBe(false);
    expect(collection.spec.lanes[0].normalized.errors.some((e: any) => e.code === 'COLLECTION_FAILURE')).toBe(true);
  }, 30000);

});
