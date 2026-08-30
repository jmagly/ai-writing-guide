// A2A client — sends messages, subscribes to task streams, manages push
// notification configs against an agentic-sandbox v2 instance.
//
// Mirrors the executor's REST surface
// (agentic-sandbox-executor/src/bindings/rest.rs):
//
//   POST   /agents/{id}/v1/messages:send
//   GET    /agents/{id}/v1/tasks/{tid}
//   POST   /agents/{id}/v1/tasks/{tid}/cancel
//   GET    /agents/{id}/v1/tasks/{tid}/subscribe        (SSE)
//   POST   /agents/{id}/v1/tasks/{tid}/pushNotificationConfigs
//   GET    /agents/{id}/v1/tasks/{tid}/pushNotificationConfigs/{cid}
//   DELETE /agents/{id}/v1/tasks/{tid}/pushNotificationConfigs/{cid}
//   GET    /agents/{id}/.well-known/agent-card.json
//   GET    /agents/{id}/v1/extendedAgentCard            (extended card)
//   GET    /agents/{id}/v1/card                         (legacy extended card)

import { A2AError, A2AHttpClient, type A2AHttpClientOptions, type A2AResponse } from './http.js';
import {
  decodePushNotificationConfig,
  decodeSendMessageResponse,
  decodeTask,
  encodeMessage,
  encodePushNotificationConfig,
} from './codecs.js';
import { A2AEventReconciler, decodeStreamResponse } from './events.js';
import { normalizeAgentCard, selectAgentInterface } from './protocol.js';
import type {
  A2AProtocolPolicy,
  A2AProtocolVersion,
  AgentCard,
  Message,
  NormalizedAgentInterface,
  PushNotificationConfig,
  StreamEvent,
  Task,
} from './types.js';

export const A2A_RUNTIME_V1 = 'https://agentic-sandbox.aiwg.io/extensions/runtime/v1';
export const A2A_IDEMPOTENCY_V1 = 'https://agentic-sandbox.aiwg.io/extensions/idempotency/v1';
export const A2A_HITL_PROMPT_V1 = 'https://agentic-sandbox.aiwg.io/extensions/hitl-prompt/v1';
export const A2A_MULTI_TENANT_V1 = 'https://agentic-sandbox.aiwg.io/extensions/multi-tenant/v1';
export const A2A_PTY_EXTENSIONS_V1 = 'https://agentic-sandbox.aiwg.io/extensions/pty-extensions/v1';

/** Required-by-default extension set — the executor's `RequireA2AExtensions`
 *  middleware (sandbox#236) rejects mutating calls without these. */
export const DEFAULT_REQUIRED_EXTENSIONS = [A2A_RUNTIME_V1, A2A_IDEMPOTENCY_V1] as const;

export interface A2AClientOptions extends Omit<A2AHttpClientOptions, 'defaultExtensions'> {
  /** Stable executor-side identifier (UUIDv7 per sandbox docs). */
  instanceId: string;
  /** Required extensions to inject on every mutating call. Defaults to
   *  `runtime/v1` + `idempotency/v1`. Add optional URIs (e.g. hitl-prompt/v1)
   *  via `optionalExtensions`. */
  requiredExtensions?: readonly string[];
  /** Optional extensions to include in the `A2A-Extensions` header (toggled
   *  by AIWG config flags upstream). */
  optionalExtensions?: readonly string[];
  /** Explicit wire policy. `auto` requires negotiate(); constructor defaults to 0.3. */
  protocolPolicy?: A2AProtocolPolicy;
  /** Interface selected from a normalized AgentCard. */
  selectedInterface?: NormalizedAgentInterface;
  /** Auto mode may fall back only after a standard VersionNotSupportedError. */
  allowProtocolFallback?: boolean;
  onProtocolSelection?: (info: {
    selected: A2AProtocolVersion;
    interface: NormalizedAgentInterface;
    policy: A2AProtocolPolicy;
  }) => void;
  onProtocolFallback?: (info: { from: '1.0'; to: '0.3'; reason: string }) => void;
}

export interface SendMessageOptions {
  /** Extension URIs to send for this single call; defaults to client config. */
  extensions?: readonly string[];
  signal?: AbortSignal;
}

export interface SendMessageResult {
  task: Task;
  /** True when the executor served this from the idempotency cache. */
  idempotentReplayed: boolean;
  activatedExtensions: string[];
  protocolVersion: A2AProtocolVersion;
  selectedInterface?: NormalizedAgentInterface;
  fallbackReason?: string;
}

export class A2AClient {
  readonly instanceId: string;
  readonly protocolVersion: A2AProtocolVersion;
  readonly protocolPolicy: A2AProtocolPolicy;
  readonly selectedInterface?: NormalizedAgentInterface;
  private readonly http: A2AHttpClient;
  private readonly extensionSet: string[];
  private fallbackClient?: A2AClient;
  private readonly allowProtocolFallback: boolean;
  private readonly onProtocolFallback?: A2AClientOptions['onProtocolFallback'];

  constructor(opts: A2AClientOptions) {
    this.instanceId = opts.instanceId;
    this.protocolPolicy = opts.protocolPolicy ?? opts.protocolVersion ?? '0.3';
    if (this.protocolPolicy === 'auto' && !opts.selectedInterface) {
      throw new Error('A2AClient protocolPolicy=auto requires A2AClient.negotiate() or selectedInterface');
    }
    this.selectedInterface = opts.selectedInterface;
    this.protocolVersion = opts.selectedInterface?.protocolVersion ?? opts.protocolVersion ?? '0.3';
    this.allowProtocolFallback = opts.allowProtocolFallback ?? false;
    this.onProtocolFallback = opts.onProtocolFallback;
    const required = opts.requiredExtensions ?? DEFAULT_REQUIRED_EXTENSIONS;
    const optional = opts.optionalExtensions ?? [];
    this.extensionSet = [...required, ...optional];
    this.http = new A2AHttpClient({
      ...opts,
      baseUrl: opts.selectedInterface?.url ?? opts.baseUrl,
      protocolVersion: this.protocolVersion,
      defaultExtensions: this.extensionSet,
    });
    if (opts.selectedInterface && opts.onProtocolSelection) {
      opts.onProtocolSelection({
        selected: this.protocolVersion,
        interface: opts.selectedInterface,
        policy: this.protocolPolicy,
      });
    }
  }

  /** Discover, normalize, and select an AgentCard interface deterministically. */
  static async negotiate(opts: A2AClientOptions): Promise<A2AClient> {
    const policy = opts.protocolPolicy ?? 'auto';
    const {
      selectedInterface: _ignoredSelectedInterface,
      protocolVersion: _ignoredProtocolVersion,
      onProtocolSelection,
      ...negotiationOpts
    } = opts;
    const discovery = new A2AClient({ ...negotiationOpts, protocolPolicy: '0.3', protocolVersion: '0.3' });
    const card = await discovery.getAgentCard();
    const normalized = normalizeAgentCard(card);
    const selected = selectAgentInterface(normalized, { policy });
    const client = new A2AClient({
      ...negotiationOpts,
      protocolPolicy: policy,
      protocolVersion: selected.protocolVersion,
      selectedInterface: selected,
    });
    if (policy === 'auto' && selected.protocolVersion === '1.0' && opts.allowProtocolFallback) {
      try {
        const fallback = selectAgentInterface(normalized, { policy: '0.3' });
        client.fallbackClient = new A2AClient({
          ...negotiationOpts,
          protocolPolicy: '0.3',
          protocolVersion: '0.3',
          selectedInterface: fallback,
          allowProtocolFallback: false,
        });
      } catch {
        // No compatible 0.3 interface; auto remains 1.0-only.
      }
    }
    // Fire once for the interface actually selected for use; the dormant
    // downgrade adapter is not itself a selection event.
    onProtocolSelection?.({ selected: selected.protocolVersion, interface: selected, policy });
    return client;
  }

  private agentPath(): string {
    return `/agents/${encodeURIComponent(this.instanceId)}/v1`;
  }

  private operationPath(v1Path: string, legacyPath: string): string {
    if (this.selectedInterface) {
      // An advertised interface URL is already the operation base. Appending
      // the legacy route prefix again turns cards ending in `/v1` into
      // `/v1/v1/...` and breaks otherwise valid negotiated 0.3 calls.
      return this.protocolVersion === '1.0' ? `/${v1Path}` : `/${legacyPath}`;
    }
    return `${this.agentPath()}/${legacyPath}`;
  }

  // ---------- AgentCard ----------

  /**
   * Fetch the well-known unsigned card. Callers that need verification should
   * use `src/a2a/agent-card.ts` instead, which wraps this with JWS verification.
   */
  async getAgentCard(): Promise<AgentCard> {
    const paths = [
      `/agents/${encodeURIComponent(this.instanceId)}/.well-known/agent-card.json`,
      `${this.agentPath()}/extendedAgentCard`,
    ];
    let last404: A2AError | undefined;
    for (const path of paths) {
      try {
        const resp = await this.http.request<AgentCard>(path, { method: 'GET' });
        if (!resp.body) {
          throw new A2AError(resp.status, path, {
            type: 'about:blank',
            title: 'Empty AgentCard response',
            code: 'aiwg.empty_agent_card',
          });
        }
        return resp.body;
      } catch (err) {
        if (err instanceof A2AError && err.status === 404) {
          last404 = err;
          continue;
        }
        throw err;
      }
    }
    throw last404 ?? new A2AError(404, paths[0], {
      type: 'about:blank',
      title: 'AgentCard not found',
      code: 'aiwg.agent_card_not_found',
    });
  }

  /** Fetch the extended AgentCard (authenticated view). */
  async getExtendedAgentCard(): Promise<AgentCard> {
    const paths = [`${this.agentPath()}/extendedAgentCard`, `${this.agentPath()}/card`];
    let last404: A2AError | undefined;
    for (const path of paths) {
      try {
        const resp = await this.http.request<AgentCard>(path, { method: 'GET' });
        if (!resp.body) {
          throw new A2AError(resp.status, path, {
            type: 'about:blank',
            title: 'Empty extended AgentCard response',
            code: 'aiwg.empty_agent_card',
          });
        }
        return resp.body;
      } catch (err) {
        if (err instanceof A2AError && err.status === 404) {
          last404 = err;
          continue;
        }
        throw err;
      }
    }
    throw last404 ?? new A2AError(404, paths[0], {
      type: 'about:blank',
      title: 'Extended AgentCard not found',
      code: 'aiwg.extended_agent_card_not_found',
    });
  }

  // ---------- Messages ----------

  /**
   * Send a message; the executor creates a Task in state `submitted` and
   * returns 202 + Task JSON. Idempotent on `message.messageId` — repeating
   * with the same id + body returns the cached Task with
   * `idempotentReplayed: true`.
   */
  async sendMessage(message: Message, opts: SendMessageOptions = {}): Promise<SendMessageResult> {
    const path = this.operationPath('message:send', 'messages:send');
    const requestOptions: Parameters<A2AHttpClient['request']>[1] = {
      method: 'POST',
      body: { message: encodeMessage(this.protocolVersion, message) },
      extensions: opts.extensions ? [...opts.extensions] : this.extensionSet,
    };
    if (opts.signal) requestOptions.signal = opts.signal;
    let resp: A2AResponse<unknown>;
    try {
      resp = await this.http.request<unknown>(path, requestOptions);
    } catch (error) {
      if (
        error instanceof A2AError
        && error.versionNotSupported
        && this.protocolVersion === '1.0'
        && this.protocolPolicy === 'auto'
        && this.allowProtocolFallback
        && this.fallbackClient
      ) {
        const reason = `${error.problem.type}: ${error.problem.detail ?? error.problem.title}`;
        this.onProtocolFallback?.({ from: '1.0', to: '0.3', reason });
        const fallback = await this.fallbackClient.sendMessage(message, opts);
        return { ...fallback, fallbackReason: reason };
      }
      throw error;
    }
    if (!resp.body) {
      throw new A2AError(resp.status, path, {
        type: 'about:blank',
        title: 'Empty sendMessage response',
        code: 'aiwg.empty_send_message',
      });
    }
    const task = decodeSendMessageResponse(this.protocolVersion, resp.body);
    return {
      task,
      idempotentReplayed: resp.idempotentReplayed,
      activatedExtensions: resp.activatedExtensions,
      protocolVersion: this.protocolVersion,
      ...(this.selectedInterface ? { selectedInterface: this.selectedInterface } : {}),
    };
  }

  // ---------- Tasks ----------

  async getTask(taskId: string, opts: { signal?: AbortSignal } = {}): Promise<Task> {
    const path = this.operationPath(`tasks/${encodeURIComponent(taskId)}`, `tasks/${encodeURIComponent(taskId)}`);
    const requestOptions: Parameters<A2AHttpClient['request']>[1] = { method: 'GET' };
    if (opts.signal) requestOptions.signal = opts.signal;
    const resp = await this.http.request<unknown>(path, requestOptions);
    if (!resp.body) {
      throw new A2AError(resp.status, path, {
        type: 'about:blank',
        title: 'Empty getTask response',
        code: 'aiwg.empty_get_task',
      });
    }
    return decodeTask(this.protocolVersion, resp.body);
  }

  /** List tasks for this instance, optionally filtered by state. */
  async listTasks(filter: { state?: string; limit?: number } = {}): Promise<Task[]> {
    const params = new URLSearchParams();
    if (filter.state) params.set(this.protocolVersion === '1.0' ? 'status' : 'state', filter.state);
    if (filter.limit !== undefined) params.set(this.protocolVersion === '1.0' ? 'pageSize' : 'limit', String(filter.limit));
    const query = params.toString();
    const basePath = this.operationPath('tasks', 'tasks');
    const path = `${basePath}${query ? '?' + query : ''}`;
    const resp = await this.http.request<{ tasks?: unknown[] } | unknown[]>(path, { method: 'GET' });
    if (!resp.body) return [];
    const raw = Array.isArray(resp.body) ? resp.body : resp.body.tasks ?? [];
    return raw.map((task, index) => decodeTask(this.protocolVersion, task, `$.tasks[${index}]`));
  }

  async cancelTask(taskId: string, opts: SendMessageOptions = {}): Promise<Task> {
    const encoded = encodeURIComponent(taskId);
    const path = this.operationPath(`tasks/${encoded}:cancel`, `tasks/${encoded}/cancel`);
    const requestOptions: Parameters<A2AHttpClient['request']>[1] = {
      method: 'POST',
      body: {},
      extensions: opts.extensions ? [...opts.extensions] : this.extensionSet,
    };
    if (opts.signal) requestOptions.signal = opts.signal;
    const resp = await this.http.request<unknown>(path, requestOptions);
    if (!resp.body) {
      throw new A2AError(resp.status, path, {
        type: 'about:blank',
        title: 'Empty cancelTask response',
        code: 'aiwg.empty_cancel_task',
      });
    }
    const body = this.protocolVersion === '1.0'
      && resp.body && typeof resp.body === 'object' && 'task' in resp.body
      ? (resp.body as { task: unknown }).task
      : resp.body;
    return decodeTask(this.protocolVersion, body);
  }

  // ---------- Task subscription (SSE) ----------

  /**
   * Subscribe to a task's event stream over SSE. Returns an async iterator
   * over `StreamEvent` payloads.
   *
   * The executor sends `event: <kind>` lines and `data: <json>` lines per
   * the WHATWG event-stream format. We parse the multi-line frames and yield
   * one `StreamEvent` per frame.
   *
   * Abort the iteration by aborting the supplied signal (or just stop
   * consuming and call `return()` on the iterator — the underlying response
   * body will be cancelled).
   */
  subscribeToTask(
    taskId: string,
    opts: { signal?: AbortSignal; replayFromSeq?: number } = {}
  ): AsyncIterable<StreamEvent> & { close(): void } {
    const params = new URLSearchParams();
    if (opts.replayFromSeq !== undefined) {
      params.set('replay_from', String(opts.replayFromSeq));
    }
    const query = params.toString();
    const encoded = encodeURIComponent(taskId);
    const basePath = this.operationPath(`tasks/${encoded}:subscribe`, `tasks/${encoded}/subscribe`);
    const path = `${basePath}${query ? '?' + query : ''}`;

    const controller = new AbortController();
    const externalSignal = opts.signal;
    if (externalSignal) {
      if (externalSignal.aborted) controller.abort();
      else externalSignal.addEventListener('abort', () => controller.abort(), { once: true });
    }

    const http = this.http;
    const protocolVersion = this.protocolVersion;
    let cancelled = false;

    async function* iterate(): AsyncGenerator<StreamEvent, void, void> {
      const resp: A2AResponse = await http.request(path, {
        method: protocolVersion === '1.0' ? 'POST' : 'GET',
        headers: { accept: 'text/event-stream' },
        signal: controller.signal,
        raw: true,
      });
      const isStream = resp.headers.get('content-type')?.includes('text/event-stream');
      if (!isStream) {
        throw new A2AError(resp.status, path, {
          type: 'about:blank',
          title: 'Subscribe did not return an SSE stream',
          code: 'aiwg.subscribe_not_sse',
        });
      }
      if (!resp.rawBody) {
        throw new A2AError(resp.status, path, {
          type: 'about:blank',
          title: 'SSE response had no body',
          code: 'aiwg.subscribe_empty_body',
        });
      }
      const reconciler = new A2AEventReconciler({
        taskId,
        requireInitialSnapshot: protocolVersion === '1.0',
      });
      for await (const frame of parseEventStream(resp.rawBody)) {
        if (cancelled) return;
        const event = decodeStreamEvent(protocolVersion, frame);
        if (!event) continue;
        const accepted = reconciler.accept(event);
        if (accepted) yield accepted;
        if (reconciler.isTerminal()) return;
      }
    }

    const generator = iterate();
    return {
      [Symbol.asyncIterator]() {
        return generator;
      },
      close() {
        cancelled = true;
        controller.abort();
      },
    };
  }

  // ---------- Push notification configs ----------

  async createPushNotificationConfig(
    taskId: string,
    config: PushNotificationConfig
  ): Promise<PushNotificationConfig> {
    const path = this.operationPath(
      `tasks/${encodeURIComponent(taskId)}/pushNotificationConfigs`,
      `tasks/${encodeURIComponent(taskId)}/pushNotificationConfigs`
    );
    const resp = await this.http.request<unknown>(path, {
      method: 'POST',
      body: encodePushNotificationConfig(this.protocolVersion, config),
      extensions: [...this.extensionSet],
    });
    if (!resp.body) {
      throw new A2AError(resp.status, path, {
        type: 'about:blank',
        title: 'Empty createPushNotificationConfig response',
        code: 'aiwg.empty_push_config_create',
      });
    }
    return decodePushNotificationConfig(this.protocolVersion, resp.body);
  }

  async getPushNotificationConfig(
    taskId: string,
    configId: string
  ): Promise<PushNotificationConfig> {
    const suffix = `tasks/${encodeURIComponent(taskId)}/pushNotificationConfigs/${encodeURIComponent(configId)}`;
    const path = this.operationPath(suffix, suffix);
    const resp = await this.http.request<unknown>(path, { method: 'GET' });
    if (!resp.body) {
      throw new A2AError(resp.status, path, {
        type: 'about:blank',
        title: 'Empty getPushNotificationConfig response',
        code: 'aiwg.empty_push_config_get',
      });
    }
    return decodePushNotificationConfig(this.protocolVersion, resp.body);
  }

  async deletePushNotificationConfig(taskId: string, configId: string): Promise<void> {
    const suffix = `tasks/${encodeURIComponent(taskId)}/pushNotificationConfigs/${encodeURIComponent(configId)}`;
    const path = this.operationPath(suffix, suffix);
    await this.http.request<void>(path, {
      method: 'DELETE',
      extensions: [...this.extensionSet],
    });
  }
}

// ---------- SSE parsing ----------

interface SseFrame {
  event?: string;
  data: string;
  id?: string;
}

/**
 * Parse a WHATWG event-stream over a ReadableStream<Uint8Array>.
 * Yields one SseFrame per complete `event: + data: + blank line` block.
 */
export async function* parseEventStream(
  stream: ReadableStream<Uint8Array>
): AsyncGenerator<SseFrame, void, void> {
  const decoder = new TextDecoder('utf-8');
  const reader = stream.getReader();
  let buffer = '';
  let event: string | undefined;
  let dataLines: string[] = [];
  let id: string | undefined;

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let idx: number;
      while ((idx = buffer.indexOf('\n')) >= 0) {
        let line = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 1);
        // Strip optional CR.
        if (line.endsWith('\r')) line = line.slice(0, -1);

        if (line.length === 0) {
          // End of frame.
          if (dataLines.length > 0 || event !== undefined) {
            const frame: SseFrame = { data: dataLines.join('\n') };
            if (event !== undefined) frame.event = event;
            if (id !== undefined) frame.id = id;
            yield frame;
          }
          event = undefined;
          dataLines = [];
          id = undefined;
          continue;
        }
        if (line.startsWith(':')) continue; // comment
        const colon = line.indexOf(':');
        const field = colon >= 0 ? line.slice(0, colon) : line;
        const valueStr = colon >= 0 ? line.slice(colon + 1).replace(/^ /, '') : '';
        switch (field) {
          case 'event':
            event = valueStr;
            break;
          case 'data':
            dataLines.push(valueStr);
            break;
          case 'id':
            id = valueStr;
            break;
          // retry / unknown — ignored
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export function decodeStreamEvent(
  protocolVersion: A2AProtocolVersion,
  frame: SseFrame
): StreamEvent | null {
  if (!frame.data) return null;
  let obj: unknown;
  try {
    obj = JSON.parse(frame.data);
  } catch (error) {
    throw new A2AError(502, 'sse', {
      type: 'about:blank',
      title: 'Invalid SSE JSON',
      detail: (error as Error).message,
      code: 'aiwg.invalid_stream_json',
    });
  }
  const sequence = frame.id !== undefined && /^\d+$/.test(frame.id)
    ? Number(frame.id)
    : undefined;
  return decodeStreamResponse(protocolVersion, obj, {
    ...(frame.event ? { eventName: frame.event } : {}),
    ...(frame.id ? { eventId: frame.id } : {}),
    ...(sequence !== undefined ? { sequence } : {}),
  });
}
