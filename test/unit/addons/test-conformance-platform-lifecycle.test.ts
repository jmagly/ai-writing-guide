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

// @ts-expect-error Shipped addon MJS.
import { collectControls, verifyControls } from '../../../agentic/code/addons/testing-quality/lib/controls.mjs';
// @ts-expect-error Shipped addon MJS.
import { createPlan } from '../../../agentic/code/addons/testing-quality/lib/normalization.mjs';

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
  const pythonCase = source.endsWith('.py');
  const file = pythonCase ? 'tests/test_positive.py' : 'test/positive.test.js';
  const names = pythonCase ? ['tests/test_positive.py::test_boundary[0-False]', 'tests/test_positive.py::test_boundary[1-True]'] : ['positive > boundary 0', 'positive > boundary 1'];
  expect(failed.spec.lanes[0].normalized.cases.map((c: any) => ({id:c.id,status:c.status}))).toEqual(names.map((name,index)=>({id:JSON.stringify(['default',file,name]),status:index===0?'failed':'passed'})));
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
  it('qualifies real Vitest negative controls with exact case attribution and restored evidence', async () => {
    await fs.symlink(path.resolve('node_modules'), path.join(root,'node_modules'),'dir');
    await write('package.json','{"type":"module"}');
    await write('vitest.config.mjs','export default {test:{include:["test/**/*.test.js"]}};');
    const original = 'export const positive = n => n > 0;';
    await write('src/positive.js',original);
    await write('test/positive.test.js',`import {test,expect} from 'vitest';
import {positive} from '../src/positive.js';
for (const [value,want] of [[0,false],[1,true]]) test('boundary '+value,()=>expect(positive(value)).toBe(want));`);
    const protocol = await createProtocol(root,{platform:'javascript-vitest'});
    const lane = protocol.spec.lanes[0];
    const plan = await createPlan(root,[{path:'src/positive.js',content:'export const positive = n => n >= 0;'}]);
    await write('.aiwg/testing/control-plan.json',JSON.stringify(plan));
    const ids = [0,1].map(value=>JSON.stringify(['default','test/positive.test.js','boundary '+value]));
    lane.negativeControls = [{id:'zero-boundary',description:'Zero is not positive; preserve the positive case',command:lane.command,result:lane.result,testIds:[ids[0]],changePlan:'.aiwg/testing/control-plan.json'}];
    const discovery = await collectEvidence(root,protocol,{mode:'discovery'});
    expect(discovery.spec.lanes[0].normalized.cases.map((c: any)=>c.id)).toEqual(ids);
    const baseline = await collectEvidence(root,protocol);
    const states = (receipt: any) => receipt.spec.lanes[0].normalized.cases.map((c: any)=>({id:c.id,status:c.status}));
    const expected = (zero: string) => [{id:ids[0],status:zero},{id:ids[1],status:'passed'}];
    expect(states(baseline)).toEqual(expected('passed'));
    const receipt = await collectControls(root,protocol,{evidence:baseline});
    expect(receipt.spec.status).toBe('passed');
    const control = receipt.spec.controls[0];
    expect(control.status).toBe('killed');
    expect(states(control.mutationReceipt)).toEqual(expected('failed'));
    expect(states(control.restoredReceipt)).toEqual(expected('passed'));
    expect(control.mutationReceipt.spec.lanes[0].process.exitCode).toBe(1);
    expect(control.restoredReceipt.spec.lanes[0].process.exitCode).toBe(0);
    expect(control.rollbackReceipt.spec.status).toBe('rolled-back');
    expect(receipt.spec.sourceRestored).toBe(true);
    expect(await fs.readFile(path.join(root,'src/positive.js'),'utf8')).toBe(original);
    expect(await verifyControls(root,protocol,receipt)).toEqual([]);
  }, 60000);

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
    expect(execution.spec.lanes[0].normalized.cases.map((c: any)=>({id:c.id,status:c.status}))).toEqual([
      {id:JSON.stringify(['default','tests/test_phases.py','tests/test_phases.py::test_setup']),status:'failed'},
      {id:JSON.stringify(['default','tests/test_phases.py','tests/test_phases.py::test_teardown']),status:'failed'},
      {id:JSON.stringify(['default','tests/test_phases.py','tests/test_phases.py::test_skip']),status:'skipped'},
    ]);
    await write('tests/test_broken_import.py', 'raise RuntimeError("collection broke")\n');
    const collection = await collectEvidence(root, protocol, { mode: 'discovery' });
    expect(collection.spec.lanes[0].normalized.complete).toBe(false);
    expect(collection.spec.lanes[0].normalized.errors.some((e: any) => e.code === 'COLLECTION_FAILURE')).toBe(true);
  }, 30000);

});
