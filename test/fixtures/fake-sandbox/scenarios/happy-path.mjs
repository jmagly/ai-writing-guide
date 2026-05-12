// Happy-path scenario — register, list, create task, transition to running,
// emit a few log lines, complete with exit 0.

/**
 * @returns {import('../server.mjs').Scenario}
 */
export function happyPath() {
  const taskTransitions = new Map();
  return {
    onTaskCreate({ manifest }) {
      // Accept; default fake task with queued state.
      return undefined;
    },
    taskAutoState(taskId) {
      // First poll → running. Second poll → completed.
      const seen = (taskTransitions.get(taskId) || 0) + 1;
      taskTransitions.set(taskId, seen);
      if (seen === 1) return 'running';
      if (seen >= 2) return 'completed';
      return undefined;
    },
    eventStreamFactory: () => (async function* () {
      // Emit a small sequence of agent-session-style events for any WS
      // subscriber. Deterministic — no time-based asserts; tests gate on
      // event count and shape. New connections get a fresh iterator so
      // late subscribers still see the full sequence.
      const events = [
        {
          event: 'agent.status',
          ts: '2026-05-12T00:00:00Z',
          data: { agent_id: 'agent-01', status: 'idle' },
        },
        {
          event: 'agent.sessions',
          ts: '2026-05-12T00:00:01Z',
          data: { agent_id: 'agent-01', sessions: 0 },
        },
      ];
      for (const e of events) yield e;
    })(),
  };
}
