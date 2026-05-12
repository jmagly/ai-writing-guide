// Partition scenario — abruptly drops mid-stream WS connections after a
// configurable number of events. Used to verify the bridge's reconnect logic.
//
// Closes by terminating the socket without a clean handshake (RFC 6455 1006
// close code) to simulate a real network partition.

/**
 * @param {object} [opts]
 * @param {number} [opts.dropAfter=2]    Drop the WS after this many sends.
 * @param {number} [opts.eventCount=5]    Total events to attempt before stop.
 * @returns {import('../server.mjs').Scenario}
 */
export function partition(opts = {}) {
  const dropAfter = opts.dropAfter ?? 2;
  const eventCount = opts.eventCount ?? 5;
  const sentByConn = new WeakMap();

  return {
    onPartition(ws) {
      sentByConn.set(ws, 0);
      const origSend = ws.send.bind(ws);
      ws.send = function patched(data) {
        const n = (sentByConn.get(ws) || 0) + 1;
        sentByConn.set(ws, n);
        if (n > dropAfter) {
          try { ws.terminate?.() || ws.close?.(1006); } catch {}
          return;
        }
        return origSend(data);
      };
    },
    eventStreamFactory: () => (async function* () {
      for (let i = 0; i < eventCount; i++) {
        yield {
          event: 'agent.status',
          ts: `2026-05-12T00:01:${String(i).padStart(2, '0')}Z`,
          data: { agent_id: 'agent-01', tick: i, partitionScenario: true },
        };
      }
    })(),
  };
}
