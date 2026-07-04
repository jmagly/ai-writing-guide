import { useCallback, useEffect, useState } from 'react';
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
        Durable Mission Control state and live executor work share one projection. Cockpit reads
        <code> aiwg mc </code> sessions and audit logs; the conductor remains the owner of durability.
      </p>
      <div className="mission-summary" aria-label="Mission status summary">
        <span><strong>{data.count}</strong> total</span>
        <span><strong>{totals.active}</strong> active</span>
        <span><strong>{totals.awaiting}</strong> awaiting approval</span>
        <span><strong>{totals.terminal}</strong> terminal</span>
      </div>
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
          {active && <MissionSessionView session={active} />}
        </div>
      )}
    </>
  );
}

function MissionSessionView({ session }: { session: MissionSession }) {
  return (
    <section className="mission-detail" aria-label={`${session.name} missions`}>
      <div className="mission-detail-head">
        <div>
          <h2>{session.name}</h2>
          <p>{session.source} · {session.state}{session.updated_at ? ` · updated ${new Date(session.updated_at).toLocaleString()}` : ''}</p>
        </div>
        <span className="badge">{session.audit_count} audit events</span>
      </div>
      {!session.missions.length ? <p className="empty">This session has no missions.</p> : (
        <table>
          <caption>{session.missions.length} mission projection(s)</caption>
          <thead>
            <tr><th scope="col">Mission</th><th scope="col">Status</th><th scope="col">Source</th><th scope="col">Loop</th><th scope="col">Backing</th></tr>
          </thead>
          <tbody>
            {session.missions.map((m) => (
              <tr key={m.id}>
                <td>
                  <strong>{m.title}</strong>
                  {m.completion && <small className="block">Done when: {m.completion}</small>}
                  {m.error && <small className="block err">{m.error}</small>}
                </td>
                <td><span className={`state ${statusClass(m.status)}`}><span className="dot" aria-hidden="true" />{m.status}</span></td>
                <td>{m.source}</td>
                <td>{loopText(m)}</td>
                <td>{backingText(m)}</td>
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

function summarize(missions: MissionProjection[]) {
  return missions.reduce((acc, mission) => {
    if (mission.status === 'awaiting-approval' || mission.status === 'input-required') acc.awaiting += 1;
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
