import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { fmtId, capRef } from '../util';
import { CapabilitySearch } from './CapabilitySearch';
import type { Instance, SessionInfo, CapabilityResult } from '../types';
import type { SessionApi } from '../useSession';
import { markRegistrySessionViewed, sessionRegistryKeyFor, setRegistryActiveSession, upsertRegistrySessions, useSessionRegistry } from '../sessionRegistry';
import { useSessionSnapshotMonitor } from '../sessionMonitor';

export function Sessions({ session, composer, setComposer, onRequestStart, refreshMs = 5_000 }: { session: SessionApi; composer: string; setComposer: (v: string) => void; onRequestStart: (instanceId?: string) => void; refreshMs?: number }) {
  const [instances, setInstances] = useState<Instance[]>([]);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [instId, setInstId] = useState('');
  const [selectedSessionKey, setSelectedSessionKey] = useState('');
  const [backendKey, setBackendKey] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [endingSession, setEndingSession] = useState('');
  const [sessionErr, setSessionErr] = useState('');
  const [attachedInstanceId, setAttachedInstanceId] = useState('');
  const [attachedSessionId, setAttachedSessionId] = useState('');
  const instIdRef = useRef('');
  const attachedRef = useRef(false);
  const attachedOwnerRef = useRef('');
  const inventorySeqRef = useRef(0);
  const sessionsSeqRef = useRef(0);
  const missingAttachedPollsRef = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const sessionRegistry = useSessionRegistry();

  useSessionSnapshotMonitor();

  useEffect(() => { instIdRef.current = instId; }, [instId]);
  useEffect(() => { attachedRef.current = session.state.attached; }, [session.state.attached]);

  const insertCap = (r: CapabilityResult) => {
    const sep = composer && !composer.endsWith(' ') ? ' ' : '';
    setComposer(composer + sep + capRef(r.type, r.name));
    setShowPicker(false);
    inputRef.current?.focus();
  };

  const refreshInventory = useCallback(async () => {
    const seq = inventorySeqRef.current + 1;
    inventorySeqRef.current = seq;
    const d = await api<{ instances: Instance[] }>('/api/inventory');
    if (seq !== inventorySeqRef.current) return;
    const sessionable = dedupeInstances(d.instances).filter((i) => i.state === 'running' && i.session_backends?.some((b) => b.available));
    setInstances(sessionable);
    const currentId = instIdRef.current;
    let nextId = sessionable[0]?.id ?? '';
    if (currentId && sessionable.some((i) => i.id === currentId)) nextId = currentId;
    else if (attachedRef.current && currentId) nextId = currentId;
    instIdRef.current = nextId;
    setInstId(nextId);
    setBackendKey((currentBackend) => {
      const selectedInstance = sessionable.find((i) => i.id === nextId) ?? sessionable[0];
      if (currentBackend && selectedInstance?.session_backends.some((b) => `${b.mode}:${b.backend}` === currentBackend && b.available)) return currentBackend;
      if (attachedRef.current && currentBackend) return currentBackend;
      const firstBackend = selectedInstance?.session_backends.find((b) => b.available) ?? selectedInstance?.session_backends[0];
      return firstBackend ? `${firstBackend.mode}:${firstBackend.backend}` : '';
    });
  }, []);

  useEffect(() => {
    attachedOwnerRef.current = attachedInstanceId || instanceIdFromAttachUrl(session.state.url);
  }, [attachedInstanceId, session.state.url]);

  const loadSessions = useCallback(async (id: string) => {
    if (!id) return;
    const seq = sessionsSeqRef.current + 1;
    sessionsSeqRef.current = seq;
    const d = await api<{ sessions: SessionInfo[] }>(`/api/sessions?instance=${encodeURIComponent(id)}`);
    if (seq !== sessionsSeqRef.current || id !== instIdRef.current) return;
    const nextSessions = d.sessions ?? [];
    upsertRegistrySessions(nextSessions);
    setSessions(nextSessions);
    setSessionErr('');
    setSelectedSessionKey((currentKey) => {
      if (currentKey && nextSessions.some((s) => sessionKey(s) === currentKey)) return currentKey;
      if (attachedRef.current && attachedOwnerRef.current === id && currentKey) return currentKey;
      return nextSessions[0] ? sessionKey(nextSessions[0]) : '';
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;
    let delay = refreshMs;
    const schedule = (ms: number) => {
      timer = window.setTimeout(tick, ms);
    };
    const tick = async () => {
      if (cancelled) return;
      if (endingSession) {
        schedule(refreshMs);
        return;
      }
      try {
        const idBeforeInventory = instIdRef.current;
        await refreshInventory();
        if (idBeforeInventory && idBeforeInventory === instIdRef.current) await loadSessions(instIdRef.current);
        delay = refreshMs;
      } catch (e) {
        if (!cancelled) setSessionErr((e as Error).message);
        delay = Math.min(Math.max(refreshMs, delay * 2), 30_000);
      }
      if (!cancelled) schedule(delay);
    };
    tick();
    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [endingSession, loadSessions, refreshInventory, refreshMs]);

  useEffect(() => {
    if (!instId) return;
    loadSessions(instId).catch((e) => setSessionErr((e as Error).message));
  }, [instId, loadSessions]);

  const attached = session.state.attached;
  const requestedReplayRole = session.state.role === 'controller' ? 'controller' : 'observer';
  const current = instances.find((i) => i.id === instId);
  const backends = current?.session_backends ?? [];
  const selectedBackend = backends.find((b) => `${b.mode}:${b.backend}` === backendKey) ?? backends.find((b) => b.available) ?? backends[0];
  const selectedSession = sessions.find((s) => sessionKey(s) === selectedSessionKey);
  const attachedOwner = attachedInstanceId || instanceIdFromAttachUrl(session.state.url);
  const attachedKey = attachedOwner && attachedSessionId ? `${attachedOwner}:${attachedSessionId}` : sessionKeyFromAttachUrl(session.state.url);
  const activeTarget = session.state.target ?? (attachedOwner && attachedSessionId ? { instanceId: attachedOwner, sessionId: attachedSessionId } : null);
  const send = () => { if (session.sendInput(composer, activeTarget)) setComposer(''); };
  const attachToSession = (s: SessionInfo, role: 'controller' | 'observer') => {
    setAttachedInstanceId(s.instance_id || instId);
    setAttachedSessionId(String(s.id));
    setRegistryActiveSession(s.instance_id || instId, String(s.id));
    session.attach(s.attach_url, false, role, { instanceId: s.instance_id || instId, sessionId: String(s.id) });
  };
  const replaySession = (s: SessionInfo, role: 'controller' | 'observer') => {
    setAttachedInstanceId(s.instance_id || instId);
    setAttachedSessionId(String(s.id));
    setRegistryActiveSession(s.instance_id || instId, String(s.id));
    session.replay(s.attach_url, role, { instanceId: s.instance_id || instId, sessionId: String(s.id) });
  };
  const detachSession = () => {
    setAttachedInstanceId('');
    setAttachedSessionId('');
    setRegistryActiveSession(null, null);
    session.detach();
  };
  useEffect(() => {
    const selected = sessions.find((s) => sessionKey(s) === selectedSessionKey);
    if (selected) markRegistrySessionViewed(selected.instance_id, String(selected.id));
  }, [selectedSessionKey, sessions]);
  useEffect(() => {
    if (!session.state.url) return;
    if (!attachedOwner || attachedOwner !== instId) return;
    const sessionStillListed = sessions.some((s) => sessionKey(s) === attachedKey);
    if (sessionStillListed) {
      missingAttachedPollsRef.current = 0;
      return;
    }
    if (sessions.length) {
      missingAttachedPollsRef.current += 1;
      if (missingAttachedPollsRef.current >= 2) detachSession();
    }
  }, [attachedKey, attachedOwner, instId, session.state.url, sessions]);
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
      if (sessionKey(s) === attachedKey) detachSession();
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
                          const key = sessionKey(s);
                          const selS = key === selectedSessionKey;
                          const live = key === attachedKey && attached;
                          const registryEntry = sessionRegistry.entries[sessionRegistryKeyFor(s)];
                          return (
                            <li key={s.id}>
                              <button
                                className={`nav-session${selS ? ' selected' : ''}${live ? ' live' : ''}`}
                                // Selecting a session keeps the operator's current posture when
                                // possible. If they are already driving, do not silently downgrade
                                // to observe; if they click the attached row, reattach+replay so
                                // Docker/tmux streams repaint and control is reasserted.
                                onClick={() => {
                                  const role = session.state.role === 'controller' && selectedBackend?.drive !== false ? 'controller' : 'observer';
                                  setSelectedSessionKey(key);
                                  if (key === attachedKey && attached) {
                                    replaySession(s, role);
                                  } else {
                                    attachToSession(s, role);
                                  }
                                }}
                                title={s.id}
                              >
                                <span className="nav-session-name">{sessionLabel(s)}</span>
                                <span className="nav-session-meta">{sessionMeta(s)}</span>
                                {sessionHoldsController(s) && <span className="badge controller" title="A controller is connected">ctrl</span>}
                                {registryEntry?.unread && <span className="badge unread" title="Unread output">unread</span>}
                                {registryEntry?.responseNeeded.needed && <span className="badge response" title="Response needed">response</span>}
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
            <button disabled={!selectedSession || (attached && session.state.role === 'observer')} onClick={() => selectedSession && attachToSession(selectedSession, 'observer')}>Observe</button>
            <button disabled={!selectedSession || selectedBackend?.drive === false || (attached && session.state.role === 'controller')} onClick={() => selectedSession && attachToSession(selectedSession, 'controller')}>
              {attached && session.state.role === 'observer' ? 'Take Control' : 'Drive'}
            </button>
            <button disabled={!attached || selectedBackend?.keyframe === false} onClick={session.requestKeyframe}>Keyframe</button>
            <button disabled={!attached} onClick={() => selectedSession && replaySession(selectedSession, requestedReplayRole)}>Reattach + replay</button>
            <button disabled={!attached} onClick={detachSession}>Detach</button>
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
  if (s.members == null && s.controllers == null && s.observers == null) return backend;
  const viewers = s.members ?? ((s.controllers ?? 0) + (s.observers ?? 0));
  return `${backend} · ${viewers} viewer${viewers === 1 ? '' : 's'}`;
}
function sessionHoldsController(s: SessionInfo): boolean {
  return s.has_controller === true || (s.controllers ?? 0) > 0;
}

function sessionKey(s: SessionInfo): string {
  return `${s.instance_id}:${s.id}`;
}

function sessionKeyFromAttachUrl(url: string | null): string {
  const parts = sessionPartsFromAttachUrl(url);
  return parts ? `${parts.instanceId}:${parts.sessionId}` : '';
}

function sessionPartsFromAttachUrl(url: string | null): { instanceId: string; sessionId: string } | null {
  if (!url) return null;
  const pattern = /\/agents\/([^/]+)\/sessions\/([^/]+)\/attach/;
  try {
    const parsed = new URL(url);
    const match = parsed.pathname.match(pattern);
    return match ? { instanceId: decodeURIComponent(match[1]), sessionId: decodeURIComponent(match[2]) } : null;
  } catch {
    const match = url.match(pattern);
    return match ? { instanceId: decodeURIComponent(match[1]), sessionId: decodeURIComponent(match[2]) } : null;
  }
}

function instanceIdFromAttachUrl(url: string | null): string {
  return sessionPartsFromAttachUrl(url)?.instanceId ?? '';
}

function dedupeInstances(instances: Instance[]) {
  const seen = new Set<string>();
  return instances.filter((instance) => {
    if (seen.has(instance.id)) return false;
    seen.add(instance.id);
    return true;
  });
}
