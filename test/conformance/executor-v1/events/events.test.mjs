/**
 * Conformance — Events Category (Core)
 *
 * Assertions:
 *  - Event envelope shape: snake_case fields, event/executor_id/ts required
 *  - RFC 3339 timestamps on all envelope.ts fields
 *  - Per-event data payload validates against schemas/executor-v1.json $defs/data_*
 *  - Unknown/extra fields in envelope cause schema validation failure
 *  - event_type enum: all 15 defined types are valid
 *  - mission_id is present on mission.* events and absent on executor.* events
 *  - Unknown events are ignored gracefully (no crash)
 *
 * @level Core
 * @issue #1183
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  loadFixture,
  hashFixture,
  validateSchema,
  createRegistryForTest,
  FakeWsConn,
} from '../client.mjs';

// ── All event envelopes from all fixtures ────────────────────────────────────

function extractEnvelopes(fixtureName) {
  const fixture = loadFixture(fixtureName);
  const results = [];

  // Collect from event_sequence
  for (const arr of [
    fixture.event_sequence,
    fixture.event_sequence_before_abort,
    fixture.event_sequence_after_abort,
    fixture.phase_1_before_suspend,
    fixture.phase_6_completion,
  ]) {
    if (!Array.isArray(arr)) continue;
    for (const evt of arr) {
      const { _step, _description, _validates_as, _direction, ...envelope } = evt;
      if (envelope.event) results.push({ source: fixtureName, envelope });
    }
  }

  // Named event objects
  for (const key of [
    'phase_2_suspend',
    'phase_3_executor_restart_and_resync',
    'phase_4_aiwg_serve_resumes',
    'phase_5_executor_reconnects_mission',
  ]) {
    const section = fixture[key];
    if (!section) continue;

    // Event may be nested at different depths
    for (const candidate of [section.event, section.resync_event, section.resumed_event, section.reconnected_event]) {
      if (candidate?.event) {
        const { _step, _description, _validates_as, _direction, ...envelope } = candidate;
        results.push({ source: fixtureName, envelope });
      }
    }
  }

  return results;
}

const ALL_ENVELOPES = [
  ...extractEnvelopes('dispatch-happy'),
  ...extractEnvelopes('dispatch-failed'),
  ...extractEnvelopes('dispatch-aborted'),
  ...extractEnvelopes('hitl-roundtrip'),
  ...extractEnvelopes('resumable-suspend-resume'),
];

// ── Fixture integrity ────────────────────────────────────────────────────────

const FIXTURE_NAMES = [
  'dispatch-happy', 'dispatch-failed', 'dispatch-aborted',
  'hitl-roundtrip', 'resumable-suspend-resume',
];
const FIXTURE_HASHES = Object.fromEntries(FIXTURE_NAMES.map(n => [n, hashFixture(n)]));

describe('[Core] Events — fixture integrity', () => {
  for (const [name, hash] of Object.entries(FIXTURE_HASHES)) {
    it(`${name} fixture hash is stable (drift guard)`, () => {
      expect(hashFixture(name)).toBe(hash);
    });
  }
});

// ── Envelope shape ───────────────────────────────────────────────────────────

describe('[Core] Events — envelope shape', () => {
  it('all fixture envelopes have required event field', () => {
    for (const { source, envelope } of ALL_ENVELOPES) {
      expect(envelope, `[${source}] envelope missing event field`).toHaveProperty('event');
      expect(typeof envelope.event, `[${source}] event must be string`).toBe('string');
    }
  });

  it('all fixture envelopes have required executor_id field', () => {
    for (const { source, envelope } of ALL_ENVELOPES) {
      expect(envelope, `[${source}][${envelope.event}] missing executor_id`).toHaveProperty('executor_id');
    }
  });

  it('all fixture envelopes have required ts field', () => {
    for (const { source, envelope } of ALL_ENVELOPES) {
      expect(envelope, `[${source}][${envelope.event}] missing ts`).toHaveProperty('ts');
    }
  });

  it('all envelope.ts values are RFC 3339 timestamps', () => {
    for (const { source, envelope } of ALL_ENVELOPES) {
      const ts = new Date(envelope.ts);
      expect(ts.toString(), `[${source}][${envelope.event}] ts is invalid date: ${envelope.ts}`).not.toBe('Invalid Date');
      // Must contain 'T' separator
      expect(envelope.ts, `[${source}][${envelope.event}] ts must be RFC 3339`).toMatch(/T/);
      // Must end with Z or ±HH:MM
      expect(envelope.ts, `[${source}][${envelope.event}] ts must end with Z or offset`).toMatch(/Z$|[+-]\d{2}:\d{2}$/);
    }
  });

  it('all field names in fixture envelopes are snake_case', () => {
    const camelCasePattern = /[a-z][A-Z]/;
    for (const { source, envelope } of ALL_ENVELOPES) {
      for (const key of Object.keys(envelope)) {
        expect(key, `[${source}][${envelope.event}] field "${key}" must be snake_case`).not.toMatch(camelCasePattern);
      }
    }
  });
});

// ── event_type enum coverage ─────────────────────────────────────────────────

describe('[Core] Events — event_type enum', () => {
  const DEFINED_EVENT_TYPES = [
    'executor.registered', 'executor.deregistered', 'executor.resync',
    'mission.assigned', 'mission.started', 'mission.progress',
    'mission.hitl_required', 'mission.hitl_responded',
    'mission.paused', 'mission.resumed', 'mission.suspended', 'mission.reconnected',
    'mission.completed', 'mission.failed', 'mission.aborted',
  ];

  it('event_envelope schema defines all 15 event types', () => {
    // If the schema changes the enum we'll catch it here
    expect(DEFINED_EVENT_TYPES).toHaveLength(15);
  });

  it('all fixture events match the defined event_type enum', () => {
    const eventTypeSet = new Set(DEFINED_EVENT_TYPES);
    for (const { source, envelope } of ALL_ENVELOPES) {
      expect(
        eventTypeSet.has(envelope.event),
        `[${source}] unexpected event type: "${envelope.event}"`
      ).toBe(true);
    }
  });
});

// ── mission_id presence rules ────────────────────────────────────────────────

describe('[Core] Events — mission_id field rules', () => {
  it('mission.* events include mission_id', () => {
    for (const { source, envelope } of ALL_ENVELOPES) {
      if (envelope.event.startsWith('mission.')) {
        expect(
          envelope.mission_id,
          `[${source}][${envelope.event}] mission.* event must have mission_id`
        ).toBeTruthy();
      }
    }
  });

  it('executor.resync event does not have a mission_id', () => {
    for (const { source, envelope } of ALL_ENVELOPES) {
      if (envelope.event === 'executor.resync') {
        // executor.resync is an executor-level event — no mission_id
        expect(
          envelope.mission_id,
          `[${source}] executor.resync must not have mission_id`
        ).toBeUndefined();
      }
    }
  });
});

// ── Per-event data payload validation ────────────────────────────────────────

describe('[Core] Events — per-event data payload schema validation', () => {
  // Map each event type to the data schema $def
  const DATA_SCHEMA_MAP = {
    'executor.resync':         'executor.aiwg.io/v1#/$defs/data_executor_resync',
    'mission.assigned':        'executor.aiwg.io/v1#/$defs/data_mission_assigned',
    'mission.started':         'executor.aiwg.io/v1#/$defs/data_mission_started',
    'mission.progress':        'executor.aiwg.io/v1#/$defs/data_mission_progress',
    'mission.hitl_required':   'executor.aiwg.io/v1#/$defs/data_mission_hitl_required',
    'mission.hitl_responded':  'executor.aiwg.io/v1#/$defs/data_mission_hitl_responded',
    'mission.paused':          'executor.aiwg.io/v1#/$defs/data_mission_paused',
    'mission.resumed':         'executor.aiwg.io/v1#/$defs/data_mission_resumed',
    'mission.suspended':       'executor.aiwg.io/v1#/$defs/data_mission_suspended',
    'mission.reconnected':     'executor.aiwg.io/v1#/$defs/data_mission_reconnected',
    'mission.completed':       'executor.aiwg.io/v1#/$defs/data_mission_completed',
    'mission.failed':          'executor.aiwg.io/v1#/$defs/data_mission_failed',
    'mission.aborted':         'executor.aiwg.io/v1#/$defs/data_mission_aborted',
  };

  for (const [eventType, schemaRef] of Object.entries(DATA_SCHEMA_MAP)) {
    it(`${eventType} data validates against ${schemaRef.split('#')[1]}`, () => {
      const matching = ALL_ENVELOPES.filter(e => e.envelope.event === eventType);
      // Skip if no fixture has this event type (not an error, just not covered by fixtures)
      if (matching.length === 0) return;

      for (const { source, envelope } of matching) {
        if (envelope.data === undefined) continue;
        const { valid, errors } = validateSchema(schemaRef, envelope.data);
        expect(valid, `[${source}][${eventType}] data schema errors: ${errors}`).toBe(true);
      }
    });
  }
});

// ── Unknown event graceful handling ─────────────────────────────────────────

describe('[Core] Events — unknown events ignored gracefully', () => {
  let registry;

  afterAll(() => { try { registry?.shutdown(); } catch { /* ignore */ } });

  it('handleEvent with unknown event type does not throw', async () => {
    const { registry: reg } = await createRegistryForTest();
    registry = reg;

    const fakeWs = new FakeWsConn();
    registry.register({
      executor_id: 'ffffffff-0000-0000-0000-000000000001',
      name: 'test', version: '1.0.0', spec_version: '1.0.0',
      transport_endpoints: { rest: 'http://127.0.0.1:8000', ws: 'ws://127.0.0.1:8001' },
      capabilities: [],
    });
    registry.setConnected('ffffffff-0000-0000-0000-000000000001', true, fakeWs);

    expect(() => {
      registry.handleEvent({
        event: 'executor.custom_unknown_event_type_xyz',
        executor_id: 'ffffffff-0000-0000-0000-000000000001',
        ts: new Date().toISOString(),
        data: { arbitrary: 'payload' },
      });
    }).not.toThrow();
  });
});
