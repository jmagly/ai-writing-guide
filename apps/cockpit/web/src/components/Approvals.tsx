import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { fmtId } from '../util';
import type { Approval, ResponseNeeded } from '../types';

export function Approvals({ refreshTick = 0, responses = [], goSessions }: { refreshTick?: number; responses?: ResponseNeeded[]; goSessions?: () => void }) {
  const [items, setItems] = useState<Approval[] | null>(null);
  const [err, setErr] = useState('');

  const load = useCallback(() => {
    api<{ approvals: Approval[] }>('/api/approvals?status=pending')
      .then((d) => { setItems(d.approvals); setErr(''); }).catch((e) => setErr((e as Error).message));
  }, []);
  useEffect(() => { load(); }, [load, refreshTick]);

  const decide = (id: string, decision: 'approve' | 'deny') =>
    api(`/api/approvals/${encodeURIComponent(id)}?decision=${decision}`, { method: 'POST' })
      .then(load).catch((e) => alert((e as Error).message));

  return (
    <>
      <p className="hint">Unified response-needed inbox — formal <code>hitl-prompt/v1</code> approvals, provider prompts, and agent sessions waiting for human input.</p>
      {err && <p className="err">{err}</p>}
      {responses.length > 0 && (
        <section className="response-needed" aria-label="Sessions waiting for response">
          <h2>Response Needed</h2>
          {responses.map((r) => (
            <article key={r.id} className="response-item">
              <div>
                <strong>{r.source === 'pty' ? 'Interactive session prompt' : r.source}</strong>
                <p>{r.prompt}</p>
                <span><code>{fmtId(r.instance_id)}</code> · {r.status}</span>
              </div>
              {goSessions && <button onClick={goSessions}>Open Session</button>}
            </article>
          ))}
        </section>
      )}
      {!items ? <p className="empty">Loading…</p>
        : !items.length && !responses.length ? <p className="empty">No pending approvals or responses.</p>
          : items.length ? (
            <table>
              <caption>{items.length} approval request(s) awaiting your decision</caption>
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
          ) : null}
    </>
  );
}
