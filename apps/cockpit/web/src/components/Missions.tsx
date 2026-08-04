import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api } from '../api';
import { fmtId } from '../util';
import type { MissionProjection, MissionSession, MissionsResponse } from '../types';

export function Missions({ refreshTick = 0 }: { refreshTick?: number }) {
  const [data, setData] = useState<MissionsResponse | null>(null);
  const [err, setErr] = useState('');
  const [selected, setSelected] = useState<string | null>(null);

  const load = useCallback(() => {
    api<MissionsResponse>('/api/missions')
      .then((d) => {
        setData(d);
        setErr('');
        setSelected((current) => current ?? d.sessions[0]?.id ?? null);
      })
      .catch((e) => setErr((e as Error).message));
  }, []);

  useEffect(() => { load(); }, [load, refreshTick]);

  if (err) return <p className="err">Could not load Missions: {err}</p>;
  if (!data) return <p className="empty">Loading...</p>;

  const active = data.sessions.find((s) => s.id === selected) ?? data.sessions[0] ?? null;
  const totals = summarize(data.missions);

  return (
    <>
      <p className="hint">
        Durable AIWG Mission Control state and Agentic Sandbox fleet work share one projection.
        Cockpit observes the parent mission and its independently managed child workloads; the
        conductor remains the owner of policy and durability.
      </p>
      <div className="mission-summary" aria-label="Mission status summary">
        <span><strong>{data.count}</strong> total</span>
        <span><strong>{totals.active}</strong> active</span>
        <span><strong>{totals.awaiting}</strong> awaiting approval</span>
        <span><strong>{totals.terminal}</strong> terminal</span>
      </div>
      <MissionComposer sessions={data.sessions.filter((session) => session.source === 'aiwg-mc')} onChanged={load} />
      {!data.sessions.length ? <p className="empty">No Mission Control sessions or live executor tasks are visible yet.</p> : (
        <div className="missions-layout">
          <aside className="mission-sessions" aria-label="Mission sessions">
            {data.sessions.map((s) => (
              <button
                key={s.id}
                className={s.id === active?.id ? 'selected' : ''}
                onClick={() => setSelected(s.id)}
                aria-pressed={s.id === active?.id}
              >
                <span>{s.name}</span>
                <small>{s.source} · {s.missions.length}</small>
              </button>
            ))}
          </aside>
          {active && <MissionSessionView session={active} onChanged={load} />}
        </div>
      )}
    </>
  );
}

function MissionComposer({ sessions, onChanged }: { sessions: MissionSession[]; onChanged: () => void }) {
  const [sessionId, setSessionId] = useState(sessions[0]?.id ?? '');
  const [objective, setObjective] = useState('');
  const [completion, setCompletion] = useState('');
  const [runNow, setRunNow] = useState(false);
  const [acceptCost, setAcceptCost] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!sessions.some((session) => session.id === sessionId)) setSessionId(sessions[0]?.id ?? '');
  }, [sessions, sessionId]);
  if (!sessions.length) return <p className="hint">Create a Mission Control session with <code>aiwg mc start</code> before dispatching from Cockpit.</p>;
  const selected = sessions.find((session) => session.id === sessionId) ?? sessions[0]!;
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('/api/missions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          session_id: selected.id,
          objective,
          completion,
          expected_updated_at: selected.updated_at,
          request_id: globalThis.crypto?.randomUUID?.() ?? `cockpit-${Date.now()}`,
          run: runNow,
          accept_cost: acceptCost,
        }),
      });
      setObjective('');
      setCompletion('');
      onChanged();
    } catch (caught) {
      setError(`Mission dispatch failed: ${(caught as Error).message}`);
    } finally {
      setBusy(false);
    }
  };
  return <form className="mission-composer" aria-label="Dispatch durable mission" onSubmit={submit}>
    <label>Session<select value={selected.id} onChange={(event) => setSessionId(event.target.value)}>{sessions.map((session) => <option key={session.id} value={session.id}>{session.name}</option>)}</select></label>
    <label>Objective<input required maxLength={4096} value={objective} onChange={(event) => setObjective(event.target.value)} /></label>
    <label>Completion criteria<input maxLength={4096} value={completion} onChange={(event) => setCompletion(event.target.value)} /></label>
    <label><input type="checkbox" checked={runNow} onChange={(event) => setRunNow(event.target.checked)} /> Run after queueing</label>
    {runNow && <label><input type="checkbox" checked={acceptCost} onChange={(event) => setAcceptCost(event.target.checked)} /> Accept estimated provider cost if the non-interactive gate requires it</label>}
    <button disabled={busy || !objective.trim()} type="submit">{runNow ? 'Queue and run mission' : 'Queue mission'}</button>
    {error && <p className="err" role="alert">{error}</p>}
  </form>;
}

function MissionSessionView({ session, onChanged }: { session: MissionSession; onChanged: () => void }) {
  const fleet = session.source === 'agentic-sandbox-fleet';
  const controllable = session.source === 'aiwg-mc';
  const [mutationError, setMutationError] = useState('');
  const [mutating, setMutating] = useState('');
  const mutate = async (action: 'pause' | 'resume' | 'cancel', missionId?: string) => {
    setMutating(`${action}:${missionId ?? session.id}`);
    setMutationError('');
    const path = action === 'cancel'
      ? `/api/missions/${encodeURIComponent(session.id)}/${encodeURIComponent(missionId!)}/cancel`
      : `/api/missions/${encodeURIComponent(session.id)}/${action}`;
    try {
      await api(path, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          expected_updated_at: session.updated_at,
          request_id: globalThis.crypto?.randomUUID?.() ?? `cockpit-${Date.now()}`,
        }),
      });
      onChanged();
    } catch (error) {
      setMutationError(`Mission control failed: ${(error as Error).message}. Refresh and retry if the state changed elsewhere.`);
    } finally {
      setMutating('');
    }
  };
  return (
    <section className="mission-detail" aria-label={`${session.name} missions`}>
      <div className="mission-detail-head">
        <div>
          <h2>{session.name}</h2>
          <p>
            {fleet && session.parent_mission_id ? `Parent mission ${session.parent_mission_id} · ` : ''}
            {session.source} · {session.state}
            {session.inventory_revision !== undefined ? ` · inventory r${session.inventory_revision}` : ''}
            {session.updated_at ? ` · updated ${new Date(session.updated_at).toLocaleString()}` : ''}
          </p>
        </div>
        <div>
          <span className="badge">{session.audit_count} audit events</span>
          {controllable && session.state === 'active' && <button disabled={Boolean(mutating)} onClick={() => mutate('pause')}>Pause session</button>}
          {controllable && session.state === 'paused' && <button disabled={Boolean(mutating)} onClick={() => mutate('resume')}>Resume session</button>}
        </div>
      </div>
      {mutationError && <p className="err" role="alert">{mutationError}</p>}
      {!session.missions.length ? <p className="empty">This session has no missions.</p> : (
        <table className={fleet ? 'fleet-missions' : undefined}>
          <caption>{session.missions.length} mission projection(s)</caption>
          <thead>
            {fleet
              ? <tr><th scope="col">Child workload</th><th scope="col">Status</th><th scope="col">Target / runtime</th><th scope="col">Binding</th><th scope="col">Evidence</th></tr>
              : <tr><th scope="col">Mission</th><th scope="col">Status</th><th scope="col">Source</th><th scope="col">Loop</th><th scope="col">Backing</th></tr>}
          </thead>
          <tbody>
            {session.missions.map((m) => (
              <tr key={m.id}>
                <td>
                  <strong>{m.title}</strong>
                  {fleet && <small className="block">{workloadSemantics(m)}</small>}
                  {m.completion && <small className="block">Done when: {m.completion}</small>}
                  {m.error && <small className="block err">{m.error}</small>}
                  {controllable && !m.terminal && m.status !== 'aborted' && m.status !== 'failed' && m.status !== 'completed' && m.status !== 'done' && (
                    <button disabled={Boolean(mutating)} onClick={() => mutate('cancel', m.id)}>Cancel mission</button>
                  )}
                </td>
                <td>
                  <span className={`state ${statusClass(m.status)}`}><span className="dot" aria-hidden="true" />{m.status}</span>
                  {m.health && <small className="block">health: {m.health}</small>}
                  {m.backpressure && <small className="block fleet-warning">backpressure: {m.backpressure.reason}{m.backpressure.retryable ? ' · retryable' : ' · operator action'}</small>}
                </td>
                {fleet ? <>
                  <td><strong>{m.target_id ?? '-'}</strong><small className="block">{m.executor_id ?? '-'} / {m.runtime_id ?? '-'}</small></td>
                  <td>{fleetBinding(m)}<small className="block">revision {m.revision ?? 0}{m.last_seen ? ` · ${new Date(m.last_seen).toLocaleString()}` : ''}</small></td>
                  <td>{fleetEvidence(m)}</td>
                </> : <>
                  <td>{m.source}</td>
                  <td>{loopText(m)}</td>
                  <td>{backingText(m)}</td>
                </>}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {session.audit_tail.length > 0 && (
        <section className="audit-tail" aria-label="Mission audit tail">
          <h3>Audit Tail</h3>
          {session.audit_tail.map((event, i) => (
            <p key={`${event.ts ?? 'event'}-${i}`}>
              <code>{event.ts ? new Date(event.ts).toLocaleTimeString() : 'event'}</code>
              {' '}{String(event.event ?? 'mission_event')}
              {event.missionId || event.mission_id ? <> · <code>{fmtId(String(event.missionId ?? event.mission_id))}</code></> : null}
            </p>
          ))}
        </section>
      )}
    </section>
  );
}

function workloadSemantics(mission: MissionProjection) {
  if (mission.workload_kind === 'daemon') return `daemon health · desired ${mission.desired_state ?? 'unknown'}`;
  if (mission.workload_kind === 'persistent-agent') return `persistent retention · desired ${mission.desired_state ?? 'unknown'}`;
  if (mission.workload_kind === 'scheduled-collector') return `scheduled collection${mission.schedule ? ` · ${mission.schedule}` : ''}`;
  if (mission.workload_kind === 'one-shot-command') return `one-shot terminal result · desired ${mission.desired_state ?? 'unknown'}`;
  return mission.workload_kind ?? 'fleet workload';
}

function fleetBinding(mission: MissionProjection) {
  const bindings = [
    mission.runtime_session_id && `session ${fmtId(mission.runtime_session_id)}`,
    mission.task_id && `task ${fmtId(mission.task_id)}`,
    mission.command_id && `command ${fmtId(mission.command_id)}`,
  ].filter(Boolean);
  return bindings.length ? bindings.join(' · ') : 'binding pending';
}

function fleetEvidence(mission: MissionProjection) {
  if (!mission.artifacts?.length) return <span className="muted">No artifacts yet</span>;
  return <ul className="fleet-artifacts">{mission.artifacts.map((artifact) => (
    <li key={`${artifact.kind}:${artifact.uri}`}>
      {safeArtifactHref(artifact.uri) ? <a href={artifact.uri}>{artifact.kind}</a> : <span>{artifact.kind}</span>}
      <small className="block"><code>{artifact.sha256.slice(0, 12)}</code> · {artifact.uri}</small>
    </li>
  ))}</ul>;
}

function safeArtifactHref(uri: string) {
  try { return ['http:', 'https:'].includes(new URL(uri).protocol); } catch { return false; }
}

function summarize(missions: MissionProjection[]) {
  return missions.reduce((acc, mission) => {
    if (mission.status === 'awaiting-approval' || mission.status === 'input-required' || mission.backpressure?.reason === 'approval') acc.awaiting += 1;
    if (mission.terminal) acc.terminal += 1;
    else acc.active += 1;
    return acc;
  }, { active: 0, awaiting: 0, terminal: 0 });
}

function statusClass(status: string) {
  return status.replace(/[^a-z0-9_-]/gi, '-');
}

function loopText(mission: MissionProjection) {
  if (mission.loop === undefined && !mission.max_iterations) return '-';
  return `${mission.loop ?? 0}/${mission.max_iterations ?? '?'}`;
}

function backingText(mission: MissionProjection) {
  if (mission.ralph_loop_id) return `Ralph ${fmtId(mission.ralph_loop_id)}`;
  if (mission.task_id && mission.instance_id) return `${fmtId(mission.instance_id)} / ${fmtId(mission.task_id)}`;
  if (mission.target_agent) return fmtId(mission.target_agent);
  return '-';
}
