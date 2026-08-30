import type {
  A2AProtocolPolicy,
  A2AProtocolVersion,
  AgentCard,
  NormalizedAgentCard,
  NormalizedAgentInterface,
} from './types.js';

export const A2A_HTTP_JSON_BINDING = 'HTTP+JSON';
export const A2A_LEGACY_REST_BINDING = 'REST';

export class A2ANegotiationError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'A2ANegotiationError';
    this.code = code;
  }
}

export interface SelectAgentInterfaceOptions {
  policy: A2AProtocolPolicy;
  /** Supported binding names in client preference order. */
  bindings?: readonly string[];
  /** Used only by auto; defaults to 1.0 then 0.3. */
  versionPreference?: readonly A2AProtocolVersion[];
}

export function normalizeProtocolVersion(value: unknown): A2AProtocolVersion | null {
  if (typeof value !== 'string') return null;
  const match = /^(0\.3|1\.0)(?:\.\d+)?$/.exec(value.trim());
  return match?.[1] as A2AProtocolVersion | undefined ?? null;
}

/**
 * Parse 0.3 top-level cards and 1.0 per-interface cards into one discovery
 * model. A card that claims top-level 1.0 while retaining only 0.3 interface
 * fields is rejected instead of being treated as proof of 1.0 support.
 */
export function normalizeAgentCard(card: AgentCard): NormalizedAgentCard {
  if (!card || typeof card !== 'object') {
    throw new A2ANegotiationError('agent_card.invalid', 'AgentCard must be an object');
  }
  if (typeof card.name !== 'string' || !card.name.trim()) {
    throw new A2ANegotiationError('agent_card.name_missing', 'AgentCard.name is required');
  }
  if (typeof card.version !== 'string' || !card.version.trim()) {
    throw new A2ANegotiationError('agent_card.version_missing', 'AgentCard.version is required');
  }

  const topVersion = normalizeProtocolVersion(card.protocolVersion);
  if (card.protocolVersion !== undefined && !topVersion) {
    throw new A2ANegotiationError(
      'agent_card.protocol_version_invalid',
      `Unsupported AgentCard.protocolVersion '${String(card.protocolVersion)}'`
    );
  }

  const interfaces: NormalizedAgentInterface[] = [];
  for (const [preference, entry] of (card.supportedInterfaces ?? []).entries()) {
    if (!entry || typeof entry !== 'object' || typeof entry.url !== 'string') {
      throw new A2ANegotiationError(
        'agent_card.interface_invalid',
        `supportedInterfaces[${preference}] must contain an absolute URL`
      );
    }
    assertAbsoluteInterfaceUrl(entry.url, `supportedInterfaces[${preference}].url`);
    const interfaceVersion = normalizeProtocolVersion(entry.protocolVersion);
    if (entry.protocolVersion !== undefined && !interfaceVersion) {
      throw new A2ANegotiationError(
        'agent_card.interface_version_invalid',
        `supportedInterfaces[${preference}].protocolVersion is unsupported`
      );
    }

    if (interfaceVersion) {
      if (typeof entry.protocolBinding !== 'string' || !entry.protocolBinding.trim()) {
        throw new A2ANegotiationError(
          'agent_card.interface_binding_missing',
          `supportedInterfaces[${preference}] declares ${interfaceVersion} without protocolBinding`
        );
      }
      interfaces.push({
        url: trimUrl(entry.url),
        protocolBinding: entry.protocolBinding,
        protocolVersion: interfaceVersion,
        ...(entry.tenant ? { tenant: entry.tenant } : {}),
        preference,
        legacy: false,
      });
      continue;
    }

    // 0.3 cards put the version at top level and binding under `transport`.
    if (topVersion !== '0.3') {
      throw new A2ANegotiationError(
        'agent_card.mixed_interface_shape',
        `supportedInterfaces[${preference}] uses legacy transport fields without a 0.3 top-level declaration`
      );
    }
    if (typeof entry.transport !== 'string' || !entry.transport.trim()) {
      throw new A2ANegotiationError(
        'agent_card.interface_transport_missing',
        `supportedInterfaces[${preference}] requires transport for the 0.3 card shape`
      );
    }
    interfaces.push({
      url: trimUrl(entry.url),
      protocolBinding: entry.transport,
      protocolVersion: '0.3',
      ...(entry.tenant ? { tenant: entry.tenant } : {}),
      preference,
      legacy: true,
    });
  }

  // Legacy cards commonly omit supportedInterfaces entirely.
  if (topVersion === '0.3' && typeof card.url === 'string') {
    assertAbsoluteUrl(card.url, 'AgentCard.url');
    if (!interfaces.some(entry => entry.protocolVersion === '0.3' && entry.url === trimUrl(card.url!))) {
      interfaces.push({
        url: trimUrl(card.url),
        protocolBinding: card.preferredTransport ?? A2A_LEGACY_REST_BINDING,
        protocolVersion: '0.3',
        preference: interfaces.length,
        legacy: true,
      });
    }
  }

  if (topVersion === '1.0' && interfaces.length === 0) {
    throw new A2ANegotiationError(
      'agent_card.v1_interfaces_missing',
      'A2A 1.0 cards must declare versioned supportedInterfaces; top-level protocolVersion/url are 0.3 fields'
    );
  }
  if (interfaces.length === 0) {
    throw new A2ANegotiationError(
      'agent_card.interfaces_missing',
      'AgentCard exposes no usable protocol interface'
    );
  }

  return { card, interfaces };
}

export function selectAgentInterface(
  input: AgentCard | NormalizedAgentCard,
  opts: SelectAgentInterfaceOptions
): NormalizedAgentInterface {
  const normalized = 'interfaces' in input ? input : normalizeAgentCard(input);
  const bindings = opts.bindings ?? [A2A_HTTP_JSON_BINDING, A2A_LEGACY_REST_BINDING];
  const versions = opts.policy === 'auto'
    ? opts.versionPreference ?? ['1.0', '0.3']
    : [opts.policy];

  for (const version of versions) {
    for (const binding of bindings) {
      const selected = normalized.interfaces
        .filter(entry => entry.protocolVersion === version && sameBinding(entry.protocolBinding, binding))
        .sort((a, b) => a.preference - b.preference)[0];
      if (selected) return selected;
    }
  }

  const available = normalized.interfaces
    .map(entry => `${entry.protocolVersion}/${entry.protocolBinding}@${entry.url}`)
    .join(', ');
  throw new A2ANegotiationError(
    'agent_card.no_compatible_interface',
    `No compatible A2A interface for policy=${opts.policy}; available: ${available || 'none'}`
  );
}

export function agentInterfaceCacheKey(
  host: string,
  instanceId: string,
  selected: NormalizedAgentInterface
): string {
  return [host, instanceId, selected.protocolVersion, selected.protocolBinding, selected.url].join('|');
}

function sameBinding(actual: string, supported: string): boolean {
  return actual.trim().toUpperCase() === supported.trim().toUpperCase();
}

function trimUrl(value: string): string {
  return value.replace(/\/+$/, '');
}

function assertAbsoluteUrl(value: string, field: string): void {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('not HTTP(S)');
  } catch {
    throw new A2ANegotiationError('agent_card.url_invalid', `${field} must be an absolute HTTP(S) URL`);
  }
}

function assertAbsoluteInterfaceUrl(value: string, field: string): void {
  try {
    const url = new URL(value);
    if (!['http:', 'https:', 'ws:', 'wss:'].includes(url.protocol)) {
      throw new Error('unsupported interface scheme');
    }
  } catch {
    throw new A2ANegotiationError(
      'agent_card.url_invalid',
      `${field} must be an absolute HTTP(S) or WS(S) URL`
    );
  }
}
