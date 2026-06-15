import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { fmtId } from '../util';
import type { Instance, SessionInfo } from '../types';
import type { SessionApi } from '../useSession';

export function Sessions({ session, composer, setComposer }: { session: SessionApi; composer: string; setComposer: (v: string) => void }) {
  const [instances, setInstances] = useState<Instance[]>([]);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [instId, setInstId] = useState('');
  const [attachUrl, setAttachUrl] = useState('');
  const termRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api<{ instances: Instance[] }>('/api/inventory')
      .then((d) => { setInstances(d.instances); if (d.instances[0]) setInstId(d.instances[0].id); })
      .catch(() => {});
  }, []);

  const loadSessions = useCallback((id: string) => {
    if (!id) return;
    api<{ sessions: SessionInfo[] }>(`/api/sessions?instance=${encodeURIComponent(id)}`)
      .then((d) => { setSessions(d.sessions); setAttachUrl(d.sessions[0]?.attach_url ?? ''); })
      .catch(() => { setSessions([]); setAttachUrl(''); });
  }, []);
  useEffect(() => { loadSessions(instId); }, [instId, loadSessions]);

  // keep the terminal scrolled to the latest output
  useEffect(() => { if (termRef.current) termRef.current.scrollTop = termRef.current.scrollHeight; }, [session.state.output]);

  const send = () => { if (session.sendInput(composer)) setComposer(''); };
  const attached = session.state.attached;

  return (
    <>
      <div className="controls">
        <label htmlFor="sel-instance">Instance</label>
        <select id="sel-instance" value={instId} onChange={(e) => setInstId(e.target.value)}>
          {instances.map((i) => <option key={i.id} value={i.id}>{fmtId(i.id)} · {i.loadout}</option>)}
        </select>
        <label htmlFor="sel-session">Session</label>
        <select id="sel-session" value={attachUrl} onChange={(e) => setAttachUrl(e.target.value)}>
          {sessions.length
            ? sessions.map((s) => <option key={s.id} value={s.attach_url}>{s.id} · seq {s.seq} · {s.members} viewer(s)</option>)
            : <option value="">— no sessions —</option>}
        </select>
        <button disabled={attached || !attachUrl} onClick={() => session.attach(attachUrl)}>Attach</button>
        <button disabled={!attached} onClick={session.requestKeyframe}>Keyframe</button>
        <button disabled={!attached} onClick={() => session.replay(attachUrl)}>Reattach + replay</button>
        <button disabled={!attached} onClick={session.detach}>Detach</button>
        {session.state.role && <span className={`badge ${session.state.role}`}>{session.state.role}</span>}
      </div>
      <div className="terminal" ref={termRef} role="log" aria-live="polite" aria-label="Session output">{session.state.output}</div>
      <div className="inputrow">
        <input
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
        Pick a session, then Attach. The first viewer drives; later viewers observe. Output mirrors to every viewer —
        that's the awareness model. Actions inject their command right here.
      </p>
    </>
  );
}
