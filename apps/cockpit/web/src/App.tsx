import { useState, type ReactNode } from 'react';
import { useSession } from './useSession';
import { api } from './api';
import type { Instance } from './types';
import { Welcome } from './components/Welcome';
import { Inventory } from './components/Inventory';
import { Running } from './components/Running';
import { Sessions } from './components/Sessions';
import { Approvals } from './components/Approvals';
import { Explore } from './components/Explore';
import { Actions } from './components/Actions';

const TABS = [
  { id: 'welcome', label: 'Home' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'running', label: 'Running' },
  { id: 'sessions', label: 'Sessions' },
  { id: 'approvals', label: 'Approvals' },
  { id: 'explore', label: 'Explore' },
  { id: 'actions', label: 'Actions' },
] as const;
type TabId = (typeof TABS)[number]['id'];

export function App() {
  const [tab, setTab] = useState<TabId>('welcome');
  const session = useSession();
  const [composer, setComposer] = useState('');

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

  return (
    <>
      <header>
        <span className="mark" aria-hidden="true">◆</span>
        <h1>AIWG&nbsp;Cockpit</h1>
        <button className="meta" onClick={startSession} style={{ marginLeft: 'auto' }}>▸ Start a session</button>
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
