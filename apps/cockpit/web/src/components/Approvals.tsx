import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { fmtId } from '../util';
import type { Approval } from '../types';

export function Approvals() {
  const [items, setItems] = useState<Approval[] | null>(null);
  const [err, setErr] = useState('');

  const load = useCallback(() => {
    api<{ approvals: Approval[] }>('/api/approvals?status=pending')
      .then((d) => { setItems(d.approvals); setErr(''); }).catch((e) => setErr((e as Error).message));
  }, []);
  useEffect(() => { load(); }, [load]);

  const decide = (id: string, decision: 'approve' | 'deny') =>
    api(`/api/approvals/${encodeURIComponent(id)}?decision=${decision}`, { method: 'POST' })
      .then(load).catch((e) => alert((e as Error).message));

  return (
    <>
      <p className="hint">Unified approval inbox — <code>hitl-prompt/v1</code> requests from every stack, in one place. Decisions are operator authorization, not the agent's.</p>
      {err && <p className="err">{err}</p>}
      {!items ? <p className="empty">Loading…</p>
        : !items.length ? <p className="empty">No pending approvals.</p>
          : (
            <table>
              <caption>{items.length} awaiting your decision</caption>
              <thead><tr><th scope="col">Request</th><th scope="col">Risk</th><th scope="col">Instance</th><th scope="col">Decision</th></tr></thead>
              <tbody>
                {items.map((p) => (
                  <tr key={p.id}>
                    <td>{p.prompt}</td>
                    <td><span className={`badge ${p.risk === 'high' ? 'high' : ''}`}>{p.risk}</span></td>
                    <td><code title={p.instance_id}>{fmtId(p.instance_id)}</code></td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button onClick={() => decide(p.id, 'approve')}>Approve</button>{' '}
                      <button onClick={() => decide(p.id, 'deny')}>Deny</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
    </>
  );
}
