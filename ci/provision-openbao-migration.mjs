#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import os from 'node:os';
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
  node ci/provision-openbao-migration.mjs --values-dir <dir> [--itops-repo <path>] [--apply]

Default mode is dry-run. In dry-run mode the script checks that every expected
value file exists and prints the exact secret-induct.sh commands without running
them.

Expected value files:
  <values-dir>/ci__aiwg__gitea-npm-token.token
  <values-dir>/ci__aiwg__github-mirror-token.token
  <values-dir>/ci__aiwg__aiwg-io-dispatch-token.token
  <values-dir>/ci__shared__docs-deploy.private_key
`);
}

if (help) {
  usage();
  process.exit(0);
}

const root = process.cwd();
const valuesDir = argValue('--values-dir');
const itopsRepo = argValue('--itops-repo', process.env.ITOPS_REPO || '/home/roctinam/dev/itops');
const planPath = path.join(root, 'ci', 'openbao-migration-plan.json');
const induct = path.join(itopsRepo, 'scripts', 'secret-induct.sh');

if (!valuesDir) {
  usage();
  console.error('\nmissing required --values-dir');
  process.exit(2);
}

if (!existsSync(planPath)) {
  console.error(`missing plan: ${planPath}`);
  process.exit(1);
}

if (!existsSync(induct)) {
  console.error(`missing itops secret induction tool: ${induct}`);
  process.exit(1);
}

const plan = JSON.parse(readFileSync(planPath, 'utf8'));
const missing = [];

function defaultOpenBaoConfigDir() {
  if (process.env.OPENBAO_CONFIG_DIR) return process.env.OPENBAO_CONFIG_DIR;
  const homeConfig = path.join(os.homedir(), '.config', 'openbao');
  if (existsSync(homeConfig)) return homeConfig;
  const operatorConfig = '/home/roctinam/.config/openbao';
  if (existsSync(operatorConfig)) return operatorConfig;
  return homeConfig;
}

function valueFileName(leaf) {
  return `${leaf.path.replaceAll('/', '__')}.${leaf.field}`;
}

function commandFor(leaf, file) {
  return [
    induct,
    '--mount',
    leaf.mount,
    '--path',
    leaf.path,
    '--file',
    file,
    '--field',
    leaf.field,
    '--type',
    leaf.type,
    '--service',
    leaf.service,
    '--owner',
    leaf.owner,
    '--tenant',
    leaf.tenant,
    '--purpose',
    leaf.purpose,
    '--consumers',
    leaf.consumers,
    '--sensitivity',
    leaf.sensitivity,
    '--rotation',
    leaf.rotation,
    '--scope',
    'repo',
    '--created_by',
    'openbao-migration-aiwg',
    '--sop',
    leaf.sop,
  ];
}

const commands = [];
for (const leaf of plan.leaves ?? []) {
  const file = path.resolve(valuesDir, valueFileName(leaf));
  if (!existsSync(file)) missing.push(file);
  commands.push(commandFor(leaf, file));
}

if (missing.length > 0) {
  console.error('missing required value file(s):');
  for (const file of missing) console.error(`- ${file}`);
  process.exit(1);
}

if (!apply) {
  console.log('Dry-run: no OpenBao writes performed.');
  for (const command of commands) {
    console.log(command.map((part) => (/\s/.test(part) ? JSON.stringify(part) : part)).join(' '));
  }
  console.log('\nRun again with --apply to execute these commands.');
  process.exit(0);
}

for (const command of commands) {
  const [program, ...programArgs] = command;
  const result = spawnSync(program, programArgs, {
    cwd: itopsRepo,
    stdio: 'inherit',
    env: {
      ...process.env,
      OPENBAO_CONFIG_DIR: defaultOpenBaoConfigDir(),
    },
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log('OpenBao leaf induction complete. Run: npm run lint:openbao-migration -- --live');
