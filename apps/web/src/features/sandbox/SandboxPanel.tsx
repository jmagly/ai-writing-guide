/**
 * Sandbox Operator Panel
 *
 * Visual interface for managing agentic-sandbox instances: view registered
 * sandboxes, agent inventory, loadout details, and lifecycle controls
 * (provision, start, stop, reprovision, destroy).
 *
 * @issue #733
 */

import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { api, type SandboxSummary, type SandboxAgent, type SandboxTask, type SubmitTaskRequest, type AiwgExecRequest, type AiwgExecResponse, type AgentCandidate, type Loadout, type LoadoutRegistry, type CreateVmRequest } from '../../lib/api.js';
import styles from './SandboxPanel.module.css';
import { InstancesList } from './InstancesList.js';
import { PaneStack, type PaneStackHandle } from './PaneStack.js';

// ---- State ----

interface State {
  sandboxes: SandboxSummary[];
  selectedSandbox: string | null;
  loading: boolean;
  error: string | null;
  actionInProgress: string | null;
  clearing: boolean;
}

type Action =
  | { type: 'SET_SANDBOXES'; sandboxes: SandboxSummary[] }
  | { type: 'SET_SELECTED'; id: string | null }
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'SET_ACTION'; id: string | null }
  | { type: 'SET_CLEARING'; clearing: boolean };

const INITIAL: State = {
  sandboxes: [],
  selectedSandbox: null,
  loading: false,
  error: null,
  actionInProgress: null,
  clearing: false,
};

// ---- Last-selected persistence (#1146 phase 3, section E) ----
//
// Persist the operator's last-selected sandbox + instance across reloads so a
// fresh page load lands on the same workspace they were on. Failure to read
// or write is non-fatal — localStorage may be disabled in private windows.

const LS_KEY_SANDBOX = 'aiwg:sandbox:lastSelectedSandbox';
const lsKeyInstance = (sandboxId: string) => `aiwg:sandbox:${sandboxId}:lastSelectedInstance`;

function readLastSelectedSandbox(): string | null {
  try {
    return localStorage.getItem(LS_KEY_SANDBOX);
  } catch {
    return null;
  }
}

function writeLastSelectedSandbox(id: string | null) {
  try {
    if (id) localStorage.setItem(LS_KEY_SANDBOX, id);
    else localStorage.removeItem(LS_KEY_SANDBOX);
  } catch {
    /* ignore */
  }
}

function readLastSelectedInstance(sandboxId: string): string | null {
  try {
    return localStorage.getItem(lsKeyInstance(sandboxId));
  } catch {
    return null;
  }
}

function writeLastSelectedInstance(sandboxId: string, name: string | null) {
  try {
    if (name) localStorage.setItem(lsKeyInstance(sandboxId), name);
    else localStorage.removeItem(lsKeyInstance(sandboxId));
  } catch {
    /* ignore */
  }
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_SANDBOXES': {
      // Honor an existing in-memory selection when it still resolves; if it
      // doesn't, fall back to the last-selected persisted value; finally fall
      // back to the first sandbox.
      const stillResolves = state.selectedSandbox && action.sandboxes.some(s => s.id === state.selectedSandbox);
      const remembered = !stillResolves ? readLastSelectedSandbox() : null;
      const rememberedResolves = remembered && action.sandboxes.some(s => s.id === remembered);
      const selected = stillResolves
        ? state.selectedSandbox
        : rememberedResolves
          ? remembered
          : action.sandboxes[0]?.id ?? null;
      return { ...state, sandboxes: action.sandboxes, selectedSandbox: selected };
    }
    case 'SET_SELECTED':
      writeLastSelectedSandbox(action.id);
      return { ...state, selectedSandbox: action.id };
    case 'SET_LOADING':
      return { ...state, loading: action.loading };
    case 'SET_ERROR':
      return { ...state, error: action.error };
    case 'SET_ACTION':
      return { ...state, actionInProgress: action.id };
    case 'SET_CLEARING':
      return { ...state, clearing: action.clearing };
    default:
      return state;
  }
}

// ---- Helpers ----

const STATUS_COLORS: Record<string, string> = {
  ready: '#4caf50',
  busy: '#ff9800',
  provisioning: '#2196f3',
  starting: '#2196f3',
  error: '#f44336',
  disconnected: '#555',
};

function statusBadge(status: string) {
  return (
    <span
      className={styles.statusDot}
      style={{ background: STATUS_COLORS[status] || '#555' }}
      title={status}
      aria-label={`Status: ${status}`}
    />
  );
}

function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  } catch {
    return iso;
  }
}

function shortId(id?: string): string {
  return id ? id.slice(0, 8) : '';
}

// ---- Component ----

export function SandboxPanel() {
  const [state, dispatch] = useReducer(reducer, INITIAL);
  const [activeTab, setActiveTab] = useState<'agents' | 'tasks' | 'remote'>('agents');
  const [showProvisionModal, setShowProvisionModal] = useState(false);
  // VM filter (#930): when set, only agents whose hostname/IP match are shown.
  // Also drives the VM card "selected" state. Persists per-sandbox in
  // localStorage (#1146 phase 3, section E).
  const [selectedVm, setSelectedVm] = useState<string | null>(null);

  // Restore the per-sandbox last-selected instance whenever the active
  // sandbox changes. Setting selectedVm directly here (rather than going
  // through a wrapper) keeps the contract with InstancesList unchanged.
  useEffect(() => {
    if (!state.selectedSandbox) {
      setSelectedVm(null);
      return;
    }
    setSelectedVm(readLastSelectedInstance(state.selectedSandbox));
  }, [state.selectedSandbox]);

  // PaneStack handle — captured on first mount; openPane is the bridge from
  // InstancesList row clicks to the multi-pane terminal area.
  const paneStackRef = useRef<PaneStackHandle | null>(null);
  const handlePaneStackMount = useCallback((handle: PaneStackHandle) => {
    paneStackRef.current = handle;
  }, []);

  // Build a stable per-sandbox agent map so PaneStack can pull live metrics
  // for whichever agent each open pane is attached to. Computed on render —
  // sandbox poll already debounces upstream changes.
  const agentsBySandbox: Record<string, SandboxAgent[]> = (() => {
    const out: Record<string, SandboxAgent[]> = {};
    for (const s of state.sandboxes) out[s.id] = s.agents;
    return out;
  })();

  const persistAndSetSelectedVm = useCallback(
    (name: string | null) => {
      setSelectedVm(name);
      if (state.selectedSandbox) writeLastSelectedInstance(state.selectedSandbox, name);
    },
    [state.selectedSandbox],
  );

  // Poll sandboxes
  useEffect(() => {
    let active = true;
    async function poll() {
      try {
        const data = await api.sandboxes();
        if (active) dispatch({ type: 'SET_SANDBOXES', sandboxes: data.sandboxes });
      } catch {
        // Server not ready
      }
    }
    poll();
    const id = setInterval(poll, 3000);
    return () => { active = false; clearInterval(id); };
  }, []);

  const selectedSandbox = state.sandboxes.find(s => s.id === state.selectedSandbox);

  const handleForgetSandbox = useCallback(async (id: string) => {
    try {
      await api.forgetSandbox(id);
      const data = await api.sandboxes();
      dispatch({ type: 'SET_SANDBOXES', sandboxes: data.sandboxes });
    } catch (err) {
      dispatch({ type: 'SET_ERROR', error: `Delete failed: ${err}` });
    }
  }, []);

  const handleClearOffline = useCallback(async () => {
    dispatch({ type: 'SET_CLEARING', clearing: true });
    try {
      await api.clearOfflineSandboxes();
      // Poll immediately to refresh list
      const data = await api.sandboxes();
      dispatch({ type: 'SET_SANDBOXES', sandboxes: data.sandboxes });
    } catch (err) {
      dispatch({ type: 'SET_ERROR', error: `Clear failed: ${err}` });
    } finally {
      dispatch({ type: 'SET_CLEARING', clearing: false });
    }
  }, []);

  const handleAgentAction = useCallback(async (
    sandboxId: string,
    agentId: string,
    action: 'start' | 'stop' | 'destroy' | 'reprovision',
  ) => {
    dispatch({ type: 'SET_ACTION', id: `${agentId}-${action}` });
    try {
      await api.agentAction(sandboxId, agentId, action);
    } catch (err) {
      dispatch({ type: 'SET_ERROR', error: `${action} failed: ${err}` });
    } finally {
      dispatch({ type: 'SET_ACTION', id: null });
    }
  }, []);

  return (
    <div className={styles.panel}>
      {/* Sidebar: combined Instances list (#1146).
          Replaces the previous sandboxes-only sidebar — sandbox selector is now
          a header dropdown above a per-sandbox merged list of agents + VMs +
          containers with runtime-aware lifecycle buttons. */}
      <InstancesList
        sandboxes={state.sandboxes}
        selectedSandboxId={state.selectedSandbox}
        selectedInstance={selectedVm}
        onSelectSandbox={(id) => dispatch({ type: 'SET_SELECTED', id })}
        onSelectInstance={persistAndSetSelectedVm}
        onForgetSandbox={handleForgetSandbox}
        onClearOffline={handleClearOffline}
        clearing={state.clearing}
        onAgentAction={handleAgentAction}
        actionInProgress={state.actionInProgress}
        onLifecycleChanged={async () => {
          // Lifecycle changes (VM start/stop/delete, container start/stop)
          // can shift agent presence; refresh sandbox summary so the agent
          // grid on the right stays consistent.
          try {
            const data = await api.sandboxes();
            dispatch({ type: 'SET_SANDBOXES', sandboxes: data.sandboxes });
          } catch {
            /* polling will catch up */
          }
        }}
        onRequestProvision={() => setShowProvisionModal(true)}
        onOpenPane={(info) => paneStackRef.current?.openPane(info)}
      />

      {/* Main: sandbox detail + agent grid */}
      <div className={styles.main}>
        {!selectedSandbox ? (
          <div className={styles.emptyMain}>
            <p>Select a sandbox to view details</p>
          </div>
        ) : (
          <>
            {/* Provision modal (#915) */}
            {showProvisionModal && selectedSandbox.connected && (
              <ProvisionModal
                sandboxId={selectedSandbox.id}
                onClose={() => setShowProvisionModal(false)}
                onProvisioned={() => {
                  // Poll will pick up the new agent automatically
                }}
              />
            )}

            {/* Sandbox header */}
            <div className={styles.sandboxHeader}>
              <h2 className={styles.sandboxTitle}>
                {statusBadge(selectedSandbox.connected ? 'ready' : 'disconnected')}
                {selectedSandbox.name}
                {!selectedSandbox.connected && (
                  <span className={styles.offlineBadge}>offline</span>
                )}
              </h2>
              <div className={styles.sandboxHeaderActions}>
                {selectedSandbox.connected && (
                  <button
                    type="button"
                    className={styles.actionBtn}
                    onClick={() => setShowProvisionModal(true)}
                    title="Create a new agent VM or container on this sandbox"
                  >
                    + New Instance
                  </button>
                )}
              </div>
              <div className={styles.sandboxInfo}>
                <span>v{selectedSandbox.version}</span>
                <span>{selectedSandbox.capabilities.join(', ')}</span>
                {selectedSandbox.connected && (
                  <span title="HTTP endpoint">{selectedSandbox.httpEndpoint}</span>
                )}
                {selectedSandbox.instanceId && (
                  <span className={styles.instanceId} title={`Instance ID: ${selectedSandbox.instanceId}`}>
                    #{shortId(selectedSandbox.instanceId)}
                  </span>
                )}
              </div>
            </div>

            {/* Disconnected last-session info */}
            {!selectedSandbox.connected && (
              <div className={styles.disconnectedBanner}>
                <div className={styles.disconnectedIcon}>⚠</div>
                <div className={styles.disconnectedInfo}>
                  <strong>Sandbox offline</strong>
                  <p>This sandbox is no longer connected. It will reappear automatically when it reconnects.</p>
                  <div className={styles.lastSessionGrid}>
                    {selectedSandbox.disconnectedAt && (
                      <><span className={styles.lastSessionLabel}>Disconnected</span>
                      <span>{fmtTime(selectedSandbox.disconnectedAt)}</span></>
                    )}
                    <span className={styles.lastSessionLabel}>Last active</span>
                    <span>{fmtTime(selectedSandbox.lastEventAt)}</span>
                    <span className={styles.lastSessionLabel}>Last registered</span>
                    <span>{fmtTime(selectedSandbox.lastRegisteredAt)}</span>
                    {selectedSandbox.instanceId && (
                      <><span className={styles.lastSessionLabel}>Instance ID</span>
                      <span className={styles.monoSmall}>{selectedSandbox.instanceId}</span></>
                    )}
                    <span className={styles.lastSessionLabel}>Endpoint</span>
                    <span className={styles.monoSmall}>{selectedSandbox.httpEndpoint}</span>
                  </div>
                </div>
              </div>
            )}

            {/* VMs are rendered in the combined Instances sidebar (#1146);
                the standalone SandboxVmsView from #930 is no longer needed. */}

            {/* Multi-pane terminal stack (#1146 phase 3, section B) — sits
                above the agent grid so the operator can keep multiple
                sessions attached while still browsing per-agent details
                below. Renders nothing when no panes are open. */}
            <PaneStack
              agentsBySandbox={agentsBySandbox}
              onMount={handlePaneStackMount}
            />

            {/* Tab bar */}
            <div className={styles.tabBar} role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'agents'}
                className={activeTab === 'agents' ? styles.tabActive : styles.tab}
                onClick={() => setActiveTab('agents')}
              >
                Agents
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'tasks'}
                className={activeTab === 'tasks' ? styles.tabActive : styles.tab}
                onClick={() => setActiveTab('tasks')}
              >
                Tasks
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'remote'}
                className={activeTab === 'remote' ? styles.tabActive : styles.tab}
                onClick={() => setActiveTab('remote')}
              >
                Remote
              </button>
            </div>

            {/* Agent grid */}
            {activeTab === 'agents' && (() => {
              // #930: Filter agents to the selected VM if one is chosen. Match on
              // hostname (agent.id commonly equals vm.name) or agentId prefix.
              const visibleAgents = selectedVm
                ? selectedSandbox.agents.filter(a =>
                    a.agentId === selectedVm ||
                    a.agentId.startsWith(`${selectedVm}-`) ||
                    a.logicalName === selectedVm
                  )
                : selectedSandbox.agents;
              return (
                <div className={styles.agentGrid} role="list" aria-label="Agents">
                  {visibleAgents.length === 0 ? (
                    <div className={styles.emptyAgents}>
                      {selectedVm
                        ? `No agents are running on VM "${selectedVm}". Clear the VM filter to see all agents.`
                        : selectedSandbox.connected ? 'No agents connected' : 'No agent data from last session'}
                    </div>
                  ) : (
                    visibleAgents.map((agent) => (
                      <AgentCard
                        key={agent.agentId}
                        agent={agent}
                        sandboxId={selectedSandbox.id}
                        onAction={handleAgentAction}
                        actionInProgress={state.actionInProgress}
                        sandboxConnected={selectedSandbox.connected}
                      />
                    ))
                  )}
                </div>
              );
            })()}

            {/* Tasks panel */}
            {activeTab === 'tasks' && (
              <SandboxTasksView
                sandboxId={selectedSandbox.id}
                connected={selectedSandbox.connected}
              />
            )}

            {/* Remote AIWG panel */}
            {activeTab === 'remote' && (
              <RemoteAiwgPanel
                sandboxId={selectedSandbox.id}
                agents={selectedSandbox.agents}
                connected={selectedSandbox.connected}
              />
            )}

            {state.error && (
              <div className={styles.error} role="alert">
                {state.error}
                <button type="button" onClick={() => dispatch({ type: 'SET_ERROR', error: null })}>x</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ---- Metric Bar (#911) ----

function MetricBar({ label, value, max, unit }: { label: string; value: number; max: number; unit: string }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  const color = pct >= 90 ? '#f44336' : pct >= 70 ? '#ff9800' : '#4caf50';
  return (
    <div className={styles.metricBar}>
      <span className={styles.metricLabel}>{label}</span>
      <div className={styles.metricTrack}>
        <div className={styles.metricFill} style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className={styles.metricValue}>{value}{unit}</span>
    </div>
  );
}

// ---- Remote AIWG Panel (#914) ----

const AIWG_QUICK_COMMANDS: Array<{ label: string; subcommand: string; args?: string[] }> = [
  { label: 'Doctor', subcommand: 'doctor', args: ['--json'] },
  { label: 'Status', subcommand: 'status' },
  { label: 'Sync (dry run)', subcommand: 'sync', args: ['--dry-run'] },
  { label: 'Version', subcommand: 'version' },
];

function RemoteAiwgPanel({
  sandboxId,
  agents,
  connected,
}: { sandboxId: string; agents: SandboxAgent[]; connected: boolean }) {
  const [selectedAgent, setSelectedAgent] = useState(agents[0]?.agentId ?? '');
  const [subcommand, setSubcommand] = useState('doctor');
  const [args, setArgs] = useState('--json');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<AiwgExecResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const outputRef = useRef<HTMLPreElement>(null);

  const handleRun = useCallback(async () => {
    if (!selectedAgent || !subcommand.trim()) return;
    setRunning(true);
    setResult(null);
    setError(null);
    try {
      const body: AiwgExecRequest = {
        subcommand: subcommand.trim(),
        args: args.trim() ? args.trim().split(/\s+/) : [],
        timeout: 30,
      };
      const res = await api.aiwgExec(sandboxId, selectedAgent, body);
      setResult(res);
    } catch (e) {
      setError(String(e));
    } finally {
      setRunning(false);
    }
  }, [sandboxId, selectedAgent, subcommand, args]);

  if (!connected) {
    return <div className={styles.emptyAgents}>Remote AIWG unavailable while sandbox is offline</div>;
  }

  return (
    <div className={styles.remotePanel}>
      <div className={styles.remoteForm}>
        <div className={styles.remoteRow}>
          <label className={styles.remoteLabel}>Agent</label>
          <select
            className={styles.remoteSelect}
            value={selectedAgent}
            onChange={(e) => setSelectedAgent(e.target.value)}
          >
            {agents.map((a) => (
              <option key={a.agentId} value={a.agentId}>{a.agentId}</option>
            ))}
          </select>
        </div>
        <div className={styles.remoteRow}>
          <label className={styles.remoteLabel}>Subcommand</label>
          <input
            className={styles.remoteInput}
            value={subcommand}
            onChange={(e) => setSubcommand(e.target.value)}
            placeholder="doctor"
          />
        </div>
        <div className={styles.remoteRow}>
          <label className={styles.remoteLabel}>Args</label>
          <input
            className={styles.remoteInput}
            value={args}
            onChange={(e) => setArgs(e.target.value)}
            placeholder="--json"
          />
        </div>
        <div className={styles.remoteQuickBtns}>
          {AIWG_QUICK_COMMANDS.map((cmd) => (
            <button
              key={cmd.label}
              type="button"
              className={styles.actionBtnSecondary}
              disabled={running}
              onClick={() => { setSubcommand(cmd.subcommand); setArgs((cmd.args ?? []).join(' ')); }}
            >
              {cmd.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          className={styles.actionBtn}
          onClick={handleRun}
          disabled={running || !selectedAgent || !subcommand.trim()}
        >
          {running ? 'Running…' : 'Run'}
        </button>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {result && (
        <div className={styles.remoteOutput}>
          <div className={styles.remoteOutputHeader}>
            Exit code: <strong style={{ color: result.exit_code === 0 ? '#4caf50' : '#f44336' }}>{result.exit_code}</strong>
          </div>
          {result.stdout && (
            <pre ref={outputRef} className={styles.remoteOutputPre}>{result.stdout}</pre>
          )}
          {result.stderr && (
            <pre className={styles.remoteOutputErr}>{result.stderr}</pre>
          )}
        </div>
      )}
    </div>
  );
}

// ---- Provision Modal (#915) ----
//
// Mirrors the agentic-sandbox management UI provision dialog:
// - Preset mode: loadout picker + read-only detail panel showing what's bundled
// - Custom mode: init script + framework/provider chip picker + compose summary
// - Resource selectors auto-populate from loadout defaults but stay editable

type LoadoutMode = 'preset' | 'custom';

const VCPU_OPTIONS = [2, 4, 8, 16];
const MEMORY_MB_OPTIONS = [
  { value: 4096, label: '4' },
  { value: 8192, label: '8' },
  { value: 16384, label: '16' },
  { value: 32768, label: '32' },
];
const DISK_GB_OPTIONS = [30, 50, 100, 200];

const CATEGORY_LABELS: Record<string, string> = {
  'per-provider': 'Single Provider',
  'collaboration': 'Multi-Provider',
  'task-focused': 'Task-Focused',
  'backward-compat': 'Baseline',
  'other': 'Other',
};
const CATEGORY_ORDER = ['per-provider', 'collaboration', 'task-focused', 'backward-compat', 'other'];

function parseMemoryToMb(mem: string | undefined): number | null {
  if (!mem) return null;
  const m = mem.match(/^(\d+)\s*(G|M)/i);
  if (!m) return null;
  const val = parseInt(m[1], 10);
  return m[2].toUpperCase() === 'G' ? val * 1024 : val;
}

function closestOption(target: number, options: number[]): number {
  return options.reduce((a, b) => (Math.abs(b - target) < Math.abs(a - target) ? b : a));
}

function ProvisionModal({
  sandboxId,
  onClose,
  onProvisioned,
}: { sandboxId: string; onClose: () => void; onProvisioned: () => void }) {
  // Runtime switch (#1146 phase 3, section D) — drives whether the modal
  // submits POST /vms or POST /containers. Containers reuse only the Name
  // field + their own image picker; VM-specific loadout/compose/resources
  // panels are hidden for containers.
  const [runtime, setRuntime] = useState<'vm' | 'container'>('vm');

  const [loadouts, setLoadouts] = useState<Loadout[]>([]);
  const [registry, setRegistry] = useState<LoadoutRegistry | null>(null);
  const [mode, setMode] = useState<LoadoutMode>('preset');

  const [vmName, setVmName] = useState('');
  const [selectedLoadoutPath, setSelectedLoadoutPath] = useState('');

  const [initScript, setInitScript] = useState('ubuntu');
  const [composeFrameworks, setComposeFrameworks] = useState<string[]>([]);
  const [composeProviders, setComposeProviders] = useState<string[]>([]);

  const [vcpus, setVcpus] = useState<number>(4);
  const [memoryMb, setMemoryMb] = useState<number>(8192);
  const [diskGb, setDiskGb] = useState<number>(50);
  const [agentshare, setAgentshare] = useState(true);
  const [autostart, setAutostart] = useState(true);

  // Container fields (#1146 phase 3)
  const [containerImages, setContainerImages] = useState<Array<{ ref: string; label: string; description: string; default?: boolean }>>([]);
  const [containerImage, setContainerImage] = useState<string>('');
  const [customContainerImage, setCustomContainerImage] = useState<string>('');

  const [provisioning, setProvisioning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resourceHint, setResourceHint] = useState(false);

  // Fetch loadouts + registry
  useEffect(() => {
    api.sandboxLoadouts(sandboxId)
      .then((resp) => {
        const arr: Loadout[] = Array.isArray(resp)
          ? resp
          : Array.isArray((resp as { loadouts?: Loadout[] })?.loadouts)
            ? (resp as { loadouts: Loadout[] }).loadouts
            : [];
        setLoadouts(arr);
        // Default to claude-only if available, else first
        const claudeOnly = arr.find((l) => l.name === 'claude-only');
        const initial = claudeOnly ?? arr[0];
        if (initial) setSelectedLoadoutPath(initial.path);
      })
      .catch((e) => setError(String(e)));

    api.sandboxLoadoutRegistry(sandboxId)
      .then((reg) => {
        setRegistry(reg);
        const def = reg.init_scripts?.find((s) => s.default);
        if (def) setInitScript(def.name);
      })
      .catch(() => { /* registry optional */ });

    // Container image picker source (#1146 phase 3). Best-effort — if the
    // sandbox doesn't expose /api/v1/container-images we fall back to a
    // free-text image field via the customContainerImage path below.
    api.sandboxContainerImages(sandboxId)
      .then((r) => {
        const imgs = r.images ?? [];
        setContainerImages(imgs);
        const def = imgs.find((i) => i.default) ?? imgs[0];
        if (def) setContainerImage(def.ref);
      })
      .catch(() => { /* image list optional */ });
  }, [sandboxId]);

  const selectedLoadout = loadouts.find((l) => l.path === selectedLoadoutPath);

  // Auto-apply loadout resource defaults when selection changes
  useEffect(() => {
    if (!selectedLoadout?.resources) {
      setResourceHint(false);
      return;
    }
    const r = selectedLoadout.resources;
    let applied = false;
    if (r.cpus && VCPU_OPTIONS.includes(r.cpus)) {
      setVcpus(r.cpus);
      applied = true;
    }
    const mb = parseMemoryToMb(r.memory);
    if (mb) {
      setMemoryMb(closestOption(mb, MEMORY_MB_OPTIONS.map((o) => o.value)));
      applied = true;
    }
    if (r.disk) {
      const gb = parseInt(r.disk, 10);
      if (!Number.isNaN(gb)) {
        setDiskGb(closestOption(gb, DISK_GB_OPTIONS));
        applied = true;
      }
    }
    setResourceHint(applied);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLoadoutPath]);

  const groupedLoadouts = (() => {
    const by: Record<string, Loadout[]> = {};
    for (const l of loadouts) {
      const cat = l.category || 'other';
      (by[cat] ??= []).push(l);
    }
    return CATEGORY_ORDER
      .filter((cat) => by[cat]?.length)
      .map((cat) => ({ cat, items: by[cat] }));
  })();

  const toggleChip = (kind: 'fw' | 'pv', name: string) => {
    if (kind === 'fw') {
      setComposeFrameworks((prev) =>
        prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name]
      );
    } else {
      setComposeProviders((prev) =>
        prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name]
      );
    }
  };

  const validName = vmName.trim().length > 0 && /^[-a-z0-9]+$/.test(vmName.trim());
  const fullName = validName ? `agent-${vmName.trim()}` : '';
  const effectiveContainerImage = containerImage === '__custom__' ? customContainerImage.trim() : containerImage;

  const canSubmit = (() => {
    if (!validName || provisioning) return false;
    if (runtime === 'container') return Boolean(effectiveContainerImage);
    if (mode === 'preset') return Boolean(selectedLoadoutPath);
    return composeProviders.length > 0;
  })();

  const handleProvision = useCallback(async () => {
    if (!validName) {
      setError('Name must be lowercase letters, numbers, or hyphens.');
      return;
    }
    setProvisioning(true);
    setError(null);
    try {
      if (runtime === 'container') {
        if (!effectiveContainerImage) {
          setError('Container image is required.');
          return;
        }
        await api.createContainer(sandboxId, {
          name: fullName,
          image: effectiveContainerImage,
        });
        onProvisioned();
        onClose();
        return;
      }
      const base: CreateVmRequest = {
        name: fullName,
        profile: '',
        vcpus,
        memory_mb: memoryMb,
        disk_gb: diskGb,
        agentshare,
        start: autostart,
      };
      const body: CreateVmRequest = mode === 'preset'
        ? { ...base, loadout: selectedLoadoutPath }
        : {
            ...base,
            loadout: '',
            composition: {
              init: initScript,
              aiwg: { frameworks: composeFrameworks, providers: composeProviders },
            },
          };
      await api.sandboxProvision(sandboxId, body);
      onProvisioned();
      onClose();
    } catch (e) {
      setError(`${runtime === 'container' ? 'Container create' : 'Provision'} failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setProvisioning(false);
    }
  }, [
    sandboxId, validName, fullName, mode, selectedLoadoutPath,
    initScript, composeFrameworks, composeProviders,
    vcpus, memoryMb, diskGb, agentshare, autostart,
    runtime, effectiveContainerImage,
    onProvisioned, onClose,
  ]);

  return (
    <div
      className={styles.modalOverlay}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={runtime === 'container' ? 'Create container' : 'Provision VM'}
    >
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>{runtime === 'container' ? 'Create Agent Container' : 'Create Agent VM'}</h3>
          <button type="button" className={styles.modalClose} onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className={styles.modalBody}>
          {/* Runtime selector (#1146 phase 3, section D) */}
          <div className={styles.provisionFormRow}>
            <label className={styles.provisionLabel}>Runtime</label>
            <select
              className={styles.remoteSelect}
              value={runtime}
              onChange={(e) => setRuntime(e.target.value as 'vm' | 'container')}
              aria-label="Runtime"
            >
              <option value="vm">VM (libvirt)</option>
              <option value="container">Container (Docker)</option>
            </select>
            <div className={styles.formHelp}>
              {runtime === 'vm'
                ? 'Provisioned via libvirt with a configurable loadout, full agentshare and resource controls.'
                : 'Started from a curated agent image. No loadout/resource controls — image is baked.'}
            </div>
          </div>

          {/* Name */}
          <div className={styles.provisionFormRow}>
            <label className={styles.provisionLabel}>Name</label>
            <div className={styles.inputPrefix}>
              <span className={styles.inputPrefixLabel}>agent-</span>
              <input
                value={vmName}
                onChange={(e) => setVmName(e.target.value)}
                placeholder="01"
                autoFocus
                pattern="[-a-z0-9]+"
              />
            </div>
            <div className={styles.formHelp}>Lowercase letters, numbers, and hyphens only</div>
          </div>

          {/* Container-only: image picker (#1146 phase 3) */}
          {runtime === 'container' && (
            <>
              <div className={styles.provisionFormRow}>
                <label className={styles.provisionLabel}>Image</label>
                <select
                  className={styles.remoteSelect}
                  value={containerImage}
                  onChange={(e) => setContainerImage(e.target.value)}
                  aria-label="Container image"
                >
                  {containerImages.length === 0 && !containerImage && (
                    <option value="">Loading…</option>
                  )}
                  {containerImages.map((img) => (
                    <option key={img.ref} value={img.ref}>
                      {img.label} — {img.ref}
                    </option>
                  ))}
                  <option value="__custom__">Custom…</option>
                </select>
                {containerImage === '__custom__' && (
                  <input
                    style={{ marginTop: 6, width: '100%' }}
                    placeholder="agentic/your-image:tag"
                    value={customContainerImage}
                    onChange={(e) => setCustomContainerImage(e.target.value)}
                  />
                )}
                {containerImage && containerImage !== '__custom__' && (
                  <div className={styles.formHelp}>
                    {containerImages.find((i) => i.ref === containerImage)?.description}
                  </div>
                )}
              </div>
              <div className={styles.formHelp} style={{ marginTop: -4 }}>
                Mounts, env vars, and network mode are not exposed yet — falls back to image defaults
                (matches the agentic-sandbox dashboard #178 deviation).
              </div>
            </>
          )}

          {/* Mode tabs (VM-only) */}
          {runtime === 'vm' && (
          <div className={styles.modeTabs}>
            <button
              type="button"
              className={`${styles.modeTab} ${mode === 'preset' ? styles.modeTabActive : ''}`}
              onClick={() => setMode('preset')}
            >Preset</button>
            <button
              type="button"
              className={`${styles.modeTab} ${mode === 'custom' ? styles.modeTabActive : ''}`}
              onClick={() => setMode('custom')}
            >Custom</button>
          </div>
          )}

          {/* Preset panel */}
          {runtime === 'vm' && mode === 'preset' && (
            <>
              <div className={styles.provisionFormRow}>
                <label className={styles.provisionLabel}>Profile</label>
                <select
                  className={styles.remoteSelect}
                  value={selectedLoadoutPath}
                  onChange={(e) => setSelectedLoadoutPath(e.target.value)}
                >
                  {loadouts.length === 0 && <option value="">Loading…</option>}
                  {groupedLoadouts.map(({ cat, items }) => (
                    <optgroup key={cat} label={CATEGORY_LABELS[cat] ?? cat}>
                      {items.map((l) => (
                        <option key={l.path} value={l.path}>{l.name}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              {selectedLoadout && (
                <div className={styles.loadoutDetail}>
                  {selectedLoadout.description && (
                    <div className={styles.loadoutDesc}>{selectedLoadout.description}</div>
                  )}
                  <div className={styles.loadoutTags}>
                    {selectedLoadout.network_mode && (
                      <span
                        className={`${styles.loadoutTag} ${selectedLoadout.network_mode === 'isolated' ? styles.tagWarn : ''}`}
                      >{selectedLoadout.network_mode} network</span>
                    )}
                    {(selectedLoadout.ai_tools ?? []).map((t) => (
                      <span key={`ai-${t}`} className={`${styles.loadoutTag} ${styles.tagAi}`}>
                        {t.replace(/_/g, ' ')}
                      </span>
                    ))}
                    {(selectedLoadout.frameworks ?? []).map((fw) => (
                      <span key={`fw-${fw.name}`} className={`${styles.loadoutTag} ${styles.tagFw}`}>
                        {fw.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Custom compose panel (VM-only) */}
          {runtime === 'vm' && mode === 'custom' && (
            <>
              <div className={styles.provisionFormRow}>
                <label className={styles.provisionLabel}>Init Script</label>
                <select
                  className={styles.remoteSelect}
                  value={initScript}
                  onChange={(e) => setInitScript(e.target.value)}
                >
                  {(registry?.init_scripts ?? [
                    { name: 'ubuntu', label: 'Ubuntu 24.04 LTS (full dev)' },
                    { name: 'ubuntu-minimal', label: 'Ubuntu 24.04 LTS (minimal)' },
                    { name: 'alpine', label: 'Alpine Linux (minimal)' },
                  ]).map((s) => (
                    <option key={s.name} value={s.name}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div className={styles.provisionFormRow}>
                <label className={styles.provisionLabel}>Frameworks</label>
                <div className={styles.chipGrid}>
                  {(registry?.frameworks ?? []).map((fw) => {
                    const selected = composeFrameworks.includes(fw.name);
                    return (
                      <button
                        key={fw.name}
                        type="button"
                        className={`${styles.chip} ${selected ? styles.chipSelected : ''} ${fw.reserved ? styles.chipReserved : ''}`}
                        title={fw.description || fw.label}
                        disabled={fw.reserved}
                        onClick={() => !fw.reserved && toggleChip('fw', fw.name)}
                      >{fw.label}</button>
                    );
                  })}
                  {!registry && <span className={styles.formHelp}>Loading registry…</span>}
                </div>
              </div>
              <div className={styles.provisionFormRow}>
                <label className={styles.provisionLabel}>Providers</label>
                <div className={styles.chipGrid}>
                  {(registry?.providers ?? []).map((pv) => {
                    const selected = composeProviders.includes(pv.name);
                    return (
                      <button
                        key={pv.name}
                        type="button"
                        className={`${styles.chip} ${selected ? styles.chipSelected : ''}`}
                        title={pv.label}
                        onClick={() => toggleChip('pv', pv.name)}
                      >{pv.label}</button>
                    );
                  })}
                </div>
              </div>
              {(composeFrameworks.length > 0 || composeProviders.length > 0) && (
                <div className={styles.composeSummary}>
                  <span className={styles.composeLabel}>init:</span> <code>{initScript}</code>{' '}
                  <span className={styles.composeLabel}>frameworks:</span>{' '}
                  {composeFrameworks.length > 0
                    ? composeFrameworks.map((f) => <code key={f}>{f}</code>).reduce((acc, el, i) => i === 0 ? [el] : [...acc, ' ', el], [] as React.ReactNode[])
                    : <em>none</em>}{' '}
                  <span className={styles.composeLabel}>providers:</span>{' '}
                  {composeProviders.length > 0
                    ? composeProviders.map((p) => <code key={p}>{p}</code>).reduce((acc, el, i) => i === 0 ? [el] : [...acc, ' ', el], [] as React.ReactNode[])
                    : <em>none</em>}
                </div>
              )}
            </>
          )}

          {/* Resources (VM-only) */}
          {runtime === 'vm' && (
          <div className={styles.formRowInline}>
            <div className={styles.provisionFormRow}>
              <label className={styles.provisionLabel}>vCPUs</label>
              <select className={styles.remoteSelect} value={vcpus} onChange={(e) => setVcpus(Number(e.target.value))}>
                {VCPU_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className={styles.provisionFormRow}>
              <label className={styles.provisionLabel}>Memory (GB)</label>
              <select className={styles.remoteSelect} value={memoryMb} onChange={(e) => setMemoryMb(Number(e.target.value))}>
                {MEMORY_MB_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className={styles.provisionFormRow}>
              <label className={styles.provisionLabel}>Disk (GB)</label>
              <select className={styles.remoteSelect} value={diskGb} onChange={(e) => setDiskGb(Number(e.target.value))}>
                {DISK_GB_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>
          )}
          {runtime === 'vm' && resourceHint && mode === 'preset' && (
            <div className={styles.resourceHint}>Defaults from loadout applied. Override above if needed.</div>
          )}

          {/* Toggles (VM-only) */}
          {runtime === 'vm' && (
            <>
              <label className={styles.provisionCheckbox}>
                <input type="checkbox" checked={agentshare} onChange={(e) => setAgentshare(e.target.checked)} />
                Enable agentshare mounts
              </label>
              <label className={styles.provisionCheckbox}>
                <input type="checkbox" checked={autostart} onChange={(e) => setAutostart(e.target.checked)} />
                Start VM after creation
              </label>
            </>
          )}

          {error && <div className={styles.error}>{error}</div>}
        </div>
        <div className={styles.modalFooter}>
          <button type="button" className={styles.actionBtnSecondary} onClick={onClose} disabled={provisioning}>
            Cancel
          </button>
          <button
            type="button"
            className={styles.actionBtn}
            onClick={handleProvision}
            disabled={!canSubmit}
            title={
              !validName
                ? 'Enter a valid name first'
                : runtime === 'container' && !effectiveContainerImage
                  ? 'Pick or enter a container image'
                  : runtime === 'vm' && mode === 'custom' && composeProviders.length === 0
                    ? 'Select at least one provider'
                    : ''
            }
          >
            {provisioning
              ? 'Creating…'
              : runtime === 'container'
                ? 'Create Container'
                : 'Create VM'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Sandbox Tasks View (#907) ----

const TASK_STATE_COLORS: Record<string, string> = {
  pending: '#ff9800',
  running: '#2196f3',
  completed: '#4caf50',
  failed: '#f44336',
  cancelled: '#555',
};

function taskStateBadge(state: string) {
  return (
    <span
      className={styles.statusDot}
      style={{ background: TASK_STATE_COLORS[state] ?? '#888' }}
      title={state}
      aria-label={`State: ${state}`}
    />
  );
}

function SandboxTasksView({ sandboxId, connected }: { sandboxId: string; connected: boolean }) {
  const [tasks, setTasks] = useState<SandboxTask[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [manifest, setManifest] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<AgentCandidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<string>('');

  // Poll task list
  useEffect(() => {
    if (!connected) return;
    let active = true;
    async function poll() {
      try {
        const data = await api.sandboxTasks(sandboxId);
        if (active) { setTasks(data.tasks); setTotal(data.total_count); setError(null); }
      } catch (e) {
        if (active) setError(String(e));
      }
    }
    poll();
    const id = setInterval(poll, 3000);
    return () => { active = false; clearInterval(id); };
  }, [sandboxId, connected]);

  // Load routing candidates when form opens (#916)
  useEffect(() => {
    if (!showForm) { setCandidates([]); setSelectedCandidate(''); return; }
    api.routingCandidates({ sandbox_id: sandboxId })
      .then((r) => {
        setCandidates(r.candidates);
        if (r.selected) setSelectedCandidate(r.selected.agent.agentId);
      })
      .catch(() => { /* routing preview is best-effort */ });
  }, [showForm, sandboxId]);

  const handleSubmit = useCallback(async () => {
    if (!manifest.trim()) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const body: SubmitTaskRequest = {
        manifest_yaml: manifest.trim(),
        ...(selectedCandidate ? { agent_filter: { agent_id: selectedCandidate } } : {}),
      };
      await api.submitTask(sandboxId, body);
      setManifest('');
      setShowForm(false);
      // Refresh immediately
      const data = await api.sandboxTasks(sandboxId);
      setTasks(data.tasks);
      setTotal(data.total_count);
    } catch (e) {
      setSubmitError(`Submit failed: ${String(e)}`);
    } finally {
      setSubmitting(false);
    }
  }, [sandboxId, manifest, selectedCandidate]);

  const handleCancel = useCallback(async (taskId: string) => {
    try {
      await api.cancelTask(sandboxId, taskId);
      const data = await api.sandboxTasks(sandboxId);
      setTasks(data.tasks);
      setTotal(data.total_count);
    } catch (e) {
      setError(`Cancel failed: ${String(e)}`);
    }
  }, [sandboxId]);

  if (!connected) {
    return <div className={styles.emptyAgents}>Tasks unavailable while sandbox is offline</div>;
  }

  return (
    <div className={styles.tasksView}>
      <div className={styles.tasksHeader}>
        <span className={styles.tasksCount}>{total} task{total !== 1 ? 's' : ''}</span>
        <button
          type="button"
          className={styles.actionBtn}
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Cancel' : 'New Task'}
        </button>
      </div>

      {showForm && (
        <div className={styles.taskForm}>
          <label className={styles.taskFormLabel} htmlFor="task-manifest">
            Task manifest (YAML)
          </label>
          <textarea
            id="task-manifest"
            className={styles.taskManifestInput}
            value={manifest}
            onChange={(e) => setManifest(e.target.value)}
            placeholder={`name: my-task\nagent: my-agent\ncommand: |\n  aiwg use sdlc && echo done`}
            rows={6}
            disabled={submitting}
          />
          {/* Candidate agent selector (#916) */}
          {candidates.length > 0 && (
            <div className={styles.candidateRow}>
              <label className={styles.taskFormLabel} htmlFor="task-agent">
                Route to agent
              </label>
              <select
                id="task-agent"
                className={styles.remoteSelect}
                value={selectedCandidate}
                onChange={(e) => setSelectedCandidate(e.target.value)}
              >
                <option value="">Auto-select (best match)</option>
                {candidates.map((c) => (
                  <option key={c.agent.agentId} value={c.agent.agentId}>
                    {c.agent.logicalName ?? c.agent.agentId}
                    {c.agent.latestMetrics ? ` — CPU ${c.agent.latestMetrics.cpu_percent.toFixed(0)}%` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
          {submitError && <div className={styles.error}>{submitError}</div>}
          <div className={styles.taskFormActions}>
            <button
              type="button"
              className={styles.actionBtn}
              onClick={handleSubmit}
              disabled={submitting || !manifest.trim()}
            >
              {submitting ? 'Submitting…' : 'Submit'}
            </button>
          </div>
        </div>
      )}

      {error && <div className={styles.error}>{error}</div>}

      {tasks.length === 0 ? (
        <div className={styles.emptyAgents}>No tasks. Use "New Task" to submit one.</div>
      ) : (
        <ul className={styles.taskList}>
          {tasks.map((task) => (
            <li key={task.id} className={styles.taskRow}>
              <div className={styles.taskRowHeader}>
                {taskStateBadge(task.state)}
                <strong className={styles.taskName}>{task.name}</strong>
                <span className={styles.taskState}>{task.state}</span>
                {task.vm_name && <span className={styles.taskMeta}>VM: {task.vm_name}</span>}
              </div>
              <div className={styles.taskRowMeta}>
                <span>Created {fmtTime(task.created_at)}</span>
                {task.progress.tool_calls > 0 && (
                  <span>{task.progress.tool_calls} tool calls</span>
                )}
                {task.progress.current_tool && (
                  <span>Running: {task.progress.current_tool}</span>
                )}
              </div>
              {task.error && <div className={styles.taskError}>{task.error}</div>}
              {(task.state === 'pending' || task.state === 'running') && (
                <button
                  type="button"
                  className={styles.actionBtnDanger}
                  onClick={() => handleCancel(task.id)}
                >
                  Cancel
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---- Agent Card ----

function AgentCard({
  agent,
  sandboxId,
  onAction,
  actionInProgress,
  sandboxConnected,
}: {
  agent: SandboxAgent;
  sandboxId: string;
  onAction: (sandboxId: string, agentId: string, action: 'start' | 'stop' | 'destroy' | 'reprovision') => void;
  actionInProgress: string | null;
  sandboxConnected: boolean;
}) {
  const busy = actionInProgress?.startsWith(agent.agentId);

  return (
    <div
      className={[styles.agentCard, !sandboxConnected ? styles.agentCardOffline : ''].join(' ')}
      role="listitem"
    >
      <div className={styles.agentHeader}>
        {statusBadge(sandboxConnected ? agent.status : 'disconnected')}
        <strong className={styles.agentId}>{agent.agentId}</strong>
        {agent.loadout && (
          <span className={styles.loadoutBadge}>{agent.loadout}</span>
        )}
      </div>

      {agent.aiwgFrameworks && agent.aiwgFrameworks.length > 0 && (
        <div className={styles.frameworks}>
          {agent.aiwgFrameworks.map((fw) => (
            <span
              key={fw.name}
              className={styles.fwBadge}
              title={`Providers: ${fw.providers.join(', ')}${fw.version ? ` · v${fw.version}` : ''}`}
            >
              {fw.name}{fw.version && <span className={styles.fwVersion}> v{fw.version}</span>}
            </span>
          ))}
        </div>
      )}

      {/* Metrics bars (#911) */}
      {agent.latestMetrics && (
        <div className={styles.metricsRow}>
          <MetricBar
            label="CPU"
            value={agent.latestMetrics.cpu_percent}
            max={100}
            unit="%"
          />
          {agent.latestMetrics.memory_total_bytes > 0 && (
            <MetricBar
              label="Mem"
              value={Math.round(agent.latestMetrics.memory_used_bytes / 1024 / 1024)}
              max={Math.round(agent.latestMetrics.memory_total_bytes / 1024 / 1024)}
              unit="MB"
            />
          )}
        </div>
      )}

      {/* Provisioning step (#911) */}
      {agent.status === 'provisioning' && agent.provisioningStep && (
        <div className={[styles.provisioningStep, agent.provisioningStalled ? styles.provisioningStalled : ''].join(' ')}>
          <span className={styles.provisioningLabel}>
            {agent.provisioningStalled ? '⚠ stalled: ' : ''}
            {agent.provisioningStep.step}
          </span>
          {agent.provisioningStep.total_steps !== undefined && agent.provisioningStep.step_index !== undefined && (
            <span className={styles.provisioningProgress}>
              {agent.provisioningStep.step_index + 1}/{agent.provisioningStep.total_steps}
            </span>
          )}
        </div>
      )}

      <div className={styles.agentActions}>
        {sandboxConnected && agent.status === 'ready' && (
          <button
            type="button"
            className={styles.actionBtn}
            onClick={() => onAction(sandboxId, agent.agentId, 'stop')}
            disabled={busy}
          >
            Stop
          </button>
        )}
        {sandboxConnected && agent.status === 'disconnected' && (
          <button
            type="button"
            className={styles.actionBtn}
            onClick={() => onAction(sandboxId, agent.agentId, 'start')}
            disabled={busy}
          >
            Start
          </button>
        )}
        {sandboxConnected && (
          <>
            <button
              type="button"
              className={styles.actionBtnSecondary}
              onClick={() => onAction(sandboxId, agent.agentId, 'reprovision')}
              disabled={busy}
            >
              Reprovision
            </button>
            <button
              type="button"
              className={styles.actionBtnDanger}
              onClick={() => onAction(sandboxId, agent.agentId, 'destroy')}
              disabled={busy}
            >
              Destroy
            </button>
          </>
        )}
        {!sandboxConnected && (
          <span className={styles.offlineNote}>Actions unavailable while offline</span>
        )}
      </div>

      {/* Per-card session picker removed — terminal sessions are managed by
          the multi-pane PaneStack at the top of the panel (#1146 phase 3). */}
    </div>
  );
}

