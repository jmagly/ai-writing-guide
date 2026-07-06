import { useSyncExternalStore } from 'react';
import type { SessionInfo } from './types';

export interface RegistryResponseNeeded {
  needed: boolean;
  prompt: string;
  since: string | null;
  source: 'snapshot' | 'pty';
}

export interface RegistrySnapshot {
  text: string;
  lines: string[];
  fetchedAt: string;
  seq?: number;
}

export interface RegistrySessionEntry {
  key: string;
  instanceId: string;
  sessionId: string;
  metadata: SessionInfo;
  lastOutputAt: string | null;
  unread: boolean;
  responseNeeded: RegistryResponseNeeded;
  snapshot: RegistrySnapshot | null;
  attached: boolean;
  updatedAt: string;
}

interface RegistryState {
  activeKey: string | null;
  entries: Record<string, RegistrySessionEntry>;
}

type Listener = () => void;

const EMPTY_RESPONSE: RegistryResponseNeeded = { needed: false, prompt: '', since: null, source: 'snapshot' };

let state: RegistryState = { activeKey: null, entries: {} };
const listeners = new Set<Listener>();

export function sessionRegistryKey(instanceId: string, sessionId: string): string {
  return `${instanceId}:${sessionId}`;
}

export function sessionRegistryKeyFor(s: Pick<SessionInfo, 'instance_id' | 'id'>): string {
  return sessionRegistryKey(s.instance_id, s.id);
}

export function subscribeSessionRegistry(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSessionRegistrySnapshot(): RegistryState {
  return state;
}

export function useSessionRegistry(): RegistryState {
  return useSyncExternalStore(subscribeSessionRegistry, getSessionRegistrySnapshot, getSessionRegistrySnapshot);
}

export function resetSessionRegistryForTest() {
  state = { activeKey: null, entries: {} };
  emit();
}

export function upsertRegistrySessions(sessions: SessionInfo[], now = new Date().toISOString()) {
  if (!sessions.length) return;
  update((prev) => {
    const entries = { ...prev.entries };
    for (const session of sessions) {
      const key = sessionRegistryKeyFor(session);
      const prior = entries[key];
      entries[key] = {
        key,
        instanceId: session.instance_id,
        sessionId: session.id,
        metadata: { ...(prior?.metadata ?? {}), ...session },
        lastOutputAt: prior?.lastOutputAt ?? null,
        unread: prior?.unread ?? false,
        responseNeeded: prior?.responseNeeded ?? EMPTY_RESPONSE,
        snapshot: prior?.snapshot ?? null,
        attached: prior?.attached ?? false,
        updatedAt: now,
      };
    }
    return { ...prev, entries };
  });
}

export function setRegistryActiveSession(instanceId: string | null, sessionId: string | null, now = new Date().toISOString()) {
  const nextActiveKey = instanceId && sessionId ? sessionRegistryKey(instanceId, sessionId) : null;
  update((prev) => {
    const entries = { ...prev.entries };
    for (const [key, entry] of Object.entries(entries)) {
      if (entry.attached !== (key === nextActiveKey)) entries[key] = { ...entry, attached: key === nextActiveKey, updatedAt: now };
    }
    return { activeKey: nextActiveKey, entries };
  });
}

export function markRegistrySessionViewed(instanceId: string, sessionId: string, now = new Date().toISOString()) {
  const key = sessionRegistryKey(instanceId, sessionId);
  updateEntry(key, (entry) => ({ ...entry, unread: false, updatedAt: now }));
}

export function updateRegistrySessionSnapshot(
  instanceId: string,
  sessionId: string,
  snapshotText: string,
  options: { seq?: number; now?: string; source?: RegistryResponseNeeded['source'] } = {},
) {
  const key = sessionRegistryKey(instanceId, sessionId);
  const now = options.now ?? new Date().toISOString();
  updateEntry(key, (entry) => {
    const previousText = entry.snapshot?.text ?? '';
    const text = snapshotText;
    const changed = text !== previousText;
    const prompt = interactivePromptFrom(text);
    return {
      ...entry,
      lastOutputAt: changed ? now : entry.lastOutputAt,
      unread: entry.attached ? false : entry.unread || changed,
      responseNeeded: prompt
        ? { needed: true, prompt, since: entry.responseNeeded.prompt === prompt ? entry.responseNeeded.since : now, source: options.source ?? 'snapshot' }
        : { ...EMPTY_RESPONSE, source: options.source ?? 'snapshot' },
      snapshot: { text, lines: tailLines(text), fetchedAt: now, seq: options.seq },
      updatedAt: now,
    };
  });
}

function updateEntry(key: string, mapper: (entry: RegistrySessionEntry) => RegistrySessionEntry) {
  update((prev) => {
    const current = prev.entries[key];
    if (!current) return prev;
    return { ...prev, entries: { ...prev.entries, [key]: mapper(current) } };
  });
}

function update(mapper: (prev: RegistryState) => RegistryState) {
  const next = mapper(state);
  if (next === state) return;
  state = next;
  emit();
}

function emit() {
  for (const listener of listeners) listener();
}

function tailLines(text: string, maxLines = 24): string[] {
  return text.replace(/\r/g, '\n').split('\n').filter(Boolean).slice(-maxLines);
}

function stripAnsi(text: string): string {
  return text
    .replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '')
    .replace(/\x1b\][^\x07]*(?:\x07|\x1b\\)/g, '')
    .replace(/\x1b[()][A-Za-z0-9]/g, '');
}

export function interactivePromptFrom(output: string): string {
  const clean = stripAnsi(output).replace(/\r/g, '\n');
  const lines = clean.split('\n').map((line) => line.trim()).filter(Boolean).slice(-24);
  const text = lines.join('\n');
  const promptPatterns = [
    /Enter to select\b/i,
    /(?:↑|up)\/(?:↓|down)|arrow keys|navigate/i,
    /\bEsc to cancel\b/i,
    /\b(?:y\/n|Y\/n|y\/N|\[y\/N\]|\[Y\/n\])\b/,
    /\b(?:choose|select|pick) (?:one|an option|a number)\b/i,
    /\?$/,
  ];
  if (!promptPatterns.some((re) => re.test(text))) return '';
  return lines.slice(-10).join('\n').slice(0, 900);
}
