#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const help = args.includes('-h') || args.includes('--help');

function argValue(name, fallback = undefined) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
}

function usage() {
  console.log(`Usage:
  node ci/provision-vault-migration.mjs --routing-env <private-routing.env> \\
    --values-dir <dir> [--itops-repo <path>] [--apply]

Default mode is dry-run. It checks that each expected value file exists and
prints route IDs only. Concrete vault paths and fields come from the private
routing env file and are never printed.

Expected value files use route IDs from ci/vault-migration-plan.json:
  <values-dir>/<route-id>.value
`);
}

if (help) {
  usage();
  process.exit(0);
}

const root = process.cwd();
const valuesDir = argValue('--values-dir');
const routingEnv = argValue('--routing-env');
const itopsRepo = argValue('--itops-repo', process.env.ITOPS_REPO || '/home/roctinam/dev/itops');
const planPath = path.join(root, 'ci', 'vault-migration-plan.json');
const induct = path.join(itopsRepo, 'scripts', 'secret-induct.sh');

if (!valuesDir || !routingEnv) {
  usage();
  console.error('\nmissing required --routing-env or --values-dir');
  process.exit(2);
}
if (!existsSync(planPath)) {
  console.error(`missing plan: ${planPath}`);
  process.exit(1);
}
if (!existsSync(routingEnv)) {
  console.error(`missing routing env file: ${routingEnv}`);
  process.exit(1);
}
if (!existsSync(induct)) {
  console.error(`missing itops secret induction tool: ${induct}`);
  process.exit(1);
}

function parseEnvFile(file) {
  const parsed = new Map();
  for (const [index, rawLine] of readFileSync(file, 'utf8').split(/\r?\n/).entries()) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line);
    if (!match) {
      console.error(`${file}:${index + 1}: expected NAME=value`);
      process.exit(1);
    }
    parsed.set(match[1], match[2]);
  }
  return parsed;
}

function splitVaultPath(value) {
  const normalized = value.replace(/^\/+/, '');
  const [mount, ...rest] = normalized.split('/');
  let secretPath = rest.join('/');
  if (secretPath.startsWith('data/')) secretPath = secretPath.slice('data/'.length);
  if (!mount || !secretPath) throw new Error('invalid vault path in routing env');
  return { mount, secretPath };
}

const plan = JSON.parse(readFileSync(planPath, 'utf8'));
const routing = parseEnvFile(routingEnv);
const missing = [];
const commands = [];

for (const route of plan.routes ?? []) {
  const valueFile = path.resolve(valuesDir, `${route.id}.value`);
  if (!existsSync(valueFile)) missing.push(valueFile);

  const vaultPath = routing.get(route.path_variable);
  const field = routing.get(route.field_variable);
  if (!vaultPath) missing.push(`${routingEnv}:${route.path_variable}`);
  if (!field) missing.push(`${routingEnv}:${route.field_variable}`);
  if (!vaultPath || !field) continue;

  const { mount, secretPath } = splitVaultPath(vaultPath);
  commands.push({
    id: route.id,
    argv: [
      induct,
      '--mount',
      mount,
      '--path',
      secretPath,
      '--file',
      valueFile,
      '--field',
      field,
      '--type',
      route.type,
      '--service',
      route.id,
      '--owner',
      'roctinam',
      '--tenant',
      'internal',
      '--purpose',
      route.purpose,
      '--consumers',
      `gitea-actions:aiwg:${route.env}`,
      '--sensitivity',
      route.type.includes('key') || route.type === 'passphrase' ? 'critical' : 'high',
      '--rotation',
      route.type.includes('key') ? 'on-exposure' : 'quarterly',
      '--scope',
      'repo',
      '--created_by',
      'vault-migration-aiwg',
      '--sop',
      'aiwg/docs/contributing/secret-rotation.md',
    ],
  });
}

if (missing.length > 0) {
  console.error('missing required input(s):');
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

if (!apply) {
  console.log('Dry-run: no vault writes performed.');
  for (const command of commands) console.log(`would induct route ${command.id}`);
  console.log('\nRun again with --apply to execute these commands.');
  process.exit(0);
}

for (const command of commands) {
  const [program, ...programArgs] = command.argv;
  const result = spawnSync(program, programArgs, {
    cwd: itopsRepo,
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log('vault leaf induction complete. Run: npm run lint:vault-migration');
