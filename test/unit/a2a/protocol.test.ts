import { describe, expect, it } from 'vitest';
import {
  A2ANegotiationError,
  agentInterfaceCacheKey,
  normalizeAgentCard,
  selectAgentInterface,
} from '../../../src/a2a/protocol.js';

const dualCard = {
  name: 'dual',
  version: '2.0.0',
  supportedInterfaces: [
    { url: 'https://agent.test/a2a/v1', protocolBinding: 'HTTP+JSON', protocolVersion: '1.0' },
    { url: 'https://agent.test/a2a/v03', protocolBinding: 'REST', protocolVersion: '0.3' },
  ],
};

describe('A2A AgentCard normalization and selection', () => {
  it('selects 1.0 first in auto and honors strict 0.3', () => {
    const normalized = normalizeAgentCard(dualCard);
    expect(selectAgentInterface(normalized, { policy: 'auto' }).protocolVersion).toBe('1.0');
    expect(selectAgentInterface(normalized, { policy: '0.3' })).toMatchObject({
      protocolVersion: '0.3', protocolBinding: 'REST',
    });
  });

  it('normalizes a headerless legacy card without treating URL /v1 as protocol 1.0', () => {
    const normalized = normalizeAgentCard({
      protocolVersion: '0.3.0',
      name: 'legacy',
      version: '1',
      url: 'https://agent.test/agents/i-1/v1',
      preferredTransport: 'REST',
    });
    expect(normalized.interfaces[0]).toMatchObject({ protocolVersion: '0.3', legacy: true });
  });

  it('rejects the Cockpit bug shape that advertises top-level 1.0 with 0.3 transport fields', () => {
    expect(() => normalizeAgentCard({
      protocolVersion: '1.0.0',
      name: 'misadvertised',
      version: '1',
      url: 'https://agent.test/agents/i-1',
      supportedInterfaces: [{ url: 'https://agent.test/agents/i-1', transport: 'REST' }],
    })).toThrow(A2ANegotiationError);
  });

  it('keeps protocol version and interface URL in cache identity', () => {
    const normalized = normalizeAgentCard(dualCard);
    const v1 = selectAgentInterface(normalized, { policy: '1.0' });
    const v03 = selectAgentInterface(normalized, { policy: '0.3' });
    expect(agentInterfaceCacheKey('https://agent.test', 'i-1', v1))
      .not.toBe(agentInterfaceCacheKey('https://agent.test', 'i-1', v03));
  });
});
