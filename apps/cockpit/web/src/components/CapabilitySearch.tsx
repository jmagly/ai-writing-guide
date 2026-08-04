import { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { useDebounced } from '../useDebounce';
import type { CapabilityResult } from '../types';

const TYPES = ['all', 'skill', 'agent', 'command', 'rule', 'flow', 'behavior', 'hook', 'template', 'tool', 'addon', 'framework', 'extension', 'plugin', 'provider', 'document'];

// Tenor-style capability search — modeled on fortemi-react's SearchBar + SearchResults
// (debounced input, Ctrl/⌘-K focus, card grid with rank + snippet + trigger tags),
// wired to the AIWG registry via the Bridge (read-only catalog data; never execution).
export function CapabilitySearch({ onPick, autoFocus, compact, refreshTick = 0 }: {
  onPick: (c: CapabilityResult) => void;
  autoFocus?: boolean;
  compact?: boolean;
  refreshTick?: number;
}) {
  const [q, setQ] = useState('');
  const [type, setType] = useState('all');
  const [results, setResults] = useState<CapabilityResult[] | null>(null);
  const [err, setErr] = useState('');
  const debounced = useDebounced(q, 300);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (autoFocus) inputRef.current?.focus(); }, [autoFocus]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); inputRef.current?.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  useEffect(() => {
    const term = debounced.trim();
    if (!term) { setResults(null); return; }
    let live = true;
    api<{ results: CapabilityResult[] }>(`/api/capabilities?q=${encodeURIComponent(term)}&type=${encodeURIComponent(type)}&limit=12`)
      .then((d) => { if (live) { setResults(d.results); setErr(''); } })
      .catch((e) => { if (live) setErr((e as Error).message); });
    return () => { live = false; };
  }, [debounced, type, refreshTick]);

  return (
    <div>
      <div className="controls">
        <input ref={inputRef} type="search" value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Search capabilities…  (Ctrl/⌘-K)" aria-label="Search capabilities" style={{ minWidth: compact ? 220 : 300 }} />
        <select value={type} onChange={(e) => setType(e.target.value)} aria-label="Capability type filter">
          {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      {err && <p className="err">{err}</p>}
      {results === null
        ? <p className="hint">Type to search every indexed capability and artifact type.</p>
        : !results.length
          ? <p className="empty">No matches.</p>
          : (
            <div className="capgrid" role="listbox" aria-label="Capability results">
              {results.map((r) => (
                <button key={r.path} className="capcard" role="option" aria-selected={false} onClick={() => onPick(r)}>
                  <div className="capcard-head">
                    <span className="badge">{r.type}</span> <strong>{r.name}</strong>
                    <span className="capcard-score">{(r.score ?? 0).toFixed(2)}</span>
                  </div>
                  <div className="capcard-cap">{(r.capability || r.title || '').slice(0, 110)}</div>
                  {r.triggers?.length
                    ? <div className="capcard-tags">{r.triggers.slice(0, 3).map((t) => <span key={t} className="tag">{t}</span>)}</div>
                    : null}
                </button>
              ))}
            </div>
          )}
    </div>
  );
}
