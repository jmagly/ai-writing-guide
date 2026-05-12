// Crash-recovery scenario — injects 500s on a configurable subset of routes.
// Useful for verifying that clients retry, log, and recover when the sandbox
// has been bounced.
//
// The error-injection middleware in server.mjs reads `errorRoutes` and short-
// circuits any matching path. Scenarios can set `failFor` to make routes fail
// only for the first N requests and then start succeeding (simulating a
// sandbox that comes back online).

/**
 * @param {object} [opts]
 * @param {RegExp[]} [opts.failPatterns]   Path patterns to fail (default: /api/v1/tasks).
 * @param {number} [opts.failFor=2]         Number of failures before recovery.
 * @param {number} [opts.status=503]
 * @returns {import('../server.mjs').Scenario}
 */
export function crashRecovery(opts = {}) {
  const failPatterns = opts.failPatterns || [/^\/api\/v1\/tasks(\/|$)/];
  const failFor = opts.failFor ?? 2;
  const status = opts.status ?? 503;
  const callsByPattern = new Map();

  const errorRoutes = failPatterns.map((pat) => {
    return {
      pathPattern: {
        test(path) {
          if (!pat.test(path)) return false;
          const n = (callsByPattern.get(pat) || 0) + 1;
          callsByPattern.set(pat, n);
          return n <= failFor;
        },
      },
      status,
      body: { error: 'service_unavailable', detail: 'simulated crash' },
    };
  });

  return {
    errorRoutes,
    eventStreamFactory: () => (async function* () {
      yield {
        event: 'sandbox.status',
        ts: '2026-05-12T00:02:00Z',
        data: { status: 'recovering' },
      };
    })(),
  };
}
