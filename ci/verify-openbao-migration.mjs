#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import YAML from 'yaml';

const root = process.cwd();
const live = process.argv.includes('--live');
const failures = [];

function fail(message) {
  failures.push(message);
}

function rel(...parts) {
  return path.join(root, ...parts);
}

function read(relPath) {
  return readFileSync(rel(relPath), 'utf8');
}

function defaultOpenBaoConfigDir() {
  if (process.env.OPENBAO_CONFIG_DIR) return process.env.OPENBAO_CONFIG_DIR;
  const homeConfig = path.join(os.homedir(), '.config', 'openbao');
  if (existsSync(homeConfig)) return homeConfig;
  const operatorConfig = '/home/roctinam/.config/openbao';
  if (existsSync(operatorConfig)) return operatorConfig;
  return homeConfig;
}

function nonCommentSpecLines(file) {
  return read(file)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));
}

const plan = JSON.parse(read('ci/openbao-migration-plan.json'));
if (plan.repository !== 'roctinam/aiwg') fail('plan repository must be roctinam/aiwg');
if (plan.reader_approle !== 'ci-aiwg') fail('plan reader_approle must be ci-aiwg');

const planLeaves = new Map();
for (const leaf of plan.leaves ?? []) {
  planLeaves.set(`${leaf.mount}/${leaf.path}:${leaf.field}`, leaf);
  for (const key of [
    'mount',
    'path',
    'field',
    'type',
    'service',
    'owner',
    'tenant',
    'purpose',
    'consumers',
    'reader_approle',
    'sensitivity',
    'rotation',
    'sop',
  ]) {
    if (!leaf[key]) fail(`plan leaf ${leaf.path ?? '<missing path>'} missing ${key}`);
  }
}

const workflowDir = rel('.gitea', 'workflows');
const workflowFiles = readdirSync(workflowDir)
  .filter((file) => file.endsWith('.yml'))
  .map((file) => path.join('.gitea', 'workflows', file));

const allowedSecrets = new Set(['BAO_CI_ROLE_ID', 'BAO_CI_SECRET_ID', 'GITHUB_TOKEN']);
const forbiddenLegacySecrets = new Set([
  'NPM_TOKEN',
  'GH_ACCESS_TOKEN',
  'AIWG_IO_DISPATCH_TOKEN',
  'DEPLOY_SSH_KEY',
  'DEPLOY_HOST',
  'DEPLOY_PORT',
  'DEPLOY_USER',
  'DEPLOY_PATH',
]);

for (const file of workflowFiles) {
  const text = read(file);
  try {
    YAML.parse(text);
  } catch (error) {
    fail(`${file} is not valid YAML: ${error.message}`);
  }
  for (const match of text.matchAll(/secrets\.([A-Z0-9_]+)/g)) {
    const name = match[1];
    if (!allowedSecrets.has(name)) fail(`${file} references non-bootstrap secret ${name}`);
    if (forbiddenLegacySecrets.has(name)) fail(`${file} references legacy Gitea secret ${name}`);
  }
}

const specFiles = readdirSync(rel('ci'))
  .filter((file) => /^openbao-fetch\..+\.spec$/.test(file))
  .map((file) => path.join('ci', file));

if (specFiles.length === 0) fail('no OpenBao fetch specs found');

for (const file of specFiles) {
  try {
    execFileSync('bash', ['ci/openbao-fetch.sh', '--spec', file, '--dry-run'], {
      cwd: root,
      stdio: 'pipe',
    });
  } catch (error) {
    fail(`${file} failed openbao-fetch dry-run: ${error.stderr?.toString() || error.message}`);
  }

  for (const line of nonCommentSpecLines(file)) {
    const [kind, envName, secretPath, field, extra] = line.split(/\s+/);
    if (extra) fail(`${file} has too many fields: ${line}`);
    if (!['env', 'keyfile'].includes(kind)) fail(`${file} invalid directive ${kind}`);
    if (!/^[A-Z_][A-Z0-9_]*$/.test(envName)) fail(`${file} invalid env name ${envName}`);
    const key = `${secretPath}:${field}`;
    if (!planLeaves.has(key)) fail(`${file} references ${key}, which is not in ci/openbao-migration-plan.json`);
  }
}

const hcl = read('ci/openbao-ci-aiwg.hcl');
for (const rule of plan.policy?.rules ?? []) {
  if (!hcl.includes(`path "${rule.path}"`)) fail(`ci/openbao-ci-aiwg.hcl missing policy path ${rule.path}`);
}

const docs = read('docs/contributing/ci-cd-secrets.md');
if (!docs.includes('ci/openbao-migration-plan.json')) {
  fail('docs/contributing/ci-cd-secrets.md must link ci/openbao-migration-plan.json');
}
if (!docs.includes('configure:gitea-openbao')) {
  fail('docs/contributing/ci-cd-secrets.md must document configure:gitea-openbao');
}

const packageJson = JSON.parse(read('package.json'));
for (const scriptName of [
  'lint:openbao-migration',
  'provision:openbao-migration',
  'provision:openbao-approle',
  'configure:gitea-openbao',
]) {
  if (!packageJson.scripts?.[scriptName]) fail(`package.json missing script ${scriptName}`);
}

if (live) {
  const itopsRepo = process.env.ITOPS_REPO || '/home/roctinam/dev/itops';
  const catalog = path.join(itopsRepo, 'scripts', 'secret-catalog.sh');
  if (!existsSync(catalog)) {
    fail(`live check requested, but secret-catalog.sh was not found at ${catalog}`);
  } else {
    let lines = '';
    try {
      lines = execFileSync(catalog, ['--mounts', 'kv_internal', '--json'], {
        cwd: itopsRepo,
        env: {
          ...process.env,
          OPENBAO_CONFIG_DIR: defaultOpenBaoConfigDir(),
        },
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (error) {
      fail(`live catalog check failed: ${error.stderr?.toString() || error.message}`);
    }
    const records = lines
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => JSON.parse(line));
    const byPath = new Map(records.map((record) => [`${record.mount}/${record.path}`, record]));
    for (const leaf of plan.leaves ?? []) {
      const record = byPath.get(`${leaf.mount}/${leaf.path}`);
      if (!record) {
        fail(`live OpenBao catalog missing ${leaf.mount}/${leaf.path}`);
        continue;
      }
      const metadata = record.metadata ?? {};
      for (const key of ['service', 'tenant', 'type', 'sensitivity', 'rotation']) {
        if (metadata[key] !== leaf[key]) {
          fail(`live metadata mismatch for ${leaf.path}.${key}: expected ${leaf[key]}, got ${metadata[key] ?? '<missing>'}`);
        }
      }
      const readers = String(metadata.reader_approle ?? '')
        .split(',')
        .map((item) => item.trim());
      if (!readers.includes('ci-aiwg')) {
        fail(`live metadata for ${leaf.path} does not include reader_approle ci-aiwg`);
      }
    }
  }
}

if (failures.length > 0) {
  console.error('OpenBao migration verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`OpenBao migration verification passed (${live ? 'local + live metadata' : 'local'}).`);
