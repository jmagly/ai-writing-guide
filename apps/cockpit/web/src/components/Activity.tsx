import { useState } from 'react';
import { api, apiRaw } from '../api';

type Scope = { tenant_id: string; host_id: string; instance_id: string; agent_id: string };
interface Gap { first_missing_sequence: number; last_missing_sequence: number }
interface Coverage {
  collector_id: string; sequence_gaps: Gap[]; durable_loss_records: Gap[];
  restart_count: number; dropped_event_count: number; stale: boolean;
  unsupported_event_classes: string[]; maximum_clock_error_ms: number;
}
interface Completeness {
  complete: boolean; label: string; collector_count: number; sequence_gap_count: number;
  durable_loss_count: number; restart_count: number; dropped_event_count: number;
  stale_collector_count: number; unsupported_event_classes: string[]; maximum_clock_error_ms: number;
}
interface EventRow {
  event_id: string; event_name: string; plane: string; occurred_at: string;
  source: { collector: string; trust: 'observed' | 'attested' | 'self-reported' | 'derived'; layer: string };
  outcome?: { status: string; reason?: string };
}
interface Envelope { schema_version: string; coverage: Coverage[]; completeness: Completeness; events?: EventRow[] }

const initialScope: Scope = { tenant_id: '', host_id: '', instance_id: '', agent_id: '' };

export function Activity() {
  const [scope, setScope] = useState(initialScope);
  const [coverage, setCoverage] = useState<Envelope | null>(null);
  const [timeline, setTimeline] = useState<Envelope | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [exportMeta, setExportMeta] = useState<{ key_id: string; merkle_root: string } | null>(null);
  const valid = Object.values(scope).every((value) => value.trim());
  const body = JSON.stringify({ ...scope, filter: { limit: 250 } });

  const load = async () => {
    if (!valid) return;
    setLoading(true); setError(''); setTimeline(null); setCoverage(null); setExportMeta(null);
    try {
      const headers = { 'content-type': 'application/json' };
      const nextCoverage = await api<Envelope>('/api/activity/coverage', { method: 'POST', headers, body });
      setCoverage(nextCoverage);
      const nextTimeline = await api<Envelope>('/api/activity/timeline', { method: 'POST', headers, body });
      setTimeline(nextTimeline);
    } catch (cause) { setError((cause as Error).message); }
    finally { setLoading(false); }
  };

  const exportSigned = async () => {
    setError(''); setExportMeta(null);
    const response = await apiRaw('/api/activity/export', { method: 'POST', headers: { 'content-type': 'application/json' }, body });
    if (!response.ok) { setError(response.status === 503 ? 'Signed export unavailable: the sandbox signing key is unavailable.' : `Signed export failed (${response.status}).`); return; }
    const document = await response.json() as { manifest: { key_id: string; merkle_root: string } };
    setExportMeta({ key_id: document.manifest.key_id, merkle_root: document.manifest.merkle_root });
    const url = URL.createObjectURL(new Blob([JSON.stringify(document, null, 2)], { type: 'application/json' }));
    const anchor = window.document.createElement('a'); anchor.href = url; anchor.download = 'activity-export.json'; anchor.click(); URL.revokeObjectURL(url);
  };

  const c = coverage?.completeness;
  return <>
    <div className="section-toolbar"><div><h2>Governed activity</h2><p className="hint">Exact sandbox scope; coverage is checked before events.</p></div></div>
    <div className="activity-scope">
      {(Object.keys(scope) as Array<keyof Scope>).map((key) => <label key={key}>{key.replace('_id', '')}<input value={scope[key]} onChange={(event) => setScope({ ...scope, [key]: event.target.value })} /></label>)}
      <button className="cta" disabled={!valid || loading} onClick={load}>{loading ? 'Loading…' : 'Load activity'}</button>
      <button disabled={!timeline || loading} onClick={exportSigned}>Export signed evidence</button>
    </div>
    {error && <p className="err" role="alert">{error}</p>}
    {c && <section className={`activity-coverage ${c.complete ? 'complete' : 'incomplete'}`} aria-label="Activity coverage">
      <h3>{c.complete ? 'Complete coverage' : 'Incomplete coverage'} <span className="badge">{c.label}</span></h3>
      <p>Collectors {c.collector_count} · gaps {c.sequence_gap_count} · durable loss {c.durable_loss_count} · restarts {c.restart_count} · dropped {c.dropped_event_count} · stale {c.stale_collector_count} · clock uncertainty {c.maximum_clock_error_ms} ms</p>
      <p>Unsupported event classes: {c.unsupported_event_classes.length ? c.unsupported_event_classes.join(', ') : 'none'}</p>
      {coverage.coverage.map((item) => <p className="cell-note" key={item.collector_id}>{item.collector_id}: gaps {item.sequence_gaps.length}, loss {item.durable_loss_records.length}, restarts {item.restart_count}, dropped {item.dropped_event_count}, stale {item.stale ? 'yes' : 'no'}, clock ±{item.maximum_clock_error_ms} ms</p>)}
    </section>}
    {timeline && <table className="inventory-table"><caption>Metadata-only activity events — coverage {timeline.completeness.complete ? 'complete' : 'incomplete'}</caption><thead><tr><th>Time</th><th>Event</th><th>Plane</th><th>Source</th><th>Trust</th><th>Outcome</th></tr></thead><tbody>
      {(timeline.events ?? []).map((event) => <tr key={event.event_id}><td>{new Date(event.occurred_at).toLocaleString()}</td><td>{event.event_name}</td><td>{event.plane}</td><td>{event.source.collector} · {event.source.layer}</td><td><span className={`badge activity-trust-${event.source.trust}`}>{event.source.trust}</span></td><td>{event.outcome?.status ?? 'unknown'}</td></tr>)}
    </tbody></table>}
    {exportMeta && <p role="status">Signed export downloaded · key {exportMeta.key_id} · Merkle root {exportMeta.merkle_root}</p>}
  </>;
}
