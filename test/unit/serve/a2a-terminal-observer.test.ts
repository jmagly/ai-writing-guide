/**
 * A2A terminal observer tests.
 *
 * @issue #1374
 * @source src/serve/a2a-terminal-observer.ts
 */

import { describe, expect, it } from 'vitest';
import { observeA2ATerminalState } from '../../../src/serve/a2a-terminal-observer.js';
import { routeDispatch } from '../../../src/serve/dispatch-router.js';
import {
  ExecutorRegistry,
  type ExecutorRegistration,
} from '../../../src/serve/executor-registry.js';
import type { Task } from '../../../src/a2a/types.js';

const EXECUTOR_ID = '019da2c3-fde4-7471-8ca7-377d8d09be4b';

function mkExecutor(): ExecutorRegistration {
  return {
    executorId: EXECUTOR_ID,
    name: 'sandbox',
    version: '1.0.0',
    specVersion: '1.0.0',
    transportEndpoints: {
      rest: 'http://sandbox.test',
      ws: 'ws://sandbox.test/ws',
    },
    capabilities: ['isolation:container', 'runtime:codex'],
    token: 'tok',
    connected: true,
    registeredAt: '2026-05-17T00:00:00.000Z',
    currentMissions: new Set(),
  };
}

function mkTask(state: Task['status']['state'], overrides: Record<string, unknown> = {}): Task {
  return {
    id: 'task-1',
    status: {
      state,
      timestamp: '2026-05-17T16:01:06.171Z',
      ...overrides,
    } as Task['status'],
  };
}

function setupRegistry(): { registry: ExecutorRegistry; executor: ExecutorRegistration } {
  const registry = new ExecutorRegistry();
  const executor = mkExecutor();
  registry.register({
    executor_id: executor.executorId,
    name: executor.name,
    version: executor.version,
    spec_version: executor.specVersion,
    transport_endpoints: executor.transportEndpoints,
    capabilities: executor.capabilities,
  });
  registry.assignMission('mission-1', executor.executorId);
  expect(registry.get(executor.executorId)?.active_mission_count).toBe(1);
  return { registry, executor };
}

describe('observeA2ATerminalState', () => {
  it('transitions a completed sandbox task to terminal AIWG mission state', async () => {
    const { registry, executor } = setupRegistry();

    await observeA2ATerminalState(
      registry,
      executor,
      'mission-1',
      'instance-1',
      mkTask('completed', { summary: 'command exited 0', exit_code: 0 }),
      { pollIntervalMs: 1, maxPolls: 0 }
    );

    const mission = registry.getMission('mission-1');
    expect(mission?.state).toBe('done');
    expect(mission?.exitCode).toBe(0);
    expect(mission?.completedAt).toBeTruthy();
    expect(mission?.recentEvents.at(-1)?.event).toBe('mission.completed');
    expect(registry.get(executor.executorId)?.active_mission_count).toBe(0);
  });

  it('polls a non-terminal sandbox task and maps failed terminal state to mission.failed', async () => {
    const { registry, executor } = setupRegistry();
    const fetchStub: typeof fetch = async () =>
      new Response(
        JSON.stringify({
          id: 'task-1',
          status: {
            state: 'failed',
            timestamp: '2026-05-17T16:01:07.000Z',
            summary: 'command exited 1',
            exit_code: 1,
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      );

    await observeA2ATerminalState(
      registry,
      executor,
      'mission-1',
      'instance-1',
      mkTask('submitted'),
      { fetch: fetchStub, pollIntervalMs: 1, maxPolls: 1 }
    );

    const mission = registry.getMission('mission-1');
    expect(mission?.state).toBe('failed');
    expect(mission?.exitCode).toBe(1);
    expect(mission?.error).toBe('command exited 1');
    expect(mission?.recentEvents.at(-1)?.event).toBe('mission.failed');
    expect(registry.get(executor.executorId)?.active_mission_count).toBe(0);
  });

  it('covers dispatch -> messages:send -> terminal task -> terminal AIWG mission state', async () => {
    const { registry, executor } = setupRegistry();
    const calls: string[] = [];
    const fetchStub: typeof fetch = async (input) => {
      const url = typeof input === 'string' ? input : (input as Request).url;
      calls.push(url);
      if (url.endsWith('/messages:send')) {
        return new Response(
          JSON.stringify({
            id: 'task-1',
            status: { state: 'submitted', timestamp: '2026-05-17T16:01:06.000Z' },
          }),
          { status: 202, headers: { 'content-type': 'application/json' } }
        );
      }
      if (url.endsWith('/tasks/task-1')) {
        return new Response(
          JSON.stringify({
            id: 'task-1',
            status: {
              state: 'completed',
              timestamp: '2026-05-17T16:01:07.000Z',
              summary: 'command exited 0',
              exit_code: 0,
            },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        );
      }
      return new Response('not found', { status: 404 });
    };

    const dispatch = await routeDispatch(
      executor,
      {
        mission_id: 'mission-1',
        objective: 'print READY',
        completion: 'task completes',
        a2a_instance_id: 'instance-1',
      },
      { fetch: fetchStub }
    );

    expect(dispatch.dispatchPath).toBe('v2');
    expect(dispatch.task?.id).toBe('task-1');

    await observeA2ATerminalState(
      registry,
      executor,
      'mission-1',
      dispatch.a2aInstanceId!,
      dispatch.task!,
      { fetch: fetchStub, pollIntervalMs: 1, maxPolls: 1 }
    );

    expect(calls.some((url) => url.endsWith('/agents/instance-1/v1/messages:send'))).toBe(true);
    expect(calls.some((url) => url.endsWith('/agents/instance-1/v1/tasks/task-1'))).toBe(true);
    expect(registry.getMission('mission-1')?.state).toBe('done');
    expect(registry.get(executor.executorId)?.active_mission_count).toBe(0);
  });
});
