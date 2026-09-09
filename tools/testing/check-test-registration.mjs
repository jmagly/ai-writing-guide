#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { globSync } from 'glob';
import ts from 'typescript';
import { parse as parseYaml } from 'yaml';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// Inspect declarations and owning lanes without executing test source bodies.
export async function inspectTestRegistration(root = repositoryRoot) {
  root = path.resolve(root);
  const { nodeFiles } = await import(pathToFileURL(path.join(root, 'config/test-lanes.mjs')).href);
  const configs = globSync('config/vitest*.config.js', { cwd: root }).sort();
  const lanes = [];
  for (const config of configs) {
    const { default: value } = await import(pathToFileURL(path.join(root, config)).href);
    lanes.push({ id: config, runner: 'vitest', files: new Set(globSync(value.test.include, { cwd: root, ignore: value.test.exclude ?? [] })), live: config.includes('live') || config.includes('uat-daemon') || config.includes('uat-fleet-sandbox') });
  }
  lanes.push({ id: 'node', runner: 'node', files: new Set(globSync(nodeFiles, { cwd: root })), live: false });
  // Exclude owned input-fixture trees, not unit suites whose SUT topic is fixtures.
  const candidates = globSync([
    'test/**/*.{test,spec,uat}.{ts,tsx,js,jsx,mjs,mts,cts,cjs}',
    'agentic/code/frameworks/*/test/**/*.{test,spec}.{ts,tsx,js,jsx,mjs,mts,cts,cjs}',
    'tools/ralph-external/*.test.mjs',
  ], { cwd: root, ignore: ['test/fixtures/**', 'agentic/code/frameworks/*/test/fixtures/**'] }).sort();
  const records = [];
  const errors = [];
  // A config file alone is not an enforced lane: expand canonical CI npm scripts
  // and require every offline config to be reachable from that workflow.
  const scripts = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).scripts;
  const workflow = parseYaml(fs.readFileSync(path.join(root, '.gitea/workflows/ci.yml'), 'utf8'));
  let reachable = Object.values(workflow.jobs ?? {}).flatMap(job => (job.steps ?? []).map(step => step.run ?? '')).join('\n');
  const seen = new Set();
  for (;;) {
    const names = [...reachable.matchAll(/npm run ([\w:-]+)/g)].map(m => m[1]).filter(name => !seen.has(name));
    if (!names.length) break;
    for (const name of names) {
      seen.add(name);
      if (!scripts[name]) errors.push(`Canonical CI references missing npm script ${name}`);
      else reachable += '\n' + scripts[name];
    }
  }
  const invokedNodePatterns = [...reachable.matchAll(/node --test ([^\n;&]+)/g)].flatMap(match => match[1].trim().split(/\s+/));
  for (const pattern of invokedNodePatterns) {
    if (!nodeFiles.includes(pattern)) errors.push(`Unclassified Node CLI argument/pattern in canonical CI: ${pattern}`);
  }
  for (const lane of lanes) {
    if (lane.id === 'node') {
      for (const pattern of nodeFiles) if (!reachable.includes(pattern)) errors.push(`Node ownership pattern is absent from canonical CI: ${pattern}`);
    } else if (!lane.live && !reachable.includes(`--config ${lane.id}`)) errors.push(`Offline lane is not reachable from canonical CI: ${lane.id}`);
  }
  for (const file of candidates) {
    const body = fs.readFileSync(path.join(root, file), 'utf8');
    const source = ts.createSourceFile(file, body, ts.ScriptTarget.Latest, true);
    const imports = source.statements.filter(ts.isImportDeclaration).map(s => s.moduleSpecifier.text);
    let runner = imports.includes('vitest') ? 'vitest' : imports.includes('node:test') ? 'node' : 'unknown';
    // Legacy synchronous harnesses rethrow failed assertions. Node reports each
    // file as one case, so never promote their printed labels to registered cases.
    if (runner === 'unknown' && file.startsWith('tools/ralph-external/') && imports.some(v => v === 'assert' || v === 'node:assert/strict')) runner = 'node-file-harness';
    const owners = lanes.filter(lane => lane.files.has(file));
    if (runner === 'unknown') errors.push(`${file}: unknown test API; declare an explicit owning runner`);
    if (!owners.length) errors.push(`${file}: unassigned test file`);
    for (const owner of owners) {
      if (owner.runner !== (runner === 'node-file-harness' ? 'node' : runner)) errors.push(`${file}: ${runner} handed to ${owner.runner} in ${owner.id}`);
    }
    records.push({ file, runner, lanes: owners.map(({ id, live }) => ({ id, live })) });
  }
  if (!records.length) errors.push('No candidate test files found');
  const report = { schemaVersion: 1, scope: 'Root test/, framework test/ and Ralph tool tests; owned test/fixtures input trees excluded (not unit-test topic directories). App/package and VS Code extension tests have separate owners.', units: 'Source files and imported APIs, not registered or executed cases', totalFiles: records.length, files: records, errors };
  return report;
}

export async function runRegistrationGate(root = repositoryRoot) {
  root = path.resolve(root);
  const report = await inspectTestRegistration(root);
  const { errors, totalFiles } = report;
  const output = path.join(root, 'test-results/test-registration.json');
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  if (errors.length) {
    console.error(errors.join('\n'));
    process.exitCode = 1;
  } else console.log(`Runner ownership: ${totalFiles} source files assigned; report ${path.relative(root, output)}`);
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await runRegistrationGate();
}
