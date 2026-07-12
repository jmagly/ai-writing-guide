#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
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
  node ci/configure-gitea-openbao-bootstrap.mjs \\
    --bootstrap-env ~/.config/openbao/handoff/aiwg-ci.env \\
    --vars-env /path/to/aiwg-deploy-vars.env \\
    [--repo roctinam/aiwg] [--login <tea-login>] [--apply]

Default mode is dry-run. It validates required names and prints what would be
set without printing secret or variable values.

bootstrap env keys:
  BAO_CI_ROLE_ID
  BAO_CI_SECRET_ID

vars env keys:
  DEPLOY_HOST
  DEPLOY_PORT
  DEPLOY_USER
  DEPLOY_PATH
`);
}

if (help) {
  usage();
  process.exit(0);
}

const bootstrapEnv = argValue('--bootstrap-env');
const varsEnv = argValue('--vars-env');
const repo = argValue('--repo', 'roctinam/aiwg');
const login = argValue('--login');

if (!bootstrapEnv || !varsEnv) {
  usage();
  console.error('\nmissing required --bootstrap-env or --vars-env');
  process.exit(2);
}

function parseEnvFile(file) {
  if (!existsSync(file)) {
    console.error(`missing env file: ${file}`);
    process.exit(1);
  }
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

const bootstrap = parseEnvFile(bootstrapEnv);
const vars = parseEnvFile(varsEnv);
const requiredSecrets = ['BAO_CI_ROLE_ID', 'BAO_CI_SECRET_ID'];
const requiredVars = ['DEPLOY_HOST', 'DEPLOY_PORT', 'DEPLOY_USER', 'DEPLOY_PATH'];
const missing = [
  ...requiredSecrets.filter((key) => !bootstrap.get(key)),
  ...requiredVars.filter((key) => !vars.get(key)),
];

if (missing.length > 0) {
  console.error('missing required key(s):');
  for (const key of missing) console.error(`- ${key}`);
  process.exit(1);
}

const commonArgs = ['--repo', repo];
if (login) commonArgs.push('--login', login);

function runTea(commandArgs, value) {
  const result = spawnSync('tea', commandArgs, {
    input: value,
    encoding: 'utf8',
    stdio: ['pipe', 'inherit', 'inherit'],
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

if (!apply) {
  console.log(`Dry-run: would configure Gitea Actions for ${repo}.`);
  for (const key of requiredSecrets) {
    console.log(`secret ${key} <- ${bootstrapEnv}`);
  }
  for (const key of requiredVars) {
    console.log(`variable ${key} <- ${varsEnv}`);
  }
  console.log('\nRun again with --apply to execute tea actions commands.');
  process.exit(0);
}

for (const key of requiredSecrets) {
  runTea(['actions', 'secrets', 'set', ...commonArgs, '--stdin', key], bootstrap.get(key));
}

for (const key of requiredVars) {
  runTea(['actions', 'variables', 'set', ...commonArgs, '--stdin', key], vars.get(key));
}

runTea(['actions', 'secrets', 'list', ...commonArgs], '');
runTea(['actions', 'variables', 'list', ...commonArgs], '');
console.log('Gitea Actions bootstrap configuration complete.');
