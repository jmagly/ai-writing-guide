import { UhpError, redactUhpText } from './errors.js';
import type { UhpEvent } from './types.js';

const TERMINAL_EVENTS = new Set(['response.completed', 'response.failed', 'response.incomplete', 'response.cancelled']);

export async function* parseUhpEventStream(
  body: ReadableStream<Uint8Array>,
  options: { inactivityTimeoutMs: number; secrets?: readonly string[]; signal?: AbortSignal },
): AsyncGenerator<UhpEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let expectedSequence = 0;
  let terminalCount = 0;
  let first = true;

  const read = async () => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        reader.read(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new UhpError('stream_inactivity_timeout', 'UHP stream became inactive; remote task state is unknown', { retryable: true, remoteState: 'unknown' })), options.inactivityTimeoutMs);
        }),
      ]);
    } finally { if (timer) clearTimeout(timer); }
  };

  const decodeBlock = (block: string): UhpEvent | undefined => {
    const data = block.split(/\r?\n/).filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n');
    if (!data) return undefined;
    let event: UhpEvent;
    try { event = JSON.parse(data) as UhpEvent; }
    catch { throw new UhpError('malformed_sse', redactUhpText('Malformed JSON in UHP event stream', options.secrets), { remoteState: 'unknown' }); }
    if (!Number.isSafeInteger(event.sequence_number) || event.sequence_number !== expectedSequence) {
      throw new UhpError('event_sequence_gap', `Expected UHP event sequence ${expectedSequence}, received ${String(event.sequence_number)}`, { remoteState: 'unknown' });
    }
    if (first && event.type !== 'response.created') throw new UhpError('invalid_first_event', `First UHP event must be response.created, received ${event.type}`, { remoteState: 'unknown' });
    first = false;
    expectedSequence += 1;
    if (TERMINAL_EVENTS.has(event.type)) terminalCount += 1;
    if (terminalCount > 1) throw new UhpError('duplicate_terminal_event', 'UHP stream emitted more than one terminal event', { remoteState: 'unknown' });
    return event;
  };

  try {
    while (true) {
      options.signal?.throwIfAborted();
      const { done, value } = await read();
      buffer += decoder.decode(value, { stream: !done });
      const blocks = buffer.split(/\r?\n\r?\n/);
      buffer = blocks.pop() ?? '';
      for (const block of blocks) { const event = decodeBlock(block); if (event) yield event; }
      if (done) break;
    }
    if (buffer.trim()) { const event = decodeBlock(buffer); if (event) yield event; }
    if (terminalCount !== 1) throw new UhpError('missing_terminal_event', 'UHP stream ended without exactly one terminal event; remote task state is unknown', { retryable: true, remoteState: 'unknown' });
  } finally { reader.releaseLock(); }
}
