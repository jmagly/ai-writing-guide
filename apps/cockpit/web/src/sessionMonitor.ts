import { useEffect, useRef } from 'react';
import { apiRaw } from './api';
import {
  getSessionRegistrySnapshot,
  updateRegistrySessionSnapshot,
  useSessionRegistry,
} from './sessionRegistry';

interface ScreenSnapshotResponse {
  text?: string;
  snapshot?: string;
  screen?: string;
  content?: string;
  seq?: number;
  sequence?: number;
  anchor_sequence?: number;
  anchorSequence?: number;
}

export function useSessionSnapshotMonitor(refreshMs = 12_000) {
  useSessionRegistry();
  // Sessions whose screen endpoint returned 404 (no server-side snapshot — e.g.
  // host-runtime PTYs). Skip them on subsequent ticks so we don't re-request a
  // known-missing endpoint every cycle and flood the console with 404s.
  const noScreenRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;
    const schedule = (ms = refreshMs) => {
      timer = window.setTimeout(tick, ms);
    };
    const tick = async () => {
      if (cancelled) return;
      if (document.hidden) {
        schedule(refreshMs);
        return;
      }
      const entries = Object.values(getSessionRegistrySnapshot().entries)
        .filter((entry) => !entry.attached)
        .filter((entry) => entry.metadata.has_screen !== false)
        .filter((entry) => !noScreenRef.current.has(`${entry.instanceId}:${entry.sessionId}`));
      await Promise.all(entries.map(async (entry) => {
        const key = `${entry.instanceId}:${entry.sessionId}`;
        try {
          const res = await apiRaw(
            `/api/instances/${encodeURIComponent(entry.instanceId)}/sessions/${encodeURIComponent(entry.sessionId)}/screen`,
          );
          if (!res.ok) {
            // No server-side snapshot for this session (e.g. host PTY). Stop
            // polling it so it doesn't re-404 every cycle.
            if (res.status === 404) noScreenRef.current.add(key);
            return;
          }
          const snapshot = (await res.json()) as ScreenSnapshotResponse;
          const text = String(snapshot.text ?? snapshot.snapshot ?? snapshot.screen ?? snapshot.content ?? '');
          const seq = snapshot.seq ?? snapshot.sequence ?? snapshot.anchor_sequence ?? snapshot.anchorSequence;
          updateRegistrySessionSnapshot(entry.instanceId, entry.sessionId, text, { seq: typeof seq === 'number' ? seq : undefined });
        } catch {
          // Snapshot support is opportunistic. A transient network error should
          // not break the active driven terminal or session list.
        }
      }));
      if (!cancelled) schedule(refreshMs);
    };
    schedule(0);
    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [refreshMs]);
}
