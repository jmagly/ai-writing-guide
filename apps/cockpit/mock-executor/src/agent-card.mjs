// Builds an A2A v1.0.0 AgentCard for a mock agentic-sandbox per-instance surface,
// declaring the five extensions Cockpit binds to. Wire-faithful to
// docs/contracts/extensions/*/v1/spec.md in the agentic-sandbox repo.
// Exact field tuning is driven by running agentic-sandbox-conformance against this mock.

export const EXT = {
  runtime: 'https://agentic-sandbox.aiwg.io/extensions/runtime/v1',
  hitlPrompt: 'https://agentic-sandbox.aiwg.io/extensions/hitl-prompt/v1',
  idempotency: 'https://agentic-sandbox.aiwg.io/extensions/idempotency/v1',
  multiTenant: 'https://agentic-sandbox.aiwg.io/extensions/multi-tenant/v1',
  ptyExtensions: 'https://agentic-sandbox.aiwg.io/extensions/pty-extensions/v1',
};

/**
 * @param {string} instanceId UUID v4 — stable for the instance lifetime.
 * @param {{ baseUrl: string, runtime?: 'vm'|'container', loadout?: string, imageRef?: string }} opts
 */
export function buildAgentCard(instanceId, opts) {
  const runtime = opts.runtime ?? 'container';
  const loadout = opts.loadout ?? 'agentic-dev';
  const runtimeParams = { runtime, loadout, instance_id: instanceId };
  if (opts.imageRef) runtimeParams.image_ref = opts.imageRef;

  return {
    protocolVersion: '1.0.0',
    name: `agentic-sandbox-mock/${instanceId}`,
    description: 'Mock agentic-sandbox per-instance A2A executor (AIWG Cockpit dev fixture).',
    version: '2.0.0-mock',
    url: opts.baseUrl,
    preferredTransport: 'JSONRPC',
    // A2A interface advertisement (per-instance REST + the pty-ws custom binding).
    supportedInterfaces: [
      { url: opts.baseUrl, transport: 'JSONRPC' },
      { url: opts.baseUrl.replace(/^http/, 'ws') + '/pty', transport: 'pty-ws/v1' },
    ],
    capabilities: {
      streaming: true,
      pushNotifications: false,
      extensions: [
        {
          uri: EXT.runtime,
          description: 'VM/container runtime metadata for this instance.',
          required: true,
          params: runtimeParams,
        },
        {
          uri: EXT.hitlPrompt,
          description: 'Human-in-the-loop prompt envelopes + response validation.',
          required: false,
          params: {},
        },
        {
          uri: EXT.idempotency,
          description: 'Idempotent dispatch via replay key + JCS hash.',
          required: false,
          params: {},
        },
        {
          uri: EXT.multiTenant,
          description: 'Carries an opaque tenant_id on Message.metadata; declared in v2.0, enforced in v2.2.',
          required: false,
          params: {
            enforcement: 'declared',
            default_tenant: 'default',
            quota_response: { status: 429, header: 'Retry-After' },
          },
        },
        {
          uri: EXT.ptyExtensions,
          description: 'Interactive PTY sessions: multi-controller roles, replay buffer, Keyframe snapshots.',
          required: false,
          params: {
            max_controllers: 4,
            max_observers: 32,
            keyframe_interval_seconds: 5,
            keyframe_interval_frames: 100,
            replay_buffer_frames: 1000,
            replay_buffer_retention_seconds: 86400,
            default_cols: 120,
            default_rows: 30,
          },
        },
      ],
    },
    defaultInputModes: ['text/plain'],
    defaultOutputModes: ['text/plain'],
    skills: [
      { id: 'run', name: 'Run', description: 'Run a task in this instance.', tags: ['mock'] },
    ],
    securitySchemes: {
      bearer: { type: 'http', scheme: 'bearer' },
    },
    security: [{ bearer: [] }],
  };
}
