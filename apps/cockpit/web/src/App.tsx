import { useEffect, useState, type ReactNode } from 'react';
import { useSession } from './useSession';
import { api, TOKEN } from './api';
import type { Approval, Instance, ResponseNeeded } from './types';
import { Welcome } from './components/Welcome';
import { Inventory } from './components/Inventory';
import { Running } from './components/Running';
import { Missions } from './components/Missions';
import { Sessions } from './components/Sessions';
import { Approvals } from './components/Approvals';
import { Explore } from './components/Explore';
import { Library } from './components/Library';
import { Actions } from './components/Actions';
import { Telemetry } from './components/Telemetry';
import { Memory } from './components/Memory';
import { StartSessionModal } from './components/StartSessionModal';
import { LaunchInstanceModal } from './components/LaunchInstanceModal';
import { registryResponseNeededItems, useSessionRegistry } from './sessionRegistry';

const TABS = [
  { id: 'welcome', label: 'Home' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'running', label: 'Running' },
  { id: 'missions', label: 'Missions' },
  { id: 'sessions', label: 'Sessions' },
  { id: 'approvals', label: 'Approvals' },
  { id: 'explore', label: 'Explore' },
  { id: 'library', label: 'Library' },
  { id: 'telemetry', label: 'Telemetry' },
  { id: 'memory', label: 'Memory' },
  { id: 'actions', label: 'Actions' },
] as const;
type TabId = (typeof TABS)[number]['id'];
interface ChromeStatus {
  executor: string;
  instances: number;
  running: number;
  responses: number;
  host: boolean;
  container: boolean;
  vm: boolean;
}

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

export function App() {
  const [tab, setTab] = useState<TabId>(() => {
    const hash = window.location.hash.replace(/^#/, '');
    return TABS.some((t) => t.id === hash) ? hash as TabId : 'welcome';
  });
  const session = useSession();
  const sessionRegistry = useSessionRegistry();
  const registryResponses = registryResponseNeededItems(sessionRegistry).filter((response) => response.id !== `pty:${sessionRegistry.activeKey}`);
  const [composer, setComposer] = useState('');
  const [chrome, setChrome] = useState<ChromeStatus | null>(null);
  const [startOpen, setStartOpen] = useState(false);
  const [startInst, setStartInst] = useState<string | undefined>(undefined);
  const [launchOpen, setLaunchOpen] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        // Health + inventory decide "Bridge live". Running + approvals are
        // enrichment that a real executor may not expose (#1638) — degrade each
        // independently so the header stays live instead of "Bridge checking".
        const [health, inv] = await Promise.all([
          api<{ executor_url: string }>('/api/health'),
          api<{ instances: Instance[] }>('/api/inventory'),
        ]);
        if (cancelled) return;
        const [run, apr] = await Promise.all([
          api<{ count: number }>('/api/running').catch(() => ({ count: 0 })),
          api<{ approvals: Approval[] }>('/api/approvals?status=pending').catch(() => ({ approvals: [] as Approval[] })),
        ]);
        if (cancelled) return;
        const kinds = inv.instances.map((i) => i.runtime_posture.kind);
        const attachedResponseCount = session.responseNeeded.needed ? 1 : 0;
        setChrome({
          executor: health.executor_url,
          instances: inv.instances.length,
          running: run.count,
          responses: apr.approvals.length + registryResponses.length + attachedResponseCount,
          host: kinds.includes('host'),
          container: kinds.includes('container') || kinds.includes('docker'),
          vm: kinds.includes('vm'),
        });
      } catch {
        if (!cancelled) setChrome(null);
      }
    };
    load();
    const timer = window.setInterval(load, 15_000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [session.responseNeeded.needed, refreshTick, registryResponses.length]);

  useEffect(() => {
    if (typeof EventSource === 'undefined' || !TOKEN) return;
    const events = new EventSource(`/api/events?token=${encodeURIComponent(TOKEN)}`);
    events.addEventListener('cockpit.refresh', () => setRefreshTick((t) => t + 1));
    events.onerror = () => undefined;
    return () => events.close();
  }, []);

  useEffect(() => {
    const onHash = () => {
      const hash = window.location.hash.replace(/^#/, '');
      if (TABS.some((t) => t.id === hash)) setTab(hash as TabId);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // The onboarding primary verb: open the start-session picker (#1640/#1641). The picker
  // is the single home for both this dashboard verb and the Sessions-tab Start button —
  // neither launches blind with defaults, neither silently clobbers an attached session,
  // and failures render inline in the picker instead of an alert().
  const requestStart = (instanceId?: string) => { setStartInst(instanceId); setStartOpen(true); };
  const handleLaunched = async (instanceId?: string, openSession?: boolean, operationId?: string) => {
    setRefreshTick((t) => t + 1);
    if (!openSession) {
      setTab('inventory');
      setRefreshTick((t) => t + 1);
      return;
    }
    // Readiness can take minutes for heavy loadouts (e.g. full-suite) or stall if the
    // executor is degraded. Never block the launch modal on it: switch to the Sessions
    // workspace now and run the wait+attach in the background. If it doesn't complete,
    // the instance is still visible under Inventory to start a session from manually.
    setTab('sessions');
    void (async () => {
      try {
        const inst = await waitForSessionReady(instanceId, operationId);
        const backend = inst.session_backends.find((b) => b.available !== false && b.drive !== false)
          ?? inst.session_backends.find((b) => b.available !== false)
          ?? inst.session_backends[0];
        if (!backend || backend.available === false) throw new Error(backend?.reason ?? 'No available session backend for the new instance.');
        const qs = new URLSearchParams({ mode: backend.mode, backend: backend.backend });
        const s = await api<{ id: string; attach_url: string }>(
          `/api/instances/${encodeURIComponent(inst.id)}/sessions?${qs}`, { method: 'POST' },
        );
        session.attach(s.attach_url, false, backend.drive === false ? 'observer' : 'controller', { instanceId: inst.id, sessionId: s.id });
      } catch (e) {
        // Non-blocking: surface via console; the instance remains in Inventory.
        console.warn('auto-session after launch did not complete:', (e as Error).message);
      } finally {
        setRefreshTick((t) => t + 1);
      }
    })();
    return;
  };
  const copyLaunchCommand = async () => {
    await navigator.clipboard?.writeText('aiwg cockpit');
  };

  return (
    <>
      <header>
        <div className="brand-lockup">
          <span className="mark" aria-hidden="true">◆</span>
          <h1>AIWG&nbsp;Cockpit</h1>
        </div>
        <div className="top-status" aria-label="Cockpit status">
          <span className={`health-pill ${chrome ? 'ok' : 'warn'}`}>{chrome ? 'Bridge live' : 'Bridge checking'}</span>
          {chrome && (
            <>
              <span className="executor-pill" title={chrome.executor}>{chrome.executor}</span>
              <span>{chrome.instances} stacks</span>
              <span>{chrome.running} running</span>
              <span>{chrome.responses} responses needed</span>
              <span className="matrix-mini" title="Runtime target coverage">host {chrome.host ? '✓' : '-'} · docker {chrome.container ? '✓' : '-'} · vm {chrome.vm ? '✓' : '-'}</span>
            </>
          )}
        </div>
        <button className="meta" onClick={() => setLaunchOpen(true)}>＋ Launch instance</button>
        <button className="meta" onClick={() => requestStart()}>▸ Start a session</button>
        <button className="meta" onClick={copyLaunchCommand}>Copy CLI</button>
      </header>
      <div role="tablist" aria-label="Cockpit views">
        {TABS.map((t) => (
          <button key={t.id} role="tab" id={`tab-${t.id}`} aria-controls={`panel-${t.id}`}
            aria-selected={tab === t.id} tabIndex={tab === t.id ? 0 : -1} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      <main>
        <Panel id="welcome" tab={tab}><Welcome onStartSession={() => requestStart()} onLaunchInstance={() => setLaunchOpen(true)} goTo={(t) => setTab(t as TabId)} /></Panel>
        <Panel id="inventory" tab={tab}><Inventory onStartSession={requestStart} onLaunchInstance={() => setLaunchOpen(true)} refreshTick={refreshTick} /></Panel>
        <Panel id="running" tab={tab}><Running refreshTick={refreshTick} /></Panel>
        <Panel id="missions" tab={tab}><Missions refreshTick={refreshTick} /></Panel>
        {/* Sessions stays mounted so the WebSocket survives tab switches */}
        <section id="panel-sessions" role="tabpanel" aria-labelledby="tab-sessions" hidden={tab !== 'sessions'}>
          <Sessions session={session} composer={composer} setComposer={setComposer} onRequestStart={requestStart} />
        </section>
        <Panel id="approvals" tab={tab}><Approvals refreshTick={refreshTick} responses={[...registryResponses, ...(session.responseNeeded.needed ? [sessionResponse(session)] : [])]} goSessions={() => setTab('sessions')} /></Panel>
        <Panel id="explore" tab={tab}><Explore /></Panel>
        <Panel id="library" tab={tab}>
          <Library session={session} setComposer={setComposer} goSessions={() => setTab('sessions')} />
        </Panel>
        <Panel id="telemetry" tab={tab}><Telemetry refreshTick={refreshTick} /></Panel>
        <Panel id="memory" tab={tab}><Memory refreshTick={refreshTick} /></Panel>
        <Panel id="actions" tab={tab}>
          <Actions refreshTick={refreshTick} session={session} setComposer={setComposer} goSessions={() => setTab('sessions')} />
        </Panel>
      </main>
      <StartSessionModal
        open={startOpen}
        onClose={() => setStartOpen(false)}
        session={session}
        onStarted={() => setTab('sessions')}
        initialInstanceId={startInst}
      />
      <LaunchInstanceModal
        open={launchOpen}
        onClose={() => setLaunchOpen(false)}
        onLaunched={handleLaunched}
      />
    </>
  );
}

interface OperationStatus {
  id?: string;
  state?: string;
  result?: { instance_id?: string; instanceId?: string; container_id?: string; runtime?: string };
  failure?: { message?: string; detail?: string; code?: string };
  error?: { message?: string; detail?: string; code?: string } | string;
}

// How long the picker waits for a newly-launched instance's agent to register
// before handing the user back to Inventory. Heavy loadouts (e.g. full-suite —
// all 9 providers × 6 frameworks) legitimately take well over a minute to
// install and enroll their agent inside a fresh container/VM, so a short wait
// produced false "no session-ready agent" failures for instances that were in
// fact up and still installing. Overridable via window.AIWG_COCKPIT_SESSION_WAIT_S.
const SESSION_READY_TIMEOUT_S = (() => {
  const raw = Number((window as unknown as { AIWG_COCKPIT_SESSION_WAIT_S?: unknown }).AIWG_COCKPIT_SESSION_WAIT_S);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 150;
})();

export async function waitForSessionReady(instanceId?: string, operationId?: string) {
  let last = '';
  let operationDetail = '';
  for (let i = 0; i < SESSION_READY_TIMEOUT_S; i += 1) {
    if (operationId) {
      const op = await api<OperationStatus>(`/api/operations/${encodeURIComponent(operationId)}`);
      const state = String(op.state ?? '').toLowerCase();
      const opInstance = op.result?.instance_id ?? op.result?.instanceId;
      if (opInstance && !instanceId) instanceId = opInstance;
      if (state === 'failed') throw new Error(operationFailure(op));
      if (state) {
        operationDetail = operationSummary(op);
        last = operationDetail;
      }
    }
    const inv = await api<{ instances: Instance[] }>('/api/inventory');
    // Fast-fail: if the instance is visible but has settled into a terminal,
    // non-running state (e.g. a container whose agent never enrolled → 'stopped'),
    // its session will never come up. Abort instead of blocking the launch modal
    // for the full readiness window. A short grace (>3s) avoids tripping on the
    // transient 'provisioning'/'created' states a healthy instance passes through.
    const TERMINAL = new Set(['stopped', 'failed', 'error', 'terminated', 'destroyed', 'exited', 'dead']);
    const present = instanceId ? inv.instances.find((inst) => inst.id === instanceId) : null;
    if (present && i > 3 && TERMINAL.has(String(present.state).toLowerCase())) {
      throw new Error(
        `Instance ${present.id} did not come online — it settled to '${present.state}' instead of running`
        + (operationDetail ? ` (${operationDetail})` : '')
        + '. Its agent likely failed to register; check the runtime and try again.',
      );
    }
    const candidates = inv.instances.filter((inst) => String(inst.state).toLowerCase() === 'running');
    const selected = instanceId ? candidates.find((inst) => inst.id === instanceId) : null;
    if (selected) {
      const backend = selected.session_backends.find((b) => b.available !== false) ?? selected.session_backends[0];
      if (backend && backend.available !== false) return selected;
      last = backend?.reason ?? `instance ${selected.id} has no available backend yet`;
    } else {
      last = [
        operationDetail,
        instanceId ? `instance ${instanceId} not visible in inventory yet` : 'waiting for launch operation to report instance id',
      ].filter(Boolean).join('; ');
    }
    await sleep(1_000);
  }
  const where = instanceId ? `Instance ${instanceId}` : 'The instance';
  throw new Error(
    `${where} launched and is still installing its loadout — its agent had not registered after ${SESSION_READY_TIMEOUT_S}s `
    + `(${last}). This is not a failure: heavy loadouts (e.g. full-suite) can take longer. `
    + `It will appear under Inventory once its agent enrolls; open a session from there when it shows as running.`,
  );
}

function operationFailure(op: OperationStatus) {
  if (typeof op.error === 'string') return op.error;
  return op.failure?.message ?? op.failure?.detail ?? op.failure?.code
    ?? op.error?.message ?? op.error?.detail ?? op.error?.code
    ?? `operation ${op.id ?? ''} failed`;
}

function operationSummary(op: OperationStatus) {
  const parts = [`operation ${op.id ?? ''} is ${op.state ?? 'unknown'}`];
  if (op.result?.runtime) parts.push(`runtime ${op.result.runtime}`);
  if (op.result?.container_id) parts.push(`container ${op.result.container_id.slice(0, 12)}`);
  if (op.result?.instance_id ?? op.result?.instanceId) parts.push(`instance ${op.result.instance_id ?? op.result.instanceId}`);
  if (String(op.state ?? '').toLowerCase() === 'succeeded' && op.result?.container_id) {
    parts.push('container was created, but no agent registered; see agentic-sandbox #501');
  }
  return parts.join('; ');
}

function sessionResponse(session: ReturnType<typeof useSession>): ResponseNeeded {
  return {
    id: `pty:${session.state.url ?? 'attached'}`,
    instance_id: 'attached session',
    prompt: session.responseNeeded.prompt,
    source: session.responseNeeded.source,
    status: 'response-needed',
    attach_url: session.state.url,
  };
}

function Panel({ id, tab, children }: { id: string; tab: string; children: ReactNode }) {
  return (
    <section id={`panel-${id}`} role="tabpanel" aria-labelledby={`tab-${id}`} hidden={tab !== id}>
      {tab === id ? children : null}
    </section>
  );
}
