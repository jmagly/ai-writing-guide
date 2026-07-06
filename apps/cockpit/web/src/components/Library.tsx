import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { capRef } from '../util';
import { CapabilitySearch } from './CapabilitySearch';
import type { LibraryAsset, CapabilityResult } from '../types';
import type { SessionApi } from '../useSession';

// The user's OWN asset library — copy/clone/import. AIWG install files are never
// written. Deploying/using an asset is an agent action (Use → inject into a session).
export function Library({ session, setComposer, goSessions }: { session: SessionApi; setComposer: (v: string) => void; goSessions: () => void }) {
  const [items, setItems] = useState<LibraryAsset[] | null>(null);
  const [cloning, setCloning] = useState(false);
  const [err, setErr] = useState('');

  const load = useCallback(() => {
    api<{ library: LibraryAsset[] }>('/api/library').then((d) => { setItems(d.library); setErr(''); }).catch((e) => setErr((e as Error).message));
  }, []);
  useEffect(() => { load(); }, [load]);

  const clone = async (r: CapabilityResult) => {
    try {
      await api(`/api/library/clone?type=${encodeURIComponent(r.type)}&name=${encodeURIComponent(r.name)}&path=${encodeURIComponent(r.path)}`, { method: 'POST' });
      setCloning(false); load();
    } catch (e) { setErr((e as Error).message); }
  };
  const remove = (a: LibraryAsset) => {
    if (!confirm(`Remove "${a.name}" from your library? (Your copy only — AIWG is untouched.)`)) return;
    api(`/api/library/${encodeURIComponent(a.name)}`, { method: 'DELETE' }).then(load).catch((e) => alert((e as Error).message));
  };
  const use = (a: LibraryAsset) => {
    const cmd = capRef(a.type, a.name.replace(/\.(md|markdown|ya?ml|json)$/i, ''));
    if (!(session.isController && session.state.target && session.sendInput(cmd, session.state.target))) setComposer(cmd);
    goSessions();
  };

  return (
    <>
      <p className="hint">
        Your <strong>own</strong> assets — copied, cloned, or imported. Edit them freely; <strong>AIWG install files are never
        touched</strong>. Stored on disk under <code>~/.aiwg/cockpit/library</code>. Deploying one into a project is an agent
        action (Use → inject into a session).
      </p>
      {err && <p className="err">{err}</p>}
      <div className="controls">
        <button onClick={() => setCloning((v) => !v)}>{cloning ? 'Close' : '+ Clone from catalog'}</button>
      </div>
      {cloning && (
        <div className="picker">
          <p className="hint" style={{ marginTop: 0 }}>Search the AIWG catalog and clone a copy into your library.</p>
          <CapabilitySearch compact autoFocus onPick={clone} />
        </div>
      )}
      {!items ? <p className="empty">Loading…</p>
        : !items.length ? <p className="empty">Your library is empty. Clone a capability from the catalog to get a copy you can modify.</p>
          : (
            <table>
              <caption>{items.length} asset(s) in your library</caption>
              <thead><tr><th scope="col">Name</th><th scope="col">Type</th><th scope="col">Origin</th><th scope="col">Actions</th></tr></thead>
              <tbody>
                {items.map((a) => (
                  <tr key={a.name}>
                    <td><strong>{a.name}</strong></td>
                    <td><span className="badge">{a.type}</span></td>
                    <td>{a.origin}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button onClick={() => use(a)}>Use</button>{' '}
                      <button onClick={() => remove(a)} aria-label={`Remove ${a.name}`}>Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
    </>
  );
}
