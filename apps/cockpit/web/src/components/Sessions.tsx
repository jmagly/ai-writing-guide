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
  const [endingSession, setEndingSession] = useState('');
  const [sessionErr, setSessionErr] = useState('');
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
        const sessionable = dedupeInstances(d.instances).filter((i) => i.state === 'running' && i.session_backends?.some((b) => b.available));
        setInstances(sessionable);
        if (sessionable[0]) {
          setInstId(sessionable[0].id);
          const firstBackend = sessionable[0].session_backends.find((b) => b.available) ?? sessionable[0].session_backends[0];
          if (firstBackend) setBackendKey(`${firstBackend.mode}:${firstBackend.backend}`);
        }
      })
      .catch(() => {});
  }, []);

  const loadSessions = useCallback((id: string) => {
    if (!id) return;
    api<{ sessions: SessionInfo[] }>(`/api/sessions?instance=${encodeURIComponent(id)}`)
      .then((d) => { setSessions(d.sessions); setAttachUrl(d.sessions[0]?.attach_url ?? ''); })
      .catch((e) => { setSessions([]); setAttachUrl(''); setSessionErr((e as Error).message); });
  }, []);
  useEffect(() => { loadSessions(instId); }, [instId, loadSessions]);

  const send = () => { if (session.sendInput(composer)) setComposer(''); };
  const attached = session.state.attached;
  const requestedReplayRole = session.state.role === 'controller' ? 'controller' : 'observer';
  const current = instances.find((i) => i.id === instId);
  const backends = current?.session_backends ?? [];
  const selectedBackend = backends.find((b) => `${b.mode}:${b.backend}` === backendKey) ?? backends.find((b) => b.available) ?? backends[0];
  const selectedSession = sessions.find((s) => s.attach_url === attachUrl);
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
  const endSelectedSession = async () => {
    if (!current || !selectedSession) return;
    const label = selectedSession.session_name ?? selectedSession.id;
    if (!confirm(`End session ${label}? This closes the PTY and detaches connected views.`)) return;
    setEndingSession(selectedSession.id);
    setSessionErr('');
    try {
      await api(`/api/instances/${encodeURIComponent(current.id)}/sessions/${encodeURIComponent(selectedSession.id)}`, { method: 'DELETE' });
      if (session.state.url === selectedSession.attach_url) session.detach();
      await loadSessions(current.id);
    } catch (e) {
      setSessionErr((e as Error).message);
    } finally {
      setEndingSession('');
    }
  };

  return (
    <>
      <p className="hint">
        <strong>Workspace.</strong> Attach to a single session on one instance to observe or drive it. Start a
        new session above, or pick a live task from the <strong>Running</strong> fleet board and open it here.
      </p>
      <div className="controls">
        <label htmlFor="sel-instance">Instance</label>
        <select id="sel-instance" value={instId} onChange={(e) => setInstId(e.target.value)}>
          {instances.map((i) => <option key={i.id} value={i.id}>{i.launch_context?.name ?? fmtId(i.id)} · {i.loadout}</option>)}
          {!instances.length && <option value="">— no session-capable running instances —</option>}
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
            ? sessions.map((s) => <option key={s.id} value={s.attach_url}>{s.id} · {s.mode ?? s.session_class ?? 'managed'}/{s.backend ?? s.session_backend ?? 'tmux'} · {current?.launch_context?.name ?? fmtId(instId)}</option>)
            : <option value="">— no sessions —</option>}
        </select>
        <button disabled={!attachUrl || (attached && session.state.role === 'observer')} onClick={() => session.attach(attachUrl, false, 'observer')}>Observe</button>
        <button disabled={!attachUrl || selectedBackend?.drive === false || (attached && session.state.role === 'controller')} onClick={() => session.attach(attachUrl, false, 'controller')}>
          {attached && session.state.role === 'observer' ? 'Take Control' : 'Drive'}
        </button>
        <button disabled={!attached || selectedBackend?.keyframe === false} onClick={session.requestKeyframe}>Keyframe</button>
        <button disabled={!attached} onClick={() => session.replay(attachUrl, requestedReplayRole)}>Reattach + replay</button>
        <button
          disabled={!selectedSession || endingSession === selectedSession?.id}
          onClick={endSelectedSession}
          title="Terminate the selected PTY session on the agent"
        >
          {endingSession === selectedSession?.id ? 'Ending…' : 'End Session'}
        </button>
        <button disabled={!attached} onClick={session.detach}>Detach</button>
        {session.state.role && <span className={`badge ${session.state.role}`}>{session.state.role}</span>}
      </div>
      {sessionErr && <p className="err">Session action failed: {sessionErr}</p>}
      {current && (
        <p className="hint">
          {current.runtime_posture.label} · {current.transport.label} ({current.transport.mode}) · attach starts as observe unless control is explicitly granted.
          {attached && session.state.role === 'observer' ? ' Click Take Control to re-attach with write access.' : ''}
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

function dedupeInstances(instances: Instance[]) {
  const seen = new Set<string>();
  return instances.filter((instance) => {
    if (seen.has(instance.id)) return false;
    seen.add(instance.id);
    return true;
  });
}
