import { useEffect, useState } from 'react';
import { api } from '../api';
import type { Instance, Approval } from '../types';

interface Status { instances: number; running: number; runningStacks: number; approvals: number; connected: boolean }

export function Welcome({ onStartSession, goTo }: { onStartSession: () => void; goTo: (t: string) => void }) {
  const [st, setSt] = useState<Status | null>(null);
  const [firstRun] = useState(() => !localStorage.getItem('cockpit.welcomed'));

  useEffect(() => { localStorage.setItem('cockpit.welcomed', '1'); }, []);
  useEffect(() => {
    (async () => {
      try {
        const inv = await api<{ instances: Instance[] }>('/api/inventory');
        const run = await api<{ count: number }>('/api/running');
        const apr = await api<{ approvals: Approval[] }>('/api/approvals?status=pending');
        const runningStacks = inv.instances.filter((i) => i.state === 'running').length;
        setSt({ instances: inv.instances.length, running: run.count, runningStacks, approvals: apr.approvals.length, connected: inv.instances.length > 0 });
      } catch {
        setSt({ instances: 0, running: 0, runningStacks: 0, approvals: 0, connected: false });
      }
    })();
  }, []);

  return (
    <div className="welcome">
      <h2>Work alongside your agents</h2>
      <p className="lead">
        AIWG Cockpit is your control plane over the agentic sessions AIWG runs — observe what agents are doing,
        take the wheel when you want, and coordinate multiple stacks from one place. It fronts the CLI and the
        registry; it never replaces them. <strong>Agents run the CLI — you direct the agents.</strong>
      </p>

      {!st ? <p className="empty">Checking your stacks…</p>
        : !st.connected ? (
          <div className="card warn-card">
            <h3>No stack connected</h3>
            <p>Cockpit talks to an agentic-sandbox executor. Start one (or the bundled mock) and point the Bridge at it:</p>
            <pre className="terminal">node apps/cockpit/mock-executor/src/server.mjs   # or your agentic-sandbox{'\n'}node apps/cockpit/bridge/src/server.mjs</pre>
          </div>
        ) : (
          <>
            <div className="statgrid">
              <button className="stat" onClick={() => goTo('inventory')}>
                <span className="stat-n">{st.instances}</span><span className="stat-l">instance(s) · {st.runningStacks} running</span>
              </button>
              <button className="stat" onClick={() => goTo('running')}>
                <span className="stat-n">{st.running}</span><span className="stat-l">running task(s)</span>
              </button>
              <button className="stat" onClick={() => goTo('approvals')}>
                <span className="stat-n">{st.approvals}</span><span className="stat-l">pending approval(s)</span>
              </button>
            </div>
            <div className="cta-row">
              <button className="cta" onClick={onStartSession}>▸ Start a session</button>
              <button onClick={() => goTo('explore')}>Browse capabilities</button>
              {st.approvals > 0 && <button onClick={() => goTo('approvals')}>Review {st.approvals} approval(s)</button>}
            </div>
          </>
        )}

      {firstRun && (
        <div className="card tour">
          <h3>Three things to know</h3>
          <ol>
            <li><strong>Sessions</strong> are where work happens — attach to observe, take the wheel to drive. Output mirrors to every viewer.</li>
            <li><strong>Actions</strong> and the <strong>＋ capability picker</strong> drop a command into a session; the agent runs it. The Cockpit never runs the CLI.</li>
            <li><strong>Explore</strong> browses the read-only AIWG catalog. Your own copied/imported assets live in your library — AIWG files are never overwritten.</li>
          </ol>
        </div>
      )}
    </div>
  );
}
