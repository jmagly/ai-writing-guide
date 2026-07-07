import { useEffect } from 'react';
import { api } from './api';
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
        .filter((entry) => entry.metadata.has_screen !== false);
      await Promise.all(entries.map(async (entry) => {
        try {
          const snapshot = await api<ScreenSnapshotResponse>(
            `/api/instances/${encodeURIComponent(entry.instanceId)}/sessions/${encodeURIComponent(entry.sessionId)}/screen`,
          );
          const text = String(snapshot.text ?? snapshot.snapshot ?? snapshot.screen ?? snapshot.content ?? '');
          const seq = snapshot.seq ?? snapshot.sequence ?? snapshot.anchor_sequence ?? snapshot.anchorSequence;
          updateRegistrySessionSnapshot(entry.instanceId, entry.sessionId, text, { seq: typeof seq === 'number' ? seq : undefined });
        } catch {
          // Snapshot support is opportunistic. Missing screen-state should not
          // break the active driven terminal or session list.
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
