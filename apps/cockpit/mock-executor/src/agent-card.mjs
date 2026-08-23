// Builds truthful 0.3, 1.0, or dual-version AgentCards for the mock executor.
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
 * @param {{ baseUrl: string, runtime?: 'vm'|'container', loadout?: string, imageRef?: string, protocolMode?: '0.3'|'1.0'|'dual' }} opts
 */
export function buildAgentCard(instanceId, opts) {
  const runtime = opts.runtime ?? 'container';
  const loadout = opts.loadout ?? 'agentic-dev';
  const protocolMode = opts.protocolMode ?? '0.3';
  const runtimeParams = { runtime, loadout, instance_id: instanceId };
  if (opts.imageRef) runtimeParams.image_ref = opts.imageRef;

  const card = {
    name: `agentic-sandbox-mock/${instanceId}`,
    description: 'Mock agentic-sandbox per-instance A2A executor (AIWG Cockpit dev fixture).',
    version: '2.0.0-mock',
    supportedInterfaces: [],
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
          required: true,
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

  if (protocolMode === '0.3' || protocolMode === 'dual') {
    card.protocolVersion = '0.3.0';
    card.url = opts.baseUrl;
    card.preferredTransport = 'REST';
    card.supportedInterfaces.push(
      protocolMode === 'dual'
        ? { url: opts.baseUrl, transport: 'REST', protocolBinding: 'REST', protocolVersion: '0.3' }
        : { url: opts.baseUrl, transport: 'REST' }
    );
  }
  if (protocolMode === '1.0' || protocolMode === 'dual') {
    card.supportedInterfaces.unshift({
      url: opts.baseUrl,
      protocolBinding: 'HTTP+JSON',
      protocolVersion: '1.0',
    });
  }
  // Custom PTY is not an A2A core binding and does not imply a protocol version.
  card.metadata = { mockProtocolMode: protocolMode, ptyUrl: opts.baseUrl.replace(/^http/, 'ws') + '/pty' };
  return card;
}
