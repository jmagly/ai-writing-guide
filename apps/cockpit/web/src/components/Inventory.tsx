import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { fmtId } from '../util';
import type { Instance } from '../types';

interface Inv { count: number; fetched_at: string; instances: Instance[] }

export function Inventory({ onStartSession, onLaunchInstance }: { onStartSession?: (instanceId?: string) => void; onLaunchInstance?: () => void }) {
  const [data, setData] = useState<Inv | null>(null);
  const [err, setErr] = useState('');
  const [actionErr, setActionErr] = useState('');
  const [actionMsg, setActionMsg] = useState('');

  const load = useCallback(() => {
    api<Inv>('/api/inventory').then((d) => { setData(d); setErr(''); }).catch((e) => setErr((e as Error).message));
  }, []);
  useEffect(() => { load(); }, [load]);

  const control = (path: string, method: string) =>
    api<{ already_gone?: boolean; message?: string }>(path, { method })
      .then((result) => {
        setActionErr('');
        setActionMsg(result.already_gone ? (result.message ?? 'Instance already removed; inventory refreshed.') : '');
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
              <td><span className={`state ${i.state}`}><span className="dot" aria-hidden="true" />{i.state}</span></td>
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
