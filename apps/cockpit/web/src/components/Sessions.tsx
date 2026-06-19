import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { fmtId, capRef } from '../util';
import { CapabilitySearch } from './CapabilitySearch';
import type { Instance, SessionInfo, CapabilityResult } from '../types';
import type { SessionApi } from '../useSession';

export function Sessions({ session, composer, setComposer, onRequestStart }: { session: SessionApi; composer: string; setComposer: (v: string) => void; onRequestStart: (instanceId?: string) => void }) {
  const [instances, setInstances] = useState<Instance[]>([]);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [instId, setInstId] = useState('');
  const [attachUrl, setAttachUrl] = useState('');
  const [backendKey, setBackendKey] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const insertCap = (r: CapabilityResult) => {
    const sep = composer && !composer.endsWith(' ') ? ' ' : '';
    setComposer(composer + sep + capRef(r.type, r.name));
    setShowPicker(false);
    inputRef.current?.focus();
  };

  useEffect(() => {
    api<{ instances: Instance[] }>('/api/inventory')
      .then((d) => {
        setInstances(d.instances);
        if (d.instances[0]) {
          setInstId(d.instances[0].id);
          const firstBackend = d.instances[0].session_backends.find((b) => b.available) ?? d.instances[0].session_backends[0];
          if (firstBackend) setBackendKey(`${firstBackend.mode}:${firstBackend.backend}`);
        }
      })
      .catch(() => {});
  }, []);

  const loadSessions = useCallback((id: string) => {
    if (!id) return;
    api<{ sessions: SessionInfo[] }>(`/api/sessions?instance=${encodeURIComponent(id)}`)
      .then((d) => { setSessions(d.sessions); setAttachUrl(d.sessions[0]?.attach_url ?? ''); })
      .catch(() => { setSessions([]); setAttachUrl(''); });
  }, []);
  useEffect(() => { loadSessions(instId); }, [instId, loadSessions]);

  const send = () => { if (session.sendInput(composer)) setComposer(''); };
  const attached = session.state.attached;
  const current = instances.find((i) => i.id === instId);
  const backends = current?.session_backends ?? [];
  const selectedBackend = backends.find((b) => `${b.mode}:${b.backend}` === backendKey) ?? backends.find((b) => b.available) ?? backends[0];
  useEffect(() => {
    if (!current) return;
    const valid = current.session_backends.some((b) => `${b.mode}:${b.backend}` === backendKey);
    if (!valid) {
      const next = current.session_backends.find((b) => b.available) ?? current.session_backends[0];
      setBackendKey(next ? `${next.mode}:${next.backend}` : '');
    }
  }, [backendKey, current]);
  // Starting now routes through the shared picker (#1640/#1641) so this tab and the
  // dashboard verb share one params/clobber/error path. The selects below remain for
  // attaching to / observing / driving sessions that already exist.

  return (
    <>
      <p className="hint">
        <strong>Workspace.</strong> Attach to a single session on one instance to observe or drive it. Start a
        new session above, or pick a live task from the <strong>Running</strong> fleet board and open it here.
      </p>
      <div className="controls">
        <label htmlFor="sel-instance">Instance</label>
        <select id="sel-instance" value={instId} onChange={(e) => setInstId(e.target.value)}>
          {instances.map((i) => <option key={i.id} value={i.id}>{fmtId(i.id)} · {i.loadout}</option>)}
        </select>
        <label htmlFor="sel-backend">Mode</label>
        <select id="sel-backend" value={backendKey} onChange={(e) => setBackendKey(e.target.value)}>
          {backends.length
            ? backends.map((b) => <option key={`${b.mode}:${b.backend}`} value={`${b.mode}:${b.backend}`} disabled={!b.available}>{b.mode} · {b.backend}{b.available ? '' : ` — ${b.reason ?? 'unsupported'}`}</option>)
            : <option value="">— not advertised —</option>}
        </select>
        <button onClick={() => onRequestStart(instId)}>Start…</button>
        <label htmlFor="sel-session">Session</label>
        <select id="sel-session" value={attachUrl} onChange={(e) => setAttachUrl(e.target.value)}>
          {sessions.length
            ? sessions.map((s) => <option key={s.id} value={s.attach_url}>{s.id} · {s.mode ?? 'direct'}/{s.backend ?? 'native'} · seq {s.seq} · {s.members} viewer(s)</option>)
            : <option value="">— no sessions —</option>}
        </select>
        <button disabled={attached || !attachUrl} onClick={() => session.attach(attachUrl, false, 'observer')}>Observe</button>
        <button disabled={attached || !attachUrl || selectedBackend?.drive === false} onClick={() => session.attach(attachUrl, false, 'controller')}>Drive</button>
        <button disabled={!attached || selectedBackend?.keyframe === false} onClick={session.requestKeyframe}>Keyframe</button>
        <button disabled={!attached} onClick={() => session.replay(attachUrl)}>Reattach + replay</button>
        <button disabled={!attached} onClick={session.detach}>Detach</button>
        {session.state.role && <span className={`badge ${session.state.role}`}>{session.state.role}</span>}
      </div>
      {current && (
        <p className="hint">
          {current.runtime_posture.label} · {current.transport.label} ({current.transport.mode}) · attach starts as observe unless control is explicitly granted.
          {selectedBackend && !selectedBackend.available ? ` ${selectedBackend.reason ?? 'Selected backend is unavailable.'}` : ''}
        </p>
      )}
      <div className="terminal" ref={session.openTerminal} role="log" aria-label="Session output" />
      {showPicker && (
        <div className="picker">
          <p className="hint" style={{ marginTop: 0 }}>Pick a capability to insert into the command — then Send to inject it. (Lookup is UI; the agent runs it.)</p>
          <CapabilitySearch compact autoFocus onPick={insertCap} />
        </div>
      )}
      <div className="inputrow">
        <button aria-label="Insert a capability" title="Insert a capability (search)" onClick={() => setShowPicker((v) => !v)}>＋</button>
        <input
          ref={inputRef}
          value={composer}
          onChange={(e) => setComposer(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
          placeholder={session.isController ? 'Type to drive the session…' : 'Observing — input is read-only'}
          disabled={!session.isController}
          aria-label="Session input"
        />
        <button disabled={!session.isController} onClick={send}>Send</button>
      </div>
      <p className="hint">
        Pick or start a session, then Attach. Cockpit requests observe-first access; drive/control is explicit and denial reasons stay visible through the session stream.
        Actions inject their command right here.
      </p>
    </>
  );
}
