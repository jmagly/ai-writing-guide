#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import YAML from 'yaml';

const root = process.cwd();
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

function nonCommentSpecLines(file) {
  return read(file)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));
}

const plan = JSON.parse(read('ci/vault-migration-plan.json'));
if (plan.repository !== 'roctinam/aiwg') fail('plan repository must be roctinam/aiwg');
if (plan.reader_approle !== 'ci-aiwg') fail('plan reader_approle must be ci-aiwg');

const requiredSecrets = new Set(plan.bootstrap_tracker_secrets ?? []);
for (const secret of ['VAULT_CI_ROLE_ID', 'VAULT_CI_SECRET_ID']) {
  if (!requiredSecrets.has(secret)) fail(`plan missing bootstrap secret ${secret}`);
}

const routeByEnv = new Map();
const requiredVariables = new Set(plan.tracker_variables ?? []);
for (const route of plan.routes ?? []) {
  for (const key of ['id', 'path_variable', 'field_variable', 'env', 'type', 'purpose']) {
    if (!route[key]) fail(`route ${route.id ?? '<missing id>'} missing ${key}`);
  }
  if (!requiredVariables.has(route.path_variable)) fail(`tracker_variables missing ${route.path_variable}`);
  if (!requiredVariables.has(route.field_variable)) fail(`tracker_variables missing ${route.field_variable}`);
  routeByEnv.set(route.env, route);
}

const workflowDir = rel('.gitea', 'workflows');
const workflowFiles = readdirSync(workflowDir)
  .filter((file) => file.endsWith('.yml'))
  .map((file) => path.join('.gitea', 'workflows', file));

const allowedSecrets = new Set(['VAULT_CI_ROLE_ID', 'VAULT_CI_SECRET_ID', 'GITHUB_TOKEN']);
const forbiddenLegacySecrets = new Set([
  'NPM_TOKEN',
  'GH_ACCESS_TOKEN',
  'AIWG_IO_DISPATCH_TOKEN',
  'DOCSITE_DEPLOY_KEY',
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
  .filter((file) => /^vault-fetch\..+\.spec$/.test(file))
  .map((file) => path.join('ci', file));

if (specFiles.length === 0) fail('no vault fetch specs found');

for (const file of specFiles) {
  try {
    execFileSync('bash', ['ci/vault-fetch.sh', '--spec', file, '--dry-run'], {
      cwd: root,
      stdio: 'pipe',
    });
  } catch (error) {
    fail(`${file} failed vault-fetch dry-run: ${error.stderr?.toString() || error.message}`);
  }

  for (const line of nonCommentSpecLines(file)) {
    const [kind, envName, pathToken, fieldToken, extra] = line.split(/\s+/);
    if (extra) fail(`${file} has too many fields: ${line}`);
    if (!['env', 'keyfile'].includes(kind)) fail(`${file} invalid directive ${kind}`);
    if (!/^[A-Z_][A-Z0-9_]*$/.test(envName)) fail(`${file} invalid env name ${envName}`);
    const route = routeByEnv.get(envName);
    if (!route) {
      fail(`${file} exports ${envName}, which is not listed in ci/vault-migration-plan.json`);
      continue;
    }
    if (pathToken !== `\${${route.path_variable}}`) {
      fail(`${file} must use \${${route.path_variable}} for ${envName}`);
    }
    if (fieldToken !== `\${${route.field_variable}}`) {
      fail(`${file} must use \${${route.field_variable}} for ${envName}`);
    }
  }
}

const activeSurface = [
  'ci',
  '.gitea/workflows',
  '.gitea/workflows/README.md',
  'docs/contributing/ci-cd-secrets.md',
  'docs/contributing/secret-rotation.md',
  'docs/contributing/versioning.md',
  'docs/releases/v2026.7.12-announcement.md',
  '.github/prompts/flow-release.prompt.md',
  '.github/commands/flow-release.md',
];
for (const item of activeSurface) {
  let text = '';
  try {
    const denyPattern = [
      'open' + 'bao',
      'Open' + 'Bao',
      'BA' + 'O_',
      'BA' + 'O_TOKEN',
      'OPEN' + 'BAO',
      'kv_' + 'internal',
      'rca' + '-g2',
      's9' + '\\\\.internal',
      '10' + '\\\\.0\\\\.42\\\\.106',
    ].join('|');
    text = execFileSync('rg', ['-n', denyPattern, item], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    text = '';
  }
  if (text.trim()) fail(`${item} contains provider-specific or concrete vault routing text:\n${text.trim()}`);
}

const docs = read('docs/contributing/ci-cd-secrets.md');
if (!docs.includes('ci/vault-migration-plan.json')) {
  fail('docs/contributing/ci-cd-secrets.md must link ci/vault-migration-plan.json');
}
if (!docs.includes('configure:gitea-vault')) {
  fail('docs/contributing/ci-cd-secrets.md must document configure:gitea-vault');
}

const packageJson = JSON.parse(read('package.json'));
for (const scriptName of [
  'lint:vault-migration',
  'provision:vault-migration',
  'provision:vault-approle',
  'configure:gitea-vault',
]) {
  if (!packageJson.scripts?.[scriptName]) fail(`package.json missing script ${scriptName}`);
}

if (failures.length > 0) {
  console.error('vault migration verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('vault migration verification passed.');
