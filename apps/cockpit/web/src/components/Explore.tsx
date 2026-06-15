import { useState, type FormEvent } from 'react';
import { api } from '../api';
import type { CapabilityResult } from '../types';

const TYPES = ['all', 'skill', 'agent', 'command', 'rule', 'flow'];

export function Explore() {
  const [q, setQ] = useState('');
  const [type, setType] = useState('all');
  const [results, setResults] = useState<CapabilityResult[] | null>(null);
  const [body, setBody] = useState<{ type: string; name: string; body: string } | null>(null);
  const [err, setErr] = useState('');

  const search = (e: FormEvent) => {
    e.preventDefault();
    if (!q.trim()) return;
    setResults(null); setErr('');
    api<{ results: CapabilityResult[] }>(`/api/capabilities?q=${encodeURIComponent(q)}&type=${encodeURIComponent(type)}&limit=10`)
      .then((d) => setResults(d.results)).catch((e2) => setErr((e2 as Error).message));
  };
  const show = (r: CapabilityResult) => {
    setBody(null);
    api<{ type: string; name: string; body: string }>(`/api/show?type=${encodeURIComponent(r.type)}&name=${encodeURIComponent(r.name)}`)
      .then(setBody).catch((e2) => setErr((e2 as Error).message));
  };

  return (
    <>
      <form className="controls" onSubmit={search}>
        <label htmlFor="ex-q">Capability</label>
        <input id="ex-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. deploy production, audit security…" style={{ minWidth: 280 }} />
        <label htmlFor="ex-type">Type</label>
        <select id="ex-type" value={type} onChange={(e) => setType(e.target.value)}>
          {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <button type="submit">Discover</button>
      </form>
      <p className="hint">
        Read-only catalog from the AIWG registry via <code>aiwg discover</code> — display, not execution. To <em>run</em> a
        capability, inject it into a session (see Actions/Sessions). Richer search/management lands next with fortemi-react.
      </p>
      {err && <p className="err">{err}</p>}
      <div className="grid2">
        <div role="region" aria-label="Discovery results">
          {results === null ? null
            : !results.length ? <p className="empty">No matches.</p>
              : (
                <table>
                  <caption>{results.length} capabilit{results.length === 1 ? 'y' : 'ies'}</caption>
                  <tbody>
                    {results.map((r) => (
                      <tr key={r.path}>
                        <td>
                          <button className="act" style={{ width: '100%' }} onClick={() => show(r)}>
                            <span className="badge">{r.type}</span> <strong>{r.name}</strong>
                            <span style={{ color: 'var(--muted)', fontSize: 12 }}> · {(r.score ?? 0).toFixed(2)}</span><br />
                            <span style={{ color: 'var(--muted)', fontSize: 13 }}>{(r.capability || r.title || '').slice(0, 90)}</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
        </div>
        <div role="region" aria-label="Capability detail">
          {!body
            ? <p className="empty">Select a result to inspect its definition.</p>
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
