/**
 * Cockpit live UAT against a real agentic-sandbox executor (#1617).
 *
 * Safe default: when no executor is reachable, tests log a skip reason and pass.
 * Strict local/release mode: set AIWG_COCKPIT_LIVE_REQUIRED=1 to fail instead.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - .mjs without bundled types
import { createBridge } from '../../apps/cockpit/bridge/src/server.mjs';

const EXECUTOR_URL =
  process.env.AIWG_COCKPIT_EXECUTOR_URL ||
  process.env.AIWG_SANDBOX_ENDPOINT ||
  'http://127.0.0.1:8122';
const REQUIRED = process.env.AIWG_COCKPIT_LIVE_REQUIRED === '1';
const EXECUTOR_TOKEN_FILE = process.env.AIWG_COCKPIT_EXECUTOR_TOKEN_FILE || '';
const MATRIX_REQUIRED = process.env.AIWG_COCKPIT_LIVE_MATRIX_REQUIRED === '1';
const MATRIX_TARGETS = (process.env.AIWG_COCKPIT_LIVE_MATRIX_TARGETS || 'host,container,vm')
  .split(',')
  .map((target) => target.trim())
  .filter(Boolean);
const PROVISION_TARGETS = process.env.AIWG_COCKPIT_LIVE_PROVISION === '1';
const PROVISION_NAME_PREFIX = process.env.AIWG_COCKPIT_LIVE_PROVISION_NAME_PREFIX || 'cockpit-uat';
const PROVISION_LOADOUT = process.env.AIWG_COCKPIT_LIVE_PROVISION_LOADOUT || '';
const PROVISION_IMAGE = process.env.AIWG_COCKPIT_LIVE_PROVISION_IMAGE || '';
const PROVISION_PROFILE = process.env.AIWG_COCKPIT_LIVE_PROVISION_PROFILE || '';
const PROVISION_TIMEOUT_MS = Number(process.env.AIWG_COCKPIT_LIVE_PROVISION_TIMEOUT_MS || 180_000);
const ALLOW_MOCK_MATRIX = process.env.AIWG_COCKPIT_LIVE_ALLOW_MOCK_MATRIX === '1';
const WORKLOAD_PROVIDER = (process.env.AIWG_COCKPIT_LIVE_PROVIDER || '').toLowerCase();
const WORKLOAD_MARKER = 'AIWG_COCKPIT_LIVE_OK';
const DISCOVERY_EXPECT = process.env.AIWG_COCKPIT_LIVE_DISCOVERY_EXPECT || 'issue-audit';
const startedAt = new Date().toISOString();
const MUTATION_FILE = process.env.AIWG_COCKPIT_LIVE_MUTATION_FILE || '';
const MUTATION_MARKER = 'AIWG_COCKPIT_MUTATION_OK';
const MUTATION_TEXT = process.env.AIWG_COCKPIT_LIVE_MUTATION_TEXT ||
  `cockpit-live-mutation ${startedAt}`;
const WORKLOAD_TEXT = process.env.AIWG_COCKPIT_LIVE_WORKLOAD ||
  [
    'AIWG Cockpit live matrix check: use AIWG skill discovery from this running agent session.',
    `Find the best capability for auditing open issue state and release blockers, then final-answer with ${WORKLOAD_MARKER}`,
    `and the discovered capability name ${DISCOVERY_EXPECT}. Do not just echo this prompt.`,
  ].join(' ');
const EXECUTOR_VERSION_HINT = process.env.AIWG_COCKPIT_EXECUTOR_VERSION || '';
const REPORT_BASE = resolve(process.env.AIWG_COCKPIT_LIVE_REPORT ?? 'test-results/cockpit-live-uat');
const JSON_REPORT = `${REPORT_BASE}.json`;
const MD_REPORT = `${REPORT_BASE}.md`;

interface Evidence {
  name: string;
  status: 'pass' | 'skip' | 'fail';
  detail: string;
}

const evidence: Evidence[] = [];
let executorIdentity: Record<string, unknown> = {};
const provisionedInstances = new Map<string, string>();
let executorAuthorization = '';

async function loadExecutorAuthorization() {
  if (!EXECUTOR_TOKEN_FILE) return;
  const path = EXECUTOR_TOKEN_FILE === '~'
    ? homedir()
    : EXECUTOR_TOKEN_FILE.startsWith('~/')
      ? join(homedir(), EXECUTOR_TOKEN_FILE.slice(2))
      : EXECUTOR_TOKEN_FILE;
  const metadata = await stat(path);
  if (!metadata.isFile()) throw new Error('AIWG_COCKPIT_EXECUTOR_TOKEN_FILE is not a regular file');
  if (process.platform !== 'win32' && (metadata.mode & 0o077) !== 0) {
    throw new Error('AIWG_COCKPIT_EXECUTOR_TOKEN_FILE must not be accessible by group or other users');
  }
  const token = String(await readFile(path, 'utf8')).trim();
  if (!token || /[\r\n]/.test(token)) throw new Error('AIWG_COCKPIT_EXECUTOR_TOKEN_FILE must contain exactly one token');
  executorAuthorization = `Bearer ${token}`;
}

function executorHeaders(): Record<string, string> {
  return executorAuthorization ? { authorization: executorAuthorization } : {};
}

function record(name: string, status: Evidence['status'], detail: string) {
  evidence.push({ name, status, detail });
}

async function probe(): Promise<{ ok: boolean; reason?: string }> {
  for (const path of ['/admin/instances', '/api/v2/admin/instances', '/health', '/api/v1/aiwg/status']) {
    try {
      const r = await fetch(`${EXECUTOR_URL}${path}`, { headers: executorHeaders(), signal: AbortSignal.timeout(2_000) });
      if (r.ok) return { ok: true };
    } catch (err) {
      if (path === '/api/v1/aiwg/status') return { ok: false, reason: String((err as Error).message || err) };
    }
  }
  return { ok: false, reason: 'no supported health/admin endpoint responded' };
}

async function bridgeJson(base: string, token: string, path: string, init: RequestInit = {}) {
  const r = await fetch(`${base}${path}`, { ...init, headers: { ...(init.headers ?? {}), authorization: `Bearer ${token}` } });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}

async function executorJson(path: string) {
  const r = await fetch(`${EXECUTOR_URL}${path}`, { headers: executorHeaders(), signal: AbortSignal.timeout(3_000) });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}

async function executorJsonWithTimeout(path: string, timeoutMs = 5_000) {
  const r = await fetch(`${EXECUTOR_URL}${path}`, { headers: executorHeaders(), signal: AbortSignal.timeout(timeoutMs) });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}

function identityFields(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== 'object') return {};
  const allowed = new Set([
    'name', 'version', 'commit', 'git_sha', 'gitSha', 'revision', 'build', 'build_id',
    'buildId', 'mock', 'surfaces', 'runtime', 'runtime_version',
  ]);
  return Object.fromEntries(
    Object.entries(body as Record<string, unknown>)
      .filter(([key]) => allowed.has(key))
      .filter(([, value]) => value === null || ['string', 'number', 'boolean'].includes(typeof value) || Array.isArray(value)),
  );
}

async function collectExecutorIdentity(): Promise<Record<string, unknown>> {
  const identity: Record<string, unknown> = {};
  if (EXECUTOR_VERSION_HINT) identity.version_hint = EXECUTOR_VERSION_HINT;
  for (const path of ['/health', '/version', '/api/version', '/api/v2/version']) {
    try {
      const r = await fetch(`${EXECUTOR_URL}${path}`, { headers: executorHeaders(), signal: AbortSignal.timeout(2_000) });
      if (!r.ok) continue;
      const body = identityFields(await r.json().catch(() => ({})));
      if (Object.keys(body).length > 0) identity[path] = body;
    } catch {
      // Best-effort identity capture only; the live gate is about runtime/session evidence.
    }
  }
  return identity;
}

function isMockExecutor(healthBody: unknown): boolean {
  if (!healthBody || typeof healthBody !== 'object') return false;
  const body = healthBody as { surfaces?: unknown; mock?: unknown; name?: unknown };
  return body.mock === true ||
    (Array.isArray(body.surfaces) && body.surfaces.includes('discovery') && body.surfaces.includes('admin')) ||
    String(body.name ?? '').toLowerCase().includes('mock');
}

function runtimeFamily(instance: any): 'host' | 'container' | 'vm' | 'other' {
  const kind = String(instance.runtime_posture?.kind ?? instance.runtime ?? '').toLowerCase();
  if (kind === 'host') return 'host';
  if (kind === 'container' || kind === 'docker') return 'container';
  if (kind === 'vm') return 'vm';
  return 'other';
}

function provisionRuntime(target: string): string {
  if (target === 'host') return 'host';
  if (target === 'container') return 'docker';
  if (target === 'vm') return 'qemu';
  throw new Error(`unsupported provision target: ${target}`);
}

function provisionName(target: string): string {
  return `${PROVISION_NAME_PREFIX}-${target}-${Date.now().toString(36)}`.replace(/[^a-z0-9-]/g, '-').slice(0, 63);
}

function provisionBody(target: string) {
  const providerSuffix = WORKLOAD_PROVIDER && ['codex', 'claude'].includes(WORKLOAD_PROVIDER) ? WORKLOAD_PROVIDER : 'codex';
  const body: Record<string, unknown> = {
    name: provisionName(target),
    runtime: provisionRuntime(target),
    start: true,
  };
  if (target === 'host') {
    body.loadout = PROVISION_LOADOUT || 'host-tools';
  } else if (target === 'container') {
    body.image = PROVISION_IMAGE || `agentic/${providerSuffix}:latest`;
    if (PROVISION_LOADOUT) body.loadout = PROVISION_LOADOUT;
  } else if (target === 'vm') {
    body.loadout = PROVISION_LOADOUT || 'profiles/basic.yaml';
  }
  if (PROVISION_PROFILE) body.profile = PROVISION_PROFILE;
  return body;
}

function asArrayFromEnvelope(body: any, keys: string[]) {
  if (Array.isArray(body)) return body;
  if (!body || typeof body !== 'object') return [];
  for (const key of keys) {
    if (Array.isArray(body[key])) return body[key];
  }
  if (body.data && typeof body.data === 'object') {
    for (const key of keys) {
      if (Array.isArray(body.data[key])) return body.data[key];
    }
  }
  return [];
}

async function waitForOperation(operationId: string, target: string) {
  const deadline = Date.now() + PROVISION_TIMEOUT_MS;
  let last = '';
  while (Date.now() < deadline) {
    const op = await executorJsonWithTimeout(`/api/v2/admin/operations/${encodeURIComponent(operationId)}`, 5_000);
    last = JSON.stringify(op.body);
    const state = String(op.body?.state ?? '').toLowerCase();
    if (state === 'succeeded' || state === 'completed') return op.body;
    if (state === 'failed') throw new Error(`provision ${target} operation failed: ${last}`);
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  throw new Error(`provision ${target} operation did not complete within ${PROVISION_TIMEOUT_MS}ms; last=${last}`);
}

async function waitForBootReady(base: string, token: string, target: 'host' | 'container' | 'vm', instanceId: string) {
  const deadline = Date.now() + PROVISION_TIMEOUT_MS;
  let last = '';
  while (Date.now() < deadline) {
    const inv = await bridgeJson(base, token, '/api/inventory')
      .catch((err) => ({ status: 0, body: { error: String((err as Error).message || err) } }));
    const agents = await executorJsonWithTimeout('/api/v1/agents', 5_000)
      .catch((err) => ({ status: 0, body: { error: String((err as Error).message || err) } }));
    const instances = inv.status === 200 ? (inv.body.instances ?? []) : [];
    const instance = instanceId
      ? instances.find((i: any) => String(i.id) === instanceId)
      : instances.find((i: any) => runtimeFamily(i) === target);
    const agentList = asArrayFromEnvelope(agents.body, ['agents', 'items', 'data']);
    const agent = agentList.find((a: any) => String(a.instance_id ?? a.instanceId ?? '') === String(instance?.id ?? instanceId));
    const backend = instance ? chooseBackend(instance) : undefined;
    last = `inventory=${inv.status}/${JSON.stringify(instance ?? inv.body)} agents=${agents.status}/${JSON.stringify(agent ?? agents.body)}`;
    if (instance && String(instance.state ?? '').toLowerCase() === 'running' && backend?.available !== false && agent) {
      return { instance, agent, backend };
    }
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  throw new Error(`provisioned ${target} did not become boot-ready within ${PROVISION_TIMEOUT_MS}ms; last=${last}`);
}

async function provisionTarget(base: string, token: string, target: 'host' | 'container' | 'vm') {
  const body = provisionBody(target);
  // Provision through the Cockpit Bridge, not the executor directly: the Bridge
  // injects the resolved ssh_key for qemu/VM launches (POST /api/instances ->
  // upstream /api/v2/admin/instances). Posting straight to the executor skips
  // that injection, so provision-vm.sh receives no --ssh-key. (#1658)
  const created = await bridgeJson(base, token, '/api/instances', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (![200, 201, 202].includes(created.status)) {
    throw new Error(`provision ${target} returned ${created.status}: ${JSON.stringify(created.body)}`);
  }
  const operationId = String(created.body?.id ?? created.body?.operation?.id ?? '');
  const instanceId = String(created.body?.instance_id ?? created.body?.instanceId ?? '');
  if (!operationId) throw new Error(`provision ${target} returned no operation id: ${JSON.stringify(created.body)}`);
  const op = await waitForOperation(operationId, target);
  const ready = await waitForBootReady(base, token, target, String(op?.result?.instance_id ?? instanceId));
  provisionedInstances.set(target, String(ready.instance.id));
  return { operationId, instanceId: ready.instance.id, body, op, ready };
}

function chooseBackend(instance: any) {
  const backends = Array.isArray(instance.session_backends) ? instance.session_backends : [];
  return backends.find((b: any) => b.available !== false && b.drive !== false) ??
    backends.find((b: any) => b.available !== false) ??
    backends[0];
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function providerWorkloadCommand(provider: string, prompt: string): string {
  if (provider === 'codex') {
    return `codex exec -s read-only ${shellQuote(prompt)}`;
  }
  if (provider === 'claude') {
    return `claude --print --permission-mode dontAsk --output-format text ${shellQuote(prompt)}`;
  }
  throw new Error(`unsupported live workload provider: ${provider}`);
}

function mutationCommand(): string {
  if (!MUTATION_FILE) throw new Error('AIWG_COCKPIT_LIVE_MUTATION_FILE is not set');
  return [
    `mkdir -p ${shellQuote(dirname(MUTATION_FILE))}`,
    `printf '%s\\n' ${shellQuote(MUTATION_TEXT)} > ${shellQuote(MUTATION_FILE)}`,
    `printf '%s\\n' ${shellQuote(MUTATION_MARKER)}`,
  ].join(' && ');
}

async function websocketSessionProbe(attachUrl: string, role: 'observer' | 'controller', workload?: string): Promise<{
  roleAssigned: boolean;
  output: string;
  sawMutationMarker: boolean;
}> {
  const ws = new WebSocket(attachUrl, 'pty-ws.v1');
  let roleAssigned = false;
  let output = '';
  let sawMutationMarker = false;
  const done = new Promise<{ roleAssigned: boolean; output: string; sawMutationMarker: boolean }>((resolve, reject) => {
    const timeout = setTimeout(() => {
      ws.close();
      resolve({ roleAssigned, output, sawMutationMarker });
    }, workload ? 60_000 : 6_000);
    ws.addEventListener('open', () => undefined);
    ws.addEventListener('error', () => {
      clearTimeout(timeout);
      reject(new Error('websocket attach failed'));
    });
    ws.addEventListener('message', (event) => {
      const raw = String(event.data);
      let msg: any;
      try { msg = JSON.parse(raw); } catch { return; }
      if (msg.op === 'binding_hello') {
        ws.send(JSON.stringify({ op: 'pty.join_session', payload: { role } }));
      }
      if (msg.op === 'role_assigned') {
        roleAssigned = true;
        if (role === 'controller' && workload) {
          ws.send(JSON.stringify({ op: 'pty.session_input', payload: { data: Buffer.from(`${workload}\r\n`, 'utf8').toString('base64') } }));
        }
      }
      if (msg.op === 'output') {
        output += Buffer.from(String(msg.payload?.data ?? ''), 'base64').toString('utf8');
        if (!workload && output.trim().length > 0) {
          clearTimeout(timeout);
          ws.close();
          resolve({ roleAssigned, output, sawMutationMarker });
        }
        if (workload && output.includes(MUTATION_MARKER)) {
          sawMutationMarker = true;
          clearTimeout(timeout);
          ws.close();
          resolve({ roleAssigned, output, sawMutationMarker });
        }
        if (workload && output.includes(WORKLOAD_MARKER) && output.includes(DISCOVERY_EXPECT)) {
          clearTimeout(timeout);
          ws.close();
          resolve({ roleAssigned, output, sawMutationMarker });
        }
      }
      if (msg.op === 'keyframe') {
        for (const frame of msg.payload?.frames ?? []) {
          output += Buffer.from(String(frame.payload?.data ?? ''), 'base64').toString('utf8');
        }
        if (workload && output.includes(MUTATION_MARKER)) {
          sawMutationMarker = true;
          clearTimeout(timeout);
          ws.close();
          resolve({ roleAssigned, output, sawMutationMarker });
        }
      }
      if (msg.op === 'error' && role === 'controller') {
        clearTimeout(timeout);
        ws.close();
        reject(new Error(`websocket controller denied: ${msg.payload?.code ?? 'error'}`));
      }
    });
  });
  return done;
}

async function verifyPtyMutation(attachUrl: string, targetDetail: string): Promise<string> {
  await rm(MUTATION_FILE, { force: true });
  const mutated = await websocketSessionProbe(attachUrl, 'controller', mutationCommand());
  if (!mutated.roleAssigned) throw new Error(`${targetDetail}; mutation drive attach not granted`);
  if (!mutated.sawMutationMarker) {
    throw new Error(`${targetDetail}; mutation command did not emit ${MUTATION_MARKER}`);
  }
  let actual = '';
  let lastError = '';
  for (let i = 0; i < 40; i += 1) {
    try {
      actual = await readFile(MUTATION_FILE, 'utf8');
      break;
    } catch (err) {
      lastError = String((err as Error).message || err);
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  if (!actual) throw new Error(`${targetDetail}; mutation file was not readable: ${lastError}`);
  if (actual.trim() !== MUTATION_TEXT) {
    throw new Error(`${targetDetail}; mutation file content mismatch`);
  }
  return `pty mutation verified at ${MUTATION_FILE}`;
}

async function writeReport({ reachable, reason }: { reachable: boolean; reason: string }) {
  const finishedAt = new Date().toISOString();
  const result = reachable
    ? (evidence.some((e) => e.status === 'fail') ? 'fail' : 'pass')
    : (REQUIRED ? 'fail' : 'skip');
  const payload = {
    issue: MATRIX_REQUIRED ? 1621 : 1617,
    executor_url: EXECUTOR_URL,
    executor_auth_configured: Boolean(EXECUTOR_TOKEN_FILE),
    required: REQUIRED,
    matrix_required: MATRIX_REQUIRED,
    matrix_targets: MATRIX_TARGETS,
    provision_targets: PROVISION_TARGETS,
    provision_name_prefix: PROVISION_TARGETS ? PROVISION_NAME_PREFIX : null,
    provision_loadout: PROVISION_TARGETS ? PROVISION_LOADOUT || null : null,
    provision_image: PROVISION_TARGETS ? PROVISION_IMAGE || null : null,
    provision_profile: PROVISION_TARGETS ? PROVISION_PROFILE || null : null,
    provider: WORKLOAD_PROVIDER || null,
    discovery_expect: DISCOVERY_EXPECT,
    mutation_file: MUTATION_FILE || null,
    mutation_marker: MUTATION_FILE ? MUTATION_MARKER : null,
    result,
    started_at: startedAt,
    finished_at: finishedAt,
    skip_reason: reachable ? undefined : reason,
    conformance_report: process.env.AIWG_SANDBOX_CONFORMANCE_REPORT || null,
    artifact_paths: {
      json_report: JSON_REPORT,
      markdown_report: MD_REPORT,
      conformance_report: process.env.AIWG_SANDBOX_CONFORMANCE_REPORT || null,
      mutation_file: MUTATION_FILE || null,
    },
    executor_identity: executorIdentity,
    evidence,
  };
  await mkdir(dirname(REPORT_BASE), { recursive: true });
  await writeFile(JSON_REPORT, `${JSON.stringify(payload, null, 2)}\n`);
  const lines = [
    '# Cockpit Live UAT Report',
    '',
    `- Issue: #${MATRIX_REQUIRED ? 1621 : 1617}`,
    `- Executor: ${EXECUTOR_URL}`,
    `- Executor auth configured: ${EXECUTOR_TOKEN_FILE ? 'yes' : 'no'}`,
    `- Required: ${REQUIRED ? 'yes' : 'no'}`,
    `- Matrix required: ${MATRIX_REQUIRED ? 'yes' : 'no'}`,
    `- Matrix targets: ${MATRIX_TARGETS.join(', ')}`,
    `- Provision targets: ${PROVISION_TARGETS ? 'yes' : 'no'}`,
    `- Workload provider: ${WORKLOAD_PROVIDER || 'not specified'}`,
    `- Discovery expectation: ${DISCOVERY_EXPECT}`,
    MUTATION_FILE ? `- Mutation file: ${MUTATION_FILE}` : '',
    `- Result: ${result}`,
    `- Started: ${startedAt}`,
    `- Finished: ${finishedAt}`,
    reachable ? '' : `- Skip reason: ${reason}`,
    `- agentic-sandbox-conformance report: ${payload.conformance_report ?? 'not provided'}`,
    `- JSON report: ${JSON_REPORT}`,
    `- Markdown report: ${MD_REPORT}`,
    MUTATION_FILE ? `- Mutation artifact: ${MUTATION_FILE}` : '',
    `- Executor identity: ${Object.keys(executorIdentity).length ? JSON.stringify(executorIdentity) : 'not provided by executor'}`,
    '',
    '## Evidence',
    '',
    ...evidence.map((e) => `- ${e.status.toUpperCase()} ${e.name}: ${e.detail}`),
    '',
  ].filter(Boolean);
  await writeFile(MD_REPORT, `${lines.join('\n')}\n`);
  // eslint-disable-next-line no-console
  console.log(`  Cockpit live UAT report: ${JSON_REPORT} and ${MD_REPORT}`);
}

describe('Cockpit live UAT — real agentic-sandbox executor', () => {
  let reachable = false;
  let reason = '';
  let bridge: any;
  let base = '';
  let token = '';

  beforeAll(async () => {
    await loadExecutorAuthorization();
    const p = await probe();
    reachable = p.ok;
    reason = p.reason || '';
    if (!reachable) {
      // eslint-disable-next-line no-console
      console.log(`\n  Skipping cockpit-live UAT — executor at ${EXECUTOR_URL} unreachable (${reason}).\n`);
      record('executor probe', REQUIRED ? 'fail' : 'skip', `unreachable: ${reason}`);
      if (REQUIRED) throw new Error(`required cockpit-live UAT unreachable: ${reason}`);
      return;
    }
    record('executor probe', 'pass', `reachable at ${EXECUTOR_URL}`);
    executorIdentity = await collectExecutorIdentity();
    record(
      'executor identity',
      Object.keys(executorIdentity).length ? 'pass' : 'skip',
      Object.keys(executorIdentity).length ? JSON.stringify(executorIdentity) : 'no version/commit endpoint or hint available',
    );
    bridge = createBridge({ executorUrl: EXECUTOR_URL, executorTokenFile: EXECUTOR_TOKEN_FILE });
    await new Promise((resolve) => bridge.listen(0, '127.0.0.1', resolve));
    base = `http://127.0.0.1:${bridge.address().port}`;
    token = bridge.cockpitToken;
  });

  afterAll(async () => {
    bridge?.close();
    await writeReport({ reachable, reason });
  });

  function liveIt(name: string, body: () => Promise<void>, timeout?: number) {
    it(name, async () => {
      if (!reachable) return;
      try {
        await body();
      } catch (err) {
        record(name, 'fail', String((err as Error).message || err));
        throw err;
      }
    }, timeout);
  }

  liveIt('Bridge health and inventory surface the real executor seam', async () => {
    const health = await bridgeJson(base, token, '/api/health');
    expect(health.body).toMatchObject({ status: 'ok', executor_url: EXECUTOR_URL });
    record('Bridge health', 'pass', `Bridge reported executor ${health.body.executor_url}`);

    const inv = await bridgeJson(base, token, '/api/inventory');
    expect([200, 502]).toContain(inv.status);
    if (inv.status === 200) {
      expect(Array.isArray(inv.body.instances)).toBe(true);
      if (inv.body.instances.length === 0) {
        const detail = 'live executor returned zero instances';
        record('inventory posture', (REQUIRED && !PROVISION_TARGETS) ? 'fail' : 'skip', PROVISION_TARGETS ? `${detail}; matrix provision mode will create target(s)` : detail);
        if (REQUIRED && !PROVISION_TARGETS) {
          throw new Error(`${detail}; provision at least one instance before required-green Cockpit live UAT`);
        }
        return;
      }
      expect(inv.body.instances[0]).toHaveProperty('runtime_posture');
      expect(inv.body.instances[0]).toHaveProperty('transport');
      expect(inv.body.instances[0]).toHaveProperty('session_backends');
      record('inventory posture', 'pass', `${inv.body.instances.length} instance(s) with normalized posture fields`);
    } else {
      record('inventory posture', 'skip', `Bridge returned ${inv.status}; live executor did not expose compatible inventory`);
    }
  });

  liveIt('session list, attach metadata, and task projection are explicit or skipped with evidence', async () => {
    const inv = await bridgeJson(base, token, '/api/inventory');
    if (inv.status !== 200 || !inv.body.instances?.length) {
      // eslint-disable-next-line no-console
      console.log('  Skipping session smoke — no inventory from live executor');
      record('session smoke', 'skip', PROVISION_TARGETS ? 'no inventory before matrix provision step' : 'no inventory from live executor');
      return;
    }
    const id = inv.body.instances[0].id;
    const sessions = await bridgeJson(base, token, `/api/sessions?instance=${encodeURIComponent(id)}`);
    expect([200, 502]).toContain(sessions.status);
    if (sessions.status === 200 && sessions.body.sessions?.length) {
      expect(sessions.body.sessions[0]).toHaveProperty('attach_url');
      expect(sessions.body.sessions[0]).toHaveProperty('role_policy');
      record('session metadata', 'pass', `${sessions.body.sessions.length} session(s) reported attach metadata`);
    } else {
      record('session metadata', 'skip', `sessions endpoint returned ${sessions.status} or no sessions`);
    }

    const running = await bridgeJson(base, token, '/api/running');
    expect([200, 502]).toContain(running.status);
    if (running.status === 200) {
      expect(Array.isArray(running.body.running)).toBe(true);
      record('task projection', 'pass', `${running.body.running.length} running task(s) reported`);
    } else {
      record('task projection', 'skip', `running endpoint returned ${running.status}`);
    }
  });

  liveIt('required host/container/vm matrix executes real provider-backed session workloads', async () => {
    if (!MATRIX_REQUIRED) {
      record('target matrix', 'skip', 'AIWG_COCKPIT_LIVE_MATRIX_REQUIRED not set');
      return;
    }
    if (!['claude', 'codex'].includes(WORKLOAD_PROVIDER)) {
      throw new Error('AIWG_COCKPIT_LIVE_PROVIDER must be claude or codex in matrix-required mode');
    }

    const health = await executorJson('/health').catch(() => ({ status: 0, body: {} }));
    if (isMockExecutor(health.body) && !ALLOW_MOCK_MATRIX) {
      throw new Error('matrix-required mode refuses mock-only executor evidence; use a real agentic-sandbox or set AIWG_COCKPIT_LIVE_ALLOW_MOCK_MATRIX=1 for harness development only');
    }

    const requiredTargets = MATRIX_TARGETS as Array<'host' | 'container' | 'vm'>;
    const unsupportedTargets = requiredTargets.filter((target) => !['host', 'container', 'vm'].includes(target));
    if (requiredTargets.length === 0 || unsupportedTargets.length > 0) {
      throw new Error(`AIWG_COCKPIT_LIVE_MATRIX_TARGETS must contain one or more of host,container,vm; unsupported=${unsupportedTargets.join(',')}`);
    }
    const targetErrors: string[] = [];
    const provisionFailures = new Map<string, string>();
    if (PROVISION_TARGETS) {
      for (const target of requiredTargets) {
        try {
          const provisioned = await provisionTarget(base, token, target);
          record(
            `provision ${target}`,
            'pass',
            `operation=${provisioned.operationId}; instance=${provisioned.instanceId}; runtime=${runtimeFamily(provisioned.ready.instance)}; state=${provisioned.ready.instance.state}; backend=${provisioned.ready.backend.mode ?? 'unknown'}/${provisioned.ready.backend.backend ?? 'unknown'}; agent=${provisioned.ready.agent.id ?? provisioned.ready.agent.agent_id ?? 'registered'}`,
          );
        } catch (err) {
          const detail = String((err as Error).message || err);
          provisionFailures.set(target, detail);
          record(`provision ${target}`, 'fail', detail);
        }
      }
    }
    const latestInv = await bridgeJson(base, token, '/api/inventory');
    expect(latestInv.status).toBe(200);
    const latestInstances = latestInv.body.instances ?? [];
    for (const target of requiredTargets) {
      try {
        if (provisionFailures.has(target)) {
          throw new Error(`provision failed for required live target ${target}: ${provisionFailures.get(target)}`);
        }
        const provisionedId = provisionedInstances.get(target);
        const instance = provisionedId
          ? latestInstances.find((i: any) => String(i.id) === provisionedId)
          : latestInstances.find((i: any) => runtimeFamily(i) === target);
        if (!instance) throw new Error(`missing required live target: ${target}`);
        const backend = chooseBackend(instance);
        if (!backend) throw new Error(`target ${target} has no session backend evidence`);
        const backendDetail = `${backend.mode ?? 'unknown'}/${backend.backend ?? 'unknown'}`;
        const targetDetail = `target=${target}; instance=${instance.id}; runtime=${runtimeFamily(instance)}; backend=${backendDetail}; provider=${WORKLOAD_PROVIDER}`;
        if (backend.available === false) {
          throw new Error(`${targetDetail}; backend unavailable: ${backend.reason ?? 'no reason'}`);
        }

        const start = await bridgeJson(
          base,
          token,
          `/api/instances/${encodeURIComponent(instance.id)}/sessions?mode=${encodeURIComponent(backend.mode ?? 'direct')}&backend=${encodeURIComponent(backend.backend ?? 'native')}`,
          { method: 'POST' },
        );
        if (![200, 201].includes(start.status)) {
          throw new Error(`${targetDetail}; session create returned ${start.status}`);
        }
        if (!start.body.attach_url) throw new Error(`${targetDetail}; session create returned no attach_url`);

        const sessions = await bridgeJson(base, token, `/api/sessions?instance=${encodeURIComponent(instance.id)}`);
        if (sessions.status !== 200) throw new Error(`${targetDetail}; sessions returned ${sessions.status}`);
        if (!sessions.body.sessions?.some((s: any) => s.id === start.body.id)) {
          throw new Error(`${targetDetail}; created session ${start.body.id ?? 'unknown'} not listed`);
        }

        const projected = await bridgeJson(base, token, '/api/running');
        if (projected.status !== 200 || !Array.isArray(projected.body.running)) {
          throw new Error(`${targetDetail}; running projection returned ${projected.status}`);
        }
        const projectedForTarget = projected.body.running.filter((t: any) => String(t.instance_id) === String(instance.id));

        const observed = await websocketSessionProbe(start.body.attach_url, 'observer');
        if (!observed.roleAssigned) throw new Error(`${targetDetail}; observe attach not granted`);

        if (backend.drive === false) {
          record(`matrix ${target}`, 'skip', `${targetDetail}; observe-only target with capability evidence: ${backend.reason ?? 'drive=false'}`);
          continue;
        }
        const driveStart = await bridgeJson(
          base,
          token,
          `/api/instances/${encodeURIComponent(instance.id)}/sessions?mode=${encodeURIComponent(backend.mode ?? 'direct')}&backend=${encodeURIComponent(backend.backend ?? 'native')}`,
          { method: 'POST' },
        );
        if (![200, 201].includes(driveStart.status)) {
          throw new Error(`${targetDetail}; drive session create returned ${driveStart.status}`);
        }
        if (!driveStart.body.attach_url) {
          throw new Error(`${targetDetail}; drive session create returned no attach_url`);
        }
        const providerCommand = providerWorkloadCommand(WORKLOAD_PROVIDER, WORKLOAD_TEXT);
        const driven = await websocketSessionProbe(driveStart.body.attach_url, 'controller', providerCommand);
        if (!driven.roleAssigned) throw new Error(`${targetDetail}; drive attach not granted`);
        if (!driven.output.trim()) throw new Error(`${targetDetail}; no terminal output for provider workload`);
        if (!driven.output.includes(WORKLOAD_MARKER)) {
          throw new Error(`${targetDetail}; provider workload did not emit ${WORKLOAD_MARKER}`);
        }
        if (!driven.output.includes(DISCOVERY_EXPECT)) {
          throw new Error(`${targetDetail}; provider workload did not prove AIWG discovery result ${DISCOVERY_EXPECT}`);
        }
        let mutationDetail = '';
        if (MUTATION_FILE) {
          const mutationStart = await bridgeJson(
            base,
            token,
            `/api/instances/${encodeURIComponent(instance.id)}/sessions?mode=${encodeURIComponent(backend.mode ?? 'direct')}&backend=${encodeURIComponent(backend.backend ?? 'native')}`,
            { method: 'POST' },
          );
          if (![200, 201].includes(mutationStart.status)) {
            throw new Error(`${targetDetail}; mutation session create returned ${mutationStart.status}`);
          }
          if (!mutationStart.body.attach_url) {
            throw new Error(`${targetDetail}; mutation session create returned no attach_url`);
          }
          const mutationObserved = await websocketSessionProbe(mutationStart.body.attach_url, 'observer');
          if (!mutationObserved.roleAssigned) {
            throw new Error(`${targetDetail}; mutation observe attach not granted`);
          }
          mutationDetail = await verifyPtyMutation(mutationStart.body.attach_url, targetDetail);
        }
        record(
          `matrix ${target}`,
          'pass',
          `${targetDetail}; provider CLI workload emitted ${WORKLOAD_MARKER} and discovery result ${DISCOVERY_EXPECT}; running_projection_count=${projectedForTarget.length}; output_bytes=${driven.output.length}${mutationDetail ? `; ${mutationDetail}` : ''}`,
        );
      } catch (err) {
        const detail = String((err as Error).message || err);
        record(`matrix ${target}`, 'fail', detail);
        targetErrors.push(detail);
      }
    }
    if (targetErrors.length > 0) {
      throw new Error(`required live matrix failed for ${targetErrors.length}/${requiredTargets.length} target(s): ${targetErrors.join(' | ')}`);
    }
  }, PROVISION_TARGETS ? Math.max(240_000, PROVISION_TIMEOUT_MS + 120_000) : 240_000);
});
