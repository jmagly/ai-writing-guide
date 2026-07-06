import { useEffect, useState } from 'react';
import { api } from '../api';
import { fmtId } from '../util';
import type { Instance } from '../types';
import type { SessionApi } from '../useSession';

// The single home for starting a session (#1640/#1641). Both the dashboard "Start a
// session" verb and the Sessions-tab Start button open this picker, so neither launches
// blind with defaults. Operator picks instance · runtime · backend · posture,
// confirms, and only then do we POST with explicit params and attach. Failures render
// inline here — never an alert() that reads as "nothing happened".
interface Props {
  open: boolean;
  onClose: () => void;
  session: SessionApi;
  onStarted: () => void;          // switch to the Sessions workspace after attach
  initialInstanceId?: string;     // pre-select when opened from a specific instance/board
  startTimeoutMs?: number;
}

const START_SESSION_TIMEOUT_MS = 15000;

export function StartSessionModal({ open, onClose, session, onStarted, initialInstanceId, startTimeoutMs = START_SESSION_TIMEOUT_MS }: Props) {
  const [instances, setInstances] = useState<Instance[]>([]);
  const [instId, setInstId] = useState('');
  const [loadoutId, setLoadoutId] = useState('');
  const [backendKey, setBackendKey] = useState('');
  const [posture, setPosture] = useState<'observer' | 'controller'>('observer');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  // Load instances when the picker opens (not on mount, so a
  // closed modal never fetches — keeps the app shell test/inert).
  useEffect(() => {
    if (!open) return;
    setErr('');
    let cancelled = false;
    (async () => {
      try {
        const inv = await api<{ instances: Instance[] }>('/api/inventory');
        if (cancelled) return;
        const sessionable = dedupeInstances(inv.instances).filter((i) => i.state === 'running');
        setInstances(sessionable);
        const pick = sessionable.find((i) => i.id === initialInstanceId)
          ?? sessionable.find((i) => i.session_backends?.some((b) => b.available))
          ?? sessionable[0];
        if (pick) {
          setInstId(pick.id);
          setLoadoutId(pick.launch_context?.loadout ?? pick.loadout ?? '');
          const first = pick.session_backends?.find((b) => b.available) ?? pick.session_backends?.[0];
          setBackendKey(first ? `${first.mode}:${first.backend}` : '');
        } else {
          setErr('No stack connected — start an executor first.');
        }
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
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), startTimeoutMs);
    try {
      const qs = new URLSearchParams({ mode: selectedBackend.mode, backend: selectedBackend.backend });
      const s = await api<{ id: string; attach_url: string }>(
        `/api/instances/${encodeURIComponent(current.id)}/sessions?${qs}`,
        { method: 'POST', signal: controller.signal },
      );
      if (!s.attach_url) throw new Error('Session started but no attach URL was returned.');
      session.attach(s.attach_url, false, posture);
      onStarted();
      onClose();
    } catch (e) {
      const message = e instanceof DOMException && e.name === 'AbortError'
        ? 'Starting the session timed out. The instance may still be preparing PTY support; refresh sessions and try again.'
        : (e as Error).message;
      setErr(message);   // inline — the operator sees exactly why
      setBusy(false);
    } finally {
      window.clearTimeout(timeout);
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
          <p className="hint warn">You have an attached view. Starting creates another managed session and switches Cockpit to it; existing sessions keep running.</p>
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

          <label>Instance loadout</label>
          <span className="ro">{loadoutId || 'unknown'}{current?.launch_context?.image_ref ? ` · ${current.launch_context.image_ref}` : ''}</span>

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
            {busy ? 'Starting…' : replacing ? 'Start another session' : 'Start session'}
          </button>
        </div>
      </div>
    </div>
  );
}

function dedupeInstances(instances: Instance[]) {
  const seen = new Set<string>();
  return instances.filter((instance) => {
    if (seen.has(instance.id)) return false;
    seen.add(instance.id);
    return true;
  });
}
