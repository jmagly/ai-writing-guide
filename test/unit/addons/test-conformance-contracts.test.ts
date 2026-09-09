import { readFileSync, readdirSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { describe, expect, it } from 'vitest';
import { compileSchemaCatalog, SchemaResolver, SchemaValidator } from '../../../src/schema/index.js';
// @ts-expect-error addon source is distributed JavaScript
import { inventoryWorkspace, sampleFrame } from '../../../agentic/code/addons/testing-quality/lib/inventory.mjs';
// @ts-expect-error addon source is distributed JavaScript
import { normalizeResults } from '../../../agentic/code/addons/testing-quality/lib/results.mjs';
// @ts-expect-error addon source is distributed JavaScript
import { validateContract } from '../../../agentic/code/addons/testing-quality/lib/contracts.mjs';

const rootDir = process.cwd();
const read = (file: string) => JSON.parse(readFileSync(path.join(rootDir, file), 'utf8'));
const manifest = read('schemas/catalog/domains/testing-quality.json');
const compiled = compileSchemaCatalog({ schemaVersion: '1', domains: [manifest] }, [manifest], { rootDir, inventoryRoots: [] });
const validator = new SchemaValidator(new SchemaResolver(compiled.catalog!, { rootDir }), { rootDir });
// Independent governed identities: catalog omissions must fail, never unregister fixture cases.
const foundational = ['test-inventory', 'test-sample', 'normalized-results', 'conformance-protocol', 'test-review', 'test-conformance-assessment', 'custom-template', 'test-coverage', 'test-run-receipt', 'test-conformance-research', 'negative-control-receipt', 'normalization-plan', 'normalization-receipt'];
const schemaDirectory = 'agentic/code/addons/testing-quality/schemas';
function assertCompleteCatalog(candidate: typeof manifest) {
  expect(candidate.artifacts.map((entry: any) => entry.logicalName).sort(), 'complete governed contract identities').toEqual(foundational.map(name => `testing-quality.${name}`).sort());
  expect(readdirSync(path.join(rootDir, schemaDirectory)).filter(file => file.endsWith('.schema.json')).sort(), 'complete shipped schema files').toEqual(foundational.map(name => `${name}.v1.schema.json`).sort());
  for (const name of foundational) {
    const entry = candidate.artifacts.find((item: any) => item.logicalName === `testing-quality.${name}`);
    expect(entry.authority, `canonical contract authority: ${name}`).toEqual({ kind: 'canonical', path: `${schemaDirectory}/${name}.v1.schema.json` });
  }
}

const additionalNegatives: Record<string, { path: string; keyword: string; change: (value: any) => void }> = {
  'test-sample': { path: '/spec/areas/0/records/0/rank', keyword: 'type', change: value => { value.spec.areas[0].records[0].rank = 123; } },
  'test-review': { path: '/spec/files/0/oracle', keyword: 'type', change: value => { value.spec.files[0].oracle = 123; } },
  'test-conformance-research': { path: '/spec/platform', keyword: 'type', change: value => { value.spec.platform = 123; } },
  'test-coverage': { path: '/scope', keyword: 'additionalProperties', change: value => { value.scope.unrecognized = true; } },
};

describe('governed testing-quality foundational output contracts', () => {
  it('registers all shipped contracts under one governed domain', () => {
    expect(compiled.valid, JSON.stringify(compiled.diagnostics)).toBe(true);
    assertCompleteCatalog(manifest);
  });
  it('rejects omitted, extra, duplicate and misrouted catalog contract identities', () => {
    assertCompleteCatalog(manifest);
    const omitted = structuredClone(manifest);
    omitted.artifacts = omitted.artifacts.filter((entry: any) => entry.logicalName !== 'testing-quality.test-coverage');
    expect(() => assertCompleteCatalog(omitted)).toThrow('complete governed contract identities');
    const extra = structuredClone(manifest);
    extra.artifacts.push({ ...extra.artifacts[0], logicalName: 'testing-quality.unexpected' });
    expect(() => assertCompleteCatalog(extra)).toThrow('complete governed contract identities');
    const duplicate = structuredClone(manifest);
    duplicate.artifacts.push(duplicate.artifacts[0]);
    expect(() => assertCompleteCatalog(duplicate)).toThrow('complete governed contract identities');
    const misrouted = structuredClone(manifest);
    misrouted.artifacts[0].authority.path = `${schemaDirectory}/test-coverage.v1.schema.json`;
    expect(() => assertCompleteCatalog(misrouted)).toThrow('canonical contract authority');
  });
  for (const name of foundational) {
    it(`accepts ${name} positive fixture through the core and addon validators`, async () => {
      const entry = manifest.artifacts.find((a: any) => a.logicalName === `testing-quality.${name}`);
      const payload = read(entry.fixtures.valid[0]);
      const result = validator.validate(entry.logicalName, payload);
      expect(result.valid, JSON.stringify(result.diagnostics)).toBe(true);
      await expect(validateContract(payload, `${name}.v1`)).resolves.toEqual(payload);
    });
    it(`rejects ${name} incorrect type and unknown nested key fixtures`, async () => {
      const entry = manifest.artifacts.find((a: any) => a.logicalName === `testing-quality.${name}`);
      expect(entry.fixtures.invalid.length).toBeGreaterThanOrEqual(2);
      for (const fixture of entry.fixtures.invalid) {
        const payload = read(fixture);
        const result = validator.validate(entry.logicalName, payload);
        expect(result.valid, fixture).toBe(false);
        expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: 'SCHEMA_INSTANCE_INVALID' }));
        await expect(validateContract(payload, `${name}.v1`)).rejects.toThrow('Invalid');
      }
      const negative = additionalNegatives[name];
      if (negative) {
        const valid = read(entry.fixtures.valid[0]);
        expect(validator.validate(entry.logicalName, valid).valid).toBe(true);
        await expect(validateContract(valid, `${name}.v1`)).resolves.toEqual(valid);
        const changed = structuredClone(valid); negative.change(changed);
        const result = validator.validate(entry.logicalName, changed);
        expect(result.valid).toBe(false);
        expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: 'SCHEMA_INSTANCE_INVALID', path: negative.path, details: expect.objectContaining({ keyword: negative.keyword }) }));
        const failure = await validateContract(changed, `${name}.v1`).then(() => { throw new Error('Expected invalid contract rejection'); }, (error: unknown) => error);
        expect(failure).toBeInstanceOf(Error);
        const prefix = `Invalid ${name}.v1: `;
        expect((failure as Error).message.startsWith(prefix)).toBe(true);
        expect(JSON.parse((failure as Error).message.slice(prefix.length))).toContainEqual(expect.objectContaining({ instancePath: negative.path, keyword: negative.keyword }));
      }
    });
  }
  it('accepts real generated inventory, sampled records and execution results', async () => {
    const target = await fs.mkdtemp(path.join(os.tmpdir(), 'test-conformance-schema-'));
    try {
      await fs.mkdir(path.join(target, 'src'));
      await fs.mkdir(path.join(target, 'tests'));
      await fs.writeFile(path.join(target, 'src/add.py'), 'def add(a, b): return a + b\n');
      await fs.writeFile(path.join(target, 'tests/test_add.py'), 'from src.add import add\ndef test_add(): assert add(2, 3) == 5\n');
      await fs.writeFile(path.join(target, 'pyproject.toml'), '[tool.pytest.ini_options]\n');
      const protocol = read('test/fixtures/testing-quality/contracts/conformance-protocol.valid.json');
      const inventory = await inventoryWorkspace(target, protocol);
      expect(inventory.spec.counts).toEqual({ sourceFiles: 1, testFiles: 1, configurationFiles: 1, testCases: null });
      expect(inventory.spec.files.find((f: any) => f.path === 'pyproject.toml')).toMatchObject({ role: 'configuration', isSource: false, hash: expect.stringMatching(/^[a-f0-9]{64}$/) });
      expect(inventory.spec.complete).toBe(true);
      expect(validator.validate('testing-quality.test-inventory', inventory).valid).toBe(true);
      const sample = sampleFrame(inventory.spec.files.filter((f: any) => f.role === 'test').map((f: any) => ({ ...f, id: f.path, area: f.areas[0] })), { seed: 'real-output-fixture' });
      expect(sample.spec.areas[0].records[0].path).toBe('tests/test_add.py');
      expect(validator.validate('testing-quality.test-sample', sample).valid).toBe(true);
      const execution = normalizeResults({ exitcode: 0, summary: { total: 1, passed: 1 }, tests: [{ nodeid: 'tests/test_add.py::test_add', outcome: 'passed' }] }, { format: 'pytest-json', root: target });
      expect(execution.complete).toBe(true);
      expect(validator.validate('testing-quality.normalized-results', execution).valid).toBe(true);
    } finally { await fs.rm(target, { recursive: true, force: true }); }
  });
  it('rejects unsafe relative paths and false static case counts', () => {
    const results = read('test/fixtures/testing-quality/contracts/normalized-results.valid.json');
    for (const invalidPath of ['../escape.ts', '/absolute.ts', 'a/../../escape.ts', 'C:\\escape.ts']) {
      const changed = structuredClone(results);
      changed.cases[0].file = invalidPath;
      expect(validator.validate('testing-quality.normalized-results', changed).valid, invalidPath).toBe(false);
    }
    const inventory = read('test/fixtures/testing-quality/contracts/test-inventory.valid.json');
    inventory.spec.counts.testCases = 10;
    expect(validator.validate('testing-quality.test-inventory', inventory).valid).toBe(false);
  });
});
