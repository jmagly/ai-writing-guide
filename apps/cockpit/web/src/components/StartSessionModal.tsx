import { useEffect, useState } from 'react';
import { api } from '../api';
import { fmtId } from '../util';
import type { Instance, Loadout } from '../types';
import type { SessionApi } from '../useSession';

// The single home for starting a session (#1640/#1641). Both the dashboard "Start a
// session" verb and the Sessions-tab Start button open this picker, so neither launches
// blind with defaults. Operator picks instance · runtime · loadout · backend · posture,
// confirms, and only then do we POST with explicit params and attach. Failures render
// inline here — never an alert() that reads as "nothing happened".
interface Props {
  open: boolean;
  onClose: () => void;
  session: SessionApi;
  onStarted: () => void;          // switch to the Sessions workspace after attach
  initialInstanceId?: string;     // pre-select when opened from a specific instance/board
}

export function StartSessionModal({ open, onClose, session, onStarted, initialInstanceId }: Props) {
  const [instances, setInstances] = useState<Instance[]>([]);
  const [loadouts, setLoadouts] = useState<Loadout[]>([]);
  const [instId, setInstId] = useState('');
  const [loadoutId, setLoadoutId] = useState('');
  const [backendKey, setBackendKey] = useState('');
  const [posture, setPosture] = useState<'observer' | 'controller'>('observer');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  // Load instances + the full loadout catalog when the picker opens (not on mount, so a
  // closed modal never fetches — keeps the app shell test/inert).
  useEffect(() => {
    if (!open) return;
    setErr('');
    let cancelled = false;
    (async () => {
      try {
        const [inv, lo] = await Promise.all([
          api<{ instances: Instance[] }>('/api/inventory'),
          api<{ loadouts: Loadout[] }>('/api/loadouts').catch(() => ({ loadouts: [] as Loadout[] })),
        ]);
        if (cancelled) return;
        setInstances(inv.instances);
        setLoadouts(lo.loadouts);
        const pick = inv.instances.find((i) => i.id === initialInstanceId)
          ?? inv.instances.find((i) => i.state === 'running')
          ?? inv.instances[0];
        if (pick) setInstId(pick.id);
        else setErr('No stack connected — start an executor first.');
      } catch (e) {
        if (!cancelled) setErr((e as Error).message);
      }
    })();
    return () => { cancelled = true; };
  }, [open, initialInstanceId]);

  const current = instances.find((i) => i.id === instId);
  const backends = current?.session_backends ?? [];
  const selectedBackend = backends.find((b) => `${b.mode}:${b.backend}` === backendKey)
    ?? backends.find((b) => b.available) ?? backends[0];

  // When the chosen instance changes, default loadout + backend to that instance.
  useEffect(() => {
    if (!current) return;
    setLoadoutId(current.launch_context?.loadout ?? current.loadout ?? '');
    const first = current.session_backends?.find((b) => b.available) ?? current.session_backends?.[0];
    setBackendKey(first ? `${first.mode}:${first.backend}` : '');
  }, [instId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null;

  const replacing = session.state.attached;
  const canStart = !busy && !!current && !!selectedBackend?.available;

  const start = async () => {
    if (!current || !selectedBackend) return;
    setBusy(true); setErr('');
    try {
      const qs = new URLSearchParams({ mode: selectedBackend.mode, backend: selectedBackend.backend });
      if (loadoutId) qs.set('loadout', loadoutId);
      const s = await api<{ id: string; attach_url: string }>(
        `/api/instances/${encodeURIComponent(current.id)}/sessions?${qs}`, { method: 'POST' },
      );
      session.attach(s.attach_url, false, posture);
      onStarted();
      onClose();
    } catch (e) {
      setErr((e as Error).message);   // inline — the operator sees exactly why
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="start-session-title"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
      >
        <h2 id="start-session-title">Start a session</h2>

        {err && <p className="err">{err}</p>}
        {replacing && (
          <p className="hint warn">You have an attached session — starting will replace it.</p>
        )}

        <div className="form-grid">
          <label htmlFor="ss-instance">Instance</label>
          <select id="ss-instance" value={instId} onChange={(e) => setInstId(e.target.value)}>
            {instances.map((i) => (
              <option key={i.id} value={i.id}>{fmtId(i.id)} · {i.runtime} · {i.state}</option>
            ))}
          </select>

          <label>Runtime</label>
          <span className="ro">{current ? `${current.runtime_posture.label} (${current.runtime})` : '—'}</span>

          <label htmlFor="ss-loadout">Loadout</label>
          <select id="ss-loadout" value={loadoutId} onChange={(e) => setLoadoutId(e.target.value)}>
            {/* keep the instance's own loadout selectable even if it's not in the catalog */}
            {loadoutId && !loadouts.some((l) => l.id === loadoutId) && <option value={loadoutId}>{loadoutId} (current)</option>}
            {loadouts.map((l) => <option key={l.id} value={l.id}>{l.label}{l.description ? ` — ${l.description}` : ''}</option>)}
            {!loadouts.length && !loadoutId && <option value="">— none advertised —</option>}
          </select>

          <label htmlFor="ss-backend">Backend</label>
          <select id="ss-backend" value={backendKey} onChange={(e) => setBackendKey(e.target.value)}>
            {backends.length
              ? backends.map((b) => (
                <option key={`${b.mode}:${b.backend}`} value={`${b.mode}:${b.backend}`} disabled={!b.available}>
                  {b.mode} · {b.backend}{b.available ? '' : ` — ${b.reason ?? 'unsupported'}`}
                </option>))
              : <option value="">— not advertised —</option>}
          </select>

          <label htmlFor="ss-posture">Posture</label>
          <select
            id="ss-posture"
            value={posture}
            onChange={(e) => setPosture(e.target.value as 'observer' | 'controller')}
          >
            <option value="observer">Observe (read-only)</option>
            <option value="controller" disabled={selectedBackend?.drive === false}>Drive (control)</option>
          </select>
        </div>

        {selectedBackend && !selectedBackend.available && (
          <p className="hint">{selectedBackend.reason ?? 'Selected backend is unavailable on this instance.'}</p>
        )}

        <div className="modal-actions">
          <button onClick={onClose} disabled={busy}>Cancel</button>
          <button className="cta" onClick={start} disabled={!canStart}>
            {busy ? 'Starting…' : replacing ? 'Replace & start' : 'Start session'}
          </button>
        </div>
      </div>
    </div>
  );
}
