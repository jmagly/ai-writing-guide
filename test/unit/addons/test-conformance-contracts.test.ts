import { readFileSync } from 'node:fs';
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
const foundational = manifest.artifacts.map((entry: any) => entry.logicalName.replace('testing-quality.', ''));

describe('governed testing-quality foundational output contracts', () => {
  it('registers all shipped contracts under one governed domain', () => {
    expect(compiled.valid, JSON.stringify(compiled.diagnostics)).toBe(true);
    for (const name of foundational) expect(manifest.artifacts.some((a: any) => a.logicalName === `testing-quality.${name}`)).toBe(true);
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
