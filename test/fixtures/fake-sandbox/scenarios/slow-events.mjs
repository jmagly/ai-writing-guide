// Slow-events scenario — delays event emission with controllable yields so
// tests can verify race conditions in event delivery without time-based
// asserts. The delay is implemented via explicit microtask yields counted
// down by the caller, not setTimeout.

/**
 * @param {object} [opts]
 * @param {number} [opts.yields=10]  Number of microtask yields between events.
 * @param {number} [opts.eventCount=5]  How many events to emit total.
 * @returns {import('../server.mjs').Scenario}
 */
export function slowEvents(opts = {}) {
  const yields = opts.yields ?? 10;
  const eventCount = opts.eventCount ?? 5;
  return {
    eventStreamFactory: () => (async function* () {
      for (let i = 0; i < eventCount; i++) {
        // Yield the microtask queue `yields` times so other I/O drains first.
        // This is deterministic and reproducible — tests can pre-schedule
        // their own awaits and observe whether events arrived before or after.
        for (let k = 0; k < yields; k++) await Promise.resolve();
        yield {
          event: 'agent.status',
          ts: `2026-05-12T00:00:${String(i).padStart(2, '0')}Z`,
          data: { agent_id: 'agent-01', status: 'busy', tick: i },
        };
      }
    })(),
  };
}
