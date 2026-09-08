import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
// @ts-ignore addon runtime is shipped as native ESM
import { loadProtocol, digest, validateContract } from '../../../agentic/code/addons/testing-quality/lib/contracts.mjs';
// @ts-ignore addon runtime is shipped as native ESM
import { inventoryWorkspace, sampleFrame } from '../../../agentic/code/addons/testing-quality/lib/inventory.mjs';
// @ts-ignore addon runtime is shipped as native ESM
import { writeNew } from '../../../agentic/code/addons/testing-quality/lib/workspace.mjs';

let root: string;
const protocol = () => ({
  apiVersion: 'testing.aiwg.io/v1', kind: 'TestConformanceProtocol', metadata: { name: 'example' },
  spec: {
    platform: 'javascript', system: 'example-library',
    source: { include: ['src/**/*.js'], exclude: [] }, tests: { include: ['test/**/*.mjs'], exclude: [] },
    areas: [{ id: 'unit', include: ['test/**/*.mjs'] }],
    lanes: [{ id: 'unit', runner: 'vitest', include: ['test/**/*.mjs'], exclude: [], command: { argv: ['node', '--version'], timeoutMs: 1000 }, result: { format: 'vitest' }, required: true }],
    policy: { requireDiscovery: true, requireReview: true, requireNegativeControls: true, allowSkipped: false, coverageThresholds: {}, maxFiles: 100, maxFileBytes: 10000, maxOutputBytes: 10000 },
    research: { paths: [], allowWeb: false },
  },
});
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'test-conformance-inventory-'));
  await mkdir(join(root, 'src')); await mkdir(join(root, 'test'));
  await writeFile(join(root, 'src/sum.js'), 'export const sum = (a,b) => a+b;');
  await writeFile(join(root, 'test/sum.test.mjs'), "import { it, expect } from 'vitest';\nit('adds', () => expect(2+2).toBe(4));\n");
});
afterEach(() => rm(root, { recursive: true, force: true }));

describe('test conformance inventory and source identity', () => {
  it('keeps source candidates separate from registered or executed test counts', async () => {
    const p = protocol();
    const report = await inventoryWorkspace(root, p);
    expect(report.spec.counts).toEqual({ sourceFiles: 1, testFiles: 1, configurationFiles: 0, testCases: null });
    expect(report.spec.authority).toBe('source-file-candidates');
    expect(report.spec.files.find((f: any) => f.role === 'test')).toMatchObject({ path: 'test/sum.test.mjs', areas: ['unit'], lanes: ['unit'], runnerHint: 'vitest' });
    expect(report.spec.complete).toBe(true);
  });
  it('invalidates identity on source changes even when the tests do not change', async () => {
    const first = await inventoryWorkspace(root, protocol());
    await writeFile(join(root, 'src/sum.js'), 'export const sum = () => 0;');
    const second = await inventoryWorkspace(root, protocol());
    expect(second.spec.snapshotHash).not.toBe(first.spec.snapshotHash);
  });
  it('binds policy and discovery configuration to the snapshot', async () => {
    const p = protocol(), first = await inventoryWorkspace(root, p);
    p.spec.policy.allowSkipped = true;
    expect((await inventoryWorkspace(root, p)).spec.snapshotHash).not.toBe(first.spec.snapshotHash);
  });
  it('detects a node:test file assigned to a Vitest lane instead of trusting extension', async () => {
    await writeFile(join(root, 'test/native.test.mjs'), "import test from 'node:test'; test('native', () => {});");
    const report = await inventoryWorkspace(root, protocol());
    expect(report.spec.complete).toBe(false);
    expect(report.spec.diagnostics).toContainEqual(expect.objectContaining({ code: 'RUNNER_MISMATCH_CANDIDATE', path: 'test/native.test.mjs' }));
  });
  it('retains empty and omitted scopes as explicit defects', async () => {
    const p = protocol(); p.spec.lanes[0].include = ['test/absent*.mjs'];
    expect((await inventoryWorkspace(root, p)).spec.diagnostics).toContainEqual(expect.objectContaining({ code: 'NO_DECLARED_LANE' }));
    await rm(join(root, 'test/sum.test.mjs'));
    expect((await inventoryWorkspace(root, p)).spec.diagnostics).toContainEqual(expect.objectContaining({ code: 'EMPTY_TEST_SCOPE' }));
  });
  it('rejects overlapping areas so selection does not silently double-count tests', async () => {
    const p = protocol(); p.spec.areas.push({ id: 'other', include: ['test/**/*.mjs'] });
    expect((await inventoryWorkspace(root, p)).spec.diagnostics).toContainEqual(expect.objectContaining({ code: 'AREA_AMBIGUOUS' }));
  });
  it('reports unreadable/out-of-bound source instead of dropping it from conformance', async () => {
    const p = protocol(); p.spec.policy.maxFileBytes = 1;
    const report = await inventoryWorkspace(root, p);
    expect(report.spec.complete).toBe(false);
    expect(report.spec.diagnostics.filter((d: any) => d.code === 'FILE_UNREADABLE')).toHaveLength(2);
  });
  it('does not read an outside-root source through a symlink', async () => {
    await symlink('/etc/passwd', join(root, 'src/external.js'));
    const report = await inventoryWorkspace(root, protocol());
    expect(report.spec.files.map((f: any) => f.path)).not.toContain('src/external.js');
    expect(report.spec.diagnostics).toContainEqual(expect.objectContaining({ code: 'FILE_UNREADABLE', path: 'src/external.js' }));
  });
  it('keeps lexical oracle signals unreviewed instead of declaring the test invalid', async () => {
    await writeFile(join(root, 'test/sum.test.mjs'), "import {it,expect} from 'vitest'; it('exists',()=>expect({}).toBeDefined());");
    const report = await inventoryWorkspace(root, protocol());
    const test = report.spec.files.find((f: any) => f.role === 'test');
    expect(test.signals).toContainEqual(expect.objectContaining({ code: 'weak-oracle', authority: 'lexical-candidate', verdict: 'unreviewed' }));
    expect(test).not.toHaveProperty('conformant');
  });
});

describe('protocol and evidence boundaries', () => {
  it('strictly validates the real shipped schema, rejecting unknown mandatory policy spelling', async () => {
    await expect(validateContract(protocol(), 'conformance-protocol.v1')).resolves.toEqual(protocol());
    const p: any = protocol(); p.spec.policy.requireDiscovry = true;
    await expect(validateContract(p, 'conformance-protocol.v1')).rejects.toThrow('additional');
  });
  it('fails closed on missing schema, duplicate YAML keys and traversal patterns', async () => {
    await expect(validateContract({}, 'missing')).rejects.toThrow();
    await writeFile(join(root, 'bad.yaml'), 'kind: one\nkind: two\n');
    await expect(loadProtocol(join(root, 'bad.yaml'))).rejects.toThrow('Cannot parse');
    const p = protocol(); p.spec.tests.include = ['../outside/*.js'];
    await writeFile(join(root, 'protocol.json'), JSON.stringify(p));
    await expect(loadProtocol(join(root, 'protocol.json'))).rejects.toThrow('relative');
  });
  it('does not overwrite existing evidence or write through directory symlinks', async () => {
    await writeNew(root, 'evidence.json', { count: 1 });
    await expect(writeNew(root, 'evidence.json', { count: 2 })).rejects.toThrow();
    await symlink(join(root, 'src'), join(root, 'alias'));
    await expect(writeNew(root, 'alias/new.txt', 'bad')).rejects.toThrow('symlink');
  });
});

describe('reproducible stratified sampling', () => {
  const frame = Array.from({ length: 34 }, (_, i) => ({ id: `case-${i}`, area: i < 30 ? 'unit' : 'contract' }));
  it('draws without replacement and uses census for small areas', () => {
    const a = sampleFrame(frame, { seed: 'retained-seed', unit: 'registered-case' });
    const b = sampleFrame([...frame].reverse(), { seed: 'retained-seed', unit: 'registered-case' });
    expect(a.spec.areas).toEqual(b.spec.areas);
    expect(a.spec.areas.map((g: any) => [g.area,g.population,g.sampled,g.census])).toEqual([['contract',4,4,true],['unit',30,20,false]]);
    const ids = a.spec.areas.flatMap((g: any) => g.records.map((r: any) => r.id));
    expect(new Set(ids).size).toBe(24);
    expect(a.spec.unit).toBe('registered-case');
  });
  it('does not silently accept missing seed, duplicate identities, zero size or empty populations', () => {
    expect(() => sampleFrame(frame, { seed: '' })).toThrow('seed');
    expect(() => sampleFrame([frame[0],frame[0]], { seed: 'x' })).toThrow('Duplicate');
    expect(() => sampleFrame(frame, { seed: 'x', size: 0 })).toThrow('size');
    expect(() => sampleFrame([], { seed: 'x' })).toThrow('empty');
    expect(digest({ b: 1, a: 2 })).toBe(digest({ a: 2, b: 1 }));
  });
});
