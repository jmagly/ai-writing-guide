/**
 * SandboxRegistry tests
 *
 * @issue #731
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  SandboxRegistry,
  normalizeSandboxEvent,
  type RegisterRequest,
  type SandboxEvent,
  type HitlRequest,
} from '../../../src/serve/sandbox-registry.js';

const REQ: RegisterRequest = {
  name: 'test-sandbox',
  grpc_endpoint: '192.168.1.10:8120',
  ws_endpoint: 'ws://192.168.1.10:8121',
  http_endpoint: 'http://192.168.1.10:8122',
  capabilities: ['vm', 'pty'],
  version: '0.1.0',
};

describe('SandboxRegistry', () => {
  let registry: SandboxRegistry;

  beforeEach(() => { registry = new SandboxRegistry(); });

  describe('register/deregister', () => {
    it('registers a sandbox and returns id + token', () => {
      const result = registry.register(REQ);
      expect(result.sandbox_id).toMatch(/^sandbox-/);
      expect(result.token).toBeTruthy();
      expect(registry.size).toBe(1);
    });

    it('returns unique ids for each registration', () => {
      const r1 = registry.register(REQ);
      const r2 = registry.register({ ...REQ, name: 'other' });
      expect(r1.sandbox_id).not.toBe(r2.sandbox_id);
      expect(r1.token).not.toBe(r2.token);
    });

    it('deregisters a sandbox', () => {
      const { sandbox_id } = registry.register(REQ);
      expect(registry.deregister(sandbox_id)).toBe(true);
      expect(registry.size).toBe(0);
    });

    it('returns false when deregistering unknown id', () => {
      expect(registry.deregister('nonexistent')).toBe(false);
    });

    it('clearOffline removes disconnected sandboxes and returns count', () => {
      const { sandbox_id: id1 } = registry.register(REQ);
      const { sandbox_id: id2 } = registry.register({ ...REQ, name: 'b' });
      // id1 connected, id2 offline
      registry.setConnected(id1, true);
      expect(registry.clearOffline()).toBe(1);
      expect(registry.get(id1)).toBeDefined();
      expect(registry.get(id2)).toBeUndefined();
      expect(registry.size).toBe(1);
    });

    it('clearOffline returns 0 when all sandboxes are connected', () => {
      const { sandbox_id } = registry.register(REQ);
      registry.setConnected(sandbox_id, true);
      expect(registry.clearOffline()).toBe(0);
      expect(registry.size).toBe(1);
    });
  });

  describe('authentication', () => {
    it('authenticates with correct token', () => {
      const { sandbox_id, token } = registry.register(REQ);
      expect(registry.authenticate(sandbox_id, token)).toBe(true);
    });

    it('rejects wrong token', () => {
      const { sandbox_id } = registry.register(REQ);
      expect(registry.authenticate(sandbox_id, 'wrong-token')).toBe(false);
    });

    it('rejects unknown sandbox id', () => {
      expect(registry.authenticate('nonexistent', 'any-token')).toBe(false);
    });
  });

  describe('list/get', () => {
    it('lists all sandboxes', () => {
      registry.register(REQ);
      registry.register({ ...REQ, name: 'second' });
      const list = registry.list();
      expect(list).toHaveLength(2);
      expect(list[0].name).toBe('test-sandbox');
      expect(list[1].name).toBe('second');
    });

    it('list includes agent count', () => {
      const { sandbox_id } = registry.register(REQ);
      registry.handleEvent(makeEvent(sandbox_id, 'agent.connected', { agentId: 'a1' }));
      const list = registry.list();
      expect(list[0].agentCount).toBe(1);
      expect(list[0].agents).toHaveLength(1);
    });

    it('getSummary returns undefined for unknown id', () => {
      expect(registry.getSummary('nonexistent')).toBeUndefined();
    });

    it('getSummary returns serializable summary', () => {
      const { sandbox_id } = registry.register(REQ);
      const summary = registry.getSummary(sandbox_id);
      expect(summary).toBeDefined();
      expect(summary!.id).toBe(sandbox_id);
      expect(summary!.capabilities).toEqual(['vm', 'pty']);
    });

    it('stores only client-safe sandbox trust refs from registration', () => {
      const { sandbox_id } = registry.register({
        ...REQ,
        trust_posture: {
          status: 'degraded',
          mode: 'mtls',
          ca_provider_ref: 'vault://sandbox-ca/current',
          trust_bundle_ref: '-----BEGIN CERTIFICATE-----\nsecret-token\n-----END CERTIFICATE-----',
          client_identity_ref: 'spiffe://sandbox.agentic.local/cockpit/bridge',
          rotation_state: 'reload-required',
          trust_bundle_fresh: false,
          missing_required_material: ['fresh_trust_bundle'],
          recovery: 'Rotate CA material and reload Cockpit.',
        },
      });
      const summary = registry.getSummary(sandbox_id);

      expect(summary?.trustPosture).toMatchObject({
        status: 'degraded',
        mode: 'mtls',
        ca_provider_ref: 'vault://sandbox-ca/current',
        trust_bundle_ref: '[redacted]',
        client_identity_ref: 'spiffe://sandbox.agentic.local/cockpit/bridge',
        rotation_state: 'reload-required',
        trust_bundle_fresh: false,
        missing_required_material: ['fresh_trust_bundle'],
      });
      expect(JSON.stringify(summary?.trustPosture)).not.toMatch(/BEGIN CERTIFICATE|secret-token/i);
    });
  });

  describe('connection state', () => {
    it('tracks connected/disconnected state', () => {
      const { sandbox_id } = registry.register(REQ);
      expect(registry.get(sandbox_id)!.connected).toBe(false);
      registry.setConnected(sandbox_id, true);
      expect(registry.get(sandbox_id)!.connected).toBe(true);
      registry.setConnected(sandbox_id, false);
      expect(registry.get(sandbox_id)!.connected).toBe(false);
    });
  });

  describe('event handling — agent lifecycle', () => {
    let sandboxId: string;

    beforeEach(() => {
      sandboxId = registry.register(REQ).sandbox_id;
    });

    it('agent.connected adds agent to inventory', () => {
      registry.handleEvent(makeEvent(sandboxId, 'agent.connected', {
        agentId: 'agent-01',
        loadout: 'claude-only',
        aiwgFrameworks: [{ name: 'sdlc', providers: ['claude'] }],
      }));
      const agents = registry.allAgents();
      expect(agents).toHaveLength(1);
      expect(agents[0].agentId).toBe('agent-01');
      expect(agents[0].status).toBe('ready');
      expect(agents[0].loadout).toBe('claude-only');
      expect(agents[0].sandboxName).toBe('test-sandbox');
    });

    it('agent.disconnected updates status', () => {
      registry.handleEvent(makeEvent(sandboxId, 'agent.connected', { agentId: 'a1' }));
      registry.handleEvent(makeEvent(sandboxId, 'agent.disconnected', { agentId: 'a1' }));
      const agents = registry.allAgents();
      expect(agents[0].status).toBe('disconnected');
    });

    it('agent.provisioning sets status to provisioning', () => {
      registry.handleEvent(makeEvent(sandboxId, 'agent.provisioning', {
        agentId: 'a2',
        loadout: 'agentic-dev',
        step: 'installing-tools',
        progress: { percent: 50 },
      }));
      const agents = registry.allAgents();
      expect(agents[0].status).toBe('provisioning');
      expect(agents[0].loadout).toBe('agentic-dev');
    });

    it('agent.ready transitions provisioning → ready', () => {
      registry.handleEvent(makeEvent(sandboxId, 'agent.provisioning', { agentId: 'a3' }));
      registry.handleEvent(makeEvent(sandboxId, 'agent.ready', { agentId: 'a3' }));
      const agents = registry.allAgents();
      expect(agents[0].status).toBe('ready');
    });

    it('session.start sets agent to busy', () => {
      registry.handleEvent(makeEvent(sandboxId, 'agent.connected', { agentId: 'a1' }));
      registry.handleEvent(makeEvent(sandboxId, 'session.start', { agentId: 'a1', sessionId: 's1' }));
      expect(registry.allAgents()[0].status).toBe('busy');
    });

    it('session.end sets agent back to ready', () => {
      registry.handleEvent(makeEvent(sandboxId, 'agent.connected', { agentId: 'a1' }));
      registry.handleEvent(makeEvent(sandboxId, 'session.start', { agentId: 'a1', sessionId: 's1' }));
      registry.handleEvent(makeEvent(sandboxId, 'session.end', { agentId: 'a1', sessionId: 's1' }));
      expect(registry.allAgents()[0].status).toBe('ready');
    });

    it('updates lastEventAt on each event', () => {
      // Force a distinguishable timestamp on the event
      const event = makeEvent(sandboxId, 'agent.connected', { agentId: 'a1' });
      event.timestamp = '2099-01-01T00:00:00.000Z';
      registry.handleEvent(event);
      expect(registry.get(sandboxId)!.lastEventAt).toBe('2099-01-01T00:00:00.000Z');
    });

    it('ignores events for unknown sandbox', () => {
      registry.handleEvent(makeEvent('nonexistent', 'agent.connected', { agentId: 'a1' }));
      expect(registry.allAgents()).toHaveLength(0);
    });
  });

  describe('HITL', () => {
    let sandboxId: string;

    beforeEach(() => {
      sandboxId = registry.register(REQ).sandbox_id;
    });

    it('hitl.input_required creates pending request', () => {
      registry.handleEvent(makeEvent(sandboxId, 'hitl.input_required', {
        agentId: 'a1',
        sessionId: 's1',
        hitlId: 'hitl-001',
        prompt: 'Should I proceed?',
        context: 'Last 20 lines...',
      }));
      const pending = registry.pendingHitl();
      expect(pending).toHaveLength(1);
      expect(pending[0].id).toBe('hitl-001');
      expect(pending[0].prompt).toBe('Should I proceed?');
    });

    it('getHitl returns specific request', () => {
      registry.handleEvent(makeEvent(sandboxId, 'hitl.input_required', {
        agentId: 'a1', sessionId: 's1', hitlId: 'h1', prompt: 'Q?', context: '',
      }));
      expect(registry.getHitl('h1')).toBeDefined();
      expect(registry.getHitl('nonexistent')).toBeUndefined();
    });

    it('resolveHitl removes and returns the request', () => {
      registry.handleEvent(makeEvent(sandboxId, 'hitl.input_required', {
        agentId: 'a1', sessionId: 's1', hitlId: 'h2', prompt: 'Q?', context: '',
      }));
      const resolved = registry.resolveHitl('h2');
      expect(resolved).toBeDefined();
      expect(resolved!.id).toBe('h2');
      expect(registry.pendingHitl()).toHaveLength(0);
    });

    it('resolveHitl returns undefined for already-resolved', () => {
      registry.handleEvent(makeEvent(sandboxId, 'hitl.input_required', {
        agentId: 'a1', sessionId: 's1', hitlId: 'h3', prompt: 'Q?', context: '',
      }));
      registry.resolveHitl('h3');
      expect(registry.resolveHitl('h3')).toBeUndefined();
    });
  });

  describe('event subscription', () => {
    it('notifies listeners of events', () => {
      const sandboxId = registry.register(REQ).sandbox_id;
      const received: SandboxEvent[] = [];
      registry.subscribe((e) => received.push(e));
      registry.handleEvent(makeEvent(sandboxId, 'agent.connected', { agentId: 'a1' }));
      expect(received).toHaveLength(1);
      expect(received[0].type).toBe('agent.connected');
    });

    it('unsubscribe stops notifications', () => {
      const sandboxId = registry.register(REQ).sandbox_id;
      const received: SandboxEvent[] = [];
      const unsub = registry.subscribe((e) => received.push(e));
      unsub();
      registry.handleEvent(makeEvent(sandboxId, 'agent.connected', { agentId: 'a1' }));
      expect(received).toHaveLength(0);
    });

    it('listener errors do not propagate', () => {
      const sandboxId = registry.register(REQ).sandbox_id;
      registry.subscribe(() => { throw new Error('boom'); });
      // Should not throw
      registry.handleEvent(makeEvent(sandboxId, 'agent.connected', { agentId: 'a1' }));
    });
  });

  describe('allAgents', () => {
    it('aggregates agents across multiple sandboxes', () => {
      const s1 = registry.register(REQ).sandbox_id;
      const s2 = registry.register({ ...REQ, name: 'second' }).sandbox_id;
      registry.handleEvent(makeEvent(s1, 'agent.connected', { agentId: 'a1' }));
      registry.handleEvent(makeEvent(s2, 'agent.connected', { agentId: 'a2' }));
      const agents = registry.allAgents();
      expect(agents).toHaveLength(2);
      expect(agents.map(a => a.agentId).sort()).toEqual(['a1', 'a2']);
    });
  });

  describe('shutdown', () => {
    it('clears all state', () => {
      const sandboxId = registry.register(REQ).sandbox_id;
      registry.handleEvent(makeEvent(sandboxId, 'agent.connected', { agentId: 'a1' }));
      registry.handleEvent(makeEvent(sandboxId, 'hitl.input_required', {
        agentId: 'a1', sessionId: 's1', hitlId: 'h1', prompt: 'Q?', context: '',
      }));
      registry.shutdown();
      expect(registry.size).toBe(0);
      expect(registry.allAgents()).toHaveLength(0);
      expect(registry.pendingHitl()).toHaveLength(0);
    });
  });
});

// ============================================================
// Helpers
// ============================================================

function makeEvent(
  sandboxId: string,
  type: SandboxEvent['type'],
  fields: Partial<SandboxEvent>,
): SandboxEvent {
  return {
    type,
    sandboxId,
    agentId: fields.agentId ?? 'agent-unknown',
    timestamp: new Date().toISOString(),
    ...fields,
  };
}

// ============================================================
// #933 — snake_case wire-protocol normalization
// ============================================================

describe('normalizeSandboxEvent (#933)', () => {
  it('maps snake_case type to dot notation', () => {
    const out = normalizeSandboxEvent({ type: 'agent_connected', agent_id: 'a1' });
    expect(out.type).toBe('agent.connected');
  });

  it('aliases snake_case top-level fields to camelCase', () => {
    const out = normalizeSandboxEvent({
      type: 'agent_connected',
      agent_id: 'a1',
      agent_instance_id: '01HX-ABC',
      agent_logical_name: 'security-01',
    });
    expect(out.agentId).toBe('a1');
    expect(out.agentInstanceId).toBe('01HX-ABC');
    expect(out.agentLogicalName).toBe('security-01');
  });

  it('is idempotent on already-normalized payloads', () => {
    const out = normalizeSandboxEvent({
      type: 'agent.connected',
      agentId: 'a1',
      agentInstanceId: '01HX-ABC',
      timestamp: '2026-04-23T00:00:00Z',
    });
    expect(out.type).toBe('agent.connected');
    expect(out.agentId).toBe('a1');
    expect(out.timestamp).toBe('2026-04-23T00:00:00Z');
  });

  it('preserves unmapped types verbatim (forward compatibility)', () => {
    const out = normalizeSandboxEvent({ type: 'future.event.someday', agent_id: 'a1' });
    expect(out.type).toBe('future.event.someday');
    expect(out.agentId).toBe('a1');
  });

  it('falls back to aiwg.log for malformed payloads', () => {
    expect(normalizeSandboxEvent(null).type).toBe('aiwg.log');
    expect(normalizeSandboxEvent(undefined).type).toBe('aiwg.log');
    expect(normalizeSandboxEvent(42).type).toBe('aiwg.log');
  });

  it('maps session lifecycle snake_case to dot notation', () => {
    expect(normalizeSandboxEvent({ type: 'session_start', agent_id: 'a1', session_id: 's1', command: 'bash' }))
      .toMatchObject({ type: 'session.start', agentId: 'a1', sessionId: 's1', command: 'bash' });
    expect(normalizeSandboxEvent({ type: 'session_end', agent_id: 'a1', session_id: 's1', exit_code: 0 }))
      .toMatchObject({ type: 'session.end', agentId: 'a1', sessionId: 's1', exitCode: 0 });
  });

  it('maps HITL payloads', () => {
    const out = normalizeSandboxEvent({
      type: 'hitl_input_required',
      agent_id: 'a1',
      session_id: 's1',
      hitl_id: 'h1',
      prompt: 'are you sure?',
      context: 'yolo',
      expires_at: '2026-04-23T01:00:00Z',
    });
    expect(out.type).toBe('hitl.input_required');
    expect(out.hitlId).toBe('h1');
    expect(out.sessionId).toBe('s1');
    expect(out.expiresAt).toBe('2026-04-23T01:00:00Z');
  });
});

describe('handleEvent with raw sandbox payloads (#933)', () => {
  it('populates sandbox.agents from a raw agent_connected payload', () => {
    const registry = new SandboxRegistry();
    const { sandbox_id } = registry.register(REQ);
    // Simulates exactly what agentic-sandbox emits:
    // management/src/aiwg_serve.rs SandboxEvent with rename_all="snake_case"
    const raw = {
      type: 'agent_connected',
      agent_id: 'agent-01',
      hostname: 'agent-01',
      ip_address: '192.168.122.201',
      loadout: 'base',
      agent_instance_id: '01HX-TESTINSTANCE',
      timestamp: '2026-04-23T00:00:00Z',
    };
    const event = normalizeSandboxEvent(raw);
    event.sandboxId = sandbox_id;
    registry.handleEvent(event);

    const summary = registry.getSummary(sandbox_id)!;
    expect(summary.agentCount).toBe(1);
    expect(summary.agents[0]).toMatchObject({
      agentId: 'agent-01',
      status: 'ready',
      loadout: 'base',
      instanceId: '01HX-TESTINSTANCE',
    });
  });

  it('processes raw session_start/session_end into sessionCount', () => {
    const registry = new SandboxRegistry();
    const { sandbox_id } = registry.register(REQ);

    registry.handleEvent(normalizeSandboxEvent({
      type: 'agent_connected', agent_id: 'a1', timestamp: '2026-04-23T00:00:00Z',
    }));
    registry.handleEvent({
      ...normalizeSandboxEvent({
        type: 'session_start', agent_id: 'a1', session_id: 's1', command: 'bash',
        timestamp: '2026-04-23T00:00:01Z',
      }),
      sandboxId: sandbox_id,
    });

    // Fix sandboxId on the first event too
    const agent = registry.getSummary(sandbox_id)?.agents[0];
    expect(agent).toBeUndefined(); // because first event didn't get sandboxId set

    // Re-run the proper way
    const registry2 = new SandboxRegistry();
    const { sandbox_id: sid2 } = registry2.register(REQ);
    const connect = normalizeSandboxEvent({
      type: 'agent_connected', agent_id: 'a1', timestamp: '2026-04-23T00:00:00Z',
    });
    connect.sandboxId = sid2;
    registry2.handleEvent(connect);
    const startEv = normalizeSandboxEvent({
      type: 'session_start', agent_id: 'a1', session_id: 's1', command: 'bash',
      timestamp: '2026-04-23T00:00:01Z',
    });
    startEv.sandboxId = sid2;
    registry2.handleEvent(startEv);
    const agent2 = registry2.getSummary(sid2)!.agents[0];
    expect(agent2.sessionCount).toBe(1);
    expect(agent2.status).toBe('busy');
  });

  it('routes raw hitl_input_required into the pending queue', () => {
    const registry = new SandboxRegistry();
    const { sandbox_id } = registry.register(REQ);
    const raw = {
      type: 'hitl_input_required',
      agent_id: 'a1',
      session_id: 's1',
      hitl_id: 'h1',
      prompt: 'confirm?',
      context: 'prod deploy',
      timestamp: '2026-04-23T00:00:00Z',
    };
    const event = normalizeSandboxEvent(raw);
    event.sandboxId = sandbox_id;
    registry.handleEvent(event);

    const pending = registry.pendingHitl();
    expect(pending).toHaveLength(1);
    expect(pending[0]).toMatchObject({
      id: 'h1',
      agentId: 'a1',
      sessionId: 's1',
      prompt: 'confirm?',
    });
  });
});
