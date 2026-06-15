import { useState } from 'react';
import { api } from '../api';
import { CapabilitySearch } from './CapabilitySearch';
import type { CapabilityResult } from '../types';

export function Explore() {
  const [body, setBody] = useState<{ type: string; name: string; body: string } | null>(null);
  const [err, setErr] = useState('');

  const show = (r: CapabilityResult) => {
    setBody(null); setErr('');
    api<{ type: string; name: string; body: string }>(`/api/show?type=${encodeURIComponent(r.type)}&name=${encodeURIComponent(r.name)}`)
      .then(setBody).catch((e) => setErr((e as Error).message));
  };

  return (
    <>
      <p className="hint">
        Read-only catalog from the AIWG registry — display, not execution. To <em>run</em> a capability, inject it into a
        session (Actions/Sessions). Search modeled on the fortemi-react patterns.
      </p>
      {err && <p className="err">{err}</p>}
      <div className="grid2">
        <CapabilitySearch onPick={show} autoFocus />
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
