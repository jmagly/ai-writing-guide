import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  A2AWireValidationError,
  decodeMessage,
  decodeTask,
  encodeMessage,
  encodeTask,
} from '../../../src/a2a/codecs.js';
import type { Task, TaskState } from '../../../src/a2a/types.js';

function fixture(name: string) {
  return JSON.parse(readFileSync(new URL(`../../fixtures/a2a/${name}`, import.meta.url), 'utf8'));
}

describe('versioned A2A wire codecs', () => {
  it('round-trips every AIWG-used 1.0 Part member and preserves extensions/graph metadata', () => {
    const golden = fixture('v1.0-golden.json');
    const message = decodeMessage('1.0', golden.message);
    expect(message.parts.map((part: { type: string }) => part.type)).toEqual(['text', 'file', 'file', 'data']);
    expect(encodeMessage('1.0', message)).toEqual(golden.message);
    const task = decodeTask('1.0', golden.task);
    expect(encodeTask('1.0', task)).toEqual(golden.task);
  });

  it('round-trips the distinct 0.3 text/file/data shapes', () => {
    const golden = fixture('v0.3-golden.json');
    expect(encodeMessage('0.3', decodeMessage('0.3', golden.message))).toEqual(golden.message);
    expect(encodeTask('0.3', decodeTask('0.3', golden.task))).toEqual(golden.task);
  });

  it('rejects mixed fields and invalid oneofs before normalization', () => {
    expect(() => decodeMessage('1.0', {
      messageId: 'm', role: 'ROLE_USER', parts: [{ kind: 'text', text: 'bad' }],
    })).toThrow(A2AWireValidationError);
    expect(() => decodeMessage('1.0', {
      messageId: 'm', role: 'ROLE_USER', parts: [{ text: 'a', data: {} }],
    })).toThrow(/exactly one/);
    expect(() => decodeMessage('0.3', {
      messageId: 'm', role: 'user', parts: [{ kind: 'file', bytes: 'aGVsbG8=', raw: 'aGVsbG8=' }],
    })).toThrow(/1.0 part fields/);
  });

  it('rejects wire enums from the other protocol version', () => {
    expect(() => decodeTask('1.0', { id: 't', status: { state: 'working' } })).toThrow(/unsupported state/);
    expect(() => decodeTask('0.3', { id: 't', status: { state: 'TASK_STATE_WORKING' } })).toThrow(/unsupported state/);
  });

  it.each([
    'submitted',
    'working',
    'completed',
    'failed',
    'canceled',
    'input-required',
    'rejected',
    'auth-required',
  ] satisfies TaskState[])('round-trips normalized state %s through both adapters', (state) => {
    const normalized: Task = {
      id: `task-${state}`,
      contextId: 'ctx',
      status: {
        state,
        timestamp: '2026-08-23T12:00:00Z',
        extensions: ['https://example.test/status/v1'],
      },
      extensions: ['https://example.test/task/v1'],
      metadata: { 'aiwg.flow.graph': { graph_id: 'g-1', run_id: 'r-1' } },
    };
    expect(decodeTask('0.3', encodeTask('0.3', normalized))).toEqual(normalized);
    expect(decodeTask('1.0', encodeTask('1.0', normalized))).toEqual(normalized);
  });
});
