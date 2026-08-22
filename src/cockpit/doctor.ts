import { execFile as execFileCallback } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { homedir, hostname, platform } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { pathToFileURL } from 'node:url';

const execFile = promisify(execFileCallback);

export const COCKPIT_DOCTOR_SCHEMA = 'aiwg.cockpit-doctor/v1' as const;
export type CockpitTopology = 'same-host' | 'ssh-local' | 'ssh-reverse';
export type DoctorStatus = 'pass' | 'warn' | 'blocked';

export interface DoctorRow {
  id: string;
  status: DoctorStatus;
  code: string;
  summary: string;
  evidence: Record<string, string | number | boolean | null>;
  recovery: string | null;
}

export interface CockpitDoctorReport {
  schema: typeof COCKPIT_DOCTOR_SCHEMA;
  generated_at: string;
  topology: {
    kind: CockpitTopology;
    cockpit_host: string;
    executor_host: string;
    operator_access: 'local' | 'ssh-local-forward' | 'ssh-reverse-forward';
  };
  status: DoctorStatus;
  rows: DoctorRow[];
}

export interface CockpitDoctorOptions {
  coreVersion: string;
  cockpitInstalled: boolean;
  cockpitVersion?: string;
  cockpitPackageRoot?: string;
  topology?: CockpitTopology;
  cockpitHost?: string;
  executorHost?: string;
  expectedExecutorVersion?: string;
  forwardEndpoint?: string;
  runtimeFile?: string;
  now?: () => Date;
}

interface RuntimeRecord {
  token?: string;
  token_ref?: unknown;
  port?: number;
  pid?: number;
  keychain_backed?: boolean;
}

export interface CockpitDoctorProbes {
  readRuntime(file: string): Promise<{ record: RuntimeRecord; mode: number; owned: boolean }>;
  fetchJson(url: string, headers?: Record<string, string>): Promise<{ status: number; body: any }>;
  command(command: string, args: string[]): Promise<{ ok: boolean; stdout: string }>;
  pathExists(file: string): boolean;
  hostName(): string;
  platform(): string;
}

function safeText(value: unknown): string {
  return String(value ?? '')
    .replace(/((?:bearer|token|nonce|secret|password|authorization)\s*)[:=]\s*[^\s,;]+/gi, '$1=[redacted]')
    .replace(/([?#](?:token|nonce|secret|password|authorization)=)[^&#\s]+/gi, '$1[redacted]')
    .slice(0, 240);
}

function evidence(values: DoctorRow['evidence']): DoctorRow['evidence'] {
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [
    key,
    typeof value === 'string' ? safeText(value) : value,
  ]));
}

function row(
  id: string,
  status: DoctorStatus,
  code: string,
  summary: string,
  values: DoctorRow['evidence'],
  recovery: string | null,
): DoctorRow {
  return { id, status, code, summary, evidence: evidence(values), recovery: status === 'pass' ? null : recovery };
}

function overall(rows: DoctorRow[]): DoctorStatus {
  if (rows.some(item => item.status === 'blocked')) return 'blocked';
  if (rows.some(item => item.status === 'warn')) return 'warn';
  return 'pass';
}

function isLoopback(host: string): boolean {
  return ['127.0.0.1', 'localhost', '::1', '[::1]'].includes(host.toLowerCase());
}

function looksMock(body: any): boolean {
  const text = JSON.stringify({
    service: body?.service,
    name: body?.name,
    executor: body?.executor,
    implementation: body?.implementation,
    mock: body?.mock,
  }).toLowerCase();
  return body?.mock === true || /mock[-_ ]?executor|cockpit[-_ ]?mock/.test(text);
}

function listenerRows(stdout: string): DoctorRow {
  const lines = stdout.split(/\r?\n/).filter(line => /:(8120|8121|8122|8140)\b/.test(line));
  const publicLines = lines.filter(line => /(?:0\.0\.0\.0|\[::\]|\*):(8120|8121|8122|8140)\b/.test(line));
  if (publicLines.length > 0) return row(
    'listeners', 'blocked', 'public_bind', 'A Cockpit or executor listener is publicly bound.',
    { checked_ports: '8120-8122,8140', public_listener_count: publicLines.length },
    'Bind the named service to 127.0.0.1 and restart only that service.',
  );
  return row(
    'listeners', lines.length > 0 ? 'pass' : 'warn', lines.length > 0 ? 'loopback_only' : 'listeners_not_observed',
    lines.length > 0 ? 'Observed application listeners are loopback-only.' : 'No application listeners were observed locally.',
    { checked_ports: '8120-8122,8140', observed_listener_count: lines.length },
    'Start the expected user services, then rerun the doctor.',
  );
}

export function defaultCockpitDoctorProbes(cockpitPackageRoot?: string): CockpitDoctorProbes {
  return {
    async readRuntime(file) {
      const [raw, info] = await Promise.all([readFile(file, 'utf8'), stat(file)]);
      const record = JSON.parse(raw) as RuntimeRecord;
      if (!record.token && record.token_ref && cockpitPackageRoot) {
        try {
          const keychain = await import(pathToFileURL(path.join(cockpitPackageRoot, 'shell-core', 'keychain.mjs')).href);
          record.token = await keychain.readCockpitToken(record.token_ref);
        } catch { /* authentication row reports a focused failure */ }
      }
      return { record, mode: info.mode & 0o777, owned: info.uid === process.getuid?.() };
    },
    async fetchJson(url, headers = {}) {
      const response = await fetch(url, { headers, signal: AbortSignal.timeout(2500) });
      let body: any = null;
      try { body = await response.json(); } catch { body = null; }
      return { status: response.status, body };
    },
    async command(command, args) {
      try {
        const result = await execFile(command, args, { timeout: 3000, maxBuffer: 1024 * 1024 });
        return { ok: true, stdout: result.stdout };
      } catch (error: any) {
        return { ok: false, stdout: typeof error?.stdout === 'string' ? error.stdout : '' };
      }
    },
    pathExists: existsSync,
    hostName: hostname,
    platform,
  };
}

export async function runCockpitDoctor(
  options: CockpitDoctorOptions,
  probes: CockpitDoctorProbes = defaultCockpitDoctorProbes(options.cockpitPackageRoot),
): Promise<CockpitDoctorReport> {
  const topology = options.topology ?? 'same-host';
  const cockpitHost = options.cockpitHost ?? probes.hostName();
  const executorHost = options.executorHost ?? (topology === 'same-host' ? cockpitHost : 'unspecified');
  const rows: DoctorRow[] = [];

  rows.push(options.cockpitInstalled
    ? row('package', options.cockpitVersion === options.coreVersion ? 'pass' : 'blocked',
      options.cockpitVersion === options.coreVersion ? 'version_lockstep' : 'version_skew',
      options.cockpitVersion === options.coreVersion ? 'Cockpit and AIWG versions match.' : 'Cockpit and AIWG versions differ.',
      {
        core_version: options.coreVersion,
        cockpit_version: options.cockpitVersion ?? 'unknown',
        source: options.cockpitPackageRoot?.includes('node_modules') ? 'managed-package' : 'source-workspace',
        location: options.cockpitPackageRoot?.includes('node_modules')
          ? '$AIWG_COCKPIT_HOME/node_modules/@aiwg/cockpit'
          : 'apps/cockpit',
      },
      'Run `aiwg use cockpit` to install the core-matched Cockpit package.')
    : row('package', 'blocked', 'cockpit_not_installed', 'Cockpit is not installed.',
      { core_version: options.coreVersion, cockpit_version: null, source: 'absent' }, 'Run `aiwg use cockpit`.'));

  const runtimeFile = options.runtimeFile ?? path.join(homedir(), '.aiwg', 'cockpit', 'runtime', 'bridge.json');
  let runtime: RuntimeRecord | null = null;
  try {
    const observed = await probes.readRuntime(runtimeFile);
    runtime = observed.record;
    const secure = observed.mode === 0o600 && observed.owned && Boolean(runtime.port) && Boolean(runtime.token || runtime.token_ref);
    rows.push(row('bridge-runtime', secure ? 'pass' : 'blocked', secure ? 'runtime_secure' : 'runtime_insecure',
      secure ? 'Bridge runtime metadata has the required ownership and mode.' : 'Bridge runtime metadata is missing or insecure.',
      { mode: observed.mode.toString(8), owned_by_current_user: observed.owned, credential_present: Boolean(runtime.token || runtime.token_ref), port: runtime.port ?? null },
      'Stop Cockpit, restrict the runtime directory to 0700 and bridge.json to 0600, then restart Cockpit.'));
  } catch {
    rows.push(row('bridge-runtime', 'blocked', 'runtime_missing', 'Bridge runtime metadata is unavailable.',
      { runtime_file: 'default-cockpit-runtime', credential_present: false }, 'Start Cockpit as the intended user, then rerun the doctor.'));
  }

  let bridgeHealth: any = null;
  if (runtime?.port) {
    const base = `http://127.0.0.1:${runtime.port}`;
    try {
      const live = await probes.fetchJson(`${base}/healthz`);
      if (live.status < 200 || live.status >= 300) throw new Error('not live');
      const token = typeof runtime.token === 'string' ? runtime.token : '';
      const authed = await probes.fetchJson(`${base}/api/health`, token ? { authorization: `Bearer ${token}` } : {});
      if ([401, 403].includes(authed.status)) {
        rows.push(row('bridge', 'blocked', 'bridge_unauthenticated', 'Bridge is reachable but authentication failed.',
          { reachable: true, authenticated: false }, 'Restart the Bridge to mint fresh runtime credentials, then rerun the doctor.'));
      } else if (authed.status >= 200 && authed.status < 300) {
        bridgeHealth = authed.body;
        rows.push(row('bridge', 'pass', 'bridge_authenticated', 'Bridge is reachable and authenticated.',
          { reachable: true, authenticated: true, port: runtime.port }, null));
      } else throw new Error('unexpected response');
    } catch {
      rows.push(row('bridge', 'blocked', 'bridge_unreachable', 'Bridge is not reachable through its runtime endpoint.',
        { reachable: false, authenticated: false, port: runtime.port }, 'Restart the Cockpit user service and rerun the doctor.'));
    }
  } else {
    rows.push(row('bridge', 'blocked', 'bridge_unreachable', 'Bridge endpoint is unknown.',
      { reachable: false, authenticated: false }, 'Start Cockpit as the intended user, then rerun the doctor.'));
  }

  const executorUrlText = typeof bridgeHealth?.executor_url === 'string' ? bridgeHealth.executor_url : '';
  if (executorUrlText) {
    let executorUrl: URL | null = null;
    try { executorUrl = new URL(executorUrlText); } catch { /* reported as unreachable */ }
    const hostMatches = executorUrl && (topology === 'same-host'
      ? isLoopback(executorUrl.hostname)
      : executorHost !== 'unspecified' && executorUrl.hostname === executorHost);
    if (!hostMatches) {
      rows.push(row('executor', 'blocked', 'wrong_host', 'Bridge targets a host inconsistent with the declared topology.',
        { topology, expected_host: executorHost, configured_host: executorUrl?.hostname ?? 'invalid' },
        'Correct the declared executor host or the Bridge executor URL; do not create a tunnel until they agree.'));
    } else {
      try {
        const bridgeExecutor = bridgeHealth?.executor;
        const deep = bridgeExecutor && typeof bridgeExecutor === 'object'
          ? { status: bridgeExecutor.status === 'ok' ? 200 : 503, body: bridgeExecutor }
          : await probes.fetchJson(`${executorUrlText.replace(/\/$/, '')}/healthz/deep`);
        if ([401, 403].includes(deep.status)) {
          rows.push(row('executor', 'blocked', 'executor_unauthenticated', 'Executor is reachable but authentication failed.',
            { reachable: true, authenticated: false, host_matches: true }, 'Configure the Bridge executor credential file with mode 0600, then restart the Bridge.'));
        } else if (deep.status < 200 || deep.status >= 300) throw new Error('deep health failed');
        else if (deep.body?.real_executor === false || looksMock(deep.body)) {
          rows.push(row('executor', 'blocked', 'mock_executor', 'Configured executor identifies as a mock.',
            { reachable: true, authenticated: true, real_executor: false }, 'Point the Bridge at the real Agentic Sandbox executor and restart it without mock allowance.'));
        } else {
          const observedVersion = safeText(deep.body?.version ?? deep.body?.commit ?? 'unknown');
          const skew = Boolean(options.expectedExecutorVersion && observedVersion !== options.expectedExecutorVersion);
          rows.push(row('executor', skew ? 'blocked' : 'pass', skew ? 'version_skew' : 'executor_ready',
            skew ? 'Executor identity does not match the expected version.' : 'Real executor deep health is ready.',
            { reachable: true, authenticated: true, real_executor: true, version_or_commit: observedVersion, auth_configured: Boolean(bridgeHealth.executor_auth_configured) },
            'Install or select the expected Agentic Sandbox release, then restart the executor and Bridge.'));
        }
      } catch {
        rows.push(row('executor', 'blocked', 'executor_unreachable', 'Executor deep health is unreachable.',
          { reachable: false, host_matches: true }, 'Start the executor on the declared host and verify only its required transport before retrying.'));
      }
    }
  } else {
    rows.push(row('executor', 'blocked', 'executor_unreachable', 'Bridge did not report an executor endpoint.',
      { reachable: false, host_matches: false }, 'Configure the Bridge executor URL and restart the Bridge.'));
  }

  rows.push(row('host-runtime', 'pass', 'host_ready', 'Host runtime is available.',
    { platform: probes.platform(), node: process.version }, null));
  const docker = await probes.command('docker', ['info', '--format', '{{json .ServerVersion}}']);
  rows.push(row('docker-runtime', docker.ok ? 'pass' : 'warn', docker.ok ? 'docker_ready' : 'docker_unavailable',
    docker.ok ? 'Docker runtime is reachable.' : 'Docker runtime is not reachable.',
    { ready: docker.ok }, 'Start Docker or choose the host runtime tier; host readiness is independent.'));
  const kvm = probes.pathExists('/dev/kvm');
  rows.push(row('vm-runtime', kvm ? 'pass' : 'warn', kvm ? 'kvm_ready' : 'kvm_unavailable',
    kvm ? 'KVM device is available.' : 'VM readiness is not claimed because KVM is unavailable.',
    { kvm_available: kvm }, 'Enable KVM access only if the VM runtime tier is required.'));

  const listeners = await probes.command('ss', ['-ltn']);
  rows.push(listeners.ok ? listenerRows(listeners.stdout) : row('listeners', 'warn', 'listener_inspection_unavailable',
    'Listener inspection is unavailable.', { checked_ports: '8120-8122,8140' }, 'Install `ss` support or inspect these listeners locally, then rerun the doctor.'));

  const cockpitEnabled = await probes.command('systemctl', ['--user', 'is-enabled', 'aiwg-cockpit.service']);
  const executorEnabled = await probes.command('systemctl', ['--user', 'is-enabled', 'agentic-sandbox.service']);
  const cockpitUnit = await probes.command('systemctl', ['--user', 'show', 'aiwg-cockpit.service', '--property=ActiveState,After,Requires,Restart']);
  const executorUnit = await probes.command('systemctl', ['--user', 'show', 'agentic-sandbox.service', '--property=ActiveState,Restart']);
  const linger = await probes.command('loginctl', ['show-user', process.env.USER ?? '', '--property=Linger', '--value']);
  const dependencyOrdered = topology !== 'same-host' || /(?:After|Requires)=.*agentic-sandbox\.service/.test(cockpitUnit.stdout);
  const restartReady = /Restart=(?:on-failure|always)/.test(cockpitUnit.stdout)
    && /Restart=(?:on-failure|always)/.test(executorUnit.stdout);
  const active = /ActiveState=active/.test(cockpitUnit.stdout) && /ActiveState=active/.test(executorUnit.stdout);
  const persistent = cockpitEnabled.ok && executorEnabled.ok && linger.ok && linger.stdout.trim() === 'yes'
    && cockpitUnit.ok && executorUnit.ok && dependencyOrdered && restartReady && active;
  rows.push(row('persistence', persistent ? 'pass' : 'warn', persistent ? 'user_systemd_ready' : 'user_systemd_incomplete',
    persistent ? 'User services and linger support persistence.' : 'User-service persistence is incomplete or unavailable.',
    {
      cockpit_enabled: cockpitEnabled.ok,
      executor_enabled: executorEnabled.ok,
      units_active: active,
      linger_enabled: linger.stdout.trim() === 'yes',
      dependency_order_ready: dependencyOrdered,
      restart_recovery_ready: restartReady,
    },
    'Enable only the Cockpit and executor user units, then enable linger for the service account.'));

  const topologyValid = topology === 'same-host' ? cockpitHost === executorHost : executorHost !== 'unspecified';
  if (topology !== 'same-host' && options.forwardEndpoint) {
    try {
      const endpoint = new URL(options.forwardEndpoint);
      const forward = await probes.fetchJson(`${options.forwardEndpoint.replace(/\/$/, '')}/healthz`);
      const safeEndpoint = `${endpoint.protocol}//${endpoint.hostname}:${endpoint.port || 'default'}`;
      rows.push(row('ssh-forward', forward.status >= 200 && forward.status < 300 ? 'pass' : 'blocked',
        forward.status >= 200 && forward.status < 300 ? 'forward_ready' : 'forward_unreachable',
        forward.status >= 200 && forward.status < 300 ? 'Declared SSH forward reaches the expected service.' : 'Declared SSH forward is unreachable.',
        { kind: topology, endpoint: safeEndpoint, reachable: forward.status >= 200 && forward.status < 300 },
        'Correct only the declared SSH forward endpoint, then rerun the doctor.'));
    } catch {
      rows.push(row('ssh-forward', 'blocked', 'forward_unreachable', 'Declared SSH forward is invalid or unreachable.',
        { kind: topology, reachable: false }, 'Correct only the declared SSH forward endpoint, then rerun the doctor.'));
    }
  }
  rows.push(row('topology', topologyValid ? 'pass' : 'blocked', topologyValid ? 'topology_declared' : 'topology_ambiguous',
    topologyValid ? 'Cockpit, executor, and operator access topology is explicit.' : 'Executor host is not explicitly declared.',
    { kind: topology, cockpit_host: cockpitHost, executor_host: executorHost, operator_access: topology === 'same-host' ? 'local' : topology === 'ssh-local' ? 'ssh-local-forward' : 'ssh-reverse-forward' },
    'Declare the executor host before generating or validating any forward.'));

  return {
    schema: COCKPIT_DOCTOR_SCHEMA,
    generated_at: (options.now ?? (() => new Date()))().toISOString(),
    topology: {
      kind: topology,
      cockpit_host: safeText(cockpitHost),
      executor_host: safeText(executorHost),
      operator_access: topology === 'same-host' ? 'local' : topology === 'ssh-local' ? 'ssh-local-forward' : 'ssh-reverse-forward',
    },
    status: overall(rows),
    rows,
  };
}

export function formatCockpitDoctor(report: CockpitDoctorReport, format: 'text' | 'json' | 'markdown'): string {
  if (format === 'json') return JSON.stringify(report, null, 2);
  if (format === 'markdown') {
    return [
      `# Cockpit Connection Doctor`,
      '',
      `Status: **${report.status}**  `,
      `Topology: \`${report.topology.kind}\``,
      '',
      '| Check | Status | Code | Summary | Recovery |',
      '|---|---|---|---|---|',
      ...report.rows.map(item => `| ${item.id} | ${item.status} | ${item.code} | ${item.summary} | ${item.recovery ?? '—'} |`),
    ].join('\n');
  }
  return [
    `Cockpit connection doctor: ${report.status}`,
    `Topology: ${report.topology.kind} (${report.topology.cockpit_host} -> ${report.topology.executor_host})`,
    ...report.rows.map(item => `${item.status.toUpperCase().padEnd(7)} ${item.id.padEnd(16)} ${item.code}: ${item.summary}${item.recovery ? ` Recovery: ${item.recovery}` : ''}`),
  ].join('\n');
}
