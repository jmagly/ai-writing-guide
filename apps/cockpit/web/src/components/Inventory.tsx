import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { fmtId } from '../util';
import type { Instance, SandboxRuntimeCapabilityId } from '../types';

interface Inv { count: number; fetched_at: string; instances: Instance[] }
interface OperationStatus {
  id?: string;
  state?: string;
  result?: Record<string, unknown>;
  error?: unknown;
  failure?: unknown;
}

type FastStartActionId = 'snapshot' | 'restore' | 'fork' | 'warm-pool';
interface FastStartAction {
  id: FastStartActionId;
  label: string;
  disabled: boolean;
  reason?: string;
}

export function Inventory({ onStartSession, onLaunchInstance, refreshTick = 0, refreshMs = 5_000 }: { onStartSession?: (instanceId?: string) => void; onLaunchInstance?: () => void; refreshTick?: number; refreshMs?: number }) {
  const [data, setData] = useState<Inv | null>(null);
  const [err, setErr] = useState('');
  const [actionErr, setActionErr] = useState('');
  const [actionMsg, setActionMsg] = useState('');

  const load = useCallback(() => {
    api<Inv>('/api/inventory').then((d) => { setData(d); setErr(''); }).catch((e) => setErr((e as Error).message));
  }, []);
  // Poll (and react to the app-wide refreshTick) so instances launched after this
  // tab first mounted appear without a manual reload — matches the other data tabs.
  useEffect(() => {
    load();
    const timer = window.setInterval(load, refreshMs);
    return () => window.clearInterval(timer);
  }, [load, refreshMs, refreshTick]);

  const control = (path: string, method: string, fallbackMessage = '') =>
    api<{ already_gone?: boolean; message?: string }>(path, { method })
      .then((result) => {
        setActionErr('');
        setActionMsg(result.message ?? (result.already_gone ? 'Instance already removed; inventory refreshed.' : fallbackMessage));
        load();
      })
      .catch((e) => {
        setActionMsg('');
        setActionErr((e as Error).message);
      });

  const fastStartControl = async (instance: Instance, action: FastStartAction) => {
    if (action.disabled) return;
    const baseName = normalizedName(instance.launch_context?.name ?? fmtId(instance.id));
    const defaultAsset = `${baseName}-${action.id === 'snapshot' ? 'snapshot' : action.id}`;
    const asset = window.prompt(`${action.label} asset id`, defaultAsset);
    if (asset === null) return;
    const body: Record<string, unknown> = { asset_ref: asset.trim() };
    if (action.id !== 'snapshot') {
      const nextName = window.prompt('New instance name', `${baseName}-${action.id === 'warm-pool' ? 'warm' : action.id}`);
      if (nextName === null) return;
      body.name = normalizedName(nextName);
    }
    setActionErr('');
    setActionMsg(`${action.label} requested; waiting for operation...`);
    try {
      const accepted = await api<{ id?: string; operation?: { id?: string } }>(
        `/api/instances/${encodeURIComponent(instance.id)}/${action.id}`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        },
      );
      const operationId = accepted.id ?? accepted.operation?.id;
      if (!operationId) {
        setActionMsg(`${action.label} accepted.`);
        load();
        return;
      }
      const terminal = await waitForOperation(operationId);
      await api('/api/audit/intent', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          event: 'instance.fast_start.terminal',
          detail: {
            instance_id: instance.id,
            provider: instance.provider,
            action: action.id,
            operation_id: operationId,
            state: terminal.state,
            result: terminal.result,
            error: terminal.error ?? terminal.failure,
          },
        }),
      }).catch(() => undefined);
      setActionMsg(`${action.label} ${terminal.state ?? 'completed'}: ${operationId}`);
      load();
    } catch (e) {
      setActionMsg('');
      setActionErr((e as Error).message);
    }
  };

  if (err) return <p className="err">Could not load inventory: {err}</p>;
  if (!data) return <p className="empty">Loading…</p>;
  if (!data.instances.length) {
    return (
      <section className="empty-state">
        <h2>No instances</h2>
        <p className="hint">Bridge is connected, but no host, Docker, or VM targets are registered.</p>
        {onLaunchInstance && <button className="cta" onClick={onLaunchInstance}>＋ New instance + session</button>}
      </section>
    );
  }

  return (
    <>
      <div className="section-toolbar">
        <div>
          <h2>Agent instances</h2>
          <p className="hint">{data.count} {data.count === 1 ? 'target' : 'targets'} · {new Date(data.fetched_at).toLocaleTimeString()}</p>
        </div>
        {onLaunchInstance && <button className="cta" onClick={onLaunchInstance}>New instance</button>}
      </div>
      {actionErr && <p className="err">Action failed: {actionErr}</p>}
      {actionMsg && <p className="hint" role="status">{actionMsg}</p>}
      <table className="inventory-table">
        <caption>Available instance deployments</caption>
        <thead>
          <tr>
            <th scope="col">Instance</th><th scope="col">Runtime</th><th scope="col">Loadout</th>
            <th scope="col">Transport</th><th scope="col">Host daemon</th><th scope="col">State</th><th scope="col">Tenant</th><th scope="col">Manage</th>
          </tr>
        </thead>
        <tbody>
          {data.instances.map((i) => (
            <tr key={i.id}>
              {/*
                Runtime state and session readiness are separate: Docker can be
                running while the embedded agent is still failing registration.
              */}
              {(() => {
                const sessionReady = i.session_backends?.some((b) => b.available);
                const unavailableReason = i.session_backends?.find((b) => !b.available)?.reason;
                const reconnectable = isReconnectable(i);
                const health = instanceHealth(i);
                return (
            <>
              <td className="instance-cell">
                <code title={i.id}>{i.launch_context?.name ?? fmtId(i.id)}</code>
                {i.launch_context?.name && <div className="cell-note">{fmtId(i.id)}</div>}
              </td>
              <td className="runtime-cell">
                <span className={`badge isolation-${i.runtime_posture.isolation}`} title={i.runtime_posture.warning || i.runtime_posture.label}>
                  {i.runtime_posture.label}
                </span>
                {i.provider && <div className="cell-note">{i.provider}</div>}
                {hasVfio(i) && (
                  <div className="cell-note">
                    VFIO{assignedGpuDevices(i).length ? ` · ${assignedGpuDevices(i).join(', ')}` : ''}
                  </div>
                )}
                {i.gpu?.reason && <div className="cell-note">{i.gpu.reason}</div>}
                {i.runtime_posture.warning && <div className="cell-note">{i.runtime_posture.warning}</div>}
              </td>
              <td>
                {i.loadout}
                {i.launch_context?.image_ref && <div className="cell-note">{i.launch_context.image_ref}</div>}
                {i.launch_context?.source && <div className="cell-note">{i.launch_context.source}</div>}
                {i.storage && (
                  <div className="cell-note">
                    Storage: {i.storage.persistent ? 'persistent' : 'ephemeral'}{i.storage.delete_on_destroy ? ' · delete on destroy' : ''}
                  </div>
                )}
                {i.storage?.reason && <div className="cell-note">{i.storage.reason}</div>}
              </td>
              <td>
                <span className={`badge trust-${i.transport.trust}`} title={`${i.transport.source}${i.transport.evidence ? `: ${i.transport.evidence}` : ''}`}>
                  {i.transport.label}
                </span>
                <div className="cell-note">{i.transport.mode}{i.transport.stale ? ' · stale' : ''}</div>
              </td>
              <td className="daemon-cell">
                <span className={`badge daemon-${i.host_daemon.status}`}>{i.host_daemon.status.replace('_', ' ')}</span>
                {i.host_daemon.detail && <div className="cell-note">{i.host_daemon.detail}</div>}
                {i.host_daemon.operator_command && <code title="Operator start command">{i.host_daemon.operator_command}</code>}
              </td>
              <td>
                <span className={`state ${health.kind === 'stale-agent' ? 'degraded' : i.state}`} title={health.detail}>
                  <span className="dot" aria-hidden="true" />{health.label}
                </span>
                {health.detail && health.kind !== 'healthy' && <div className="cell-note">{health.detail}</div>}
              </td>
              <td>{i.tenant}</td>
              <td className="manage-actions">
                {i.state === 'running' && onStartSession && (
                  <button
                    className="cta"
                    aria-label={`Start session on ${fmtId(i.id)}`}
                    disabled={!sessionReady}
                    title={!sessionReady ? unavailableReason : undefined}
                    onClick={() => onStartSession(i.id)}
                  >
                    Session
                  </button>
                )}{' '}
                {reconnectable && (
                  <button
                    aria-label={`Reconnect agent for ${fmtId(i.id)}`}
                    title={unavailableReason ?? 'Ask the running agent to re-register without restarting the instance.'}
                    onClick={() => control(`/api/instances/${encodeURIComponent(i.id)}/reconnect`, 'POST', 'Reconnect requested; inventory will refresh shortly.')}
                  >
                    Reconnect
                  </button>
                )}{' '}
                {fastStartActions(i).map((action) => (
                  <button
                    key={action.id}
                    aria-label={`${action.label} ${fmtId(i.id)}`}
                    disabled={action.disabled}
                    title={action.reason}
                    onClick={() => fastStartControl(i, action)}
                  >
                    {action.label}
                  </button>
                ))}{' '}
                {i.state === 'running'
                  ? <button aria-label={`Stop instance ${fmtId(i.id)}`} onClick={() => control(`/api/instances/${encodeURIComponent(i.id)}/stop`, 'POST')}>Stop</button>
                  : <button aria-label={`Start instance ${fmtId(i.id)}`} onClick={() => control(`/api/instances/${encodeURIComponent(i.id)}/start`, 'POST')}>Start</button>}{' '}
                <button
                  aria-label={`Destroy instance ${fmtId(i.id)}`}
                  title={i.state !== 'running' && i.runtime === 'docker' ? 'Stopped Docker row — Destroy asks the sandbox management API to remove it.' : undefined}
                  onClick={() => { if (confirm(`Destroy ${fmtId(i.id)}? This cannot be undone.`)) control(`/api/instances/${encodeURIComponent(i.id)}`, 'DELETE'); }}
                >
                  Destroy
                </button>
              </td>
            </>
                );
              })()}
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

// VM runtimes included per #1778 — the bridge signals the in-guest agent via
// qemu-guest-agent, the container/docker path via docker exec.
const RECONNECTABLE_RUNTIMES = ['docker', 'container', 'vm', 'qemu', 'kvm'];
const FAST_START_ACTIONS: Array<{
  id: FastStartActionId;
  label: string;
  capabilities: SandboxRuntimeCapabilityId[];
}> = [
  { id: 'snapshot', label: 'Snapshot', capabilities: ['instance.snapshot', 'instance.checkpoint'] },
  { id: 'restore', label: 'Restore', capabilities: ['instance.restore'] },
  { id: 'fork', label: 'Fork', capabilities: ['instance.fork'] },
  { id: 'warm-pool', label: 'Warm pool', capabilities: ['warm_pool.manage'] },
];

function isReconnectable(i: Instance): boolean {
  const runtime = String(i.runtime_posture?.kind ?? i.runtime).toLowerCase();
  const running = String(i.state).toLowerCase() === 'running';
  const agentMissing = i.agent_ready === false || i.session_backends?.some((b) => b.available === false);
  return running && RECONNECTABLE_RUNTIMES.includes(runtime) && Boolean(agentMissing);
}

function instanceHealth(i: Instance): { kind: 'healthy' | 'stale-agent'; label: string; detail?: string } {
  const running = String(i.state).toLowerCase() === 'running';
  const unavailableReason = i.session_backends?.find((b) => b.available === false)?.reason;
  const agentMissing = i.agent_ready === false || Boolean(unavailableReason);
  if (running && agentMissing) {
    return {
      kind: 'stale-agent',
      label: 'agent unreachable',
      detail: unavailableReason ?? 'Runtime is still running, but the agent is not registered.',
    };
  }
  return { kind: 'healthy', label: i.state };
}

function hasVfio(instance: Instance) {
  return instance.capabilities?.some((capability) => capability.id === 'device.vfio')
    || instance.capability_constraints?.some((constraint) => constraint.capability === 'device.vfio')
    || Boolean(instance.gpu?.assigned || instance.gpu?.available || instance.gpu?.devices?.length);
}

function assignedGpuDevices(instance: Instance) {
  return instance.gpu?.devices?.filter(Boolean) ?? [];
}

function fastStartActions(instance: Instance): FastStartAction[] {
  const runtime = String(instance.runtime_posture?.kind ?? instance.runtime).toLowerCase();
  if (!['vm', 'qemu', 'kvm'].includes(runtime)) return [];
  const capabilities = new Set((instance.capabilities ?? []).map((capability) => capability.id));
  const constraints = instance.capability_constraints ?? [];
  const provider = String(instance.provider ?? '').toLowerCase();
  return FAST_START_ACTIONS.flatMap((action) => {
    const advertised = action.capabilities.some((capability) => capabilities.has(capability));
    const exclusion = constraints.find((constraint) =>
      constraint.excludes?.some((excluded) => action.capabilities.includes(excluded))
      || action.capabilities.includes(constraint.capability));
    if (!advertised && !exclusion) return [];
    const label = action.id === 'snapshot' && provider === 'libvirt' ? 'Checkpoint' : action.label;
    return [{
      id: action.id,
      label,
      disabled: Boolean(exclusion),
      reason: exclusion?.reason,
    }];
  });
}

function normalizedName(value: string) {
  const cleaned = String(value || 'cockpit-vm')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+$/g, '')
    .slice(0, 63);
  const prefixed = /^[a-z]/.test(cleaned) ? cleaned : `a-${cleaned.replace(/^-+/, '')}`;
  return prefixed.length >= 2 ? prefixed : 'cockpit-vm';
}

async function waitForOperation(operationId: string): Promise<OperationStatus> {
  let last: OperationStatus = { id: operationId, state: 'unknown' };
  for (let i = 0; i < 60; i += 1) {
    last = await api<OperationStatus>(`/api/operations/${encodeURIComponent(operationId)}`);
    const state = String(last.state ?? '').toLowerCase();
    if (['succeeded', 'failed', 'canceled', 'cancelled'].includes(state)) return last;
    await new Promise((resolve) => window.setTimeout(resolve, 1_000));
  }
  return last;
}
