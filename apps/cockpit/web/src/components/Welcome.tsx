import { useEffect, useState } from 'react';
import { api } from '../api';
import { fmtId } from '../util';
import type { Instance, Approval, Cost, RunningTask } from '../types';

interface Status {
  instances: Instance[];
  running: RunningTask[];
  approvals: Approval[];
  cost: Cost | null;
  executor: string;
  connected: boolean;
}

export function Welcome({ onStartSession, goTo }: { onStartSession: () => void; goTo: (t: string) => void }) {
  const [st, setSt] = useState<Status | null>(null);
  const [firstRun] = useState(() => !localStorage.getItem('cockpit.welcomed'));

  useEffect(() => { localStorage.setItem('cockpit.welcomed', '1'); }, []);
  useEffect(() => {
    (async () => {
      try {
        const inv = await api<{ instances: Instance[] }>('/api/inventory');
        const run = await api<{ count: number; running: RunningTask[] }>('/api/running');
        const apr = await api<{ approvals: Approval[] }>('/api/approvals?status=pending');
        const health = await api<{ executor_url: string }>('/api/health');
        const cost = await api<Cost>('/api/cost').catch(() => null);
        setSt({ instances: inv.instances, running: run.running, approvals: apr.approvals, cost, executor: health.executor_url, connected: inv.instances.length > 0 });
      } catch {
        setSt({ instances: [], running: [], approvals: [], cost: null, executor: '', connected: false });
      }
    })();
  }, []);

  const runningInstances = st?.instances.filter((i) => i.state === 'running') ?? [];
  const runtimeCoverage = {
    host: st?.instances.some((i) => i.runtime_posture.kind === 'host') ?? false,
    container: st?.instances.some((i) => i.runtime_posture.kind === 'container' || i.runtime_posture.kind === 'docker') ?? false,
    vm: st?.instances.some((i) => i.runtime_posture.kind === 'vm') ?? false,
  };
  const copyStartCommand = async () => {
    await navigator.clipboard?.writeText('aiwg cockpit');
  };

  return (
    <div className="welcome operator-wall">
      <section className="wall-hero" aria-labelledby="cockpit-wall-title">
        <div>
          <p className="eyebrow">Operator wall</p>
          <h2 id="cockpit-wall-title">Work alongside your agents</h2>
          <p className="lead">
            Observe live stacks, take control when a session allows it, and keep approvals, cost,
            runtime posture, and handoff context visible in one control plane.
          </p>
        </div>
        <div className="hero-actions" aria-label="Primary Cockpit actions">
          <button className="cta" onClick={onStartSession}>▸ Start a session</button>
          <button onClick={() => goTo('running')}>View board</button>
          <button onClick={copyStartCommand}>Copy CLI</button>
        </div>
      </section>

      {!st ? <p className="empty">Checking your stacks…</p>
        : !st.connected ? (
          <div className="card warn-card">
            <h3>No stack connected</h3>
            <p>Cockpit talks to an agentic-sandbox executor. Start one (or the bundled mock) and point the Bridge at it:</p>
            <pre className="terminal">node apps/cockpit/mock-executor/src/server.mjs   # or your agentic-sandbox{'\n'}node apps/cockpit/bridge/src/server.mjs</pre>
          </div>
        ) : (
          <>
            <section className="stack-board" aria-label="Running stack board">
              {runningInstances.slice(0, 6).map((i) => {
                const task = st.running.find((r) => r.instance_id === i.id);
                const cost = st.cost?.per_instance.find((c) => c.instance_id === i.id);
                const drive = i.session_backends.some((b) => b.available && b.drive);
                return (
                  <article className={`stack-card accent-${accentFor(i.id)}`} key={i.id}>
                    <div className="stack-head">
                      <span className={`topology topology-${runtimeFamily(i)}`} aria-hidden="true" />
                      <div>
                        <h3>{i.loadout}</h3>
                        <p>{fmtId(i.id)} · {i.runtime_posture.label}</p>
                      </div>
                      <span className={`badge isolation-${i.runtime_posture.isolation}`}>{i.state}</span>
                    </div>
                    <div className="stack-log" role="img" aria-label={`Recent activity for ${i.loadout}`}>
                      <span>{task ? `task ${fmtId(task.task_id)} · ${task.state}` : 'idle · ready for session attach'}</span>
                      <span>{i.transport.label} · {i.transport.mode}</span>
                      <span>{drive ? 'Drive enabled' : 'Observe only'}</span>
                    </div>
                    <div className="segment-progress" aria-label="Session progress">
                      <span style={{ width: task ? '68%' : '28%' }} />
                    </div>
                    <div className="transport-bar">
                      <button onClick={() => goTo('sessions')}>Attach</button>
                      <button onClick={() => goTo('running')}>Details</button>
                      <span>{cost ? `$${cost.usd.toFixed(2)}` : 'cost n/a'}</span>
                    </div>
                  </article>
                );
              })}
            </section>

            <section className="telemetry-strip" aria-label="Fleet telemetry">
              <button onClick={() => goTo('inventory')}>
                <strong>{st.instances.length}</strong>
                <span>instances · {runningInstances.length} running</span>
              </button>
              <button onClick={() => goTo('running')}>
                <strong>{st.running.length}</strong>
                <span>active tasks</span>
              </button>
              <button onClick={() => goTo('approvals')}>
                <strong>{st.approvals.length}</strong>
                <span>pending approvals</span>
              </button>
              <button onClick={() => goTo('running')}>
                <strong>{st.cost ? `$${st.cost.total.usd.toFixed(2)}` : '--'}</strong>
                <span>cost · quota</span>
              </button>
              <button onClick={() => goTo('inventory')}>
                <strong>{runtimeCoverage.host && runtimeCoverage.container && runtimeCoverage.vm ? '3/3' : `${[runtimeCoverage.host, runtimeCoverage.container, runtimeCoverage.vm].filter(Boolean).length}/3`}</strong>
                <span>host · docker · vm</span>
              </button>
            </section>

            <section className="guided-start" aria-label="Guided start">
              <div>
                <p className="eyebrow">Guided start</p>
                <h3>Pick stack, attach observe-first, then drive when granted.</h3>
                <p className="hint">Executor: {st.executor || 'unknown'} · UI actions inject commands into a session; the agent runs them.</p>
              </div>
              <div className="cta-row">
                <button className="cta" onClick={onStartSession}>▸ Start a session</button>
                <button onClick={() => goTo('explore')}>Browse capabilities</button>
                {st.approvals.length > 0 && <button onClick={() => goTo('approvals')}>Review {st.approvals.length} approval(s)</button>}
              </div>
            </section>
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

function runtimeFamily(instance: Instance): string {
  if (instance.runtime_posture.kind === 'host') return 'terminal';
  if (instance.runtime_posture.kind === 'vm' || instance.runtime_posture.kind === 'container' || instance.runtime_posture.kind === 'docker') return 'cube';
  return 'window';
}

function accentFor(value: string): number {
  let sum = 0;
  for (const ch of value) sum += ch.charCodeAt(0);
  return (sum % 4) + 1;
}
