import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getSessionRegistrySnapshot,
  interactivePromptFrom,
  markRegistrySessionViewed,
  registryResponseNeededItems,
  resetSessionRegistryForTest,
  sessionRegistryKey,
  setRegistryActiveSession,
  subscribeSessionRegistry,
  updateRegistrySessionSnapshot,
  upsertRegistrySessions,
} from './sessionRegistry';
import type { SessionInfo } from './types';

const SESSION_A: SessionInfo = {
  id: 'sess-a',
  instance_id: 'inst-a',
  attach_url: 'ws://x/agents/inst-a/sessions/sess-a/attach',
  session_name: 'terminal-a',
};

const SESSION_B: SessionInfo = {
  id: 'sess-b',
  instance_id: 'inst-b',
  attach_url: 'ws://x/agents/inst-b/sessions/sess-b/attach',
  session_name: 'terminal-b',
};

beforeEach(() => resetSessionRegistryForTest());

describe('sessionRegistry', () => {
  it('keys entries by instance/session identity and preserves existing snapshot state on metadata refresh', () => {
    upsertRegistrySessions([SESSION_A], '2026-07-06T20:00:00.000Z');
    updateRegistrySessionSnapshot('inst-a', 'sess-a', 'hello\n', { now: '2026-07-06T20:00:01.000Z' });
    upsertRegistrySessions([{ ...SESSION_A, session_name: 'renamed' }], '2026-07-06T20:00:02.000Z');

    const entry = getSessionRegistrySnapshot().entries[sessionRegistryKey('inst-a', 'sess-a')];
    expect(entry.metadata.session_name).toBe('renamed');
    expect(entry.snapshot?.text).toBe('hello\n');
    expect(entry.unread).toBe(true);
  });

  it('tracks the active attached session without dropping background entries', () => {
    upsertRegistrySessions([SESSION_A, SESSION_B]);
    setRegistryActiveSession('inst-a', 'sess-a', '2026-07-06T20:01:00.000Z');

    const snapshot = getSessionRegistrySnapshot();
    expect(snapshot.activeKey).toBe('inst-a:sess-a');
    expect(snapshot.entries['inst-a:sess-a'].attached).toBe(true);
    expect(snapshot.entries['inst-b:sess-b'].attached).toBe(false);
  });

  it('marks background snapshot changes unread and clears unread on view', () => {
    upsertRegistrySessions([SESSION_A]);
    updateRegistrySessionSnapshot('inst-a', 'sess-a', 'new output\n', { now: '2026-07-06T20:02:00.000Z' });
    expect(getSessionRegistrySnapshot().entries['inst-a:sess-a'].unread).toBe(true);

    markRegistrySessionViewed('inst-a', 'sess-a');
    expect(getSessionRegistrySnapshot().entries['inst-a:sess-a'].unread).toBe(false);
  });

  it('does not mark the actively attached session unread for its own snapshot changes', () => {
    upsertRegistrySessions([SESSION_A]);
    setRegistryActiveSession('inst-a', 'sess-a');
    updateRegistrySessionSnapshot('inst-a', 'sess-a', 'driver output\n');

    expect(getSessionRegistrySnapshot().entries['inst-a:sess-a'].unread).toBe(false);
  });

  it('detects response-needed prompts from snapshot tails', () => {
    upsertRegistrySessions([SESSION_A]);
    updateRegistrySessionSnapshot('inst-a', 'sess-a', 'Deploy to prod? [y/N]\n', { now: '2026-07-06T20:03:00.000Z' });

    const response = getSessionRegistrySnapshot().entries['inst-a:sess-a'].responseNeeded;
    expect(response).toMatchObject({
      needed: true,
      prompt: 'Deploy to prod? [y/N]',
      since: '2026-07-06T20:03:00.000Z',
      source: 'snapshot',
    });
  });

  it('projects response-needed entries for the approvals inbox', () => {
    upsertRegistrySessions([SESSION_A]);
    updateRegistrySessionSnapshot('inst-a', 'sess-a', 'Deploy to prod? [y/N]\n', { now: '2026-07-06T20:03:00.000Z' });

    expect(registryResponseNeededItems(getSessionRegistrySnapshot())).toEqual([{
      id: 'pty:inst-a:sess-a',
      instance_id: 'inst-a',
      prompt: 'Deploy to prod? [y/N]',
      source: 'snapshot',
      status: 'response-needed',
      attach_url: 'ws://x/agents/inst-a/sessions/sess-a/attach',
    }]);
  });

  it('notifies subscribers when registry state changes', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeSessionRegistry(listener);
    upsertRegistrySessions([SESSION_A]);
    unsubscribe();
    upsertRegistrySessions([SESSION_B]);

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('exports the prompt heuristic for monitor and PTY plumbing reuse', () => {
    expect(interactivePromptFrom('Choose one\n1. yes\n2. no\n')).toContain('Choose one');
    expect(interactivePromptFrom('plain build output\n')).toBe('');
  });
});
