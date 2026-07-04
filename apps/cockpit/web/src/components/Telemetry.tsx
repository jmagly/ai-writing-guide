import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { fmtId } from '../util';
import type { Cost, EventsSnapshot, MissionsResponse } from '../types';

type Filter = 'all' | 'mission' | 'task' | 'approval' | 'session' | 'inventory';

export function Telemetry({ refreshTick = 0 }: { refreshTick?: number }) {
  const [events, setEvents] = useState<EventsSnapshot | null>(null);
  const [missions, setMissions] = useState<MissionsResponse | null>(null);
  const [cost, setCost] = useState<Cost | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [err, setErr] = useState('');

  const load = useCallback(() => {
    Promise.all([
      api<EventsSnapshot>('/api/events/snapshot'),
      api<MissionsResponse>('/api/missions').catch(() => null),
      api<Cost>('/api/cost').catch(() => null),
    ]).then(([eventData, missionData, costData]) => {
      setEvents(eventData);
      setMissions(missionData);
      setCost(costData);
      setErr('');
    }).catch((e) => setErr((e as Error).message));
  }, []);

  useEffect(() => { load(); }, [load, refreshTick]);

  if (err) return <p className="err">Could not load telemetry: {err}</p>;
  if (!events) return <p className="empty">Loading...</p>;

  const visible = filter === 'all' ? events.events : events.events.filter((e) => e.type.startsWith(filter));
  const missionTotals = summarizeMissions(missions);
  const tokenTotal = cost ? cost.total.input_tokens + cost.total.output_tokens : 0;

  return (
    <>
      <p className="hint">
        Live Cockpit telemetry from the unified event model. This replaces the legacy dashboard feed with
        Bridge-backed inventory, session, task, approval, Mission, and cost posture.
      </p>
      <section className="telemetry-kpis" aria-label="Telemetry key performance indicators">
        <article><span>Events</span><strong>{events.count}</strong><small>{events.source}</small></article>
        <article><span>Active Missions</span><strong>{missionTotals.active}</strong><small>{missionTotals.terminal} terminal</small></article>
        <article><span>Approvals</span><strong>{missionTotals.awaiting}</strong><small>awaiting operator input</small></article>
        <article><span>Spend</span><strong>{cost ? `$${cost.total.usd.toFixed(2)}` : '-'}</strong><small>{tokenTotal ? `${tokenTotal.toLocaleString()} tokens` : 'cost route unavailable'}</small></article>
      </section>

      <div className="controls" role="group" aria-label="Filter telemetry events">
        {(['all', 'mission', 'task', 'approval', 'session', 'inventory'] as const).map((f) => (
          <button key={f} aria-pressed={filter === f} onClick={() => setFilter(f)}>{f}</button>
        ))}
      </div>

      {!visible.length ? <p className="empty">No events match this filter.</p> : (
        <table>
          <caption>{visible.length} event(s), fetched {new Date(events.fetched_at).toLocaleTimeString()}</caption>
          <thead><tr><th scope="col">Time</th><th scope="col">Type</th><th scope="col">Subject</th><th scope="col">State</th><th scope="col">Source</th></tr></thead>
          <tbody>
            {visible.map((e) => (
              <tr key={e.id}>
                <td><time dateTime={e.ts}>{new Date(e.ts).toLocaleTimeString()}</time></td>
                <td><span className="badge">{e.type}</span></td>
                <td><code title={e.subject}>{fmtId(e.subject)}</code></td>
                <td>{e.state ? <span className={`state ${e.state}`}><span className="dot" aria-hidden="true" />{e.state}</span> : '-'}</td>
                <td>{e.source}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

function summarizeMissions(data: MissionsResponse | null) {
  const summary = { active: 0, terminal: 0, awaiting: 0 };
  for (const mission of data?.missions ?? []) {
    if (mission.status === 'awaiting-approval' || mission.status === 'input-required') summary.awaiting += 1;
    if (mission.terminal) summary.terminal += 1;
    else summary.active += 1;
  }
  return summary;
}
