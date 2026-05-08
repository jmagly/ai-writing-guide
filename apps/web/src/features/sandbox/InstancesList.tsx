/**
 * Combined Instances List (#1146)
 *
 * Sidebar component that merges agents + VMs + containers for the selected
 * sandbox into a single list with runtime badges ([VM]/[CT]/[AG]) and per-row
 * lifecycle controls. Replaces the previous sandboxes-only sidebar +
 * standalone SandboxVmsView block.
 *
 * Acceptance refs (from issue #1146):
 *   A. Combined list merging /api/v1/agents + /api/v1/vms + /api/v1/containers
 *   C. Per-instance lifecycle controls — runtime-aware button matrix
 *   E. Empty state, libvirt-degraded fallback (banner + retry)
 *
 * Deferred to a follow-up issue (Phase 3):
 *   B. Click-to-attach multi-pane (still routes through the existing
 *      SessionPicker on the agent card on the right).
 *   D. Container creation in the Create dialog (currently VM-only).
 *   E. Last-selected localStorage persistence.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  api,
  type ContainerInfo,
  type FullSandboxAgent,
  type SandboxAgent,
  type SandboxSummary,
  type VmInfo,
} from '../../lib/api.js';
import styles from './SandboxPanel.module.css';

type InstanceKind = 'vm' | 'container' | 'agent';

interface InstanceRow {
  key: string;
  kind: InstanceKind;
  name: string;
  /** Lower-case state token: running, stopped, ready, busy, paused, crashed, … */
  state: string;
  /** Free-form secondary line — loadout, image, or hostname. */
  secondary?: string;
  /** True when an agent is currently bound to this instance. Drives the
   *  Deploy Agent button visibility for VMs. */
  agentAttached?: boolean;
  vm?: VmInfo;
  container?: ContainerInfo;
  agent?: SandboxAgent;
}

const STATE_DOT: Record<string, string> = {
  running: '#4caf50',
  ready: '#4caf50',
  busy: '#ff9800',
  starting: '#2196f3',
  provisioning: '#2196f3',
  paused: '#ff9800',
  stopped: '#555',
  shutdown: '#555',
  exited: '#555',
  disconnected: '#555',
  crashed: '#f44336',
  dead: '#f44336',
  error: '#f44336',
  unknown: '#777',
};

function dotColor(state: string): string {
  return STATE_DOT[state.toLowerCase()] ?? '#777';
}

/**
 * Container statuses that count as "running" for button-set selection.
 * The sandbox serializes ContainerStatus via Display so we get strings like
 * "running", "stopped", "exited" — see container_runtime.rs.
 */
function isContainerRunning(status: string): boolean {
  return /^(running|restarting)$/i.test(status);
}

function isVmRunning(state: string): boolean {
  return /^(running|paused)$/i.test(state);
}

/**
 * Match a sandbox-side agent record to a VM/container name.
 *
 * agentId is commonly `<vm-name>-<suffix>` (provisioning hash) rather than
 * exactly `<vm-name>`, so the match has to be loose. Mirrors the existing
 * SandboxPanel agent-grid filter so both surfaces agree on which agent
 * belongs to which instance.
 */
function findBoundAgent(agents: SandboxAgent[], instanceName: string): SandboxAgent | undefined {
  return agents.find(
    (a) =>
      a.agentId === instanceName ||
      a.agentId.startsWith(`${instanceName}-`) ||
      a.logicalName === instanceName,
  );
}

/**
 * Same loose match against the REST-polled FullSandboxAgent list. Used as a
 * fallback when the event-driven registry is empty (sandbox not pushing
 * agent.connected events to this AIWG instance).
 */
function findFullAgent(agents: FullSandboxAgent[], instanceName: string): FullSandboxAgent | undefined {
  return agents.find(
    (a) =>
      a.id === instanceName ||
      a.id.startsWith(`${instanceName}-`) ||
      a.hostname === instanceName,
  );
}

/**
 * Project a FullSandboxAgent (REST shape) into a SandboxAgent (registry/event
 * shape) so the rest of the UI can consume it uniformly. We can't recover
 * fields the REST endpoint doesn't carry (loadout, frameworks, metrics
 * history) — leave them undefined; downstream consumers already treat them
 * as optional.
 */
function syntheticAgent(full: FullSandboxAgent): SandboxAgent {
  // FullSandboxAgent.status is a string; SandboxAgent.status is a literal
  // union. Coerce only the values we know about; fall back to 'ready' so the
  // Pane button lights up rather than staying disabled on an unknown status.
  const KNOWN_STATUSES = ['starting', 'provisioning', 'ready', 'busy', 'error', 'disconnected'] as const;
  const status = (KNOWN_STATUSES as readonly string[]).includes(full.status)
    ? (full.status as SandboxAgent['status'])
    : 'ready';
  return {
    agentId: full.id,
    status,
    logicalName: full.hostname,
  };
}

export interface InstancesListProps {
  sandboxes: SandboxSummary[];
  selectedSandboxId: string | null;
  /** Currently focused instance name (drives the agent-grid VM filter on the
   *  right). Null = "all instances". */
  selectedInstance: string | null;
  onSelectSandbox: (id: string) => void;
  onSelectInstance: (name: string | null) => void;
  onForgetSandbox: (id: string) => void;
  onClearOffline: () => void;
  clearing: boolean;
  /** Existing agent-side lifecycle action (Stop / Start / Reprovision /
   *  Destroy). */
  onAgentAction: (
    sandboxId: string,
    agentId: string,
    action: 'start' | 'stop' | 'destroy' | 'reprovision',
  ) => void;
  actionInProgress: string | null;
  /** Fired after a VM/container action so the parent can refresh state. */
  onLifecycleChanged?: () => void;
  /** Fired when the operator clicks "Provision VM" in the empty/header
   *  area — opens the existing modal in SandboxPanel. */
  onRequestProvision: () => void;
  /** Fired when a row that has a bound agent is selected — opens (or
   *  focuses) a multi-pane terminal pane for that instance (#1146 phase 3,
   *  section B). Rows without a bound agent skip this callback. */
  onOpenPane?: (info: {
    sandboxId: string;
    agentId: string;
    label: string;
    kind: 'vm' | 'container' | 'agent';
  }) => void;
}

export function InstancesList({
  sandboxes,
  selectedSandboxId,
  selectedInstance,
  onSelectSandbox,
  onSelectInstance,
  onForgetSandbox,
  onClearOffline,
  clearing,
  onAgentAction,
  actionInProgress,
  onLifecycleChanged,
  onRequestProvision,
  onOpenPane,
}: InstancesListProps) {
  const [vms, setVms] = useState<VmInfo[]>([]);
  const [containers, setContainers] = useState<ContainerInfo[]>([]);
  // REST-backed agent fallback (#1151 follow-up). When the event-driven
  // sandbox-registry agent push isn't reaching this AIWG instance, the
  // selectedSandbox.agents list is empty and every Pane button stays
  // disabled even though the sandbox itself reports the agent as
  // connected. Polling /api/sandboxes/:id/agents/full directly gives us
  // an authoritative agent inventory regardless of the event push state.
  const [agentsFull, setAgentsFull] = useState<FullSandboxAgent[]>([]);
  const [vmsDegraded, setVmsDegraded] = useState(false);
  const [containersDegraded, setContainersDegraded] = useState(false);
  const [busyInstance, setBusyInstance] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedSandbox = sandboxes.find((s) => s.id === selectedSandboxId);

  // Poll VMs + containers every 10s — independent backends, separate
  // degraded-state tracking so a libvirt hang doesn't take down the whole
  // list (issue #1146 acceptance + sandbox#187 graceful-degradation).
  const pollVms = useCallback(async () => {
    if (!selectedSandboxId || !selectedSandbox?.connected) return;
    try {
      const data = await api.sandboxVms(selectedSandboxId);
      setVms(data.vms ?? []);
      setVmsDegraded(false);
    } catch {
      setVmsDegraded(true);
    }
  }, [selectedSandboxId, selectedSandbox?.connected]);

  const pollContainers = useCallback(async () => {
    if (!selectedSandboxId || !selectedSandbox?.connected) return;
    try {
      const data = await api.sandboxContainers(selectedSandboxId);
      setContainers(data.containers ?? []);
      setContainersDegraded(false);
    } catch {
      setContainersDegraded(true);
    }
  }, [selectedSandboxId, selectedSandbox?.connected]);

  const pollAgentsFull = useCallback(async () => {
    if (!selectedSandboxId || !selectedSandbox?.connected) return;
    try {
      const data = await api.sandboxAgentsFull(selectedSandboxId);
      setAgentsFull(data.agents ?? []);
    } catch {
      // Best effort — leave the previous list in place. We still try the
      // event-driven registry view as the primary source.
    }
  }, [selectedSandboxId, selectedSandbox?.connected]);

  useEffect(() => {
    if (!selectedSandboxId) {
      setVms([]);
      setContainers([]);
      setAgentsFull([]);
      return;
    }
    pollVms();
    pollContainers();
    pollAgentsFull();
    const id = setInterval(() => {
      pollVms();
      pollContainers();
      pollAgentsFull();
    }, 10000);
    return () => clearInterval(id);
  }, [selectedSandboxId, pollVms, pollContainers, pollAgentsFull]);

  // Build the merged row list. Agents that are bound to a known VM/container
  // are folded into that row's secondary metadata to avoid duplicates; orphan
  // agents (no matching VM/container — e.g. external hosts) get their own row.
  //
  // Bound-agent lookup tries the event-driven registry first, then falls back
  // to the REST-polled `agentsFull` list. The fallback is what makes the Pane
  // button light up on a fresh `aiwg serve` whose sandbox isn't pushing
  // agent.connected events to it (the on-screen "No agents connected"
  // condition the operator hit).
  const findBoundForName = (instanceName: string): SandboxAgent | undefined => {
    const fromRegistry = selectedSandbox
      ? findBoundAgent(selectedSandbox.agents, instanceName)
      : undefined;
    if (fromRegistry) return fromRegistry;
    const fromFull = findFullAgent(agentsFull, instanceName);
    return fromFull ? syntheticAgent(fromFull) : undefined;
  };

  const rows: InstanceRow[] = (() => {
    if (!selectedSandbox) return [];
    const out: InstanceRow[] = [];
    const claimed = new Set<string>();

    for (const vm of vms) {
      const boundAgent = findBoundForName(vm.name);
      if (boundAgent) claimed.add(boundAgent.agentId);
      out.push({
        key: `vm:${vm.name}`,
        kind: 'vm',
        name: vm.name,
        state: vm.state,
        secondary: boundAgent?.loadout,
        agentAttached: Boolean(boundAgent),
        vm,
        agent: boundAgent,
      });
    }

    for (const ct of containers) {
      const boundAgent = findBoundForName(ct.name);
      if (boundAgent) claimed.add(boundAgent.agentId);
      out.push({
        key: `ct:${ct.name}`,
        kind: 'container',
        name: ct.name,
        state: ct.status,
        secondary: boundAgent?.loadout,
        agentAttached: Boolean(boundAgent),
        container: ct,
        agent: boundAgent,
      });
    }

    for (const a of selectedSandbox.agents) {
      if (claimed.has(a.agentId)) continue;
      out.push({
        key: `ag:${a.agentId}`,
        kind: 'agent',
        name: a.logicalName ?? a.agentId,
        state: a.status,
        secondary: a.loadout,
        agentAttached: true,
        agent: a,
      });
    }

    // Surface REST-only agents (event push isn't reaching us, but the agent is
    // alive on the sandbox) as orphan rows so the operator can attach to them
    // even without a matching VM/container. Avoid double-listing the ones
    // already claimed by VM/container rows above.
    for (const fa of agentsFull) {
      const claimedAlready =
        claimed.has(fa.id) ||
        (selectedSandbox &&
          selectedSandbox.agents.some((a) => a.agentId === fa.id));
      if (claimedAlready) continue;
      const synth = syntheticAgent(fa);
      out.push({
        key: `ag:${fa.id}`,
        kind: 'agent',
        name: synth.logicalName ?? synth.agentId,
        state: synth.status,
        agentAttached: true,
        agent: synth,
      });
    }

    return out.sort((a, b) => a.name.localeCompare(b.name));
  })();

  const performLifecycle = useCallback(
    async (
      runId: string,
      runner: () => Promise<unknown>,
      confirmMsg?: string,
    ) => {
      if (confirmMsg && typeof window !== 'undefined' && !window.confirm(confirmMsg)) {
        return;
      }
      setBusyInstance(runId);
      setError(null);
      try {
        await runner();
        onLifecycleChanged?.();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setBusyInstance(null);
      }
    },
    [onLifecycleChanged],
  );

  const handleVmAction = useCallback(
    (
      vmName: string,
      action: 'start' | 'stop' | 'restart' | 'destroy' | 'deploy-agent',
    ) => {
      if (!selectedSandboxId) return;
      const confirmMsg =
        action === 'destroy'
          ? `Force-off VM "${vmName}"? Running work will be killed (libvirt destroy — VM stays defined).`
          : undefined;
      const body =
        action === 'restart' ? { mode: 'graceful', timeout_seconds: 60 } : undefined;
      performLifecycle(
        `vm:${vmName}:${action}`,
        () => api.vmAction(selectedSandboxId, vmName, action, body),
        confirmMsg,
      );
    },
    [selectedSandboxId, performLifecycle],
  );

  const handleVmDelete = useCallback(
    (vmName: string, running: boolean) => {
      if (!selectedSandboxId) return;
      performLifecycle(
        `vm:${vmName}:delete`,
        () => api.deleteVm(selectedSandboxId, vmName, { force: running, deleteDisk: true }),
        `Delete VM "${vmName}" and wipe its disk? This cannot be undone.`,
      );
    },
    [selectedSandboxId, performLifecycle],
  );

  const handleContainerAction = useCallback(
    (name: string, action: 'start' | 'stop') => {
      if (!selectedSandboxId) return;
      performLifecycle(
        `ct:${name}:${action}`,
        () => api.containerAction(selectedSandboxId, name, action),
      );
    },
    [selectedSandboxId, performLifecycle],
  );

  const handleContainerDelete = useCallback(
    (name: string) => {
      if (!selectedSandboxId) return;
      performLifecycle(
        `ct:${name}:delete`,
        () => api.deleteContainer(selectedSandboxId, name),
        `Delete container "${name}"? Force-removes the container (matches docker rm -f).`,
      );
    },
    [selectedSandboxId, performLifecycle],
  );

  return (
    <aside className={styles.sidebar} aria-label="Sandbox instances">
      <div className={styles.sidebarHeader}>
        <h3 className={styles.sidebarTitle}>Sandbox</h3>
        {sandboxes.some((s) => !s.connected) && (
          <button
            type="button"
            className={styles.clearOfflineBtn}
            onClick={onClearOffline}
            disabled={clearing}
            title="Remove all disconnected sandboxes to force re-registration"
          >
            {clearing ? 'Clearing…' : 'Clear Offline'}
          </button>
        )}
      </div>

      {/* Sandbox selector dropdown — replaces the previous full sandbox list.
          Stays as a dropdown because most operators run a single sandbox; the
          combined Instances list below this is the per-sandbox view that #1146
          targets. */}
      <div style={{ padding: '0 12px 8px' }}>
        {sandboxes.length === 0 ? (
          <div className={styles.empty} style={{ padding: '4px 0' }}>
            <p style={{ margin: 0, fontSize: 12 }}>No sandboxes registered.</p>
            <p className={styles.hint} style={{ marginTop: 4 }}>
              Start an agentic-sandbox with <code>aiwg_serve.enabled = true</code>.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <select
              value={selectedSandboxId ?? ''}
              onChange={(e) => onSelectSandbox(e.target.value)}
              style={{
                flex: 1,
                padding: '4px 6px',
                background: '#1a1a1a',
                color: '#ddd',
                border: '1px solid #333',
                borderRadius: 3,
                fontSize: 13,
              }}
              aria-label="Select sandbox"
            >
              {sandboxes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {!s.connected ? ' (offline)' : ''}
                </option>
              ))}
            </select>
            {selectedSandbox && (
              <button
                type="button"
                className={styles.sandboxDeleteBtn}
                onClick={() => onForgetSandbox(selectedSandbox.id)}
                title={`Remove ${selectedSandbox.name} from the registry`}
                aria-label={`Remove ${selectedSandbox.name}`}
                style={{ width: 24, position: 'static', opacity: 1 }}
              >
                ✕
              </button>
            )}
          </div>
        )}
      </div>

      {/* Libvirt degraded banner — sandbox#187 fallback. Containers and agents
          remain visible; only VM list is unavailable. */}
      {selectedSandbox?.connected && vmsDegraded && (
        <div
          role="alert"
          style={{
            margin: '0 12px 8px',
            padding: '6px 8px',
            border: '1px solid #ff9800',
            borderRadius: 4,
            background: '#2a1f0c',
            color: '#ffb74d',
            fontSize: 11,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span>⚠ libvirt degraded — VM list unavailable.</span>
          <button
            type="button"
            onClick={pollVms}
            style={{
              marginLeft: 'auto',
              fontSize: 10,
              padding: '2px 6px',
              cursor: 'pointer',
              background: '#3a2a14',
              color: '#ffb74d',
              border: '1px solid #ff9800',
              borderRadius: 3,
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Instances header + provision affordance */}
      {selectedSandbox?.connected && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '6px 12px 4px',
          }}
        >
          <span style={{ fontSize: 11, textTransform: 'uppercase', color: '#666', letterSpacing: 0.5 }}>
            Instances ({rows.length})
          </span>
          <button
            type="button"
            onClick={onRequestProvision}
            title="Create a new VM"
            style={{
              fontSize: 10,
              padding: '2px 6px',
              cursor: 'pointer',
              background: '#1a3a1a',
              color: '#7fdc7f',
              border: '1px solid #2a5a2a',
              borderRadius: 3,
            }}
          >
            + New
          </button>
        </div>
      )}

      {/* Combined list */}
      {selectedSandbox?.connected ? (
        rows.length === 0 ? (
          <div className={styles.emptyAgents} style={{ padding: '12px' }}>
            {containersDegraded && vmsDegraded
              ? 'No instance data — both VM and container backends are unreachable.'
              : 'No instances. Click "+ New" to create one.'}
          </div>
        ) : (
          <ul className={styles.sandboxList}>
            {rows.map((row) => (
              <InstanceRowItem
                key={row.key}
                row={row}
                isSelected={selectedInstance === row.name}
                onSelect={() => {
                  // Row click only toggles the selection / agent-grid filter.
                  // Opening a terminal pane is a separate explicit action via
                  // the per-row "📺 Pane" button (clearer affordance than
                  // implicit click-to-attach — see #1146 phase 3 follow-up).
                  onSelectInstance(selectedInstance === row.name ? null : row.name);
                }}
                onOpenPane={
                  row.agent && selectedSandboxId
                    ? () =>
                        onOpenPane?.({
                          sandboxId: selectedSandboxId,
                          agentId: row.agent!.agentId,
                          label: row.name,
                          kind: row.kind,
                        })
                    : undefined
                }
                busy={busyInstance?.startsWith(`${row.kind === 'vm' ? 'vm' : row.kind === 'container' ? 'ct' : 'ag'}:${row.name}`) ?? false}
                onVmAction={handleVmAction}
                onVmDelete={handleVmDelete}
                onContainerAction={handleContainerAction}
                onContainerDelete={handleContainerDelete}
                onAgentAction={(action) =>
                  row.agent &&
                  selectedSandboxId &&
                  onAgentAction(selectedSandboxId, row.agent.agentId, action)
                }
                agentActionBusyPrefix={
                  row.agent ? actionInProgress?.startsWith(row.agent.agentId) ?? false : false
                }
              />
            ))}
          </ul>
        )
      ) : selectedSandbox ? (
        <div className={styles.emptyAgents} style={{ padding: '12px' }}>
          Sandbox offline — instance list unavailable.
        </div>
      ) : null}

      {error && (
        <div
          role="alert"
          style={{
            margin: '8px 12px',
            padding: '6px 8px',
            border: '1px solid #f44336',
            background: '#2a1414',
            color: '#ffabab',
            borderRadius: 4,
            fontSize: 11,
          }}
        >
          {error}{' '}
          <button
            type="button"
            onClick={() => setError(null)}
            style={{ float: 'right', background: 'transparent', border: 0, color: '#ffabab', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>
      )}
    </aside>
  );
}

// ---- Row ----

interface InstanceRowItemProps {
  row: InstanceRow;
  isSelected: boolean;
  busy: boolean;
  onSelect: () => void;
  /** Provided only when the row has a bound agent — drives the explicit
   *  "📺 Pane" affordance per #1146 phase 3 follow-up. Rows without an
   *  attached agent simply don't render the button. */
  onOpenPane?: () => void;
  onVmAction: (
    name: string,
    action: 'start' | 'stop' | 'restart' | 'destroy' | 'deploy-agent',
  ) => void;
  onVmDelete: (name: string, running: boolean) => void;
  onContainerAction: (name: string, action: 'start' | 'stop') => void;
  onContainerDelete: (name: string) => void;
  onAgentAction: (action: 'start' | 'stop' | 'destroy' | 'reprovision') => void;
  agentActionBusyPrefix: boolean;
}

function InstanceRowItem({
  row,
  isSelected,
  busy,
  onSelect,
  onOpenPane,
  onVmAction,
  onVmDelete,
  onContainerAction,
  onContainerDelete,
  onAgentAction,
  agentActionBusyPrefix,
}: InstanceRowItemProps) {
  const badge = row.kind === 'vm' ? 'VM' : row.kind === 'container' ? 'CT' : 'AG';
  const badgeBg = row.kind === 'vm' ? '#1a3a5a' : row.kind === 'container' ? '#1a4a2a' : '#3a2a4a';
  const badgeFg = row.kind === 'vm' ? '#7fb8ff' : row.kind === 'container' ? '#7fdc7f' : '#c896e8';
  const anyBusy = busy || agentActionBusyPrefix;

  return (
    <li className={styles.sandboxRow} style={{ flexDirection: 'column', alignItems: 'stretch', padding: 0 }}>
      <button
        type="button"
        onClick={onSelect}
        className={isSelected ? styles.sandboxItemActive : styles.sandboxItem}
        style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4, padding: '8px 12px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%' }}>
          <span
            className={styles.statusDot}
            style={{ background: dotColor(row.state) }}
            title={`Status: ${row.state}`}
            aria-label={`Status: ${row.state}`}
          />
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              padding: '1px 4px',
              background: badgeBg,
              color: badgeFg,
              borderRadius: 2,
              letterSpacing: 0.5,
            }}
          >
            {badge}
          </span>
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13 }}>
            {row.name}
          </span>
          {/* Session-count badge (#1151). Only rendered when the sandbox has
              actually pushed an inventory — undefined sessions[] = unknown,
              not zero, so we don't want to claim "0 sessions" for sandboxes
              still on the pre-#192 build. */}
          {row.agent?.sessions && row.agent.sessions.length > 0 && (
            <span
              title={
                row.agent.sessions
                  .map((s) => `${s.session_name} (${s.session_type})`)
                  .join('\n')
              }
              style={{
                fontSize: 10,
                color: '#7fb8ff',
                padding: '0 4px',
                borderRadius: 2,
                background: '#1a3a5a',
                fontFamily: 'monospace',
              }}
            >
              · {row.agent.sessions.length}
            </span>
          )}
          <span style={{ fontSize: 10, color: '#888' }}>{row.state}</span>
        </div>
        {row.secondary && (
          <span style={{ fontSize: 10, color: '#999', paddingLeft: 18, fontFamily: 'monospace' }}>
            {row.secondary}
          </span>
        )}
      </button>

      {/* Lifecycle buttons — runtime-aware (issue #1146 section C). Buttons stop
          propagation so clicking them doesn't toggle row selection. */}
      <div
        style={{
          display: 'flex',
          gap: 4,
          padding: '0 12px 8px',
          flexWrap: 'wrap',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Open pane — explicit affordance for "attach a terminal session
            to this instance." Always visible so the affordance is
            discoverable; disabled with an explanatory tooltip when no agent
            is bound (e.g., a stopped VM, or a running VM that hasn't had
            its agent deployed yet). Clicking opens or focuses the matching
            pane in the multi-pane stack above. */}
        <button
          type="button"
          className={styles.actionBtn}
          onClick={onOpenPane ?? undefined}
          disabled={!onOpenPane}
          title={
            onOpenPane
              ? 'Open a terminal pane for this instance'
              : row.kind === 'vm'
                ? 'No agent attached — start the VM and click ⚡ Deploy first'
                : row.kind === 'container'
                  ? 'Container has no AIWG agent attached — start it first'
                  : 'No bound agent'
          }
        >
          📺 Pane
        </button>

        {row.kind === 'vm' && row.vm && (
          <>
            {!isVmRunning(row.vm.state) && (
              <button
                type="button"
                className={styles.actionBtn}
                disabled={anyBusy}
                onClick={() => onVmAction(row.vm!.name, 'start')}
                title="Start VM"
              >
                ▶ Start
              </button>
            )}
            {isVmRunning(row.vm.state) && !row.agentAttached && (
              <button
                type="button"
                className={styles.actionBtn}
                disabled={anyBusy}
                onClick={() => onVmAction(row.vm!.name, 'deploy-agent')}
                title="Deploy agent binary to VM"
              >
                ⚡ Deploy
              </button>
            )}
            {isVmRunning(row.vm.state) && (
              <>
                <button
                  type="button"
                  className={styles.actionBtnSecondary}
                  disabled={anyBusy}
                  onClick={() => onVmAction(row.vm!.name, 'restart')}
                  title="Graceful restart (60s timeout)"
                >
                  ↻ Restart
                </button>
                <button
                  type="button"
                  className={styles.actionBtnSecondary}
                  disabled={anyBusy}
                  onClick={() => onVmAction(row.vm!.name, 'stop')}
                  title="Graceful stop"
                >
                  ⏸ Stop
                </button>
                <button
                  type="button"
                  className={styles.actionBtnDanger}
                  disabled={anyBusy}
                  onClick={() => onVmAction(row.vm!.name, 'destroy')}
                  title="Force off (libvirt destroy — VM stays defined)"
                >
                  ⏻ Force off
                </button>
              </>
            )}
            <button
              type="button"
              className={styles.actionBtnDanger}
              disabled={anyBusy}
              onClick={() => onVmDelete(row.vm!.name, isVmRunning(row.vm!.state))}
              title={isVmRunning(row.vm.state) ? 'Force-delete VM and wipe disk' : 'Delete VM and wipe disk'}
            >
              ✕ Delete
            </button>
          </>
        )}

        {row.kind === 'container' && row.container && (
          <>
            {!isContainerRunning(row.container.status) && (
              <button
                type="button"
                className={styles.actionBtn}
                disabled={anyBusy}
                onClick={() => onContainerAction(row.container!.name, 'start')}
                title="Start container"
              >
                ▶ Start
              </button>
            )}
            {isContainerRunning(row.container.status) && (
              <button
                type="button"
                className={styles.actionBtnSecondary}
                disabled={anyBusy}
                onClick={() => onContainerAction(row.container!.name, 'stop')}
                title="Graceful stop"
              >
                ⏸ Stop
              </button>
            )}
            <button
              type="button"
              className={styles.actionBtnDanger}
              disabled={anyBusy}
              onClick={() => onContainerDelete(row.container!.name)}
              title="Force-remove container (matches docker rm -f)"
            >
              ✕ Delete
            </button>
            {/* No Restart, no Force-off, no Deploy — no matching sandbox endpoint. */}
          </>
        )}

        {row.kind === 'agent' && row.agent && (
          <>
            {row.agent.status === 'ready' && (
              <button
                type="button"
                className={styles.actionBtn}
                disabled={anyBusy}
                onClick={() => onAgentAction('stop')}
              >
                Stop
              </button>
            )}
            {row.agent.status === 'disconnected' && (
              <button
                type="button"
                className={styles.actionBtn}
                disabled={anyBusy}
                onClick={() => onAgentAction('start')}
              >
                Start
              </button>
            )}
            <button
              type="button"
              className={styles.actionBtnSecondary}
              disabled={anyBusy}
              onClick={() => onAgentAction('reprovision')}
            >
              ↻ Reprov
            </button>
            <button
              type="button"
              className={styles.actionBtnDanger}
              disabled={anyBusy}
              onClick={() => onAgentAction('destroy')}
            >
              ✕ Destroy
            </button>
          </>
        )}
      </div>
    </li>
  );
}
