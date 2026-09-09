import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const checker = pathToFileURL(path.join(repo, 'tools/testing/check-test-registration.mjs')).href;
const roots = [];
const rootTopic = 'test/unit/testing/fixtures/example.test.ts';
const frameworkTopic = 'agentic/code/frameworks/example/test/unit/testing/fixtures/example.test.ts';
const baseline = 'test/unit/control.test.ts';
const vitestSource = "import { it } from 'vitest'; throw new Error('SOURCE_MUST_NOT_EXECUTE'); it('source-only fixture', () => {});\n";
const nodeSource = "import { test } from 'node:test'; throw new Error('SOURCE_MUST_NOT_EXECUTE'); test('source-only fixture', () => {});\n";

function project({ files = {}, include = ['test/unit/**/*.test.ts', 'agentic/code/frameworks/*/test/unit/**/*.test.ts'], nodeFiles = [], scripts, ci = 'npm run test', withBaseline = true } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'aiwg-registration-gate-'));
  roots.push(root);
  const entries = {
    'package.json': JSON.stringify({ type: 'module', scripts: scripts ?? { test: 'vitest run --config config/vitest.config.js' } }),
    '.gitea/workflows/ci.yml': JSON.stringify({ jobs: { test: { steps: [{ run: ci }] } } }),
    'config/test-lanes.mjs': `export const nodeFiles = ${JSON.stringify(nodeFiles)};\n`,
    'config/vitest.config.js': `export default ${JSON.stringify({ test: { include, exclude: [] } })};\n`,
    ...(withBaseline ? { [baseline]: vitestSource } : {}),
    ...files,
  };
  for (const [name, body] of Object.entries(entries)) {
    const destination = path.join(root, name);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, body);
  }
  return root;
}

function run(root) {
  const script = `import { runRegistrationGate } from ${JSON.stringify(checker)}; await runRegistrationGate(${JSON.stringify(root)});`;
  const child = spawnSync(process.execPath, ['--input-type=module', '--eval', script], {
    cwd: root, encoding: 'utf8', timeout: 15_000,
  });
  expect(child.error).toBeUndefined();
  expect(child.signal).toBeNull();
  // An import/startup failure cannot satisfy a negative test: require a real
  // completed gate report before checking its exit and exact diagnostics.
  const report = JSON.parse(fs.readFileSync(path.join(root, 'test-results/test-registration.json'), 'utf8'));
  return { child, report };
}

function copyChecker(root) {
  const destination = path.join(root, 'tools/testing/check-test-registration.mjs');
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(fileURLToPath(checker), destination);
  expect(fs.readFileSync(destination)).toEqual(fs.readFileSync(fileURLToPath(checker)));
  fs.symlinkSync(path.join(repo, 'node_modules'), path.join(root, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir');
  return destination;
}

afterEach(() => {
  for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

describe('test runner registration gate', () => {
  it.each([['root', rootTopic], ['framework', frameworkTopic]])('includes %s unit suites with a fixtures topic directory', (_kind, file) => {
    const { child, report } = run(project({ files: { [file]: vitestSource } }));
    expect(child.status).toBe(0);
    expect(report.errors).toEqual([]);
    expect(report.totalFiles).toBe(2);
    expect(report.files).toContainEqual({ file, runner: 'vitest', lanes: [{ id: 'config/vitest.config.js', live: false }] });
  });

  it('keeps both real TestDataFactory suites in the repository report', () => {
    const script = `import { inspectTestRegistration } from ${JSON.stringify(checker)}; console.log(JSON.stringify(await inspectTestRegistration(${JSON.stringify(repo)})));`;
    const report = JSON.parse(execFileSync(process.execPath, ['--input-type=module', '--eval', script], {
      cwd: repo, encoding: 'utf8', timeout: 15_000, maxBuffer: 4 * 1024 * 1024,
    }));
    for (const file of [
      'test/unit/testing/fixtures/test-data-factory.test.ts',
      'agentic/code/frameworks/sdlc-complete/test/unit/testing/fixtures/test-data-factory.test.ts',
    ]) {
      expect(report.files).toContainEqual({ file, runner: 'vitest', lanes: [{ id: 'config/vitest.config.js', live: false }] });
    }
    expect(report.units).toBe('Source files and imported APIs, not registered or executed cases');
  });

  it('excludes only owned root and framework input-fixture trees', () => {
    const { child, report } = run(project({ files: {
      'test/fixtures/scenario/invalid.test.ts': 'deliberately invalid source',
      'agentic/code/frameworks/example/test/fixtures/scenario/invalid.test.ts': 'deliberately invalid source',
    } }));
    expect(child.status).toBe(0);
    expect(report.errors).toEqual([]);
    expect(report.files).toEqual([{ file: baseline, runner: 'vitest', lanes: [{ id: 'config/vitest.config.js', live: false }] }]);
    expect(report.totalFiles).toBe(1);
  });

  it.each([['root', rootTopic], ['framework', frameworkTopic]])('rejects a wrong-runner %s fixtures-topic suite', (_kind, file) => {
    const { child, report } = run(project({ files: { [file]: nodeSource } }));
    expect(child.status).toBe(1);
    expect(report.errors).toEqual([`${file}: node handed to vitest in config/vitest.config.js`]);
    expect(child.stderr).toContain(report.errors[0]);
    expect(report.files.find(row => row.file === file)?.runner).toBe('node');
  });

  it.each([['root', rootTopic], ['framework', frameworkTopic]])('rejects an unassigned %s fixtures-topic suite', (_kind, file) => {
    const { child, report } = run(project({ include: [baseline], files: { [file]: vitestSource } }));
    expect(child.status).toBe(1);
    expect(report.errors).toEqual([`${file}: unassigned test file`]);
    expect(report.files).toContainEqual({ file, runner: 'vitest', lanes: [] });
  });

  it('rejects unknown APIs even when a Vitest glob selects the file', () => {
    const file = 'test/unit/unknown.test.ts';
    const { child, report } = run(project({ files: { [file]: "export const notATest = true;\n" } }));
    expect(child.status).toBe(1);
    expect(report.errors).toEqual([
      `${file}: unknown test API; declare an explicit owning runner`,
      `${file}: unknown handed to vitest in config/vitest.config.js`,
    ]);
  });

  it('rejects an empty test population', () => {
    const { child, report } = run(project({ withBaseline: false }));
    expect(child.status).toBe(1);
    expect(report.totalFiles).toBe(0);
    expect(report.files).toEqual([]);
    expect(report.errors).toEqual(['No candidate test files found']);
  });

  it('rejects offline config absent from canonical CI', () => {
    const { child, report } = run(project({ ci: 'node --version' }));
    expect(child.status).toBe(1);
    expect(report.errors).toEqual(['Offline lane is not reachable from canonical CI: config/vitest.config.js']);
  });

  it('expands nested npm scripts and rejects a missing referenced script', () => {
    const { child, report } = run(project({ scripts: {
      test: 'npm run inner', inner: 'vitest run --config config/vitest.config.js && npm run missing',
    } }));
    expect(child.status).toBe(1);
    expect(report.errors).toEqual(['Canonical CI references missing npm script missing']);
  });

  it('rejects an unclassified Node CLI pattern in canonical CI', () => {
    const { child, report } = run(project({ ci: 'npm run test && node --test unexpected/*.test.mjs' }));
    expect(child.status).toBe(1);
    expect(report.errors).toEqual(['Unclassified Node CLI argument/pattern in canonical CI: unexpected/*.test.mjs']);
  });

  it('rejects a declared Node ownership pattern absent from canonical CI', () => {
    const { child, report } = run(project({ nodeFiles: ['test/unit/ralph/*.test.mjs'] }));
    expect(child.status).toBe(1);
    expect(report.errors).toEqual(['Node ownership pattern is absent from canonical CI: test/unit/ralph/*.test.mjs']);
  });

  it('preserves Node runner and legacy file-harness ownership', () => {
    const { child, report } = run(project({
      withBaseline: false, nodeFiles: ['tools/ralph-external/*.test.mjs', 'test/unit/ralph/*.test.mjs'],
      ci: 'npm run test && node --test tools/ralph-external/*.test.mjs test/unit/ralph/*.test.mjs',
      files: {
        'tools/ralph-external/legacy.test.mjs': "import assert from 'node:assert/strict'; assert.equal(1, 1);\n",
        'test/unit/ralph/native.test.mjs': nodeSource,
      },
    }));
    expect(child.status).toBe(0);
    expect(report.errors).toEqual([]);
    expect(report.files).toEqual([
      { file: 'test/unit/ralph/native.test.mjs', runner: 'node', lanes: [{ id: 'node', live: false }] },
      { file: 'tools/ralph-external/legacy.test.mjs', runner: 'node-file-harness', lanes: [{ id: 'node', live: false }] },
    ]);
  });

  it.each([['passing', 'npm run test', 0], ['failing', 'node --version', 1]])('runs the %s direct CLI against its module root instead of cwd', (_kind, ci, status) => {
    const root = project({ ci });
    const other = project({ files: { 'test/unit/decoy.test.ts': vitestSource } });
    const copy = copyChecker(root);
    const child = spawnSync(process.execPath, [copy], { cwd: other, encoding: 'utf8', timeout: 15_000 });
    expect(child.error).toBeUndefined();
    expect(child.signal).toBeNull();
    expect(child.status).toBe(status);
    const output = path.join(root, 'test-results/test-registration.json');
    expect(fs.existsSync(output), 'direct CLI must create its module-root report').toBe(true);
    expect(fs.existsSync(path.join(other, 'test-results/test-registration.json')), 'cwd decoy must remain untouched').toBe(false);
    const report = JSON.parse(fs.readFileSync(output, 'utf8'));
    expect(report.totalFiles).toBe(1);
    expect(report.files).toEqual([{ file: baseline, runner: 'vitest', lanes: [{ id: 'config/vitest.config.js', live: false }] }]);
    expect(report.errors).toEqual(status === 0 ? [] : ['Offline lane is not reachable from canonical CI: config/vitest.config.js']);
    if (status === 0) {
      expect(child.stdout.trim()).toBe(`Runner ownership: 1 source files assigned; report ${path.join('test-results', 'test-registration.json')}`);
      expect(child.stderr).toBe('');
    } else {
      expect(child.stdout).toBe('');
      expect(child.stderr.trim()).toBe(report.errors[0]);
    }
  });

  it('imports from an ordinary script without automatic writes and inspects the default module root', () => {
    const root = project();
    const other = project({ files: { 'test/unit/decoy.test.ts': vitestSource } });
    const copy = copyChecker(root);
    const driver = path.join(other, 'import-driver.mjs');
    fs.writeFileSync(driver, `const { inspectTestRegistration } = await import(${JSON.stringify(pathToFileURL(copy).href)}); console.log(JSON.stringify(await inspectTestRegistration()));\n`);
    const child = spawnSync(process.execPath, [driver], { cwd: other, encoding: 'utf8', timeout: 15_000 });
    expect(child.error).toBeUndefined();
    expect(child.signal).toBeNull();
    expect(child.status).toBe(0);
    expect(child.stderr).toBe('');
    expect(child.stdout).not.toContain('Runner ownership:');
    expect(fs.existsSync(path.join(root, 'test-results/test-registration.json')), 'ordinary import and inspect must not write a gate report').toBe(false);
    expect(fs.existsSync(path.join(other, 'test-results/test-registration.json'))).toBe(false);
    const report = JSON.parse(child.stdout);
    expect(report.totalFiles).toBe(1);
    expect(report.errors).toEqual([]);
    expect(report.files).toEqual([{ file: baseline, runner: 'vitest', lanes: [{ id: 'config/vitest.config.js', live: false }] }]);
  });

  it.each([['jobs', {}], ['steps', { jobs: { test: {} } }]])('fails closed with a completed report when workflow %s are absent', (_kind, workflow) => {
    const root = project({ files: { '.gitea/workflows/ci.yml': JSON.stringify(workflow) } });
    const { child, report } = run(root);
    expect(child.status).toBe(1);
    expect(report.totalFiles).toBe(1);
    expect(report.files).toEqual([{ file: baseline, runner: 'vitest', lanes: [{ id: 'config/vitest.config.js', live: false }] }]);
    expect(report.errors).toEqual(['Offline lane is not reachable from canonical CI: config/vitest.config.js']);
    expect(child.stderr.trim()).toBe(report.errors[0]);
  });
});
