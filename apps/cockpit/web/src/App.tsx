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

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [health, inv, run, apr] = await Promise.all([
          api<{ executor_url: string }>('/api/health'),
          api<{ instances: Instance[] }>('/api/inventory'),
          api<{ count: number }>('/api/running'),
          api<{ approvals: Approval[] }>('/api/approvals?status=pending'),
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

  // The onboarding primary verb: create a session on a running instance and drop into it.
  const startSession = async () => {
    try {
      const inv = await api<{ instances: Instance[] }>('/api/inventory');
      const inst = inv.instances.find((i) => i.state === 'running') ?? inv.instances[0];
      if (!inst) { alert('No stack connected — start an executor first.'); return; }
      const s = await api<{ id: string; attach_url: string }>(`/api/instances/${encodeURIComponent(inst.id)}/sessions`, { method: 'POST' });
      session.attach(s.attach_url);
      setTab('sessions');
    } catch (e) { alert((e as Error).message); }
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
              <span>{chrome.approvals} approvals</span>
              <span className="matrix-mini" title="Runtime target coverage">host {chrome.host ? '✓' : '-'} · docker {chrome.container ? '✓' : '-'} · vm {chrome.vm ? '✓' : '-'}</span>
            </>
          )}
        </div>
        <button className="meta" onClick={startSession}>▸ Start a session</button>
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
        <Panel id="welcome" tab={tab}><Welcome onStartSession={startSession} goTo={(t) => setTab(t as TabId)} /></Panel>
        <Panel id="inventory" tab={tab}><Inventory /></Panel>
        <Panel id="running" tab={tab}><Running /></Panel>
        {/* Sessions stays mounted so the WebSocket survives tab switches */}
        <section id="panel-sessions" role="tabpanel" aria-labelledby="tab-sessions" hidden={tab !== 'sessions'}>
          <Sessions session={session} composer={composer} setComposer={setComposer} />
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
