/**
 * AIWG Dashboard root application.
 *
 * Tabs: Missions | Sandbox | Telemetry | Memory
 *
 * The standalone Terminal tab was retired in favor of the per-instance
 * multi-pane terminal stack inside the Sandbox tab (#1146 phase 3) — one
 * generic terminal pane connected to a single session was redundant once
 * each VM/container/agent could attach its own pane independently.
 */

import { useState } from 'react';
import { MissionControl } from '../features/missions/MissionControl.js';
import { TelemetryDashboard } from '../features/telemetry/TelemetryDashboard.js';
import { MemoryPanel } from '../features/memory/MemoryPanel.js';
import { HitlDrawer } from '../features/hitl/HitlDrawer.js';
import { SandboxPanel } from '../features/sandbox/SandboxPanel.js';
import { Onboarding, isFirstVisit } from '../features/onboarding/Onboarding.js';
import styles from './App.module.css';

type Tab = 'missions' | 'sandbox' | 'telemetry' | 'memory';

export function App() {
  const [tab, setTab] = useState<Tab>('missions');
  const [showOnboarding, setShowOnboarding] = useState(isFirstVisit);

  return (
    <div className={styles.app}>
      {showOnboarding && (
        <Onboarding onComplete={() => setShowOnboarding(false)} />
      )}
      <header className={styles.header} role="banner">
        <h1 className={styles.title}>
          <span aria-hidden="true">⚙</span> AIWG Dashboard
        </h1>
        <nav className={styles.nav} aria-label="Dashboard tabs">
          {(['missions', 'sandbox', 'telemetry', 'memory'] as const).map((t) => (
            <button
              key={t}
              type="button"
              className={tab === t ? styles.active : ''}
              onClick={() => setTab(t)}
              aria-current={tab === t ? 'page' : undefined}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </nav>
        <div className={styles.headerRight}>
          <button
            type="button"
            className={styles.newTaskBtn}
            onClick={() => setShowOnboarding(true)}
            aria-label="Launch a new task"
          >
            + New task
          </button>
        </div>
      </header>

      <main className={styles.main} role="main">
        {tab === 'missions' && <MissionControl />}
        {tab === 'telemetry' && <TelemetryDashboard sessionId="default" />}
        {tab === 'sandbox' && <SandboxPanel />}
        {tab === 'memory' && <MemoryPanel />}
      </main>

      {/* HITL drawer — persists across tab navigation (#732) */}
      <HitlDrawer />
    </div>
  );
}
