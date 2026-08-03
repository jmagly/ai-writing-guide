/**
 * Tests for the HITL CLI delivery adapter + orchestrator driver.
 *
 * @source @src/a2a/hitl-cli.ts
 * @source @src/a2a/hitl-driver.ts
 * @issue #1255
 */

import { describe, it, expect } from 'vitest';
import { PassThrough, Writable } from 'node:stream';

import {
  CliHitlDeliveryAdapter,
  HitlAdapterAborted,
} from '../../../src/a2a/hitl-cli.js';
import {
  driveOnePrompt,
  isResponderAllowed,
  validateResponseAgainstSchema,
  StderrHitlAuditLog,
  type HitlAuditEntry,
  type HitlAuditLog,
} from '../../../src/a2a/hitl-driver.js';
import type {
  HitlDeliveryAdapter,
  HitlPromptEnvelope,
} from '../../../src/a2a/hitl.js';
import type { JsonValue, Message } from '../../../src/a2a/types.js';
import { digestDecisionContext } from '../../../src/audit/operator-decision.js';

// ── helpers ────────────────────────────────────────────────────────────

class CollectingAuditLog implements HitlAuditLog {
  entries: HitlAuditEntry[] = [];
  append(entry: HitlAuditEntry): void {
    this.entries.push(entry);
  }
}

class DiscardWritable extends Writable {
  override _write(_c: unknown, _e: string, cb: (e?: Error | null) => void): void {
    cb();
  }
}

function makeEnvelope(overrides: Partial<HitlPromptEnvelope> = {}): HitlPromptEnvelope {
  return {
    prompt_id: 'p-1',
    prompt: 'Approve deploy?',
    response_schema: {
      type: 'object',
      required: ['approve'],
      properties: { approve: { type: 'boolean' } },
    } as JsonValue,
    ...overrides,
  };
}

class MockAdapter implements HitlDeliveryAdapter {
  name = 'mock';
  operatorId = 'tester';
  responses: JsonValue[];
  attempts = 0;
  constructor(responses: JsonValue[]) {
    this.responses = responses;
  }
  async collect(
    _env: HitlPromptEnvelope,
    _ctx: { signal?: AbortSignal }
  ): Promise<JsonValue> {
    if (this.attempts >= this.responses.length) {
      throw new Error('mock: no more responses');
    }
    return this.responses[this.attempts++]!;
  }
}

interface SentMessage {
  message: Message;
}
function makeClientStub(opts: { failNext?: number; throwHttp422?: boolean } = {}): {
  sendMessage: (message: Message) => Promise<unknown>;
  sent: SentMessage[];
} {
  const sent: SentMessage[] = [];
  let failsLeft = opts.failNext ?? 0;
  return {
    sent,
    async sendMessage(message: Message) {
      if (failsLeft > 0) {
        failsLeft--;
        if (opts.throwHttp422) {
          throw new Error('A2AError 422 hitl_response_invalid');
        }
        throw new Error('A2AError 500 internal');
      }
      sent.push({ message });
      return { task: { id: 'task-1', status: { state: 'completed', timestamp: '' } } };
    },
  };
}

// ── validateResponseAgainstSchema ──────────────────────────────────────

describe('validateResponseAgainstSchema', () => {
  it('passes a response that conforms to a simple schema', () => {
    const env = makeEnvelope();
    const res = validateResponseAgainstSchema(env, { approve: true });
    expect(res.ok).toBe(true);
  });

  it('fails a response that violates the schema', () => {
    const env = makeEnvelope();
    const res = validateResponseAgainstSchema(env, { approve: 'yes' });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.errors.join(' ')).toMatch(/approve|boolean/i);
    }
  });

  it('fails on missing required property', () => {
    const env = makeEnvelope();
    const res = validateResponseAgainstSchema(env, {});
    expect(res.ok).toBe(false);
  });

  it('accepts a permissive schema (object with no constraints)', () => {
    const env = makeEnvelope({ response_schema: { type: 'object' } as JsonValue });
    const res = validateResponseAgainstSchema(env, { whatever: 1 });
    expect(res.ok).toBe(true);
  });
});

// ── CliHitlDeliveryAdapter ─────────────────────────────────────────────

describe('CliHitlDeliveryAdapter', () => {
  it('reads a single-line JSON response and returns it', async () => {
    const input = new PassThrough();
    const output = new DiscardWritable();
    const adapter = new CliHitlDeliveryAdapter({ input, output, operatorId: 'alice' });
    const promise = adapter.collect(makeEnvelope(), {});
    input.write('{"approve":true}\n');
    input.end();
    const result = await promise;
    expect(result).toEqual({ approve: true });
    expect(adapter.operatorId).toBe('alice');
  });

  it('reads multi-line JSON, parsing on the line that closes the value', async () => {
    const input = new PassThrough();
    const output = new DiscardWritable();
    const adapter = new CliHitlDeliveryAdapter({ input, output });
    const promise = adapter.collect(makeEnvelope(), {});
    input.write('{\n');
    input.write('  "approve": true\n');
    input.write('}\n');
    const result = await promise;
    expect(result).toEqual({ approve: true });
    input.end();
  });

  it('honors a pre-aborted signal', async () => {
    const input = new PassThrough();
    const output = new DiscardWritable();
    const adapter = new CliHitlDeliveryAdapter({ input, output });
    const controller = new AbortController();
    controller.abort();
    await expect(adapter.collect(makeEnvelope(), { signal: controller.signal })).rejects.toBeInstanceOf(
      HitlAdapterAborted
    );
  });

  it('renders prompt_id and deadline to the output stream', async () => {
    const input = new PassThrough();
    const chunks: Buffer[] = [];
    const output = new Writable({
      write(c, _e, cb) {
        chunks.push(Buffer.from(c));
        cb();
      },
    });
    const adapter = new CliHitlDeliveryAdapter({ input, output });
    const promise = adapter.collect(
      makeEnvelope({ prompt_id: 'p-42', deadline: '2030-01-01T00:00:00Z' }),
      { taskId: 'task-9' }
    );
    input.write('"ok"\n');
    input.end();
    await promise;
    const rendered = Buffer.concat(chunks).toString('utf8');
    expect(rendered).toContain('p-42');
    expect(rendered).toContain('task-9');
    expect(rendered).toContain('2030-01-01T00:00:00Z');
    expect(rendered).toContain('HITL prompt');
  });
});

// ── driveOnePrompt ─────────────────────────────────────────────────────

describe('driveOnePrompt', () => {
  it('rejects a responder that is not authorized by the prompt policy', async () => {
    const adapter = new MockAdapter([{ approve: true }]);
    const client = makeClientStub();
    const auditLog = new CollectingAuditLog();
    await driveOnePrompt({
      envelope: makeEnvelope({ allowed_responders: ['specific:release-manager'] }),
      client,
      adapter,
      auditLog,
    });
    expect(client.sent).toHaveLength(0);
    expect(adapter.attempts).toBe(0);
    expect(auditLog.entries[0]).toMatchObject({ operator: 'tester', outcome: 'unauthorized' });
  });

  it('happy path: validates response and posts reply Message', async () => {
    const adapter = new MockAdapter([{ approve: true }]);
    const client = makeClientStub();
    const auditLog = new CollectingAuditLog();
    await driveOnePrompt({
      envelope: makeEnvelope(),
      client,
      adapter,
      auditLog,
      taskId: 'task-1',
      contextId: 'ctx-1',
    });
    expect(client.sent).toHaveLength(1);
    const sent = client.sent[0]!.message;
    expect(sent.metadata?.['hitl_response_for']).toEqual({
      prompt_id: 'p-1',
      payload: { approve: true },
    });
    expect(auditLog.entries).toHaveLength(1);
    expect(auditLog.entries[0]!.outcome).toBe('responded');
    expect(auditLog.entries[0]!.response_digest).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(JSON.stringify(auditLog.entries[0])).not.toContain('"approve":true');
    expect(auditLog.entries[0]!.task_id).toBe('task-1');
    expect(auditLog.entries[0]!.context_id).toBe('ctx-1');
  });

  it('rejects an invalid response and retries until validation passes', async () => {
    const adapter = new MockAdapter([{ approve: 'maybe' }, { approve: true }]);
    const client = makeClientStub();
    const auditLog = new CollectingAuditLog();
    await driveOnePrompt({
      envelope: makeEnvelope(),
      client,
      adapter,
      auditLog,
      maxRetries: 3,
    });
    expect(client.sent).toHaveLength(1);
    expect(auditLog.entries).toHaveLength(1);
    expect(auditLog.entries[0]!.outcome).toBe('responded');
    expect(adapter.attempts).toBe(2);
  });

  it('records `invalid` outcome after exhausting retries', async () => {
    const adapter = new MockAdapter([
      { approve: 'no' },
      { approve: 1 },
      { approve: null },
    ]);
    const client = makeClientStub();
    const auditLog = new CollectingAuditLog();
    await driveOnePrompt({
      envelope: makeEnvelope(),
      client,
      adapter,
      auditLog,
      maxRetries: 3,
    });
    expect(client.sent).toHaveLength(0);
    expect(auditLog.entries).toHaveLength(1);
    expect(auditLog.entries[0]!.outcome).toBe('invalid');
    expect(auditLog.entries[0]!.error).toMatch(/approve|boolean/i);
  });

  it('treats 422 hitl_response_invalid from sendMessage as a re-prompt trigger', async () => {
    const adapter = new MockAdapter([{ approve: true }, { approve: true }]);
    const client = makeClientStub({ failNext: 1, throwHttp422: true });
    const auditLog = new CollectingAuditLog();
    await driveOnePrompt({
      envelope: makeEnvelope(),
      client,
      adapter,
      auditLog,
      maxRetries: 3,
    });
    expect(client.sent).toHaveLength(1);
    expect(auditLog.entries[0]!.outcome).toBe('responded');
    expect(adapter.attempts).toBe(2);
  });

  it('records `send_failed` when sendMessage throws a non-422 error', async () => {
    const adapter = new MockAdapter([{ approve: true }]);
    const client = makeClientStub({ failNext: 99, throwHttp422: false });
    const auditLog = new CollectingAuditLog();
    await expect(
      driveOnePrompt({
        envelope: makeEnvelope(),
        client,
        adapter,
        auditLog,
        maxRetries: 1,
      })
    ).rejects.toThrow();
    expect(auditLog.entries).toHaveLength(1);
    expect(auditLog.entries[0]!.outcome).toBe('send_failed');
  });

  it('records `expired` when deadline passes before response', async () => {
    class SlowAdapter implements HitlDeliveryAdapter {
      name = 'slow';
      operatorId = 'tester';
      async collect(
        _env: HitlPromptEnvelope,
        ctx: { signal?: AbortSignal }
      ): Promise<JsonValue> {
        return new Promise<JsonValue>((_resolve, reject) => {
          ctx.signal?.addEventListener('abort', () =>
            reject(new HitlAdapterAborted('deadline aborted'))
          );
          // never resolves on its own
        });
      }
    }
    const auditLog = new CollectingAuditLog();
    // Deadline 50ms in the future.
    const deadline = new Date(Date.now() + 50).toISOString();
    await driveOnePrompt({
      envelope: makeEnvelope({ deadline }),
      client: makeClientStub(),
      adapter: new SlowAdapter(),
      auditLog,
    });
    expect(auditLog.entries[0]!.outcome).toBe('expired');
  });

  it('correlates concurrent prompts by prompt_id', async () => {
    const auditLog = new CollectingAuditLog();
    const adapter = new MockAdapter([{ approve: true }, { approve: false }]);
    const client = makeClientStub();
    await driveOnePrompt({
      envelope: makeEnvelope({ prompt_id: 'p-A' }),
      client,
      adapter,
      auditLog,
    });
    await driveOnePrompt({
      envelope: makeEnvelope({ prompt_id: 'p-B' }),
      client,
      adapter,
      auditLog,
    });
    expect(auditLog.entries.map(e => e.prompt_id)).toEqual(['p-A', 'p-B']);
    expect(client.sent.map(s => s.message.metadata?.['hitl_response_for'])).toEqual([
      { prompt_id: 'p-A', payload: { approve: true } },
      { prompt_id: 'p-B', payload: { approve: false } },
    ]);
  });
});

describe('isResponderAllowed', () => {
  it('defaults to any and matches a specific principal', () => {
    expect(isResponderAllowed(undefined, 'alice')).toBe(true);
    expect(isResponderAllowed(['specific:alice'], 'alice')).toBe(true);
    expect(isResponderAllowed(['specific:alice'], 'bob')).toBe(false);
  });

  it('requires an aggregate adapter for consensus policies', () => {
    expect(isResponderAllowed(['consensus:2'], 'alice')).toBe(false);
  });
});

// ── StderrHitlAuditLog smoke ───────────────────────────────────────────

describe('StderrHitlAuditLog', () => {
  it('serializes entry as JSONL on stderr', () => {
    // Construct directly; just verify the call signature compiles and runs.
    const log = new StderrHitlAuditLog();
    log.append({
      decided_at: new Date().toISOString(),
      operator: 'tester',
      channel: 'cli',
      prompt_id: 'p-smoke',
      outcome: 'responded',
      response_digest: digestDecisionContext({ ok: true }),
      duration_ms: 1,
    });
    // No assertion — just exercising the path.
  });
});
