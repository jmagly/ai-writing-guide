import { describe, expect, it } from 'vitest';
import {
  COCKPIT_DOCTOR_SCHEMA,
  formatCockpitDoctor,
  runCockpitDoctor,
  type CockpitDoctorProbes,
} from '../../../src/cockpit/doctor.js';

interface FixtureOptions {
  executorUrl?: string;
  bridgeStatus?: number;
  deepStatus?: number;
  deepBody?: any;
  listeners?: string;
  runtimeError?: boolean;
  docker?: boolean;
  kvm?: boolean;
}

function probes(options: FixtureOptions = {}): CockpitDoctorProbes {
  const executorUrl = options.executorUrl ?? 'http://127.0.0.1:8122';
  return {
    async readRuntime() {
      if (options.runtimeError) throw new Error('missing');
      return {
        record: { token: 'bridge-bearer-DO-NOT-EMIT', port: 8140, pid: 42 },
        mode: 0o600,
        owned: true,
      };
    },
    async fetchJson(url) {
      if (url.endsWith('/healthz/deep')) return {
        status: options.deepStatus ?? 200,
        body: options.deepBody ?? { status: 'ok', service: 'agentic-sandbox', version: 'v2026.8.5' },
      };
      if (url.endsWith('/api/health')) return {
        status: options.bridgeStatus ?? 200,
        body: { status: 'ok', executor_url: executorUrl, executor_auth_configured: true },
      };
      return { status: 200, body: { status: 'ok' } };
    },
    async command(command, args) {
      if (command === 'docker') return { ok: options.docker ?? true, stdout: '"27.0"' };
      if (command === 'ss') return { ok: true, stdout: options.listeners ?? 'LISTEN 0 4096 127.0.0.1:8122\nLISTEN 0 4096 127.0.0.1:8140\n' };
      if (command === 'systemctl' && args.includes('show')) {
        return { ok: true, stdout: args.includes('aiwg-cockpit.service')
          ? 'ActiveState=active\nAfter=agentic-sandbox.service\nRequires=agentic-sandbox.service\nRestart=on-failure\n'
          : 'ActiveState=active\nRestart=on-failure\n' };
      }
      if (command === 'systemctl') return { ok: true, stdout: 'enabled\n' };
      if (command === 'loginctl') return { ok: true, stdout: 'yes\n' };
      return { ok: false, stdout: '' };
    },
    pathExists(file) { return file === '/dev/kvm' ? (options.kvm ?? true) : false; },
    hostName() { return 'cockpit-host'; },
    platform() { return 'linux'; },
  };
}

const base = {
  coreVersion: '2026.8.16',
  cockpitInstalled: true,
  cockpitVersion: '2026.8.16',
  cockpitPackageRoot: '/managed/node_modules/@aiwg/cockpit',
  now: () => new Date('2026-08-21T12:00:00.000Z'),
};

describe('Cockpit topology-aware connection doctor (#2139)', () => {
  it('reports a stable, secret-free same-host topology', async () => {
    const report = await runCockpitDoctor({ ...base, topology: 'same-host', cockpitHost: 'cockpit-host', executorHost: 'cockpit-host' }, probes());
    expect(report.schema).toBe(COCKPIT_DOCTOR_SCHEMA);
    expect(report.status).toBe('pass');
    expect(report.rows.map(item => item.id)).toEqual([
      'package', 'bridge-runtime', 'bridge', 'executor', 'host-runtime',
      'docker-runtime', 'vm-runtime', 'listeners', 'persistence', 'topology',
    ]);
    const json = formatCockpitDoctor(report, 'json');
    expect(json).not.toContain('DO-NOT-EMIT');
    expect(JSON.parse(json)).toEqual(report);
    expect(formatCockpitDoctor(report, 'text')).toContain('executor_ready');
    expect(formatCockpitDoctor(report, 'markdown')).toContain('| Check | Status | Code |');
  });

  it('supports an explicit SSH-forwarded cross-host topology', async () => {
    const report = await runCockpitDoctor({
      ...base,
      topology: 'ssh-local',
      cockpitHost: 'cockpit.internal',
      executorHost: 'sandbox.internal',
      forwardEndpoint: 'http://127.0.0.1:18140',
    }, probes({ executorUrl: 'http://sandbox.internal:8122' }));
    expect(report.status).toBe('pass');
    expect(report.topology.operator_access).toBe('ssh-local-forward');
    expect(report.rows.find(item => item.id === 'ssh-forward')?.code).toBe('forward_ready');
    expect(report.rows.find(item => item.id === 'topology')?.code).toBe('topology_declared');
  });

  it('validates a declared SSH reverse forward without changing executor-host semantics', async () => {
    const report = await runCockpitDoctor({
      ...base,
      topology: 'ssh-reverse',
      cockpitHost: 'cockpit.internal',
      executorHost: 'sandbox.internal',
      forwardEndpoint: 'http://127.0.0.1:28140',
    }, probes({ executorUrl: 'http://sandbox.internal:8122' }));
    expect(report.status).toBe('pass');
    expect(report.topology.operator_access).toBe('ssh-reverse-forward');
    expect(report.rows.find(item => item.id === 'ssh-forward')).toMatchObject({ status: 'pass', code: 'forward_ready' });
  });

  it('reports disconnected Bridge and executor states independently', async () => {
    const report = await runCockpitDoctor(base, probes({ runtimeError: true, docker: false, kvm: false }));
    expect(report.status).toBe('blocked');
    expect(report.rows.map(item => item.code)).toEqual(expect.arrayContaining([
      'runtime_missing', 'bridge_unreachable', 'executor_unreachable', 'docker_unavailable', 'kvm_unavailable',
    ]));
    for (const item of report.rows.filter(item => item.status !== 'pass')) expect(item.recovery).toBeTruthy();
  });

  it.each([
    ['bridge_unauthenticated', { bridgeStatus: 401 }, {}],
    ['mock_executor', { deepBody: { status: 'ok', service: 'cockpit-mock-executor', mock: true } }, {}],
    ['executor_unauthenticated', { deepStatus: 403 }, {}],
    ['wrong_host', { executorUrl: 'http://wrong.internal:8122' }, { topology: 'ssh-local' as const, cockpitHost: 'cockpit.internal', executorHost: 'sandbox.internal' }],
    ['public_bind', { listeners: 'LISTEN 0 4096 0.0.0.0:8140\n' }, {}],
    ['version_skew', {}, { expectedExecutorVersion: 'v2099.1.1' }],
  ])('distinguishes %s', async (code, fixture, overrides) => {
    const report = await runCockpitDoctor({ ...base, ...overrides }, probes(fixture));
    expect(report.rows.some(item => item.code === code)).toBe(true);
    const failed = report.rows.find(item => item.code === code)!;
    expect(failed.status).toBe('blocked');
    expect(failed.recovery).toBeTruthy();
  });

  it('reports host and Docker readiness independently and never claims VM readiness without KVM', async () => {
    const report = await runCockpitDoctor(base, probes({ docker: false, kvm: false }));
    expect(report.rows.find(item => item.id === 'host-runtime')?.status).toBe('pass');
    expect(report.rows.find(item => item.id === 'docker-runtime')?.code).toBe('docker_unavailable');
    expect(report.rows.find(item => item.id === 'vm-runtime')).toMatchObject({ status: 'warn', code: 'kvm_unavailable' });
  });
});
