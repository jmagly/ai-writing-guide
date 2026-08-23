/**
 * HITL prompt envelope extractor + structural validator tests.
 *
 * @source @src/a2a/hitl.ts
 * @issue #1255
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { A2A_HITL_PROMPT_V1 } from '../../../src/a2a/client.js';
import { encodeMessage } from '../../../src/a2a/codecs.js';
import {
  buildHitlResponseMessage,
  extractHitlEnvelope,
  validateResponseStructurally,
  type HitlDeliveryAdapter,
} from '../../../src/a2a/hitl.js';
import type { Task, JsonValue } from '../../../src/a2a/types.js';

const PROMPT_ID = '9f4b15b6-6e1d-4c83-9a7f-43f8dd2d0d65';

function makeTask(overrides: Partial<Task> = {}, envelope?: Record<string, JsonValue>): Task {
  const base: Task = {
    id: 't-1',
    status: {
      state: 'input-required',
      message: {
        messageId: 'agent-m-1',
        role: 'agent',
        parts: [{ type: 'text', text: 'Need your input' }],
        metadata: envelope
          ? { [A2A_HITL_PROMPT_V1]: envelope as unknown as JsonValue }
          : {},
      },
    },
    ...overrides,
  };
  return base;
}

describe('extractHitlEnvelope', () => {
  it('returns the envelope for an input-required Task with a valid envelope', () => {
    const task = makeTask({}, {
      prompt_id: PROMPT_ID,
      prompt: 'Approve deploy?',
      response_schema: { type: 'object' } as JsonValue,
    });
    const result = extractHitlEnvelope(task);
    expect(result?.ok).toBe(true);
    if (result?.ok) {
      expect(result.envelope.prompt_id).toBe(PROMPT_ID);
      expect(result.envelope.prompt).toBe('Approve deploy?');
    }
  });

  it('returns null for a task not in input-required state', () => {
    const task: Task = { id: 't-1', status: { state: 'working' } };
    expect(extractHitlEnvelope(task)).toBeNull();
  });

  it('flags missing metadata as a validation failure', () => {
    const task: Task = {
      id: 't-1',
      status: {
        state: 'input-required',
        message: { messageId: 'm', role: 'agent', parts: [] },
      },
    };
    const result = extractHitlEnvelope(task);
    expect(result?.ok).toBe(false);
    if (result && !result.ok) {
      expect(result.reason).toMatch(/no metadata/);
    }
  });

  it('flags missing envelope at the HITL URI', () => {
    const task = makeTask();
    const result = extractHitlEnvelope(task);
    expect(result?.ok).toBe(false);
    if (result && !result.ok) {
      expect(result.reason).toMatch(/missing envelope/);
    }
  });

  it('flags envelope missing required keys', () => {
    const task = makeTask({}, {
      prompt_id: PROMPT_ID,
      prompt: 'x',
      // response_schema missing
    });
    const result = extractHitlEnvelope(task);
    expect(result?.ok).toBe(false);
    if (result && !result.ok) {
      expect(result.reason).toMatch(/response_schema/);
    }
  });

  it('flags non-string prompt_id', () => {
    const task = makeTask({}, {
      prompt_id: '',
      prompt: 'x',
      response_schema: { type: 'object' } as JsonValue,
    });
    const result = extractHitlEnvelope(task);
    expect(result?.ok).toBe(false);
  });

  it('rejects non-UUID correlation ids and non-canonical response schemas', () => {
    const badId = extractHitlEnvelope(makeTask({}, {
      prompt_id: 'p-1',
      prompt: 'x',
      response_schema: { type: 'object' } as JsonValue,
    }));
    expect(badId).toMatchObject({ ok: false, reason: expect.stringMatching(/UUID/) });

    const badSchema = extractHitlEnvelope(makeTask({}, {
      prompt_id: PROMPT_ID,
      prompt: 'x',
      response_schema: { type: 'string' } as JsonValue,
    }));
    expect(badSchema).toMatchObject({ ok: false, reason: expect.stringMatching(/top-level type object/) });
  });

  it('validates deadline, responder policy, and closed envelope shape', () => {
    const invalidResponder = extractHitlEnvelope(makeTask({}, {
      prompt_id: PROMPT_ID,
      prompt: 'x',
      response_schema: { type: 'object' } as JsonValue,
      allowed_responders: ['specific:release manager'] as unknown as JsonValue,
    }));
    expect(invalidResponder).toMatchObject({ ok: false, reason: expect.stringMatching(/responder policy/) });

    const extraProperty = extractHitlEnvelope(makeTask({}, {
      prompt_id: PROMPT_ID,
      prompt: 'x',
      response_schema: { type: 'object' } as JsonValue,
      vendor_extension: true,
    }));
    expect(extraProperty).toMatchObject({ ok: false, reason: expect.stringMatching(/unsupported key/) });
  });

  it('works with bare TaskStatus too', () => {
    const result = extractHitlEnvelope({
      state: 'input-required',
      message: {
        messageId: 'm',
        role: 'agent',
        parts: [],
        metadata: {
          [A2A_HITL_PROMPT_V1]: {
            prompt_id: PROMPT_ID,
            prompt: 'hi',
            response_schema: { type: 'object' },
          } as unknown as JsonValue,
        },
      },
    });
    expect(result?.ok).toBe(true);
  });

  it('returns null on null/undefined input', () => {
    expect(extractHitlEnvelope(null)).toBeNull();
    expect(extractHitlEnvelope(undefined)).toBeNull();
  });
});

describe('buildHitlResponseMessage', () => {
  it('matches the canonical agentic-sandbox prompt and response fixture', () => {
    const fixture = JSON.parse(readFileSync(
      new URL('../../fixtures/contracts/hitl-prompt-v1.json', import.meta.url),
      'utf8',
    ));
    const extracted = extractHitlEnvelope(fixture.task as Task);
    expect(extracted?.ok).toBe(true);
    if (!extracted?.ok) return;
    const built = buildHitlResponseMessage({
      promptId: extracted.envelope.prompt_id,
      response: { approved: true },
      messageId: fixture.response.messageId,
      taskId: fixture.response.taskId,
    });
    expect(encodeMessage('0.3', built)).toEqual(fixture.response);
  });

  it('produces a Message with hitl_response_for correlation', () => {
    const msg = buildHitlResponseMessage({
      promptId: PROMPT_ID,
      response: { approved: true } as JsonValue,
      messageId: 'reply-1',
      taskId: 't-1',
    });
    expect(msg.messageId).toBe('reply-1');
    expect(msg.role).toBe('user');
    expect(msg.taskId).toBe('t-1');
    expect(msg.metadata?.['hitl_response_for']).toEqual({
      prompt_id: PROMPT_ID,
      payload: { approved: true },
    });
    expect(msg.metadata?.[A2A_HITL_PROMPT_V1]).toBeUndefined();
  });

  it('omits taskId when not provided', () => {
    const msg = buildHitlResponseMessage({
      promptId: PROMPT_ID,
      response: { approved: false } as JsonValue,
      messageId: 'reply-2',
    });
    expect(msg.taskId).toBeUndefined();
  });

  it('preserves graph extension identity on the HITL response path', () => {
    const graph = {
      schemaVersion: 'graph.flow.aiwg.io/v1', graphId: 'examples/review', graphVersion: '1.0.0',
      runId: 'run-1', nodeId: 'approval', nodeRunId: 'run-1:approval:1:1',
    } as JsonValue;
    const msg = buildHitlResponseMessage({
      promptId: PROMPT_ID,
      response: { approved: true },
      messageId: 'reply-graph',
      metadata: { 'aiwg.flow.graph': graph },
    });
    expect(msg.metadata?.['aiwg.flow.graph']).toEqual(graph);
    expect(msg.metadata?.['hitl_response_for']).toMatchObject({ prompt_id: PROMPT_ID });
  });
});

describe('validateResponseStructurally', () => {
  it('accepts valid object response', () => {
    const schema: JsonValue = {
      type: 'object',
      required: ['approved'],
      properties: { approved: { type: 'boolean' } as JsonValue },
    };
    const result = validateResponseStructurally(schema, { approved: true });
    expect(result.ok).toBe(true);
  });

  it('rejects on type mismatch', () => {
    const schema: JsonValue = {
      type: 'object',
      properties: { approved: { type: 'boolean' } as JsonValue },
    };
    const result = validateResponseStructurally(schema, { approved: 'yes' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]).toMatch(/expected boolean/);
    }
  });

  it('rejects on missing required field', () => {
    const schema: JsonValue = {
      type: 'object',
      required: ['approved', 'reason'],
      properties: {},
    };
    const result = validateResponseStructurally(schema, { approved: true });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.join('|')).toMatch(/reason/);
    }
  });

  it('validates array items', () => {
    const schema: JsonValue = {
      type: 'array',
      items: { type: 'number' } as JsonValue,
    };
    expect(validateResponseStructurally(schema, [1, 2, 3]).ok).toBe(true);
    expect(validateResponseStructurally(schema, [1, '2', 3]).ok).toBe(false);
  });
});

describe('HitlDeliveryAdapter interface (compile check)', () => {
  it('satisfies the interface with a basic stub adapter', async () => {
    const stub: HitlDeliveryAdapter = {
      name: 'stub',
      async collect() {
        return { approved: true } as JsonValue;
      },
    };
    const result = await stub.collect(
      {
        prompt_id: 'p',
        prompt: 'x',
        response_schema: {} as JsonValue,
      },
      {}
    );
    expect(result).toEqual({ approved: true });
  });
});
