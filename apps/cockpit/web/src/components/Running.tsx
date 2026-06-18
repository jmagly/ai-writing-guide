import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { fmtId } from '../util';
import type { RunningTask, Cost } from '../types';

interface Run { count: number; running: RunningTask[] }

export function Running() {
  const [run, setRun] = useState<Run | null>(null);
  const [cost, setCost] = useState<Cost | null>(null);
  const [err, setErr] = useState('');

  const load = useCallback(() => {
    api<Run>('/api/running').then((d) => { setRun(d); setErr(''); }).catch((e) => setErr((e as Error).message));
    api<Cost>('/api/cost').then(setCost).catch(() => setCost(null));
  }, []);
  useEffect(() => { load(); }, [load]);

  const stop = (t: RunningTask) =>
    api(`/api/tasks/${encodeURIComponent(t.instance_id)}/${encodeURIComponent(t.task_id)}/cancel`, { method: 'POST' })
      .then(load).catch((e) => alert((e as Error).message));

  if (err) return <p className="err">Could not load running: {err}</p>;
  if (!run) return <p className="empty">Loading…</p>;

  return (
    <>
      {cost && (
        <p className="hint">Spend across stacks: <strong>${cost.total.usd.toFixed(2)}</strong> · {(cost.total.input_tokens + cost.total.output_tokens).toLocaleString()} tokens</p>
      )}
      {!run.running.length
        ? <p className="empty">Nothing running yet — use “Start a session” (top right or Home) to put an agent to work.</p>
        : (
          <table>
            <caption>Running across all stacks — {run.count} task(s)</caption>
            <thead>
              <tr><th scope="col">Instance</th><th scope="col">Runtime</th><th scope="col">Transport</th><th scope="col">Task</th><th scope="col">State</th><th scope="col">Tenant</th><th scope="col">Control</th></tr>
            </thead>
            <tbody>
              {run.running.map((t) => (
                <tr key={t.task_id}>
                  <td><code title={t.instance_id}>{fmtId(t.instance_id)}</code></td>
                  <td>{t.runtime_posture ? <span className={`badge isolation-${t.runtime_posture.isolation}`} title={t.runtime_posture.warning || t.runtime_posture.label}>{t.runtime_posture.label}</span> : <span className="badge">unknown</span>}</td>
                  <td>{t.transport ? <span className={`badge trust-${t.transport.trust}`}>{t.transport.label}</span> : <span className="badge">unknown</span>}</td>
                  <td><code title={t.task_id}>{fmtId(t.task_id)}</code></td>
                  <td><span className={`state ${t.state}`}><span className="dot" aria-hidden="true" />{t.state}</span></td>
                  <td>{t.tenant}</td>
                  <td><button aria-label={`Stop task ${fmtId(t.task_id)}`} onClick={() => stop(t)}>Stop</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
    </>
  );
}
