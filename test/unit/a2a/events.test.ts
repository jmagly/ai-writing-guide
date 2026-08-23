import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  A2AEventReconciler,
  decodeLegacyStreamEvent,
  decodeV1StreamResponse,
} from '../../../src/a2a/events.js';

const golden = JSON.parse(readFileSync(
  new URL('../../fixtures/a2a/v1.0-golden.json', import.meta.url), 'utf8'
));

describe('A2A StreamResponse normalization', () => {
  it('accepts all 1.0 wrapper members and rejects zero/multiple-member unions', () => {
    expect(decodeV1StreamResponse(golden.stream[0]).type).toBe('task');
    expect(decodeV1StreamResponse(golden.stream[1]).type).toBe('artifact');
    expect(decodeV1StreamResponse(golden.stream[2]).type).toBe('status');
    expect(() => decodeV1StreamResponse({})).toThrow(/exactly one/);
    expect(() => decodeV1StreamResponse({ task: golden.task, message: golden.message })).toThrow(/exactly one/);
  });

  it('keeps legacy kind events in the separate 0.3 decoder', () => {
    expect(decodeLegacyStreamEvent({
      kind: 'status-update', taskId: 't', status: { state: 'working' },
    })).toMatchObject({ type: 'status', protocolVersion: '0.3' });
    expect(() => decodeV1StreamResponse({
      kind: 'status-update', taskId: 't', status: { state: 'working' },
    })).toThrow(/legacy/);
  });

  it('requires an initial snapshot and blocks duplicates, out-of-order delivery, and terminal regression', () => {
    const gate = new A2AEventReconciler({ taskId: 'task-v1', requireInitialSnapshot: true });
    const snapshot = decodeV1StreamResponse(golden.stream[0], { eventId: '1', sequence: 1 });
    expect(gate.accept(snapshot)?.type).toBe('task');
    expect(gate.accept(snapshot)).toBeNull();
    const artifact = decodeV1StreamResponse(golden.stream[1], { eventId: '2', sequence: 2 });
    expect(gate.accept(artifact)?.type).toBe('artifact');
    const terminal = decodeV1StreamResponse(golden.stream[2], { eventId: '3', sequence: 3 });
    expect(gate.accept(terminal)?.type).toBe('status');
    expect(() => gate.accept(decodeV1StreamResponse(golden.stream[1], { eventId: 'late', sequence: 2 })))
      .toThrow(/regressed/);
  });

  it('detects missing sequence members and supports reconnect from a known snapshot', () => {
    const snapshot = decodeV1StreamResponse(golden.stream[0], { eventId: '1', sequence: 1 });
    const gate = new A2AEventReconciler({ taskId: 'task-v1', requireInitialSnapshot: true });
    gate.accept(snapshot);
    expect(() => gate.accept(decodeV1StreamResponse(golden.stream[2], { eventId: '3', sequence: 3 })))
      .toThrow(/sequence gap/);

    const reconnect = new A2AEventReconciler({
      taskId: 'task-v1',
      initialTask: snapshot.type === 'task' ? snapshot.task : undefined,
    });
    expect(reconnect.accept(decodeV1StreamResponse(golden.stream[1], { eventId: 'replay-2', sequence: 2 })))
      .toMatchObject({ type: 'artifact' });
  });

  it('rejects deltas before the initial task and cross-task contamination', () => {
    const gate = new A2AEventReconciler({ taskId: 'task-v1', requireInitialSnapshot: true });
    expect(() => gate.accept(decodeV1StreamResponse(golden.stream[1]))).toThrow(/begin with a Task/);
    expect(() => gate.accept(decodeV1StreamResponse({
      task: { id: 'other', contextId: 'ctx-v1', status: { state: 'TASK_STATE_WORKING' } },
    }))).toThrow(/belongs to task/);
  });

  it('produces the same normalized transition sequence for SSE and push inputs', () => {
    const sseGate = new A2AEventReconciler({ taskId: 'task-v1', requireInitialSnapshot: true });
    const pushGate = new A2AEventReconciler({ taskId: 'task-v1', requireInitialSnapshot: true });
    const sse = golden.stream.map((wire: unknown, index: number) =>
      sseGate.accept(decodeV1StreamResponse(wire, { eventId: `sse-${index}`, sequence: index + 1 }))
    );
    const push = golden.stream.map((wire: unknown, index: number) =>
      pushGate.accept(decodeV1StreamResponse(wire, { eventId: `push-${index}`, sequence: index + 1 }))
    );
    const project = (event: (typeof sse)[number]) => event && ({
      type: event.type,
      state: event.type === 'task'
        ? event.task.status.state
        : event.type === 'status'
          ? event.status.state
          : undefined,
    });
    expect(sse.map(project)).toEqual(push.map(project));
  });

  it('isolates concurrent subscriptions by task ownership', () => {
    const first = new A2AEventReconciler({ taskId: 'task-v1', requireInitialSnapshot: true });
    const second = new A2AEventReconciler({ taskId: 'task-other', requireInitialSnapshot: true });
    expect(first.accept(decodeV1StreamResponse(golden.stream[0]))).toMatchObject({ type: 'task' });
    expect(() => second.accept(decodeV1StreamResponse(golden.stream[0]))).toThrow(/belongs to task/);
    expect(first.isTerminal()).toBe(false);
  });
});
