#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const HEADLESS_PLAN_SCHEMA = 'aiwg.cockpit-headless-plan/v1';
export const CANONICAL_MANIFEST = 'https://aiwg.io/agentic-sandbox/setup.aiwg.yaml';

function argsOf(argv) {
  const out = { command: argv[0] || 'plan' };
  for (let index = 1; index < argv.length; index += 1) {
    const key = argv[index];
    if (!key.startsWith('--')) continue;
    const name = key.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    const next = argv[index + 1];
    out[name] = next && !next.startsWith('--') ? argv[++index] : true;
  }
  return out;
}

async function manifestText(source) {
  if (/^https:\/\//.test(source)) {
    const response = await fetch(source, { signal: AbortSignal.timeout(10_000) });
    if (!response.ok) throw new Error(`manifest fetch failed (${response.status})`);
    return response.text();
  }
  return readFile(path.resolve(source), 'utf8');
}

export function validateManifestContract(text) {
  if (!/^apiVersion:\s*setup\.aiwg\.io\/v1\s*$/m.test(text)) {
    throw new Error('manifest must declare apiVersion setup.aiwg.io/v1');
  }
  if (!/^kind:\s*SetupManifest\s*$/m.test(text)) {
    throw new Error('manifest must declare kind SetupManifest');
  }
  return {
    api_version: 'setup.aiwg.io/v1',
    kind: 'SetupManifest',
    execution_mode: /execution_mode:\s*provider-orchestrated/.test(text)
      ? 'provider-orchestrated'
      : 'validate-with-aiwg-setup-validate',
  };
}

export function createPlan(input, manifest) {
  if (!input.cockpitHost) throw new Error('--cockpit-host is required');
  if (!input.executorHost) {
    return {
      schema: HEADLESS_PLAN_SCHEMA,
      status: 'question',
      mutation_allowed: false,
      question: `Will Agentic Sandbox run on the Cockpit host ${input.cockpitHost}, or a different host?`,
    };
  }
  const sameHost = input.cockpitHost === input.executorHost;
  const operatorHost = input.operatorHost || input.cockpitHost;
  return {
    schema: HEADLESS_PLAN_SCHEMA,
    status: 'ready',
    mutation_allowed: false,
    manifest: {
      source: input.manifest,
      api_version: manifest.api_version,
      kind: manifest.kind,
      execution_mode: manifest.execution_mode,
      contract_owner: 'setup.aiwg.yaml',
    },
    topology: {
      kind: sameHost ? 'same-host' : 'cross-host',
      cockpit_host: input.cockpitHost,
      executor_host: input.executorHost,
      operator_host: operatorHost,
      operator_access: operatorHost === input.cockpitHost ? 'local' : 'explicit-forward-required',
      bridge_to_executor: sameHost ? 'loopback' : 'explicit-trusted-transport-required',
    },
    preview: {
      packages: 'from-validated-setup-manifest',
      services: [
        { id: 'agentic-sandbox', scope: 'user', bind: '127.0.0.1', ports: [8120, 8121, 8122] },
        { id: 'aiwg-cockpit', scope: 'user', bind: '127.0.0.1', ports: [8140], after: sameHost ? ['agentic-sandbox.service'] : [] },
      ],
      runtime_tiers: [
        { id: 'host', verify_independently: true },
        { id: 'docker', verify_independently: true },
        { id: 'vm', pass_requires: '/dev/kvm' },
      ],
      mounts: 'from-validated-setup-manifest',
      egress: 'from-validated-setup-manifest',
      persistence: { user_systemd: true, linger: 'verify-before-claiming' },
      cleanup: 'ledger-owned-resources-only',
    },
    verification: {
      command: `aiwg cockpit doctor --topology ${sameHost ? 'same-host' : 'ssh-local'} --cockpit-host ${input.cockpitHost} --executor-host ${input.executorHost} --format json`,
    },
  };
}

function unitFiles(plan) {
  return {
    'agentic-sandbox.service': [
      '[Unit]',
      'Description=Agentic Sandbox executor',
      '',
      '[Service]',
      'Environment=HOST=127.0.0.1',
      'ExecStart=agentic-mgmt --host 127.0.0.1 --grpc-port 8120 --ws-port 8121 --http-port 8122',
      'Restart=on-failure',
      '',
      '[Install]',
      'WantedBy=default.target',
      '',
    ].join('\n'),
    'aiwg-cockpit.service': [
      '[Unit]',
      'Description=AIWG Cockpit Bridge',
      ...(plan.topology.kind === 'same-host' ? ['After=agentic-sandbox.service', 'Requires=agentic-sandbox.service'] : []),
      '',
      '[Service]',
      'Environment=HOST=127.0.0.1',
      'Environment=AIWG_COCKPIT_BRIDGE_PORT=8140',
      'ExecStart=aiwg cockpit',
      'Restart=on-failure',
      '',
      '[Install]',
      'WantedBy=default.target',
      '',
    ].join('\n'),
  };
}

function within(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative);
}

export async function stagePlan(plan, root) {
  if (!root) throw new Error('--root is required for stage');
  const absoluteRoot = path.resolve(root);
  if (absoluteRoot === path.parse(absoluteRoot).root) throw new Error('refusing to stage into a filesystem root');
  if (plan.status !== 'ready') throw new Error('topology must be ready before staging');
  const unitRoot = path.join(absoluteRoot, 'systemd', 'user');
  const resources = [];
  await mkdir(unitRoot, { recursive: true });
  for (const [name, content] of Object.entries(unitFiles(plan))) {
    const target = path.join(unitRoot, name);
    if (existsSync(target)) throw new Error(`refusing to overwrite existing staged resource: ${name}`);
    await writeFile(target, content, { mode: 0o600 });
    resources.push({ path: target, kind: 'user-systemd-unit', created: true });
  }
  const ledgerPath = path.join(absoluteRoot, 'cockpit-headless-ledger.json');
  if (existsSync(ledgerPath)) throw new Error('refusing to overwrite an existing attempt ledger');
  const ledger = {
    schema: 'aiwg.cockpit-headless-ledger/v1',
    root: absoluteRoot,
    topology: plan.topology,
    resources,
  };
  await writeFile(ledgerPath, JSON.stringify(ledger, null, 2), { mode: 0o600 });
  return { ...plan, status: 'staged', mutation_allowed: false, ledger: ledgerPath, resources };
}

export async function rollbackLedger(ledgerPath) {
  const absoluteLedger = path.resolve(ledgerPath);
  const ledger = JSON.parse(await readFile(absoluteLedger, 'utf8'));
  const root = path.resolve(ledger.root || '');
  if (!root || root === path.parse(root).root) throw new Error('invalid ledger root');
  const removed = [];
  for (const resource of [...(ledger.resources || [])].reverse()) {
    const target = path.resolve(String(resource.path || ''));
    if (resource.created !== true || !within(root, target)) throw new Error('ledger contains an unowned or out-of-root resource');
    await rm(target, { force: true });
    removed.push(target);
  }
  await rm(absoluteLedger, { force: true });
  return { schema: ledger.schema, status: 'rolled-back', removed_count: removed.length };
}

export async function run(argv = process.argv.slice(2)) {
  const input = argsOf(argv);
  if (input.command === 'rollback') {
    if (!input.ledger) throw new Error('--ledger is required for rollback');
    console.log(JSON.stringify(await rollbackLedger(input.ledger), null, 2));
    return 0;
  }
  const source = String(input.manifest || CANONICAL_MANIFEST);
  const contract = validateManifestContract(await manifestText(source));
  const plan = createPlan({ ...input, manifest: source }, contract);
  if (plan.status === 'question') {
    console.log(JSON.stringify(plan, null, 2));
    return 2;
  }
  const result = input.command === 'stage' ? await stagePlan(plan, input.root) : plan;
  console.log(JSON.stringify(result, null, 2));
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  run().then(code => { process.exitCode = code; }).catch(error => {
    console.error(`cockpit-headless-deploy: ${error.message}`);
    process.exitCode = 1;
  });
}
