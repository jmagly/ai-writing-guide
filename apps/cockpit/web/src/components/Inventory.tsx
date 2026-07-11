import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { fmtId } from '../util';
import type { Instance } from '../types';

interface Inv { count: number; fetched_at: string; instances: Instance[] }

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
                {i.runtime_posture.warning && <div className="cell-note">{i.runtime_posture.warning}</div>}
              </td>
              <td>
                {i.loadout}
                {i.launch_context?.image_ref && <div className="cell-note">{i.launch_context.image_ref}</div>}
                {i.launch_context?.source && <div className="cell-note">{i.launch_context.source}</div>}
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
                    title={unavailableReason ?? 'Ask the running container agent to re-register without restarting it.'}
                    onClick={() => control(`/api/instances/${encodeURIComponent(i.id)}/reconnect`, 'POST', 'Reconnect requested; inventory will refresh shortly.')}
                  >
                    Reconnect
                  </button>
                )}{' '}
                {i.state === 'running'
                  ? <button aria-label={`Stop instance ${fmtId(i.id)}`} onClick={() => control(`/api/instances/${encodeURIComponent(i.id)}/stop`, 'POST')}>Stop</button>
                  : <button aria-label={`Start instance ${fmtId(i.id)}`} onClick={() => control(`/api/instances/${encodeURIComponent(i.id)}/start`, 'POST')}>Start</button>}{' '}
                <button
                  aria-label={`Destroy instance ${fmtId(i.id)}`}
                  title={i.state !== 'running' && i.runtime === 'docker' ? 'Stopped Docker row — Destroy removes the container directly (admin-v2 has no instance record).' : undefined}
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

function isReconnectable(i: Instance): boolean {
  const runtime = String(i.runtime_posture?.kind ?? i.runtime).toLowerCase();
  const running = String(i.state).toLowerCase() === 'running';
  const agentMissing = i.agent_ready === false || i.session_backends?.some((b) => b.available === false);
  return running && ['docker', 'container'].includes(runtime) && agentMissing;
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
