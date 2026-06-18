import { useEffect, useState, type CSSProperties } from 'react';
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

interface OrbitNode {
  key: string;
  label: string;
  meta: string;
  family: 'host' | 'container' | 'vm' | 'mission' | 'approval' | 'cost' | 'capability' | 'library' | 'action' | 'session' | 'inventory';
  tab: string;
  state: 'running' | 'ready' | 'attention' | 'blocked' | 'idle';
  x: number;
  y: number;
}

type OrbitStyle = CSSProperties & { '--x': string; '--y': string };

const ORBIT_POSITIONS = [
  [50, 8], [73, 15], [89, 34], [86, 60], [68, 78], [50, 88],
  [31, 78], [14, 60], [11, 34], [27, 15], [50, 28],
] as const;

export function Welcome({ onStartSession, goTo }: { onStartSession: () => void; goTo: (t: string) => void }) {
  const [st, setSt] = useState<Status | null>(null);
  const [firstRun] = useState(() => !localStorage.getItem('cockpit.welcomed'));
  const [selectedStackId, setSelectedStackId] = useState('');
  const [selectedRuntime, setSelectedRuntime] = useState('auto');
  const [selectedTask, setSelectedTask] = useState('observe');

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
  const orbitNodes = buildOrbitNodes(st);
  const attentionCount = (st?.approvals.length ?? 0) + (runtimeCoverage.host && runtimeCoverage.container && runtimeCoverage.vm ? 0 : 1);
  const selectedStack = runningInstances.find((i) => i.id === selectedStackId) ?? runningInstances[0] ?? st?.instances[0];
  const selectedStackCost = selectedStack ? st?.cost?.per_instance.find((c) => c.instance_id === selectedStack.id) : undefined;
  const totalCost = st?.cost?.total.usd ?? 0;
  const quotaUsed = st?.cost ? Math.min(100, Math.max(6, totalCost * 12)) : 0;
  const startPlan = [
    selectedStack ? selectedStack.loadout : 'no stack',
    selectedRuntime === 'auto' ? 'auto runtime' : selectedRuntime,
    selectedTask,
  ].join(' / ');

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
            <section className="radial-wall" aria-labelledby="operator-wall-map-title">
              <div className="radial-map" aria-label="Operator wall topology">
                <svg className="radial-links" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
                  <circle className="link-ring" cx="50" cy="50" r="37" />
                  {orbitNodes.map((node) => (
                    <line key={node.key} className={`link-line link-${node.state}`} x1="50" y1="50" x2={node.x} y2={node.y} />
                  ))}
                  <path className="handoff-arc" d="M 18 58 C 32 18, 70 16, 86 43" />
                </svg>
                <button className="central-hub" onClick={onStartSession} aria-label="Start from Cockpit command hub">
                  <span className="hub-core" aria-hidden="true" />
                  <strong>Cockpit</strong>
                  <span>{runningInstances.length} running · {st.approvals.length} approvals</span>
                </button>
                {orbitNodes.map((node, index) => (
                  <button
                    key={node.key}
                    className={`orbit-node node-${node.family} node-${node.state}`}
                    style={orbitStyle(node)}
                    onClick={() => goTo(node.tab)}
                    aria-label={`${node.label}: ${node.meta}`}
                  >
                    <span className={`node-glyph glyph-${node.family}`} aria-hidden="true" />
                    <span className="node-copy">
                      <strong>{node.label}</strong>
                      <span>{node.meta}</span>
                    </span>
                    {index === 3 && <span className="handoff-marker" aria-hidden="true" />}
                  </button>
                ))}
              </div>
              <aside className="radial-detail" aria-labelledby="operator-wall-map-title">
                <p className="eyebrow">Live topology</p>
                <h3 id="operator-wall-map-title">Eleven-stack operator wall</h3>
                <div className="mission-route" aria-label="Mission handoff state">
                  <span>Mission</span>
                  <strong>{st.running[0] ? fmtId(st.running[0].task_id) : 'ready'}</strong>
                  <span className={attentionCount > 0 ? 'route-attention' : 'route-ready'}>
                    {attentionCount > 0 ? `${attentionCount} gate(s)` : 'clear'}
                  </span>
                </div>
                <dl className="wall-readout">
                  <div><dt>Coverage</dt><dd>{[runtimeCoverage.host, runtimeCoverage.container, runtimeCoverage.vm].filter(Boolean).length}/3</dd></div>
                  <div><dt>Executor</dt><dd>{st.executor || 'unknown'}</dd></div>
                  <div><dt>Control</dt><dd>{runningInstances.some((i) => i.session_backends.some((b) => b.available && b.drive)) ? 'drive available' : 'observe first'}</dd></div>
                  <div><dt>Quota</dt><dd>{st.cost ? `$${st.cost.total.usd.toFixed(2)}` : 'n/a'}</dd></div>
                </dl>
                <div className="cta-row">
                  <button className="cta" onClick={onStartSession}>▸ Start a session</button>
                  <button onClick={() => goTo('running')}>View board</button>
                </div>
              </aside>
            </section>

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

            <section className="control-planner" aria-label="Guided start and cost quota">
              <div className="guided-start" aria-label="Guided start">
                <div>
                  <p className="eyebrow">Guided start</p>
                  <h3>Pick stack, runtime, and task posture.</h3>
                  <p className="hint">Plan: {startPlan}</p>
                </div>
                <div className="planner-grid">
                  <label>
                    <span>Stack</span>
                    <select value={selectedStack?.id ?? ''} onChange={(event) => setSelectedStackId(event.target.value)}>
                      {runningInstances.map((i) => <option key={i.id} value={i.id}>{i.loadout} · {i.runtime_posture.kind}</option>)}
                    </select>
                  </label>
                  <label>
                    <span>Runtime</span>
                    <select value={selectedRuntime} onChange={(event) => setSelectedRuntime(event.target.value)}>
                      <option value="auto">Auto from selected stack</option>
                      <option value="host">Host</option>
                      <option value="container">Docker/container</option>
                      <option value="vm">VM</option>
                    </select>
                  </label>
                  <label>
                    <span>Task</span>
                    <select value={selectedTask} onChange={(event) => setSelectedTask(event.target.value)}>
                      <option value="observe">Observe first</option>
                      <option value="drive">Drive when granted</option>
                      <option value="handoff">Mission handoff</option>
                    </select>
                  </label>
                </div>
                <div className="cta-row">
                  <button className="cta" onClick={onStartSession}>▸ Start planned session</button>
                  <button onClick={() => goTo('explore')}>Browse capabilities</button>
                  {st.approvals.length > 0 && <button onClick={() => goTo('approvals')}>Review {st.approvals.length} approval(s)</button>}
                </div>
              </div>

              <aside className="quota-panel" aria-label="Cost and quota">
                <p className="eyebrow">Cost & quota</p>
                <div className="quota-donut" style={{ '--quota': `${quotaUsed}%` } as CSSProperties}>
                  <strong>{st.cost ? `$${totalCost.toFixed(2)}` : '--'}</strong>
                  <span>{st.cost ? `${st.cost.total.input_tokens + st.cost.total.output_tokens} tokens` : 'metrics unavailable'}</span>
                </div>
                <dl className="quota-readout">
                  <div><dt>Selected stack</dt><dd>{selectedStackCost ? `$${selectedStackCost.usd.toFixed(2)}` : 'n/a'}</dd></div>
                  <div><dt>Headroom</dt><dd>{st.cost ? (quotaUsed > 80 ? 'near limit' : 'clear') : 'unknown'}</dd></div>
                  <div><dt>Approval load</dt><dd>{st.approvals.length} pending</dd></div>
                </dl>
              </aside>
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

function orbitStyle(node: OrbitNode): OrbitStyle {
  return { '--x': `${node.x}%`, '--y': `${node.y}%` };
}

function buildOrbitNodes(st: Status | null): OrbitNode[] {
  const running = st?.instances.filter((i) => i.state === 'running') ?? [];
  const host = st?.instances.find((i) => i.runtime_posture.kind === 'host');
  const container = st?.instances.find((i) => i.runtime_posture.kind === 'container' || i.runtime_posture.kind === 'docker');
  const vm = st?.instances.find((i) => i.runtime_posture.kind === 'vm');
  const drive = st?.instances.some((i) => i.session_backends.some((b) => b.available && b.drive)) ?? false;
  const approvals = st?.approvals.length ?? 0;
  const cost = st?.cost?.total.usd;
  const base: Omit<OrbitNode, 'x' | 'y'>[] = [
    {
      key: 'host',
      label: host?.loadout || 'Host CLI',
      meta: host ? `${fmtId(host.id)} · ${host.state}` : 'not connected',
      family: 'host',
      tab: 'inventory',
      state: host ? 'running' : 'blocked',
    },
    {
      key: 'vm',
      label: vm?.loadout || 'VM sandbox',
      meta: vm ? `${fmtId(vm.id)} · ${vm.state}` : 'not connected',
      family: 'vm',
      tab: 'inventory',
      state: vm ? 'running' : 'blocked',
    },
    {
      key: 'container',
      label: container?.loadout || 'Docker runtime',
      meta: container ? `${fmtId(container.id)} · ${container.state}` : 'not connected',
      family: 'container',
      tab: 'inventory',
      state: container ? 'running' : 'blocked',
    },
    {
      key: 'mission',
      label: 'Mission handoff',
      meta: st?.running[0] ? `${fmtId(st.running[0].task_id)} · ${st.running[0].state}` : 'ready',
      family: 'mission',
      tab: 'running',
      state: st?.running.length ? 'running' : 'ready',
    },
    {
      key: 'approvals',
      label: 'Approvals',
      meta: approvals ? `${approvals} pending` : 'clear',
      family: 'approval',
      tab: 'approvals',
      state: approvals ? 'attention' : 'ready',
    },
    {
      key: 'cost',
      label: 'Cost & quota',
      meta: cost === undefined ? 'metrics n/a' : `$${cost.toFixed(2)}`,
      family: 'cost',
      tab: 'running',
      state: cost === undefined ? 'idle' : 'ready',
    },
    {
      key: 'capabilities',
      label: 'Capability search',
      meta: 'catalog ready',
      family: 'capability',
      tab: 'explore',
      state: 'ready',
    },
    {
      key: 'library',
      label: 'Library',
      meta: 'workspace assets',
      family: 'library',
      tab: 'library',
      state: 'ready',
    },
    {
      key: 'actions',
      label: 'Actions',
      meta: drive ? 'drive available' : 'observe first',
      family: 'action',
      tab: 'actions',
      state: drive ? 'ready' : 'idle',
    },
    {
      key: 'sessions',
      label: 'Sessions',
      meta: running.length ? `${running.length} attachable` : 'none active',
      family: 'session',
      tab: 'sessions',
      state: running.length ? 'running' : 'idle',
    },
    {
      key: 'inventory',
      label: 'Inventory',
      meta: `${st?.instances.length ?? 0} registered`,
      family: 'inventory',
      tab: 'inventory',
      state: st?.instances.length ? 'ready' : 'idle',
    },
  ];
  return base.map((node, index) => ({ ...node, x: ORBIT_POSITIONS[index][0], y: ORBIT_POSITIONS[index][1] }));
}
