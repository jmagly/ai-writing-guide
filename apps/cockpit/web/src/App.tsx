import { useEffect, useState, type ReactNode } from 'react';
import { useSession } from './useSession';
import { api } from './api';
import type { Approval, Instance, ResponseNeeded } from './types';
import { Welcome } from './components/Welcome';
import { Inventory } from './components/Inventory';
import { Running } from './components/Running';
import { Sessions } from './components/Sessions';
import { Approvals } from './components/Approvals';
import { Explore } from './components/Explore';
import { Library } from './components/Library';
import { Actions } from './components/Actions';
import { StartSessionModal } from './components/StartSessionModal';
import { LaunchInstanceModal } from './components/LaunchInstanceModal';

const TABS = [
  { id: 'welcome', label: 'Home' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'running', label: 'Running' },
  { id: 'sessions', label: 'Sessions' },
  { id: 'approvals', label: 'Approvals' },
  { id: 'explore', label: 'Explore' },
  { id: 'library', label: 'Library' },
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
  const [tab, setTab] = useState<TabId>('welcome');
  const session = useSession();
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
        setChrome({
          executor: health.executor_url,
          instances: inv.instances.length,
          running: run.count,
          responses: apr.approvals.length + (session.responseNeeded.needed ? 1 : 0),
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
  }, [session.responseNeeded.needed, refreshTick]);

  // The onboarding primary verb: open the start-session picker (#1640/#1641). The picker
  // is the single home for both this dashboard verb and the Sessions-tab Start button —
  // neither launches blind with defaults, neither silently clobbers an attached session,
  // and failures render inline in the picker instead of an alert().
  const requestStart = (instanceId?: string) => { setStartInst(instanceId); setStartOpen(true); };
  const handleLaunched = async (instanceId?: string, openSession?: boolean, operationId?: string) => {
    setRefreshTick((t) => t + 1);
    if (openSession) {
      const inst = await waitForSessionReady(instanceId, operationId);
      const backend = inst.session_backends.find((b) => b.available !== false && b.drive !== false)
        ?? inst.session_backends.find((b) => b.available !== false)
        ?? inst.session_backends[0];
      if (!backend || backend.available === false) throw new Error(backend?.reason ?? 'No available session backend for the new instance.');
      const qs = new URLSearchParams({ mode: backend.mode, backend: backend.backend });
      const s = await api<{ id: string; attach_url: string }>(
        `/api/instances/${encodeURIComponent(inst.id)}/sessions?${qs}`, { method: 'POST' },
      );
      session.attach(s.attach_url, false, backend.drive === false ? 'observer' : 'controller');
      setTab('sessions');
    } else {
      setTab('inventory');
    }
    setRefreshTick((t) => t + 1);
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
        <Panel id="inventory" tab={tab}><Inventory onStartSession={requestStart} onLaunchInstance={() => setLaunchOpen(true)} /></Panel>
        <Panel id="running" tab={tab}><Running /></Panel>
        {/* Sessions stays mounted so the WebSocket survives tab switches */}
        <section id="panel-sessions" role="tabpanel" aria-labelledby="tab-sessions" hidden={tab !== 'sessions'}>
          <Sessions session={session} composer={composer} setComposer={setComposer} onRequestStart={requestStart} />
        </section>
        <Panel id="approvals" tab={tab}><Approvals responses={session.responseNeeded.needed ? [sessionResponse(session)] : []} goSessions={() => setTab('sessions')} /></Panel>
        <Panel id="explore" tab={tab}><Explore /></Panel>
        <Panel id="library" tab={tab}>
          <Library session={session} setComposer={setComposer} goSessions={() => setTab('sessions')} />
        </Panel>
        <Panel id="actions" tab={tab}>
          <Actions session={session} setComposer={setComposer} goSessions={() => setTab('sessions')} />
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

async function waitForSessionReady(instanceId?: string, operationId?: string) {
  let last = '';
  let operationDetail = '';
  for (let i = 0; i < 45; i += 1) {
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
    const candidates = inv.instances.filter((inst) => String(inst.state).toLowerCase() === 'running');
    const selected = instanceId
      ? candidates.find((inst) => inst.id === instanceId)
      : candidates[0];
    if (selected) {
      const backend = selected.session_backends.find((b) => b.available !== false) ?? selected.session_backends[0];
      if (backend && backend.available !== false) return selected;
      last = backend?.reason ?? `instance ${selected.id} has no available backend yet`;
    } else {
      last = [
        operationDetail,
        instanceId ? `instance ${instanceId} not visible in inventory yet` : 'no running instance visible in inventory yet',
      ].filter(Boolean).join('; ');
    }
    await sleep(1_000);
  }
  throw new Error(`Instance launched, but no session-ready agent appeared within 45s (${last}).`);
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
