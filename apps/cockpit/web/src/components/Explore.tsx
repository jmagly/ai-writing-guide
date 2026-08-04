import { useEffect, useState } from 'react';
import { api } from '../api';
import { CapabilitySearch } from './CapabilitySearch';
import type { CapabilityResult, IndexQueryResponse, IndexStatusResponse } from '../types';

export function Explore({ refreshTick = 0 }: { refreshTick?: number }) {
  const [body, setBody] = useState<{ type: string; name: string; body: string } | null>(null);
  const [status, setStatus] = useState<IndexStatusResponse | null>(null);
  const [query, setQuery] = useState('requirements');
  const [queryResults, setQueryResults] = useState<IndexQueryResponse | null>(null);
  const [graphName, setGraphName] = useState('');
  const [scanDirs, setScanDirs] = useState('docs');
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const [stale, setStale] = useState(false);

  const loadStatus = () => {
    api<IndexStatusResponse>('/api/index/status').then((next) => {
      setStatus(next);
      setStale(false);
      setErr('');
    }).catch((e) => {
      setErr((e as Error).message);
      setStale(true);
    });
  };

  useEffect(() => { loadStatus(); }, [refreshTick]);

  const show = (r: CapabilityResult) => {
    setBody(null); setErr('');
    // Fetch by the discovered path — deterministic even when a name is shared by two
    // artifacts (e.g. two `aiwg-steward` agents), which would otherwise 502 (#1643).
    const qs = `type=${encodeURIComponent(r.type)}&name=${encodeURIComponent(r.name)}&path=${encodeURIComponent(r.path)}`;
    api<{ type: string; name: string; body: string }>(`/api/show?${qs}`)
      .then(setBody).catch((e) => setErr((e as Error).message));
  };

  const runIndexQuery = async () => {
    const q = query.trim();
    if (!q) return;
    setBusy('query'); setErr('');
    try {
      setQueryResults(await api<IndexQueryResponse>(`/api/index/query?q=${encodeURIComponent(q)}&limit=8`));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy('');
    }
  };

  const rebuild = async () => {
    setBusy('rebuild'); setErr('');
    try {
      const result = await api<{ status: IndexStatusResponse }>('/api/index/rebuild', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ all: true }),
      });
      setStatus(result.status);
      setQueryResults(null);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy('');
    }
  };

  const createGraph = async () => {
    if (!graphName.trim() || !scanDirs.trim()) return;
    setBusy('create'); setErr('');
    try {
      await api('/api/index/graphs', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: graphName.trim(), scanDirs: scanDirs.split(',').map((value) => value.trim()).filter(Boolean) }),
      });
      setGraphName('');
      loadStatus();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy('');
    }
  };

  const graphs = status?.graphs ?? [];
  const queryItems = queryResults?.results ?? [];

  return (
    <>
      <p className="hint">
        Read-only catalog from the AIWG registry — display, not execution. To <em>run</em> a capability, inject it into a
        session (Actions/Sessions). Search modeled on the fortemi-react patterns.
      </p>
      {err && <p className="err">{err}{status ? ' — showing last-known index state.' : ''}</p>}
      <section className="index-live" aria-label="Live index status">
        <div className="section-toolbar">
          <div>
            <h2>Live Index</h2>
            <p className="hint">
              {status
                ? `${status.summary.built}/${status.summary.total} graphs built, ${status.summary.missing} missing, ${status.summary.orphans} orphan dirs.`
                : 'Loading index status.'}
              {stale && status ? ' Stale: live refresh is temporarily unavailable.' : ''}
            </p>
          </div>
          <div className="manage-actions">
            <button onClick={loadStatus} disabled={busy === 'rebuild'}>Refresh</button>
            <button onClick={rebuild} disabled={busy === 'rebuild'}>{busy === 'rebuild' ? 'Rebuilding...' : 'Rebuild all'}</button>
          </div>
        </div>
        <div className="index-grid">
          {graphs.map((g) => (
            <article className={g.missing ? 'index-graph missing' : 'index-graph'} key={g.name}>
              <div><strong>{g.name}</strong> <span className="badge">{g.origin}</span></div>
              <p>{g.built ? `${g.entries ?? 0} entries` : 'not built'}{g.ageHours !== null ? ` · ${g.ageHours}h old` : ''}</p>
            </article>
          ))}
        </div>
        <div className="index-query">
          <label>
            Index query
            <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void runIndexQuery(); }} />
          </label>
          <button onClick={runIndexQuery} disabled={busy === 'query'}>{busy === 'query' ? 'Searching...' : 'Search index'}</button>
        </div>
        <div className="index-query" aria-label="Create user index graph">
          <label>
            New graph name
            <input value={graphName} onChange={(e) => setGraphName(e.target.value)} placeholder="references" />
          </label>
          <label>
            Scan directories (comma-separated)
            <input value={scanDirs} onChange={(e) => setScanDirs(e.target.value)} placeholder="docs,research" />
          </label>
          <button onClick={createGraph} disabled={busy === 'create' || !graphName.trim()}>{busy === 'create' ? 'Creating...' : 'Create graph'}</button>
        </div>
        {queryResults && (
          <div className="index-results" aria-label="Index query results">
            {queryItems.length
              ? queryItems.map((r) => (
                <article key={r.path}>
                  <strong>{r.title || r.path}</strong>
                  <p>{r.summary || r.path}</p>
                  <small>{r.type || 'artifact'}{r.phase ? ` · ${r.phase}` : ''}{typeof r.score === 'number' ? ` · ${r.score.toFixed(2)}` : ''}</small>
                </article>
              ))
              : <p className="empty">No index hits.</p>}
          </div>
        )}
      </section>
      <div className="grid2">
        <CapabilitySearch onPick={show} autoFocus refreshTick={refreshTick} />
        <div role="region" aria-label="Capability detail">
          {!body
            ? <p className="empty">Select a capability to inspect its definition.</p>
            : (
              <>
                <div style={{ marginBottom: 8 }}><span className="badge">{body.type}</span> <strong>{body.name}</strong></div>
                <div className="terminal" style={{ maxHeight: '52vh' }}>{body.body}</div>
              </>
            )}
        </div>
      </div>
    </>
  );
}
