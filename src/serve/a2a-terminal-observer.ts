/**
 * A2A terminal observer.
 *
 * v2 dispatch returns an A2A Task immediately. Executors may not also emit the
 * executor-contract mission.* event stream, so aiwg serve must follow the task
 * until it reaches a terminal A2A state and then project that state into the
 * ExecutorRegistry mission model.
 *
 * @issue #1374
 */

import { A2AClient } from '../a2a/client.js';
import {
  isTerminalTaskState,
  type Task,
  type TaskState,
} from '../a2a/types.js';
import type {
  EventEnvelope,
  ExecutorRegistration,
  ExecutorRegistry,
} from './executor-registry.js';

export interface A2ATerminalObserverOptions {
  fetch?: typeof fetch;
  pollIntervalMs?: number;
  maxPolls?: number;
  onError?: (err: unknown) => void;
}

const DEFAULT_POLL_INTERVAL_MS = 1000;
const DEFAULT_MAX_POLLS = 300;

export async function observeA2ATerminalState(
  registry: ExecutorRegistry,
  executor: ExecutorRegistration,
  missionId: string,
  a2aInstanceId: string,
  initialTask: Task,
  opts: A2ATerminalObserverOptions = {}
): Promise<void> {
  try {
    const clientOpts: ConstructorParameters<typeof A2AClient>[0] = {
      baseUrl: executor.transportEndpoints.rest,
      bearer: executor.token,
      instanceId: a2aInstanceId,
    };
    if (opts.fetch) clientOpts.fetch = opts.fetch;
    const client = new A2AClient(clientOpts);

    let task = initialTask;
    emitNonTerminalProgress(registry, executor.executorId, missionId, task);

    for (let attempt = 0; attempt <= (opts.maxPolls ?? DEFAULT_MAX_POLLS); attempt++) {
      if (isTerminalTaskState(task.status.state)) {
        emitTerminalTask(registry, executor.executorId, missionId, task);
        return;
      }

      if (attempt === (opts.maxPolls ?? DEFAULT_MAX_POLLS)) break;
      await sleep(opts.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS);
      task = await client.getTask(task.id);
      emitNonTerminalProgress(registry, executor.executorId, missionId, task);
    }

    registry.failMission(
      missionId,
      `A2A task ${initialTask.id} did not reach a terminal state before observer timeout`
    );
  } catch (err) {
    registry.failMission(
      missionId,
      `A2A terminal observer failed: ${(err as Error).message ?? String(err)}`
    );
    opts.onError?.(err);
  }
}

function emitNonTerminalProgress(
  registry: ExecutorRegistry,
  executorId: string,
  missionId: string,
  task: Task
): void {
  const state = task.status.state;
  if (state === 'working') {
    registry.handleEvent(makeEnvelope('mission.started', executorId, missionId, task, {
      state: 'running',
      a2a_task_id: task.id,
      summary: taskStatusSummary(task),
    }));
    return;
  }
  if (state === 'input-required') {
    registry.handleEvent(makeEnvelope('mission.hitl_required', executorId, missionId, task, {
      state: 'hitl-required',
      a2a_task_id: task.id,
      summary: taskStatusSummary(task),
    }));
  }
}

function emitTerminalTask(
  registry: ExecutorRegistry,
  executorId: string,
  missionId: string,
  task: Task
): void {
  const state = task.status.state;
  if (state === 'completed') {
    registry.handleEvent(makeEnvelope('mission.completed', executorId, missionId, task, {
      state: 'done',
      a2a_task_id: task.id,
      summary: taskStatusSummary(task),
      ...exitCodeData(task),
    }));
    return;
  }

  if (state === 'canceled') {
    registry.handleEvent(makeEnvelope('mission.aborted', executorId, missionId, task, {
      state: 'aborted',
      a2a_task_id: task.id,
      summary: taskStatusSummary(task),
      error: taskStatusSummary(task) ?? `A2A task ${task.id} was canceled`,
      ...exitCodeData(task),
    }));
    return;
  }

  registry.handleEvent(makeEnvelope('mission.failed', executorId, missionId, task, {
    state: 'failed',
    a2a_task_id: task.id,
    summary: taskStatusSummary(task),
    error: taskStatusSummary(task) ?? `A2A task ${task.id} reached terminal state ${state}`,
    ...exitCodeData(task),
  }));
}

function makeEnvelope(
  event: EventEnvelope['event'],
  executorId: string,
  missionId: string,
  task: Task,
  data: Record<string, unknown>
): EventEnvelope {
  return {
    event,
    executor_id: executorId,
    mission_id: missionId,
    ts: task.status.timestamp ?? new Date().toISOString(),
    data,
  };
}

function taskStatusSummary(task: Task): string | undefined {
  const status = task.status as Task['status'] & { summary?: unknown };
  return typeof status.summary === 'string' ? status.summary : undefined;
}

function exitCodeData(task: Task): { exit_code?: number } {
  const status = task.status as Task['status'] & { exit_code?: unknown };
  return typeof status.exit_code === 'number' ? { exit_code: status.exit_code } : {};
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    if (typeof timer === 'object' && typeof timer.unref === 'function') {
      timer.unref();
    }
  });
}

export function isA2ATerminalState(state: TaskState): boolean {
  return isTerminalTaskState(state);
}
