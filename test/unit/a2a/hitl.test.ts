/**
 * HITL prompt envelope extractor + structural validator tests.
 *
 * @source @src/a2a/hitl.ts
 * @issue #1255
 */

import { describe, it, expect } from 'vitest';
import { A2A_HITL_PROMPT_V1 } from '../../../src/a2a/client.js';
import {
  buildHitlResponseMessage,
  extractHitlEnvelope,
  validateResponseStructurally,
  type HitlDeliveryAdapter,
} from '../../../src/a2a/hitl.js';
import type { Task, JsonValue } from '../../../src/a2a/types.js';

function makeTask(overrides: Partial<Task> = {}, envelope?: Record<string, JsonValue>): Task {
  const base: Task = {
    id: 't-1',
    status: {
      state: 'input-required',
      message: {
        messageId: 'agent-m-1',
        role: 'agent',
        parts: [{ kind: 'text', text: 'Need your input' }],
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
      prompt_id: 'p-1',
      prompt: 'Approve deploy?',
      response_schema: { type: 'object' } as JsonValue,
    });
    const result = extractHitlEnvelope(task);
    expect(result?.ok).toBe(true);
    if (result?.ok) {
      expect(result.envelope.prompt_id).toBe('p-1');
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
      prompt_id: 'p-1',
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

  it('works with bare TaskStatus too', () => {
    const result = extractHitlEnvelope({
      state: 'input-required',
      message: {
        messageId: 'm',
        role: 'agent',
        parts: [],
        metadata: {
          [A2A_HITL_PROMPT_V1]: {
            prompt_id: 'p-2',
            prompt: 'hi',
            response_schema: { type: 'string' },
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
  it('produces a Message with hitl_response_for correlation', () => {
    const msg = buildHitlResponseMessage({
      promptId: 'p-1',
      response: { approved: true } as JsonValue,
      messageId: 'reply-1',
      taskId: 't-1',
    });
    expect(msg.messageId).toBe('reply-1');
    expect(msg.role).toBe('user');
    expect(msg.taskId).toBe('t-1');
    expect(msg.metadata?.['hitl_response_for']).toBe('p-1');
    const envResp = msg.metadata?.[A2A_HITL_PROMPT_V1] as { response?: unknown };
    expect(envResp?.response).toEqual({ approved: true });
  });

  it('omits taskId when not provided', () => {
    const msg = buildHitlResponseMessage({
      promptId: 'p-1',
      response: { approved: false } as JsonValue,
      messageId: 'reply-2',
    });
    expect(msg.taskId).toBeUndefined();
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
