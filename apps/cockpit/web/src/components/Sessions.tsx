import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { fmtId, capRef } from '../util';
import { CapabilitySearch } from './CapabilitySearch';
import type { Instance, SessionInfo, CapabilityResult } from '../types';
import type { SessionApi } from '../useSession';

export function Sessions({ session, composer, setComposer, onRequestStart, refreshMs = 5_000 }: { session: SessionApi; composer: string; setComposer: (v: string) => void; onRequestStart: (instanceId?: string) => void; refreshMs?: number }) {
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

  const refreshInventory = useCallback(() => {
    return api<{ instances: Instance[] }>('/api/inventory')
      .then((d) => {
        const sessionable = dedupeInstances(d.instances).filter((i) => i.state === 'running' && i.session_backends?.some((b) => b.available));
        setInstances(sessionable);
        setInstId((currentId) => {
          if (currentId && sessionable.some((i) => i.id === currentId)) return currentId;
          return sessionable[0]?.id ?? '';
        });
        setBackendKey((currentBackend) => {
          if (currentBackend && sessionable.some((i) => i.session_backends.some((b) => `${b.mode}:${b.backend}` === currentBackend && b.available))) return currentBackend;
          const firstBackend = sessionable[0]?.session_backends.find((b) => b.available) ?? sessionable[0]?.session_backends[0];
          return firstBackend ? `${firstBackend.mode}:${firstBackend.backend}` : '';
        });
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    refreshInventory();
    const timer = window.setInterval(refreshInventory, refreshMs);
    return () => window.clearInterval(timer);
  }, [refreshInventory, refreshMs]);

  const loadSessions = useCallback((id: string) => {
    if (!id) return;
    api<{ sessions: SessionInfo[] }>(`/api/sessions?instance=${encodeURIComponent(id)}`)
      .then((d) => {
        const nextSessions = d.sessions ?? [];
        setSessions(nextSessions);
        setAttachUrl((currentUrl) => {
          if (currentUrl && nextSessions.some((s) => s.attach_url === currentUrl)) return currentUrl;
          return nextSessions[0]?.attach_url ?? '';
        });
      })
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
    if (!session.state.url) return;
    const sessionStillListed = sessions.some((s) => s.attach_url === session.state.url);
    if (sessions.length && !sessionStillListed) session.detach();
  }, [session.state.url, session.detach, sessions]);
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
  const endSelectedSession = async (target?: SessionInfo) => {
    const s = target ?? selectedSession;
    if (!current || !s) return;
    const label = s.session_name ?? s.id;
    if (!confirm(`End session ${label}? This closes the PTY and detaches connected views.`)) return;
    setEndingSession(s.id);
    setSessionErr('');
    try {
      await api(`/api/instances/${encodeURIComponent(current.id)}/sessions/${encodeURIComponent(s.id)}`, { method: 'DELETE' });
      if (session.state.url === s.attach_url) session.detach();
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
        <strong>Workspace.</strong> Pick an instance on the left, then a session under it to observe or drive.
        Start a new session per instance, or open a live task from the <strong>Running</strong> fleet board.
      </p>
      <div className="session-workspace">
        {/* Persistent instances → sessions navigation (agentic-sandbox-style control screen, #1670). */}
        <aside className="session-nav" aria-label="Instances and sessions">
          <div className="session-nav-head">
            <h2>Instances</h2>
            <span className="hint">{instances.length}</span>
          </div>
          {!instances.length && <p className="empty">No session-capable running instances.</p>}
          <ul className="nav-list">
            {instances.map((i) => {
              const isSel = i.id === instId;
              const name = i.launch_context?.name ?? fmtId(i.id);
              return (
                <li key={i.id} className={`nav-instance${isSel ? ' selected' : ''}`}>
                  <button className="nav-instance-row" aria-expanded={isSel} onClick={() => setInstId(i.id)} title={i.id}>
                    <span className={`badge isolation-${i.runtime_posture.isolation}`}>{i.runtime}</span>
                    <span className="nav-instance-name">{name}</span>
                    <span className={`state ${i.state}`}><span className="dot" aria-hidden="true" />{i.state}</span>
                  </button>
                  {isSel && (
                    <div className="nav-sessions">
                      {sessions.length === 0 && <p className="empty nav-empty">No sessions yet.</p>}
                      <ul>
                        {sessions.map((s) => {
                          const selS = s.attach_url === attachUrl;
                          const live = session.state.url === s.attach_url && attached;
                          return (
                            <li key={s.id}>
                              <button
                                className={`nav-session${selS ? ' selected' : ''}${live ? ' live' : ''}`}
                                onClick={() => setAttachUrl(s.attach_url)}
                                title={s.id}
                              >
                                <span className="nav-session-name">{sessionLabel(s)}</span>
                                <span className="nav-session-meta">{sessionMeta(s)}</span>
                                {sessionHoldsController(s) && <span className="badge controller" title="A controller is connected">ctrl</span>}
                                {live && <span className="badge live-dot" title="Attached here">●</span>}
                              </button>
                              <button
                                className="nav-session-end"
                                aria-label={`End session ${sessionLabel(s)}`}
                                title="End this PTY session"
                                disabled={endingSession === s.id}
                                onClick={() => endSelectedSession(s)}
                              >
                                {endingSession === s.id ? '…' : '×'}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                      <button className="cta-sm nav-new-session" disabled={backends.length > 0 && !selectedBackend?.available} onClick={() => onRequestStart(i.id)}>＋ New session</button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </aside>

        <section className="session-main">
          <div className="controls">
            {backends.length > 1 && (
              <>
                <label htmlFor="sel-backend">Mode</label>
                <select id="sel-backend" value={backendKey} onChange={(e) => setBackendKey(e.target.value)}>
                  {backends.map((b) => <option key={`${b.mode}:${b.backend}`} value={`${b.mode}:${b.backend}`} disabled={!b.available}>{b.mode} · {b.backend}{b.available ? '' : ` — ${b.reason ?? 'unsupported'}`}</option>)}
                </select>
              </>
            )}
            <span className="controls-active" title={selectedSession?.id}>{selectedSession ? sessionLabel(selectedSession) : '— no session selected —'}</span>
            <button disabled={!attachUrl || (attached && session.state.role === 'observer')} onClick={() => session.attach(attachUrl, false, 'observer')}>Observe</button>
            <button disabled={!attachUrl || selectedBackend?.drive === false || (attached && session.state.role === 'controller')} onClick={() => session.attach(attachUrl, false, 'controller')}>
              {attached && session.state.role === 'observer' ? 'Take Control' : 'Drive'}
            </button>
            <button disabled={!attached || selectedBackend?.keyframe === false} onClick={session.requestKeyframe}>Keyframe</button>
            <button disabled={!attached} onClick={() => session.replay(attachUrl, requestedReplayRole)}>Reattach + replay</button>
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
        </section>
      </div>
    </>
  );
}

function sessionLabel(s: SessionInfo): string {
  return s.session_name ?? s.sessionName ?? fmtId(s.id);
}
function sessionMeta(s: SessionInfo): string {
  const backend = `${s.mode ?? s.session_class ?? 'managed'}/${s.backend ?? s.session_backend ?? 'tmux'}`;
  const viewers = s.members ?? ((s.controllers ?? 0) + (s.observers ?? 0));
  return `${backend} · ${viewers} viewer${viewers === 1 ? '' : 's'}`;
}
function sessionHoldsController(s: SessionInfo): boolean {
  return s.has_controller === true || (s.controllers ?? 0) > 0;
}

function dedupeInstances(instances: Instance[]) {
  const seen = new Set<string>();
  return instances.filter((instance) => {
    if (seen.has(instance.id)) return false;
    seen.add(instance.id);
    return true;
  });
}
