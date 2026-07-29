// In-memory instance store for the mock executor. Seeds a few demo instances
// so the admin surface + Cockpit inventory have real data to render.
// (Real provisioning lifecycle — start/stop/destroy — lands in a later increment.)

export const DEFAULT_INSTANCE = process.env.MOCK_INSTANCE_ID ?? '550e8400-e29b-41d4-a716-446655440000';

/** @typedef {{ instance_id: string, runtime: string, loadout: string, state: 'running'|'stopped'|'provisioning', created_at: string, tenant_id: string, host_daemon?: object, transport?: object, launch_context?: object, storage?: object, lifecycle?: object, session_backends?: object[] }} Instance */

/** @type {Map<string, Instance>} */
export const instances = new Map([
  [DEFAULT_INSTANCE, {
    instance_id: DEFAULT_INSTANCE,
    runtime: 'container',
    loadout: 'agentic-dev',
    state: 'running',
    created_at: '2026-06-13T12:00:00Z',
    tenant_id: 'default',
    transport: { mode: 'loopback-rest', trust: 'local', source: 'agentic-sandbox admin', evidence: '127.0.0.1 REST control plane' },
    launch_context: { cwd: '/home/roctinam/dev/aiwg', loadout: 'agentic-dev', runtime_kind: 'container', selected_tier: 'container', name: 'agentic-default' },
    storage: { persistent: true, delete_on_destroy: true, scope: 'inbox', reason: 'Container workspace persists until sandbox destroy.' },
    lifecycle: { destroy: { delegated: true }, reconnect: { delegated: false, reason: 'management reconnect endpoint not advertised by this mock' } },
    session_backends: [
      { mode: 'direct', backend: 'native', replay: true, keyframe: true, drive: true, observe: true, available: true },
      { mode: 'managed', backend: 'tmux', replay: true, keyframe: true, drive: true, observe: true, available: true },
    ],
  }],
  ['7c1f0b2a-3d4e-4f5a-9b8c-1d2e3f4a5b6c', {
    instance_id: '7c1f0b2a-3d4e-4f5a-9b8c-1d2e3f4a5b6c',
    runtime: 'vm',
    provider: 'cloud-hypervisor',
    capabilities: [
      { id: 'instance.snapshot', label: 'Snapshot' },
      { id: 'instance.restore', label: 'Restore' },
      { id: 'instance.fork', label: 'Fork' },
      { id: 'warm_pool.manage', label: 'Warm pools' },
    ],
    loadout: 'security-audit',
    state: 'running',
    created_at: '2026-06-13T12:05:00Z',
    tenant_id: 'default',
    transport: { mode: 'mtls-local-ca', trust: 'secure', source: 'agentic-sandbox peer identity', evidence: 'local CA mTLS bootstrap' },
    launch_context: { cwd: '/workspace/audit', loadout: 'security-audit', runtime_kind: 'vm', host: 'qemu:///system', selected_tier: 'vm' },
    session_backends: [
      { mode: 'direct', backend: 'native', replay: false, keyframe: false, drive: false, observe: true, available: false, reason: 'direct console disabled for this VM policy' },
      { mode: 'managed', backend: 'zellij', replay: true, keyframe: true, drive: true, observe: true, available: true },
    ],
  }],
  ['2f83b456-14aa-4fc3-ae70-02b2a6d74490', {
    instance_id: '2f83b456-14aa-4fc3-ae70-02b2a6d74490',
    runtime: 'host',
    loadout: 'host-tools',
    state: 'running',
    created_at: '2026-06-16T09:20:00Z',
    tenant_id: 'default',
    host_daemon: { status: 'available', detail: 'first-party host runtime daemon reachable', operator_command: 'agentic-sandbox host-daemon start --listen 127.0.0.1:8122' },
    transport: { mode: 'uds', trust: 'local', source: 'agentic-sandbox host daemon', evidence: 'local socket peer check' },
    launch_context: { cwd: '/home/roctinam/dev/aiwg', loadout: 'host-tools', runtime_kind: 'host', host: 'grissom', selected_tier: 'host' },
    session_backends: [
      { mode: 'direct', backend: 'native', replay: true, keyframe: true, drive: true, observe: true, available: true },
      { mode: 'managed', backend: 'screen', replay: true, keyframe: true, drive: true, observe: true, available: true },
    ],
  }],
  ['9e8d7c6b-5a4f-4e3d-8c2b-1a0f9e8d7c6b', {
    instance_id: '9e8d7c6b-5a4f-4e3d-8c2b-1a0f9e8d7c6b',
    runtime: 'wasm-edge',
    loadout: 'agentic-dev',
    state: 'stopped',
    created_at: '2026-06-12T18:30:00Z',
    tenant_id: 'default',
    transport: { mode: 'shared-secret', trust: 'compatibility', source: 'agentic-sandbox compatibility adapter', evidence: 'legacy shared secret accepted; secret value withheld' },
    launch_context: { cwd: '/workspace', loadout: 'agentic-dev', runtime_kind: 'wasm-edge', selected_tier: 'wasm-edge' },
    session_backends: [],
  }],
]);

export function listInstances() {
  return [...instances.values()];
}
export function getInstance(id) {
  return instances.get(id) ?? null;
}

// Loadout catalog (#1641) — the full set the operator can pick from at session start,
// a superset of the loadouts the seeded instances happen to be running.
export const loadouts = [
  {
    id: 'agentic-dev',
    label: 'Agentic Dev',
    description: 'General coding agent loadout',
    runtimes: ['container', 'host', 'vm'],
    runtime_options: { kind: 'vm', provider: 'cloud-hypervisor', launch_strategy: { mode: 'cold' } },
    compatibility: [
      { runtime_kind: 'vm', provider: 'cloud-hypervisor', eligible: true, launch_strategy: { mode: 'cold' } },
      { runtime_kind: 'vm', provider: 'libvirt', eligible: true, launch_strategy: { mode: 'cold' } },
    ],
  },
  { id: 'security-audit', label: 'Security Audit', description: 'Hardened audit toolchain', runtimes: ['vm'] },
  { id: 'host-tools', label: 'Host Tools', description: 'Native host operations', runtimes: ['host'] },
  { id: 'research', label: 'Research', description: 'Long-context research corpus', runtimes: ['container', 'vm'] },
  {
    id: 'gpu-vfio',
    label: 'GPU VFIO',
    description: 'GPU-backed VM that cold-boots only',
    runtimes: ['vm'],
    runtime_options: {
      kind: 'vm',
      provider: 'cloud-hypervisor',
      required_capabilities: ['device.vfio'],
      excluded_capabilities: ['instance.snapshot', 'instance.restore', 'instance.fork', 'warm_pool.manage'],
      launch_strategy: { mode: 'cold' },
      constraints: { allow_vfio_fast_start: false, fallback_mode: 'fail' },
    },
    compatibility: [{
      runtime_kind: 'vm',
      provider: 'cloud-hypervisor',
      eligible: true,
      required_capabilities: ['device.vfio'],
      excluded_capabilities: ['instance.snapshot', 'instance.restore', 'instance.fork', 'warm_pool.manage'],
      constraints: [{
        capability: 'device.vfio',
        excludes: ['instance.snapshot', 'instance.restore', 'instance.fork', 'warm_pool.manage'],
        reason: 'VFIO-backed VMs cannot safely reuse memory state.',
      }],
      launch_strategy: { mode: 'cold' },
    }],
  },
  { id: 'minimal', label: 'Minimal', description: 'Bare shell, no framework deploy', runtimes: ['container', 'host', 'vm', 'wasm-edge'] },
];
export function listLoadouts() {
  return loadouts;
}

// --- lifecycle mutators (Cockpit management, UC-012) ---
export function setInstanceState(id, state) {
  const inst = instances.get(id);
  if (!inst) return null;
  inst.state = state;
  return inst;
}
export function destroyInstance(id) {
  return instances.delete(id);
}

// --- HITL approval queue (hitl-prompt/v1; UC-009) ---
/** @type {Map<string, {id:string, instance_id:string, prompt:string, risk:string, created_at:string, status:'pending'|'approved'|'denied', decided_at?:string}>} */
export const approvals = new Map([
  ['apr-001', { id: 'apr-001', instance_id: '7c1f0b2a-3d4e-4f5a-9b8c-1d2e3f4a5b6c', prompt: 'Deploy to production (security-audit stack)?', risk: 'high', created_at: '2026-06-13T20:00:00Z', status: 'pending' }],
  ['apr-002', { id: 'apr-002', instance_id: DEFAULT_INSTANCE, prompt: 'Write to ~/.ssh/config during setup?', risk: 'medium', created_at: '2026-06-13T20:02:00Z', status: 'pending' }],
]);
export function listApprovals(status) {
  return [...approvals.values()].filter((a) => !status || a.status === status);
}
export function resolveApproval(id, decision) {
  const a = approvals.get(id);
  if (!a || a.status !== 'pending') return null;
  a.status = decision === 'approve' ? 'approved' : 'denied';
  a.decided_at = new Date().toISOString();
  return a;
}

// --- cost / quota rollup (UC-010) — mock token+spend per instance/tenant ---
const COST = {
  [DEFAULT_INSTANCE]: { input_tokens: 184_200, output_tokens: 42_900, usd: 1.83 },
  '7c1f0b2a-3d4e-4f5a-9b8c-1d2e3f4a5b6c': { input_tokens: 96_400, output_tokens: 18_700, usd: 0.91 },
  '9e8d7c6b-5a4f-4e3d-8c2b-1a0f9e8d7c6b': { input_tokens: 12_100, output_tokens: 2_300, usd: 0.11 },
};
export function costReport() {
  const per = listInstances().map((i) => ({ instance_id: i.instance_id, tenant: i.tenant_id, ...(COST[i.instance_id] ?? { input_tokens: 0, output_tokens: 0, usd: 0 }) }));
  const total = per.reduce((a, c) => ({ input_tokens: a.input_tokens + c.input_tokens, output_tokens: a.output_tokens + c.output_tokens, usd: +(a.usd + c.usd).toFixed(2) }), { input_tokens: 0, output_tokens: 0, usd: 0 });
  return { per_instance: per, total };
}
