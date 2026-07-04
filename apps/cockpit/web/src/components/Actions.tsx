import { useEffect, useState } from 'react';
import { api } from '../api';
import type { ContribAction, ContribScreen, ContribWorkflow, ContributionsResponse } from '../types';
import type { SessionApi } from '../useSession';

// Actions INJECT a command into an agentic session — the Cockpit never runs the CLI.
export function Actions({ refreshTick = 0, session, setComposer, goSessions }: { refreshTick?: number; session: SessionApi; setComposer: (v: string) => void; goSessions: () => void }) {
  const [actions, setActions] = useState<ContribAction[]>([]);
  const [screens, setScreens] = useState<ContribScreen[]>([]);
  const [workflows, setWorkflows] = useState<ContribWorkflow[]>([]);
  const [err, setErr] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    api<ContributionsResponse>('/api/contributions').then((d) => {
      setActions(d.actions ?? []);
      setScreens(d.screens ?? []);
      setWorkflows(d.workflows ?? []);
    }).catch((e) => setErr((e as Error).message));
  }, [refreshTick]);

  const inject = async (a: ContribAction) => {
    let command = a.inject.command;
    if (a.inject.needs_args) {
      const extra = prompt(`Arguments for ${a.title}${a.inject.args_hint ? ` (${a.inject.args_hint})` : ''}:`, '');
      if (extra === null) return;
      if (extra.trim()) command += ' ' + extra.trim();
    }
    await api('/api/audit/intent', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        event: 'action.inject.requested',
        detail: {
          action_id: a.id,
          source: a.source,
          target: a.inject.target ?? 'focused',
          command,
          controller_attached: session.isController,
        },
      }),
    }).catch(() => undefined);
    if (session.isController && session.sendInput(command)) {
      setNote(`Injected "${command}" into the attached session — the agent runs it.`);
    } else {
      setComposer(command); // prefill the session composer; attach (drive) or start one, then Send
      setNote(`Ready to inject "${command}". Attach to a session (drive) or start one, then Send.`);
    }
    goSessions(); // actions target the sessions surface
  };
  const copyCommand = async (a: ContribAction) => {
    await navigator.clipboard?.writeText(a.inject.command);
    setNote(`Copied "${a.inject.command}" to the clipboard.`);
  };
  const actionById = new Map(actions.map((a) => [a.id, a]));
  const openScreen = (screen: ContribScreen) => {
    if (screen.source === 'cockpit://index/live') {
      window.location.hash = '#explore';
      setNote('Opened the contributed Live Index screen.');
      return;
    }
    if (screen.source === 'cockpit://issues/workbench') {
      window.location.hash = '#actions';
      setNote('Issue Workbench is available here through the contributed issue actions and workflows.');
      return;
    }
    setNote(`Unsupported contributed screen source: ${screen.source}`);
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
            <span className="action-cluster" key={a.id}>
              <button className="act" title={`injects: ${a.inject.command}`} onClick={() => inject(a)}>
                {a.icon ? a.icon + ' ' : ''}{a.title}
              </button>
              <button className="copy-command" aria-label={`Copy CLI command for ${a.title}`} title={a.inject.command} onClick={() => copyCommand(a)}>
                Copy CLI
              </button>
            </span>
          ))
          : <p className="empty">No contributed actions.</p>}
      </div>
      <div className="contrib-layout">
        <section aria-label="Contributed screens">
          <div className="section-toolbar">
            <h2>Screens</h2>
          </div>
          <div className="contrib-grid">
            {screens.length
              ? screens.map((s) => (
                <article className="contrib-item" key={s.id}>
                  <strong>{s.title}</strong>
                  <p>{s.source}</p>
                  <button onClick={() => openScreen(s)}>Open</button>
                </article>
              ))
              : <p className="empty">No contributed screens.</p>}
          </div>
        </section>
        <section aria-label="Contributed workflows">
          <div className="section-toolbar">
            <h2>Workflows</h2>
          </div>
          <div className="contrib-grid">
            {workflows.length
              ? workflows.map((w) => (
                <article className="contrib-item" key={w.id}>
                  <strong>{w.title}</strong>
                  {w.description && <p>{w.description}</p>}
                  <div className="workflow-steps">
                    {w.steps.map((step, idx) => {
                      const action = actionById.get(step.action);
                      return (
                        <button key={`${w.id}-${idx}-${step.action}`} disabled={!action} onClick={() => action && inject(action)}>
                          {step.label || action?.title || step.action}
                        </button>
                      );
                    })}
                  </div>
                </article>
              ))
              : <p className="empty">No contributed workflows.</p>}
          </div>
        </section>
      </div>
      <p className="empty">{note || 'Output appears in the session terminal — actions drop a command into a session and the agent executes it.'}</p>
    </>
  );
}
