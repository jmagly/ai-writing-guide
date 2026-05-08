/**
 * Telemetry Dashboard
 *
 * Displays real-time agent metrics aligned with #708 no-time-estimates rule:
 * - Scope units completed (progress bar)
 * - Pass count / estimate
 * - Agent utilization (active / defined)
 * - Token cost by model
 * - Gate pass rate
 *
 * @issue #716
 */

import { useEffect, useState, useCallback } from 'react';
import type { SessionMetrics } from './types.js';
import type { ConnectionsResponse } from '../../lib/api.js';
import styles from './TelemetryDashboard.module.css';

// ─────────────────────────────────────────────
// Types (browser-side, mirrors server schema)
// ─────────────────────────────────────────────

export interface TelemetryEventBrowser {
  id: string;
  sessionId: string;
  missionId?: string;
  timestamp: string;
  type: string;
  payload: Record<string, unknown>;
}

// ─────────────────────────────────────────────
// IndexedDB storage (#717 fortemi stores this,
// but we provide a minimal fallback here)
// ─────────────────────────────────────────────

class EventStore {
  private events: TelemetryEventBrowser[] = [];

  add(event: TelemetryEventBrowser): void {
    this.events.push(event);
    if (this.events.length > 10_000) this.events.shift();
  }

  query(sessionId?: string): TelemetryEventBrowser[] {
    if (!sessionId) return [...this.events];
    return this.events.filter((e) => e.sessionId === sessionId);
  }

  computeMetrics(sessionId?: string): Partial<SessionMetrics> {
    const events = this.query(sessionId);
    let totalInput = 0, totalOutput = 0, iterations = 0;
    let gatePasses = 0, gateFails = 0, scopeDone = 0, scopeTotal = 0, activeAgents = 0;
    const tokensByModel: Record<string, { input: number; output: number }> = {};

    for (const e of events) {
      if (e.type === 'tokens.used') {
        const p = e.payload as { input?: number; output?: number; model?: string };
        totalInput += p.input ?? 0;
        totalOutput += p.output ?? 0;
        if (p.model) {
          const m = tokensByModel[p.model] ?? { input: 0, output: 0 };
          m.input += p.input ?? 0;
          m.output += p.output ?? 0;
          tokensByModel[p.model] = m;
        }
      } else if (e.type === 'iteration.complete') { iterations++; }
      else if (e.type === 'gate.pass') { gatePasses++; }
      else if (e.type === 'gate.fail') { gateFails++; }
      else if (e.type === 'scope.unit.complete') {
        const p = e.payload as { done?: number; total?: number };
        scopeDone = p.done ?? scopeDone;
        scopeTotal = p.total ?? scopeTotal;
      } else if (e.type === 'agent.spawn') { activeAgents++; }
      else if (e.type === 'agent.complete') { activeAgents = Math.max(0, activeAgents - 1); }
    }

    return {
      sessionId: sessionId ?? 'all',
      totalInputTokens: totalInput,
      totalOutputTokens: totalOutput,
      tokensByModel,
      iterations,
      gatePasses,
      gateFails,
      passRate: gatePasses + gateFails > 0
        ? Math.round(gatePasses / (gatePasses + gateFails) * 100) : null,
      scopeDone,
      scopeTotal,
      activeAgents,
    };
  }
}

const localStore = new EventStore();

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

interface Props {
  sessionId?: string;
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function fmtUptime(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

function statusColor(status: string): string {
  if (status === 'active' || status === 'running' || status === 'ok') return styles.statusGreen;
  if (status === 'idle' || status === 'stopped') return styles.statusAmber;
  return styles.statusGray;
}

export function TelemetryDashboard({ sessionId }: Props) {
  const [metrics, setMetrics] = useState<Partial<SessionMetrics>>({});
  const [recentEvents, setRecentEvents] = useState<TelemetryEventBrowser[]>([]);
  const [connections, setConnections] = useState<ConnectionsResponse | null>(null);
  const [eventFilter, setEventFilter] = useState<string>('');

  const refresh = useCallback(() => {
    setMetrics(localStore.computeMetrics(sessionId));
    const events = localStore.query(sessionId);
    setRecentEvents(events.slice(-50).reverse());
  }, [sessionId]);

  // Poll /api/telemetry and store events locally
  useEffect(() => {
    let active = true;

    async function poll() {
      try {
        const res = await fetch('/api/telemetry');
        if (!res.ok) return;
        const data = await res.json() as { events?: TelemetryEventBrowser[] };
        if (!active) return;
        for (const e of data.events ?? []) {
          localStore.add(e);
        }
        refresh();
      } catch {
        // server not ready
      }
    }

    poll();
    const id = setInterval(poll, 2000);
    return () => { active = false; clearInterval(id); };
  }, [sessionId, refresh]);

  // Poll /api/connections every 5 s (#887)
  useEffect(() => {
    let active = true;

    async function pollConnections() {
      try {
        const res = await fetch('/api/connections');
        if (!res.ok) return;
        const data = await res.json() as ConnectionsResponse;
        if (active) setConnections(data);
      } catch {
        // server not ready
      }
    }

    pollConnections();
    const id = setInterval(pollConnections, 5000);
    return () => { active = false; clearInterval(id); };
  }, []);

  const { totalInputTokens = 0, totalOutputTokens = 0, tokensByModel = {},
    iterations = 0, gatePasses = 0, gateFails = 0, passRate,
    scopeDone = 0, scopeTotal = 0, activeAgents = 0 } = metrics;

  const totalTokens = (totalInputTokens) + (totalOutputTokens);

  const filteredEvents = eventFilter
    ? recentEvents.filter((e) => e.type.startsWith(eventFilter))
    : recentEvents;

  return (
    <div className={styles.dashboard} aria-label="Telemetry dashboard">
      <h2 className={styles.heading}>Telemetry</h2>

      {/* Connection status (#887) */}
      {connections && (
        <section className={styles.connectionPanel} aria-label="Connection status">
          <h3>Connection Status</h3>
          <div className={styles.connectionGrid}>
            <div className={styles.connectionItem}>
              <span className={styles.connectionLabel}>Server</span>
              <span className={`${styles.statusBadge} ${statusColor(connections.server.status)}`}>
                {connections.server.status}
              </span>
              <span className={styles.connectionMeta}>up {fmtUptime(connections.server.uptime)}{connections.server.readOnly ? ' · read-only' : ''}</span>
            </div>
            <div className={styles.connectionItem}>
              <span className={styles.connectionLabel}>PTY Sessions</span>
              <span className={`${styles.statusBadge} ${connections.ptySessions.length > 0 ? styles.statusGreen : styles.statusGray}`}>
                {connections.ptySessions.length}
              </span>
              <span className={styles.connectionMeta}>{connections.ptySessions.length === 0 ? 'none active' : connections.ptySessions.join(', ')}</span>
            </div>
            <div className={styles.connectionItem}>
              <span className={styles.connectionLabel}>Sandboxes</span>
              <span className={`${styles.statusBadge} ${connections.sandboxes.length > 0 ? styles.statusGreen : styles.statusGray}`}>
                {connections.sandboxes.length}
              </span>
              <span className={styles.connectionMeta}>
                {(() => {
                  if (connections.sandboxes.length === 0) return 'none registered';
                  // #1157 — show instance breakdown alongside host names so it's
                  // obvious the badge counts hosts, not runtime instances.
                  let agents = 0;
                  let vms = 0;
                  let containers = 0;
                  let anyVmsUnknown = false;
                  let anyContainersUnknown = false;
                  for (const s of connections.sandboxes) {
                    agents += s.agentCount;
                    if (s.vmCount === null) anyVmsUnknown = true;
                    else vms += s.vmCount;
                    if (s.containerCount === null) anyContainersUnknown = true;
                    else containers += s.containerCount;
                  }
                  const fmt = (n: number, unknown: boolean) => (unknown ? `${n}+?` : `${n}`);
                  const hosts = connections.sandboxes.map((s) => `${s.name}${s.connected ? '' : ' (offline)'}`).join(', ');
                  return `${agents} agents · ${fmt(vms, anyVmsUnknown)} VMs · ${fmt(containers, anyContainersUnknown)} containers — ${hosts}`;
                })()}
              </span>
            </div>
            {connections.mcpServers.length > 0 && (
              <div className={styles.connectionItem}>
                <span className={styles.connectionLabel}>MCP Servers</span>
                <span className={`${styles.statusBadge} ${styles.statusGreen}`}>{connections.mcpServers.length}</span>
                <span className={styles.connectionMeta}>{connections.mcpServers.map((m) => m.name).join(', ')}</span>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Subsystem health (#887) */}
      {connections && (
        <section className={styles.subsystemPanel} aria-label="Subsystem health">
          <h3>Subsystems</h3>
          <div className={styles.subsystemGrid}>
            <SubsystemCard
              name="Ralph"
              status={connections.subsystems.ralph.status}
              detail={connections.subsystems.ralph.activeLoops > 0
                ? `${connections.subsystems.ralph.activeLoops} active loop${connections.subsystems.ralph.activeLoops !== 1 ? 's' : ''}`
                : 'no active loops'}
            />
            <SubsystemCard
              name="Missions"
              status={connections.subsystems.missions.status}
              detail={connections.subsystems.missions.count > 0
                ? `${connections.subsystems.missions.count} running`
                : 'none running'}
            />
            <SubsystemCard name="Daemon" status={connections.subsystems.daemon.status} />
            <SubsystemCard name="RLM" status={connections.subsystems.rlm.status} />
            <SubsystemCard name="Memory" status={connections.subsystems.memory.status} />
          </div>
        </section>
      )}

      {/* KPI cards */}
      <section className={styles.kpiGrid} aria-label="Key performance indicators">
        <KpiCard label="Passes" value={String(iterations)} sub="iterations completed" />
        <KpiCard
          label="Gate Pass Rate"
          value={passRate !== null && passRate !== undefined ? `${passRate}%` : '—'}
          sub={`${gatePasses} pass / ${gateFails} fail`}
          highlight={passRate !== null && passRate !== undefined
            ? passRate >= 70 ? 'green' : passRate >= 40 ? 'amber' : 'red'
            : undefined}
        />
        <KpiCard
          label="Scope"
          value={scopeTotal > 0 ? `${scopeDone}/${scopeTotal}` : '—'}
          sub="units completed"
        >
          {scopeTotal > 0 && (
            <div
              className={styles.progressBar}
              role="progressbar"
              aria-valuenow={scopeDone}
              aria-valuemin={0}
              aria-valuemax={scopeTotal}
              aria-label={`Scope progress: ${scopeDone} of ${scopeTotal}`}
            >
              <div className={styles.progressFill}
                style={{ width: `${Math.round(scopeDone / scopeTotal * 100)}%` }} />
            </div>
          )}
        </KpiCard>
        <KpiCard label="Active Agents" value={String(activeAgents)} sub="currently running" />
        <KpiCard
          label="Total Tokens"
          value={totalTokens > 0 ? `${(totalTokens / 1000).toFixed(1)}k` : '—'}
          sub={`${(totalInputTokens / 1000).toFixed(1)}k in / ${(totalOutputTokens / 1000).toFixed(1)}k out`}
        />
      </section>

      {/* Token cost by model */}
      {Object.keys(tokensByModel).length > 0 && (
        <section className={styles.modelBreakdown} aria-label="Token cost by model">
          <h3>Tokens by Model</h3>
          <table>
            <thead>
              <tr>
                <th scope="col">Model</th>
                <th scope="col" className={styles.right}>Input</th>
                <th scope="col" className={styles.right}>Output</th>
                <th scope="col" className={styles.right}>Total</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(tokensByModel).map(([model, t]) => (
                <tr key={model}>
                  <td><code>{model}</code></td>
                  <td className={styles.right}>{(t.input / 1000).toFixed(1)}k</td>
                  <td className={styles.right}>{(t.output / 1000).toFixed(1)}k</td>
                  <td className={styles.right}>{((t.input + t.output) / 1000).toFixed(1)}k</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Event log with filter (#887) */}
      <section className={styles.eventLog} aria-label="Recent telemetry events">
        <div className={styles.eventLogHeader}>
          <h3>Event Feed</h3>
          <div className={styles.filterButtons} role="group" aria-label="Filter events by type">
            {['', 'tokens', 'gate', 'agent', 'scope', 'iteration', 'mission'].map((prefix) => (
              <button
                key={prefix || 'all'}
                type="button"
                className={`${styles.filterBtn} ${eventFilter === prefix ? styles.filterBtnActive : ''}`}
                onClick={() => setEventFilter(prefix)}
                aria-pressed={eventFilter === prefix}
              >
                {prefix || 'all'}
              </button>
            ))}
          </div>
        </div>
        {filteredEvents.length === 0 ? (
          <p className={styles.empty}>No events yet. Start a session to collect telemetry.</p>
        ) : (
          <ol className={styles.eventList} aria-label="Telemetry event list">
            {filteredEvents.map((e) => (
              <li key={e.id} className={styles.eventRow}>
                <time dateTime={e.timestamp} className={styles.eventTime}>
                  {new Date(e.timestamp).toLocaleTimeString()}
                </time>
                <span className={styles.eventType}>{e.type}</span>
                <span className={styles.eventSession}>{e.sessionId}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

// ─────────────────────────────────────────────
// KPI Card sub-component
// ─────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
  highlight?: 'green' | 'amber' | 'red';
  children?: React.ReactNode;
}

// ─────────────────────────────────────────────
// Subsystem Card sub-component
// ─────────────────────────────────────────────

interface SubsystemCardProps {
  name: string;
  status: string;
  detail?: string;
}

function SubsystemCard({ name, status, detail }: SubsystemCardProps) {
  return (
    <article className={styles.subsystemCard} aria-label={`${name}: ${status}`}>
      <p className={styles.subsystemName}>{name}</p>
      <span className={`${styles.statusBadge} ${statusColor(status)}`}>{status}</span>
      {detail && <p className={styles.subsystemDetail}>{detail}</p>}
    </article>
  );
}

// ─────────────────────────────────────────────
// KPI Card sub-component
// ─────────────────────────────────────────────

function KpiCard({ label, value, sub, highlight, children }: KpiCardProps) {
  const valueClass = highlight
    ? `${styles.kpiValue} ${styles[`kpi${highlight.charAt(0).toUpperCase()}${highlight.slice(1)}`]}`
    : styles.kpiValue;

  return (
    <article className={styles.kpiCard} aria-label={`${label}: ${value}`}>
      <p className={styles.kpiLabel}>{label}</p>
      <p className={valueClass}>{value}</p>
      {sub && <p className={styles.kpiSub}>{sub}</p>}
      {children}
    </article>
  );
}
