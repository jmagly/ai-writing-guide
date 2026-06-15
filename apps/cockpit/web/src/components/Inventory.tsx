import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { fmtId } from '../util';
import type { Instance } from '../types';

interface Inv { count: number; fetched_at: string; instances: Instance[] }

export function Inventory() {
  const [data, setData] = useState<Inv | null>(null);
  const [err, setErr] = useState('');

  const load = useCallback(() => {
    api<Inv>('/api/inventory').then((d) => { setData(d); setErr(''); }).catch((e) => setErr((e as Error).message));
  }, []);
  useEffect(() => { load(); }, [load]);

  const control = (path: string, method: string) =>
    api(path, { method }).then(load).catch((e) => alert((e as Error).message));

  if (err) return <p className="err">Could not load inventory: {err}</p>;
  if (!data) return <p className="empty">Loading…</p>;
  if (!data.instances.length) return <p className="empty">No instances.</p>;

  return (
    <table>
      <caption>Agent instances — {data.count} · {new Date(data.fetched_at).toLocaleTimeString()}</caption>
      <thead>
        <tr>
          <th scope="col">Instance</th><th scope="col">Runtime</th><th scope="col">Loadout</th>
          <th scope="col">State</th><th scope="col">Tenant</th><th scope="col">Manage</th>
        </tr>
      </thead>
      <tbody>
        {data.instances.map((i) => (
          <tr key={i.id}>
            <td><code title={i.id}>{fmtId(i.id)}</code></td>
            <td><span className="badge">{i.runtime}</span></td>
            <td>{i.loadout}</td>
            <td><span className={`state ${i.state}`}><span className="dot" aria-hidden="true" />{i.state}</span></td>
            <td>{i.tenant}</td>
            <td style={{ whiteSpace: 'nowrap' }}>
              {i.state === 'running'
                ? <button aria-label={`Stop ${fmtId(i.id)}`} onClick={() => control(`/api/instances/${encodeURIComponent(i.id)}/stop`, 'POST')}>Stop</button>
                : <button aria-label={`Start ${fmtId(i.id)}`} onClick={() => control(`/api/instances/${encodeURIComponent(i.id)}/start`, 'POST')}>Start</button>}{' '}
              <button aria-label={`Destroy ${fmtId(i.id)}`} onClick={() => { if (confirm(`Destroy ${fmtId(i.id)}? This cannot be undone.`)) control(`/api/instances/${encodeURIComponent(i.id)}`, 'DELETE'); }}>Destroy</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
