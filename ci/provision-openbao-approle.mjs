#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
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
  node ci/provision-openbao-approle.mjs [--addr https://rca-g2.s9.internal:8200] \\
    [--handoff ~/.config/openbao/handoff/aiwg-ci.env] [--apply]

Default mode is dry-run. Apply mode requires BAO_TOKEN and writes:
  - policy ci-aiwg from ci/openbao-ci-aiwg.hcl
  - AppRole auth/approle/role/ci-aiwg
  - handoff env file containing BAO_CI_ROLE_ID and BAO_CI_SECRET_ID

The generated secret ID is written only to the handoff file, never stdout.
`);
}

if (help) {
  usage();
  process.exit(0);
}

const root = process.cwd();
const addr = argValue('--addr', process.env.BAO_ADDR || 'https://rca-g2.s9.internal:8200').replace(/\/+$/, '');
const role = 'ci-aiwg';
const policyFile = path.join(root, 'ci', 'openbao-ci-aiwg.hcl');

if (['1', 'true', 'yes'].includes(String(process.env.BAO_SKIP_VERIFY ?? '').toLowerCase())) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

function defaultOpenBaoConfigDir() {
  if (process.env.OPENBAO_CONFIG_DIR) return process.env.OPENBAO_CONFIG_DIR;
  const homeConfig = path.join(os.homedir(), '.config', 'openbao');
  if (existsSync(homeConfig)) return homeConfig;
  const operatorConfig = '/home/roctinam/.config/openbao';
  if (existsSync(operatorConfig)) return operatorConfig;
  return homeConfig;
}

const handoff = path.resolve(
  argValue('--handoff', path.join(defaultOpenBaoConfigDir(), 'handoff', 'aiwg-ci.env')),
);

if (!existsSync(policyFile)) {
  console.error(`missing policy file: ${policyFile}`);
  process.exit(1);
}

const policy = readFileSync(policyFile, 'utf8');

const operations = [
  `POST ${addr}/v1/sys/policies/acl/${role}`,
  `POST ${addr}/v1/auth/approle/role/${role}`,
  `GET  ${addr}/v1/auth/approle/role/${role}/role-id`,
  `POST ${addr}/v1/auth/approle/role/${role}/secret-id`,
  `write handoff file ${handoff}`,
];

if (!apply) {
  console.log('Dry-run: no OpenBao writes performed.');
  for (const operation of operations) console.log(operation);
  console.log('\nRun again with --apply and BAO_TOKEN set to execute.');
  process.exit(0);
}

const token = process.env.BAO_TOKEN;
if (!token) {
  console.error('BAO_TOKEN is required for --apply');
  process.exit(2);
}

async function openbao(pathname, init = {}) {
  const response = await fetch(`${addr}/v1/${pathname}`, {
    ...init,
    headers: {
      'X-Vault-Token': token,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${init.method ?? 'GET'} ${pathname} failed (${response.status}): ${text}`);
  }
  return text ? JSON.parse(text) : {};
}

try {
  await openbao(`sys/policies/acl/${role}`, {
    method: 'POST',
    body: JSON.stringify({ policy }),
  });

  await openbao(`auth/approle/role/${role}`, {
    method: 'POST',
    body: JSON.stringify({
      token_policies: role,
      token_ttl: '5m',
      token_max_ttl: '15m',
      secret_id_ttl: '0',
    }),
  });

  const roleId = await openbao(`auth/approle/role/${role}/role-id`);
  const secretId = await openbao(`auth/approle/role/${role}/secret-id`, { method: 'POST' });
  const roleIdValue = roleId?.data?.role_id;
  const secretIdValue = secretId?.data?.secret_id;

  if (!roleIdValue || !secretIdValue) {
    throw new Error('OpenBao response did not include role_id and secret_id');
  }

  mkdirSync(path.dirname(handoff), { recursive: true, mode: 0o700 });
  writeFileSync(handoff, `BAO_CI_ROLE_ID=${roleIdValue}\nBAO_CI_SECRET_ID=${secretIdValue}\n`, {
    mode: 0o600,
  });
  console.log(`OpenBao AppRole ${role} provisioned. Handoff written to ${handoff}.`);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
