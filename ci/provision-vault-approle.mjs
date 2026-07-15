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
  node ci/provision-vault-approle.mjs --policy-file <private-policy.hcl> \\
    [--addr "$VAULT_ADDR"] [--handoff ~/.config/vault/handoff/aiwg-ci.env] [--apply]

Default mode is dry-run. Apply mode requires VAULT_ADMIN_TOKEN and writes:
  - policy ci-aiwg from the private policy file
  - AppRole auth/approle/role/ci-aiwg
  - handoff env file containing VAULT_CI_ROLE_ID and VAULT_CI_SECRET_ID

The generated secret ID is written only to the handoff file, never stdout.
`);
}

if (help) {
  usage();
  process.exit(0);
}

const addr = argValue('--addr', process.env.VAULT_ADDR || '').replace(/\/+$/, '');
const role = 'ci-aiwg';
const policyFile = argValue('--policy-file');

if (['1', 'true', 'yes'].includes(String(process.env.VAULT_SKIP_VERIFY ?? '').toLowerCase())) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

function defaultVaultConfigDir() {
  if (process.env.VAULT_CONFIG_DIR) return process.env.VAULT_CONFIG_DIR;
  return path.join(os.homedir(), '.config', 'vault');
}

const handoff = path.resolve(
  argValue('--handoff', path.join(defaultVaultConfigDir(), 'handoff', 'aiwg-ci.env')),
);

if (!addr) {
  console.error('VAULT_ADDR or --addr is required');
  process.exit(2);
}
if (!policyFile || !existsSync(policyFile)) {
  console.error('missing required --policy-file');
  process.exit(2);
}

const policy = readFileSync(policyFile, 'utf8');

if (!apply) {
  console.log('Dry-run: would provision ci-aiwg vault AppRole from private policy file.');
  console.log(`policy source: ${policyFile}`);
  console.log(`handoff file: ${handoff}`);
  console.log('\nRun again with --apply and VAULT_ADMIN_TOKEN set to execute.');
  process.exit(0);
}

const token = process.env.VAULT_ADMIN_TOKEN;
if (!token) {
  console.error('VAULT_ADMIN_TOKEN is required for --apply');
  process.exit(2);
}

async function vault(pathname, init = {}) {
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
  await vault(`sys/policies/acl/${role}`, {
    method: 'POST',
    body: JSON.stringify({ policy }),
  });

  await vault(`auth/approle/role/${role}`, {
    method: 'POST',
    body: JSON.stringify({
      token_policies: role,
      token_ttl: '5m',
      token_max_ttl: '15m',
      secret_id_ttl: '0',
    }),
  });

  const roleId = await vault(`auth/approle/role/${role}/role-id`);
  const secretId = await vault(`auth/approle/role/${role}/secret-id`, { method: 'POST' });
  const roleIdValue = roleId?.data?.role_id;
  const secretIdValue = secretId?.data?.secret_id;

  if (!roleIdValue || !secretIdValue) {
    throw new Error('vault response did not include role_id and secret_id');
  }

  mkdirSync(path.dirname(handoff), { recursive: true, mode: 0o700 });
  writeFileSync(handoff, `VAULT_CI_ROLE_ID=${roleIdValue}\nVAULT_CI_SECRET_ID=${secretIdValue}\n`, {
    mode: 0o600,
  });
  console.log(`vault AppRole ${role} provisioned. Handoff written to ${handoff}.`);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
