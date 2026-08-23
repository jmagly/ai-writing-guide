import {
  decodeArtifact,
  decodeMessage,
  decodeStatus,
  decodeTask,
  A2AWireValidationError,
} from './codecs.js';
import {
  isTerminalTaskState,
  type A2AProtocolVersion,
  type JsonValue,
  type StreamEvent,
  type Task,
} from './types.js';

export interface DecodeStreamOptions {
  eventName?: string;
  eventId?: string;
  sequence?: number;
}

/** Strict 1.0 StreamResponse decoder and separate 0.3 compatibility decoder. */
export function decodeStreamResponse(
  version: A2AProtocolVersion,
  input: unknown,
  opts: DecodeStreamOptions = {}
): StreamEvent {
  return version === '1.0'
    ? decodeV1StreamResponse(input, opts)
    : decodeLegacyStreamEvent(input, opts);
}

export function decodeV1StreamResponse(input: unknown, opts: DecodeStreamOptions = {}): StreamEvent {
  const obj = objectAt('1.0', '$', input);
  if (typeof obj.kind === 'string') {
    fail('1.0', '$.kind', 'legacy event discriminator is not valid in StreamResponse');
  }
  const members = ['task', 'message', 'statusUpdate', 'artifactUpdate']
    .filter(key => Object.prototype.hasOwnProperty.call(obj, key));
  if (members.length !== 1) {
    fail('1.0', '$', 'StreamResponse must contain exactly one of task, message, statusUpdate, artifactUpdate');
  }
  const base = eventBase('1.0', opts);
  switch (members[0]) {
    case 'task':
      return { ...base, type: 'task', task: decodeTask('1.0', obj.task, '$.task') };
    case 'message':
      return { ...base, type: 'message', message: decodeMessage('1.0', obj.message, '$.message') };
    case 'statusUpdate': {
      const update = objectAt('1.0', '$.statusUpdate', obj.statusUpdate);
      return {
        ...base,
        type: 'status',
        taskId: stringAt('1.0', '$.statusUpdate.taskId', update.taskId),
        contextId: stringAt('1.0', '$.statusUpdate.contextId', update.contextId),
        status: decodeStatus('1.0', update.status, '$.statusUpdate.status'),
        ...(update.metadata !== undefined
          ? { metadata: jsonObjectAt('1.0', '$.statusUpdate.metadata', update.metadata) }
          : {}),
      };
    }
    case 'artifactUpdate': {
      const update = objectAt('1.0', '$.artifactUpdate', obj.artifactUpdate);
      return {
        ...base,
        type: 'artifact',
        taskId: stringAt('1.0', '$.artifactUpdate.taskId', update.taskId),
        contextId: stringAt('1.0', '$.artifactUpdate.contextId', update.contextId),
        artifact: decodeArtifact('1.0', update.artifact, '$.artifactUpdate.artifact'),
        ...(update.append !== undefined ? { append: booleanAt('1.0', '$.artifactUpdate.append', update.append) } : {}),
        ...(update.lastChunk !== undefined ? { lastChunk: booleanAt('1.0', '$.artifactUpdate.lastChunk', update.lastChunk) } : {}),
        ...(update.metadata !== undefined
          ? { metadata: jsonObjectAt('1.0', '$.artifactUpdate.metadata', update.metadata) }
          : {}),
      };
    }
    default:
      fail('1.0', '$', 'unknown StreamResponse member');
  }
}

export function decodeLegacyStreamEvent(input: unknown, opts: DecodeStreamOptions = {}): StreamEvent {
  const obj = objectAt('0.3', '$', input);
  const base = eventBase('0.3', opts);

  // Some 0.3 subscriptions use the SSE event name for a full initial Task.
  if (typeof obj.id === 'string' && obj.status !== undefined) {
    return { ...base, type: 'task', task: decodeTask('0.3', obj) };
  }

  const kind = typeof obj.kind === 'string' ? obj.kind : opts.eventName;
  if (!kind) fail('0.3', '$', 'legacy stream event requires kind or SSE event name');
  switch (kind) {
    case 'task-state':
      return { ...base, type: 'task', task: decodeTask('0.3', obj.task, '$.task') };
    case 'status-update':
      return {
        ...base,
        type: 'status',
        taskId: stringAt('0.3', '$.taskId', obj.taskId),
        status: decodeStatus('0.3', obj.status, '$.status'),
      };
    case 'artifact-update':
      return {
        ...base,
        type: 'artifact',
        taskId: stringAt('0.3', '$.taskId', obj.taskId),
        artifact: decodeArtifact('0.3', obj.artifact, '$.artifact'),
        ...(obj.append !== undefined ? { append: booleanAt('0.3', '$.append', obj.append) } : {}),
      };
    default:
      fail('0.3', '$.kind', `unsupported legacy event '${kind}'`);
  }
}

export interface EventReconcilerOptions {
  taskId: string;
  contextId?: string;
  /** Subscription streams must start with a Task snapshot in 1.0. */
  requireInitialSnapshot?: boolean;
  /** Existing state when applying push deltas or reconnecting. */
  initialTask?: Task;
}

/**
 * Shared ordering/ownership/state-transition gate for SSE and push. It returns
 * null for an exact duplicate and throws before state mutation for invalid
 * ownership, out-of-order delivery, missing initial snapshots, or terminal
 * regression.
 */
export class A2AEventReconciler {
  private readonly taskId: string;
  private contextId?: string;
  private initialized: boolean;
  private terminal: boolean;
  private lastSequence?: number;
  private readonly eventIds = new Set<string>();

  constructor(opts: EventReconcilerOptions) {
    this.taskId = opts.taskId;
    this.contextId = opts.contextId ?? opts.initialTask?.contextId;
    this.initialized = opts.initialTask !== undefined || opts.requireInitialSnapshot !== true;
    this.terminal = opts.initialTask ? isTerminalTaskState(opts.initialTask.status.state) : false;
  }

  accept(event: StreamEvent): StreamEvent | null {
    if (event.eventId && this.eventIds.has(event.eventId)) return null;
    if (event.sequence !== undefined) {
      if (this.lastSequence !== undefined && event.sequence <= this.lastSequence) {
        if (event.sequence === this.lastSequence) return null;
        throw new Error(`A2A event sequence regressed from ${this.lastSequence} to ${event.sequence}`);
      }
      if (this.lastSequence !== undefined && event.sequence !== this.lastSequence + 1) {
        throw new Error(`A2A event sequence gap after ${this.lastSequence}: received ${event.sequence}`);
      }
    }

    const eventTaskId = taskIdOf(event);
    if (eventTaskId && eventTaskId !== this.taskId) {
      throw new Error(`A2A event belongs to task ${eventTaskId}, expected ${this.taskId}`);
    }
    const eventContextId = contextIdOf(event);
    if (this.contextId && eventContextId && this.contextId !== eventContextId) {
      throw new Error(`A2A event belongs to context ${eventContextId}, expected ${this.contextId}`);
    }

    if (!this.initialized) {
      if (event.type !== 'task') {
        throw new Error('A2A subscription must begin with a Task snapshot before deltas');
      }
      this.initialized = true;
    }

    if (this.terminal && event.type !== 'task') {
      throw new Error(`A2A event '${event.type}' arrived after task ${this.taskId} became terminal`);
    }
    if (event.type === 'task') {
      if (this.terminal && !isTerminalTaskState(event.task.status.state)) {
        throw new Error(`A2A task ${this.taskId} cannot regress from terminal state`);
      }
      this.contextId ??= event.task.contextId;
      this.terminal = isTerminalTaskState(event.task.status.state);
    } else if (event.type === 'status') {
      this.contextId ??= event.contextId;
      this.terminal = isTerminalTaskState(event.status.state);
    } else if (event.type === 'message') {
      this.contextId ??= event.message.contextId;
    } else {
      this.contextId ??= event.contextId;
    }

    if (event.eventId) this.eventIds.add(event.eventId);
    if (event.sequence !== undefined) this.lastSequence = event.sequence;
    return event;
  }

  isTerminal(): boolean {
    return this.terminal;
  }
}

function taskIdOf(event: StreamEvent): string | undefined {
  if (event.type === 'task') return event.task.id;
  if (event.type === 'message') return event.message.taskId;
  return event.taskId;
}

function contextIdOf(event: StreamEvent): string | undefined {
  if (event.type === 'task') return event.task.contextId;
  if (event.type === 'message') return event.message.contextId;
  return event.contextId;
}

function eventBase(version: A2AProtocolVersion, opts: DecodeStreamOptions) {
  return {
    protocolVersion: version,
    ...(opts.sequence !== undefined ? { sequence: opts.sequence } : {}),
    ...(opts.eventId !== undefined ? { eventId: opts.eventId } : {}),
  };
}

function objectAt(version: A2AProtocolVersion, path: string, value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(version, path, 'must be an object');
  return value as Record<string, unknown>;
}

function stringAt(version: A2AProtocolVersion, path: string, value: unknown): string {
  if (typeof value !== 'string' || !value) fail(version, path, 'must be a non-empty string');
  return value;
}

function booleanAt(version: A2AProtocolVersion, path: string, value: unknown): boolean {
  if (typeof value !== 'boolean') fail(version, path, 'must be a boolean');
  return value;
}

function jsonObjectAt(
  version: A2AProtocolVersion,
  path: string,
  value: unknown
): Record<string, JsonValue> {
  const object = objectAt(version, path, value);
  assertJsonValue(version, path, object);
  return object as Record<string, JsonValue>;
}

function assertJsonValue(version: A2AProtocolVersion, path: string, value: unknown): void {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'number' && Number.isFinite(value)) return;
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertJsonValue(version, `${path}[${index}]`, entry));
    return;
  }
  if (value && typeof value === 'object') {
    for (const [key, entry] of Object.entries(value)) {
      assertJsonValue(version, `${path}.${key}`, entry);
    }
    return;
  }
  fail(version, path, 'must contain only JSON values');
}

function fail(version: A2AProtocolVersion, path: string, detail: string): never {
  throw new A2AWireValidationError(version, path, detail);
}
