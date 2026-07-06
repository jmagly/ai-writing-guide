import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSessionSnapshotMonitor } from './sessionMonitor';
import {
  getSessionRegistrySnapshot,
  resetSessionRegistryForTest,
  setRegistryActiveSession,
  upsertRegistrySessions,
} from './sessionRegistry';
import type { SessionInfo } from './types';

const BACKGROUND_SESSION: SessionInfo = {
  id: 'sess-bg',
  instance_id: 'inst-bg',
  attach_url: 'ws://x/agents/inst-bg/sessions/sess-bg/attach',
  session_name: 'background',
};

beforeEach(() => {
  resetSessionRegistryForTest();
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('useSessionSnapshotMonitor', () => {
  it('polls non-attached session snapshots into the registry', async () => {
    upsertRegistrySessions([BACKGROUND_SESSION]);
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).includes('/api/instances/inst-bg/sessions/sess-bg/screen')) {
        return jsonResponse({ text: 'Background prompt? [y/N]\n', seq: 4 });
      }
      return new Response('{}', { status: 404 });
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    renderHook(() => useSessionSnapshotMonitor(10_000));
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });

    const entry = getSessionRegistrySnapshot().entries['inst-bg:sess-bg'];
    expect(entry.snapshot?.text).toContain('Background prompt?');
    expect(entry.responseNeeded.needed).toBe(true);
    expect(entry.unread).toBe(true);
    expect(MockFetchUrls(fetchMock)).toContain('/api/instances/inst-bg/sessions/sess-bg/screen');
  });

  it('does not poll the actively attached session', async () => {
    upsertRegistrySessions([BACKGROUND_SESSION]);
    setRegistryActiveSession('inst-bg', 'sess-bg');
    const fetchMock = vi.fn(async () => jsonResponse({ text: 'should not fetch' }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    renderHook(() => useSessionSnapshotMonitor(10_000));
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('pauses snapshot polling while the document is hidden', async () => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    upsertRegistrySessions([BACKGROUND_SESSION]);
    const fetchMock = vi.fn(async () => jsonResponse({ text: 'hidden' }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    renderHook(() => useSessionSnapshotMonitor(10_000));
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });

    expect(fetchMock).not.toHaveBeenCalled();
  });
});

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function MockFetchUrls(fetchMock: ReturnType<typeof vi.fn>): string {
  return fetchMock.mock.calls.map(([input]) => String(input)).join('\n');
}
