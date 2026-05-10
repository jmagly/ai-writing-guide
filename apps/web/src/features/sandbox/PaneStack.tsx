/**
 * Multi-Pane Terminal Stack (#1146 phase 3, section B)
 *
 * Holds N independently-attached `TerminalPane` instances, displays a tab
 * strip header for switching foreground, and lets the operator close any
 * tab. Inactive panes are kept mounted (display:none) so their xterm + WS
 * stay attached and their output buffers continue to accumulate — switching
 * foreground does NOT disconnect.
 *
 * The agentic-sandbox dashboard ships a similar `PanesPanel` (`app.js`,
 * #178/#180) — same UX, simpler styling here because we lean on the
 * existing SandboxPanel CSS module.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { TerminalPane } from './SessionPicker.js';
import type { SandboxAgent } from '../../lib/api.js';
import {
  TmuxCheatsheetPanel,
  TmuxCheatsheetToggle,
  useTmuxCheatsheet,
} from './TmuxCheatsheet.js';

const HEIGHT_STORAGE_KEY = 'aiwg:sandbox:paneStackHeight';
const MIN_HEIGHT = 200;
const DEFAULT_HEIGHT = 380;

function loadStoredHeight(): number {
  try {
    const raw = window.localStorage.getItem(HEIGHT_STORAGE_KEY);
    if (!raw) return DEFAULT_HEIGHT;
    const n = parseInt(raw, 10);
    if (!Number.isFinite(n) || n < MIN_HEIGHT) return DEFAULT_HEIGHT;
    return n;
  } catch {
    return DEFAULT_HEIGHT;
  }
}

function maxAllowedHeight(): number {
  // Cap at 90% of viewport so tab strip / page chrome stay reachable.
  if (typeof window === 'undefined') return 2000;
  return Math.max(MIN_HEIGHT, Math.floor(window.innerHeight * 0.9));
}

export interface PaneSpec {
  /** Stable identity per (sandboxId, agentId) — opening the same instance
   *  twice focuses the existing pane instead of duplicating it. */
  id: string;
  sandboxId: string;
  agentId: string;
  /** Operator-facing label — VM/container/agent name. */
  label: string;
  /** Optional runtime kind for the tab badge. */
  kind?: 'vm' | 'container' | 'agent';
}

export interface PaneStackHandle {
  /** Open or focus a pane for the given instance. Returns the pane id. */
  openPane: (spec: Omit<PaneSpec, 'id'>) => string;
}

export interface PaneStackProps {
  /** Latest sandbox-agent inventory for the active sandbox, used to look up
   *  per-pane CPU/MEM/DSK live stats. */
  agentsBySandbox: Record<string, SandboxAgent[]>;
  /** Callback fired when the active pane changes — used by SandboxPanel to
   *  sync the sidebar's selected-instance highlight. */
  onActiveChange?: (label: string | null) => void;
  /** Imperative handle exposed to parent so external triggers (e.g.
   *  clicking an instance row) can call openPane. */
  onMount?: (handle: PaneStackHandle) => void;
}

function paneKey(sandboxId: string, agentId: string): string {
  return `${sandboxId}::${agentId}`;
}

export function PaneStack({ agentsBySandbox, onActiveChange, onMount }: PaneStackProps) {
  const [panes, setPanes] = useState<PaneSpec[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  // Tmux cheatsheet open/close state — persisted across reloads (#1166).
  const cheatsheet = useTmuxCheatsheet();
  const [paneHeight, setPaneHeight] = useState<number>(() =>
    typeof window === 'undefined' ? DEFAULT_HEIGHT : loadStoredHeight(),
  );
  const dragStateRef = useRef<{ startY: number; startHeight: number } | null>(null);

  const onResizeStart = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.preventDefault();
      dragStateRef.current = { startY: e.clientY, startHeight: paneHeight };
      const onMove = (ev: MouseEvent) => {
        const s = dragStateRef.current;
        if (!s) return;
        const delta = ev.clientY - s.startY;
        const next = Math.min(maxAllowedHeight(), Math.max(MIN_HEIGHT, s.startHeight + delta));
        setPaneHeight(next);
      };
      const onUp = () => {
        dragStateRef.current = null;
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
      };
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'row-resize';
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    },
    [paneHeight],
  );

  // Persist height changes (debounced via the natural mouseup boundary —
  // each render writes the latest committed value).
  useEffect(() => {
    try {
      window.localStorage.setItem(HEIGHT_STORAGE_KEY, String(paneHeight));
    } catch {
      /* localStorage unavailable — accept the in-memory value */
    }
  }, [paneHeight]);

  const openPane = useCallback((spec: Omit<PaneSpec, 'id'>) => {
    const id = paneKey(spec.sandboxId, spec.agentId);
    setPanes((prev) => {
      if (prev.some((p) => p.id === id)) return prev;
      return [...prev, { ...spec, id }];
    });
    setActiveId(id);
    return id;
  }, []);

  useEffect(() => {
    onMount?.({ openPane });
  }, [openPane, onMount]);

  useEffect(() => {
    const active = panes.find((p) => p.id === activeId);
    onActiveChange?.(active?.label ?? null);
  }, [activeId, panes, onActiveChange]);

  const closePane = useCallback(
    (id: string) => {
      setPanes((prev) => {
        const next = prev.filter((p) => p.id !== id);
        if (id === activeId) {
          // Focus the right-neighbor (or left if we closed the last tab)
          const idx = prev.findIndex((p) => p.id === id);
          const fallback = next[idx] ?? next[idx - 1] ?? null;
          setActiveId(fallback?.id ?? null);
        }
        return next;
      });
    },
    [activeId],
  );

  if (panes.length === 0) return null;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        borderBottom: '1px solid #2a2a2a',
        background: '#0d0d0d',
      }}
    >
      {/* Tab strip */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          padding: '4px 8px',
          background: '#161616',
          borderBottom: '1px solid #2a2a2a',
          overflowX: 'auto',
        }}
        role="tablist"
        aria-label="Open instance panes"
      >
        {/* Tmux cheatsheet toggle — pinned left, ahead of the dynamic tab list,
            so its position is stable as panes open/close (#1166). */}
        <TmuxCheatsheetToggle open={cheatsheet.open} onToggle={cheatsheet.toggle} />
        {panes.map((p) => {
          const isActive = p.id === activeId;
          const badge = p.kind === 'vm' ? 'VM' : p.kind === 'container' ? 'CT' : 'AG';
          const badgeBg = p.kind === 'vm' ? '#1a3a5a' : p.kind === 'container' ? '#1a4a2a' : '#3a2a4a';
          const badgeFg = p.kind === 'vm' ? '#7fb8ff' : p.kind === 'container' ? '#7fdc7f' : '#c896e8';
          return (
            <div
              key={p.id}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '3px 6px 3px 8px',
                borderRadius: 4,
                fontSize: 12,
                background: isActive ? '#2a2a2a' : 'transparent',
                color: isActive ? '#ddd' : '#999',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveId(p.id)}
            >
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
              <span>{p.label}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  closePane(p.id);
                }}
                title="Close pane"
                aria-label={`Close pane ${p.label}`}
                style={{
                  marginLeft: 4,
                  background: 'transparent',
                  border: 0,
                  color: '#777',
                  cursor: 'pointer',
                  fontSize: 11,
                  padding: '0 2px',
                }}
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>

      {/* Tmux cheatsheet panel — sits between the tab strip and the active
          pane when toggled open. Default-collapsed, so it doesn't steal
          vertical real estate from the terminal. State persists in
          localStorage (#1166). */}
      <TmuxCheatsheetPanel open={cheatsheet.open} />

      {/* Stack of panes — keep all mounted, hide non-active so each pane's
          WS + xterm stay attached and continue buffering output even when
          backgrounded. Issue #1146 acceptance: "switching foreground works
          without disconnecting."
          Height is operator-controlled via the drag handle below (#1153)
          and persisted to localStorage across reloads. SessionPicker's
          ResizeObserver fires xterm.fit() so PTY cols/rows stay correct. */}
      <div style={{ position: 'relative', height: paneHeight }}>
        {panes.map((p) => {
          const isActive = p.id === activeId;
          const agents = agentsBySandbox[p.sandboxId] ?? [];
          const agent = agents.find((a) => a.agentId === p.agentId);
          const stats = agent?.latestMetrics
            ? {
                cpu_percent: agent.latestMetrics.cpu_percent,
                memory_used_bytes: agent.latestMetrics.memory_used_bytes,
                memory_total_bytes: agent.latestMetrics.memory_total_bytes,
                disk_used_bytes: (agent.latestMetrics as { disk_used_bytes?: number }).disk_used_bytes,
                disk_total_bytes: (agent.latestMetrics as { disk_total_bytes?: number }).disk_total_bytes,
              }
            : undefined;
          return (
            <div
              key={p.id}
              style={{
                display: isActive ? 'block' : 'none',
                height: '100%',
              }}
              role="tabpanel"
              aria-hidden={!isActive}
            >
              <TerminalPane sandboxId={p.sandboxId} agentId={p.agentId} stats={stats} />
            </div>
          );
        })}
      </div>

      {/* Vertical resize handle — drag to grow/shrink pane stack (#1153).
          Sits between PaneStack and the agent grid below. */}
      <div
        role="separator"
        aria-orientation="horizontal"
        aria-label="Resize terminal pane stack"
        onMouseDown={onResizeStart}
        style={{
          height: 6,
          cursor: 'row-resize',
          background: '#1a1a1a',
          borderTop: '1px solid #2a2a2a',
          borderBottom: '1px solid #2a2a2a',
          flexShrink: 0,
        }}
        title="Drag to resize"
      />
    </div>
  );
}
