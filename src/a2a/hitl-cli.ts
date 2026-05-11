// CLI HitlDeliveryAdapter — terminal-based operator I/O for hitl-prompt/v1.
//
// Consumes the `HitlPromptEnvelope` extracted by `extractHitlEnvelope`,
// renders it to stdout, prompts the operator on stdin, and returns a
// JsonValue ready to be wrapped by `buildHitlResponseMessage` and POSTed
// via `A2AClient.sendMessage`.
//
// Behaviors:
//   - Renders the prompt verbatim (markdown allowed; we don't try to
//     re-render — terminal users get the raw markdown which is readable).
//   - Surfaces `response_schema` properties so the operator knows what
//     shape to type.
//   - Reads a single JSON line from stdin (multi-line input via repeated
//     reads until a balanced JSON value is parsed).
//   - Honors `signal` for cancellation (deadline expiry, task cancel).
//
// Not in scope for this adapter:
//   - Validation against `response_schema` — the driver does that with
//     Ajv (see `validateResponseWithAjv` in this module) so the adapter
//     can stay framework-free and unit-testable with mock streams.
//
// @issue #1255

import * as readline from 'node:readline';
import type { Readable, Writable } from 'node:stream';
import type {
  HitlDeliveryAdapter,
  HitlPromptEnvelope,
} from './hitl.js';
import type { JsonValue } from './types.js';

export interface CliHitlAdapterOptions {
  /** Override stdin — useful for tests. Defaults to `process.stdin`. */
  input?: Readable;
  /** Override stdout — useful for tests. Defaults to `process.stdout`. */
  output?: Writable;
  /** Override stderr. Defaults to `process.stderr`. */
  errorOutput?: Writable;
  /**
   * Override the operator id surfaced to the audit log. Defaults to
   * `process.env.USER ?? process.env.USERNAME ?? 'unknown-operator'`.
   */
  operatorId?: string;
}

export class CliHitlDeliveryAdapter implements HitlDeliveryAdapter {
  readonly name = 'cli';
  readonly operatorId: string;
  private readonly input: Readable;
  private readonly output: Writable;

  constructor(opts: CliHitlAdapterOptions = {}) {
    this.input = opts.input ?? process.stdin;
    this.output = opts.output ?? process.stdout;
    // errorOutput is reserved for future use (currently unused — kept on
    // the options surface so callers can plug it in once we add stderr
    // diagnostics from the adapter itself rather than the driver).
    void opts.errorOutput;
    this.operatorId =
      opts.operatorId ??
      process.env['USER'] ??
      process.env['USERNAME'] ??
      'unknown-operator';
  }

  async collect(
    envelope: HitlPromptEnvelope,
    ctx: { taskId?: string; contextId?: string; signal?: AbortSignal }
  ): Promise<JsonValue> {
    this.render(envelope, ctx);

    if (ctx.signal?.aborted) {
      throw new HitlAdapterAborted('signal aborted before reading response');
    }

    const raw = await this.readJsonFromStdin(ctx.signal);
    if (raw === null) {
      throw new HitlAdapterAborted('stdin closed without response');
    }

    return raw;
  }

  private render(
    envelope: HitlPromptEnvelope,
    ctx: { taskId?: string; contextId?: string }
  ): void {
    const lines: string[] = [];
    lines.push('');
    lines.push('━'.repeat(72));
    lines.push('HITL prompt — operator response required');
    lines.push('━'.repeat(72));
    lines.push(`prompt_id: ${envelope.prompt_id}`);
    if (ctx.taskId) lines.push(`task_id:   ${ctx.taskId}`);
    if (ctx.contextId) lines.push(`context:   ${ctx.contextId}`);
    if (envelope.deadline) lines.push(`deadline:  ${envelope.deadline}`);
    if (envelope.allowed_responders && envelope.allowed_responders.length > 0) {
      lines.push(`responders allowed: ${envelope.allowed_responders.join(', ')}`);
    }
    lines.push('');
    lines.push('Prompt:');
    lines.push('-'.repeat(72));
    lines.push(envelope.prompt);
    lines.push('-'.repeat(72));
    lines.push('Expected response shape (response_schema):');
    lines.push(JSON.stringify(envelope.response_schema, null, 2));
    lines.push('');
    lines.push('Enter response as a single JSON value (object, array, string, number, boolean, or null).');
    lines.push('Press Ctrl-D after the closing bracket/brace if your JSON spans multiple lines.');
    lines.push('');
    this.output.write(lines.join('\n') + '\n');
  }

  /**
   * Read JSON from `this.input` until either:
   *   - a balanced JSON value parses cleanly (success), or
   *   - the stream ends (returns null), or
   *   - the abort signal fires (throws HitlAdapterAborted).
   *
   * Allows the operator to type a multi-line JSON object — we accumulate
   * lines and try parsing at each newline boundary.
   */
  private readJsonFromStdin(signal?: AbortSignal): Promise<JsonValue | null> {
    return new Promise((resolve, reject) => {
      let aborted = false;
      const rl = readline.createInterface({
        input: this.input,
        crlfDelay: Infinity,
        terminal: false,
      });

      const abortListener = () => {
        aborted = true;
        rl.close();
        reject(new HitlAdapterAborted('signal aborted while reading stdin'));
      };
      if (signal) {
        if (signal.aborted) {
          rl.close();
          reject(new HitlAdapterAborted('signal aborted before reading'));
          return;
        }
        signal.addEventListener('abort', abortListener, { once: true });
      }

      let buffer = '';

      rl.on('line', (line: string) => {
        buffer += (buffer ? '\n' : '') + line;
        // Try parsing each time the operator hits enter — supports both
        // one-line responses and multi-line pretty-printed JSON.
        const parsed = tryParseJson(buffer);
        if (parsed.ok) {
          rl.close();
          if (signal) signal.removeEventListener('abort', abortListener);
          resolve(parsed.value);
        }
      });

      rl.on('close', () => {
        if (aborted) return;
        if (signal) signal.removeEventListener('abort', abortListener);
        if (buffer.length === 0) {
          resolve(null);
          return;
        }
        const finalParse = tryParseJson(buffer);
        if (finalParse.ok) resolve(finalParse.value);
        else
          reject(
            new HitlAdapterParseError(
              `could not parse stdin as JSON: ${finalParse.error}`
            )
          );
      });

      rl.on('error', (err: Error) => {
        if (signal) signal.removeEventListener('abort', abortListener);
        reject(err);
      });
    });
  }
}

export class HitlAdapterAborted extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HitlAdapterAborted';
  }
}

export class HitlAdapterParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HitlAdapterParseError';
  }
}

function tryParseJson(s: string): { ok: true; value: JsonValue } | { ok: false; error: string } {
  const trimmed = s.trim();
  if (trimmed.length === 0) return { ok: false, error: 'empty input' };
  try {
    return { ok: true, value: JSON.parse(trimmed) as JsonValue };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
