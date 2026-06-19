import { useEffect, useState, type ReactNode } from 'react';
import { useSession } from './useSession';
import { api } from './api';
import type { Approval, Instance } from './types';
import { Welcome } from './components/Welcome';
import { Inventory } from './components/Inventory';
import { Running } from './components/Running';
import { Sessions } from './components/Sessions';
import { Approvals } from './components/Approvals';
import { Explore } from './components/Explore';
import { Library } from './components/Library';
import { Actions } from './components/Actions';
import { StartSessionModal } from './components/StartSessionModal';

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
  approvals: number;
  host: boolean;
  container: boolean;
  vm: boolean;
}

export function App() {
  const [tab, setTab] = useState<TabId>('welcome');
  const session = useSession();
  const [composer, setComposer] = useState('');
  const [chrome, setChrome] = useState<ChromeStatus | null>(null);
  const [startOpen, setStartOpen] = useState(false);
  const [startInst, setStartInst] = useState<string | undefined>(undefined);

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
          approvals: apr.approvals.length,
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
  }, []);

  // The onboarding primary verb: open the start-session picker (#1640/#1641). The picker
  // is the single home for both this dashboard verb and the Sessions-tab Start button —
  // neither launches blind with defaults, neither silently clobbers an attached session,
  // and failures render inline in the picker instead of an alert().
  const requestStart = (instanceId?: string) => { setStartInst(instanceId); setStartOpen(true); };
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
              <span>{chrome.approvals} approvals</span>
              <span className="matrix-mini" title="Runtime target coverage">host {chrome.host ? '✓' : '-'} · docker {chrome.container ? '✓' : '-'} · vm {chrome.vm ? '✓' : '-'}</span>
            </>
          )}
        </div>
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
        <Panel id="welcome" tab={tab}><Welcome onStartSession={() => requestStart()} goTo={(t) => setTab(t as TabId)} /></Panel>
        <Panel id="inventory" tab={tab}><Inventory /></Panel>
        <Panel id="running" tab={tab}><Running /></Panel>
        {/* Sessions stays mounted so the WebSocket survives tab switches */}
        <section id="panel-sessions" role="tabpanel" aria-labelledby="tab-sessions" hidden={tab !== 'sessions'}>
          <Sessions session={session} composer={composer} setComposer={setComposer} onRequestStart={requestStart} />
        </section>
        <Panel id="approvals" tab={tab}><Approvals /></Panel>
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
    </>
  );
}

function Panel({ id, tab, children }: { id: string; tab: string; children: ReactNode }) {
  return (
    <section id={`panel-${id}`} role="tabpanel" aria-labelledby={`tab-${id}`} hidden={tab !== id}>
      {tab === id ? children : null}
    </section>
  );
}
