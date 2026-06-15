import { useEffect, useState } from 'react';
import { api } from '../api';
import type { ContribAction } from '../types';
import type { SessionApi } from '../useSession';

// Actions INJECT a command into an agentic session — the Cockpit never runs the CLI.
export function Actions({ session, setComposer, goSessions }: { session: SessionApi; setComposer: (v: string) => void; goSessions: () => void }) {
  const [actions, setActions] = useState<ContribAction[]>([]);
  const [err, setErr] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    api<{ actions: ContribAction[] }>('/api/contributions').then((d) => setActions(d.actions)).catch((e) => setErr((e as Error).message));
  }, []);

  const inject = (a: ContribAction) => {
    let command = a.inject.command;
    if (a.inject.needs_args) {
      const extra = prompt(`Arguments for ${a.title}${a.inject.args_hint ? ` (${a.inject.args_hint})` : ''}:`, '');
      if (extra === null) return;
      if (extra.trim()) command += ' ' + extra.trim();
    }
    if (session.isController && session.sendInput(command)) {
      setNote(`Injected "${command}" into the attached session — the agent runs it.`);
    } else {
      setComposer(command); // prefill the session composer; attach (drive) or start one, then Send
      setNote(`Ready to inject "${command}". Attach to a session (drive) or start one, then Send.`);
    }
    goSessions(); // actions target the sessions surface
  };

  return (
    <>
      <p className="hint">
        Actions are <strong>contributed declaratively</strong>. Clicking one <strong>injects a command into an agentic session</strong>
        {' '}(focused, else it offers a new one); the agent runs it. The Cockpit never runs the CLI — agents do.
      </p>
      {err && <p className="err">{err}</p>}
      <div className="controls" role="group" aria-label="Contributed actions">
        {actions.length
          ? actions.map((a) => (
            <button key={a.id} className="act" title={`injects: ${a.inject.command}`} onClick={() => inject(a)}>
              {a.icon ? a.icon + ' ' : ''}{a.title}
            </button>
          ))
          : <p className="empty">No contributed actions.</p>}
      </div>
      <p className="empty">{note || 'Output appears in the session terminal — actions drop a command into a session and the agent executes it.'}</p>
    </>
  );
}
