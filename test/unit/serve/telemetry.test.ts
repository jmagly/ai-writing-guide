/**
 * TelemetryStore tests
 *
 * @issue #716
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  TelemetryStore,
  createEvent,
  type TelemetryEvent,
} from '../../../src/serve/telemetry.js';

describe('TelemetryStore', () => {
  let store: TelemetryStore;

  beforeEach(() => { store = new TelemetryStore(); });

  it('requires and preserves graph metadata for graph events', () => {
    expect(() => createEvent('graph.node.state', 's1', { state: 'running' })).toThrow('requires graph execution metadata');
    const graph = {
      schemaVersion: 'graph.flow.aiwg.io/v1' as const,
      graphId: 'examples/review',
      graphVersion: '1.0.0',
      runId: 'run-42',
      nodeId: 'screen',
      nodeRunId: 'run-42:screen',
    };
    const event = createEvent('graph.node.state', 's1', { state: 'running' }, 'mission-42', graph);
    store.ingest(event);
    expect(store.query('s1')[0].graph).toEqual(graph);
  });

  it('ingests and queries events', () => {
    store.ingest(createEvent('session.start', 's1', { name: 'test' }));
    const events = store.query('s1');
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('session.start');
  });

  it('filters by type', () => {
    store.ingest(createEvent('tokens.used', 's1', { input: 100, output: 50, model: 'sonnet' }));
    store.ingest(createEvent('gate.pass', 's1', { criteria: 'tests pass', result: 'pass' }));

    const tokenEvents = store.query('s1', { types: ['tokens.used'] });
    expect(tokenEvents).toHaveLength(1);
    expect(tokenEvents[0].type).toBe('tokens.used');
  });

  it('limits results', () => {
    for (let i = 0; i < 10; i++) {
      store.ingest(createEvent('iteration.complete', 's1', { iteration: i }));
    }
    const limited = store.query('s1', { limit: 3 });
    expect(limited).toHaveLength(3);
  });

  it('filters by since', () => {
    const before = new Date(Date.now() - 10000).toISOString();
    store.ingest(createEvent('session.start', 's1', {}));
    const events = store.query('s1', { since: before });
    expect(events).toHaveLength(1);
  });

  it('computes token metrics', () => {
    store.ingest(createEvent('tokens.used', 's1', { input: 1000, output: 500, model: 'sonnet' }));
    store.ingest(createEvent('tokens.used', 's1', { input: 2000, output: 1000, model: 'opus' }));

    const metrics = store.metrics('s1');
    expect(metrics.totalInputTokens).toBe(3000);
    expect(metrics.totalOutputTokens).toBe(1500);
    expect(metrics.tokensByModel['sonnet']).toEqual({ input: 1000, output: 500 });
    expect(metrics.tokensByModel['opus']).toEqual({ input: 2000, output: 1000 });
  });

  it('computes gate pass rate', () => {
    store.ingest(createEvent('gate.pass', 's1', { criteria: 'test', result: 'pass' }));
    store.ingest(createEvent('gate.pass', 's1', { criteria: 'test', result: 'pass' }));
    store.ingest(createEvent('gate.fail', 's1', { criteria: 'test', result: 'fail' }));

    const metrics = store.metrics('s1');
    expect(metrics.gatePasses).toBe(2);
    expect(metrics.gateFails).toBe(1);
    expect(metrics.passRate).toBe(67); // 2/3 rounded
  });

  it('counts iterations', () => {
    for (let i = 0; i < 5; i++) {
      store.ingest(createEvent('iteration.complete', 's1', { iteration: i }));
    }
    expect(store.metrics('s1').iterations).toBe(5);
  });

  it('tracks scope progress', () => {
    store.ingest(createEvent('scope.unit.complete', 's1', { unit: 'UC-1', done: 3, total: 10 }));
    const metrics = store.metrics('s1');
    expect(metrics.scopeDone).toBe(3);
    expect(metrics.scopeTotal).toBe(10);
  });

  it('notifies subscribers', () => {
    const received: TelemetryEvent[] = [];
    const unsub = store.subscribe((e) => received.push(e));

    store.ingest(createEvent('session.start', 's1', {}));
    expect(received).toHaveLength(1);

    unsub();
    store.ingest(createEvent('session.end', 's1', {}));
    expect(received).toHaveLength(1); // unsubscribed
  });

  it('returns all session ids', () => {
    store.ingest(createEvent('session.start', 'sessionA', {}));
    store.ingest(createEvent('session.start', 'sessionB', {}));
    expect(store.sessions().sort()).toEqual(['sessionA', 'sessionB']);
  });

  it('clears session events', () => {
    store.ingest(createEvent('session.start', 's1', {}));
    store.clear('s1');
    expect(store.query('s1')).toHaveLength(0);
  });

  it('passRate is null when no gate events', () => {
    store.ingest(createEvent('session.start', 's1', {}));
    expect(store.metrics('s1').passRate).toBeNull();
  });
});

describe('createEvent', () => {
  it('generates unique IDs', () => {
    const e1 = createEvent('session.start', 's1', {});
    const e2 = createEvent('session.start', 's1', {});
    expect(e1.id).not.toBe(e2.id);
  });

  it('includes ISO timestamp', () => {
    const e = createEvent('session.start', 's1', {});
    expect(e.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('attaches missionId when provided', () => {
    const e = createEvent('mission.dispatch', 's1', {}, 'mission-42');
    expect(e.missionId).toBe('mission-42');
  });
});
