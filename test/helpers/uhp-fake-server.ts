import { UHP_VERSION, type UhpResponse } from '../../src/uhp/index.js';

export interface FakeUhpOptions {
  sequenceFault?: boolean;
  disconnect?: boolean;
  sessionBusy?: boolean;
  hostileArtifact?: boolean;
}

export class FakeUhpServer {
  readonly requests: Array<{ url: string; method: string; headers: Headers; body?: string }> = [];
  readonly idempotency = new Map<string, UhpResponse>();

  constructor(readonly options: FakeUhpOptions = {}) {}

  private json(value: unknown, status = 200): Response {
    return new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json', 'UHP-Version': UHP_VERSION } });
  }

  private response(id = 'resp_fake', status = 'completed'): UhpResponse {
    return { id, object: 'response', created_at: 1787600000, status, model: 'fixture-model', output: [], metadata: { session_id: 'hsessfixture', harness_id: 'chrn_fixture' } };
  }

  fetch = async (input: URL | RequestInfo, init: RequestInit = {}): Promise<Response> => {
    const url = String(input);
    const method = init.method ?? 'GET';
    const headers = new Headers(init.headers);
    const body = typeof init.body === 'string' ? init.body : undefined;
    this.requests.push({ url, method, headers, body });
    const pathname = new URL(url).pathname;
    if (pathname.endsWith('/v1/uhp')) return this.json({ object: 'uhp.discovery', protocol: 'uhp', versions: [UHP_VERSION], default_version: UHP_VERSION, conformance_class: 'core', capabilities: { streaming: true, sessions: true, cancellation: true, idempotency: true } });
    if (pathname.endsWith('/v1/harnesses')) return this.json({ harnesses: [{ id: 'chrn_fixture', object: 'harness', name: 'Fixture', status: 'active' }] });
    if (pathname.endsWith('/v1/models')) return this.json({ object: 'list', data: [{ id: 'fixture-model', object: 'model' }] });
    if (pathname.includes('/files/') && pathname.endsWith('/content')) {
      return new Response(this.options.hostileArtifact ? 'hostile fixture' : 'safe fixture', { headers: { 'Content-Type': 'text/plain', 'X-Content-Type-Options': 'nosniff', 'UHP-Version': UHP_VERSION } });
    }
    if (pathname.endsWith('/files')) return this.json({ files: [{ id: 'file_fixture', object: 'file', bytes: 12, created_at: 1787600000, filename: '../../outside.txt', purpose: 'assistants', status: 'processed' }] });
    if (pathname.endsWith('/cancel')) return this.json(this.response('resp_cancelled', 'cancelled'));
    if (/\/v1\/responses\/resp_/.test(pathname)) return this.json(this.response(pathname.split('/').at(-1), 'completed'));
    if (pathname.endsWith('/v1/responses') && headers.get('accept') === 'text/event-stream') {
      const sequence = this.options.sequenceFault ? [0, 2] : [0, 1];
      const events = [
        `data: ${JSON.stringify({ type: 'response.created', sequence_number: sequence[0], response: this.response('resp_stream', 'in_progress') })}\n\n`,
        `data: ${JSON.stringify({ type: 'response.completed', sequence_number: sequence[1], response: this.response('resp_stream') })}\n\n`,
      ];
      const disconnect = this.options.disconnect;
      const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
          controller.enqueue(new TextEncoder().encode(events[0]));
          await Promise.resolve();
          if (!disconnect) controller.enqueue(new TextEncoder().encode(events[1]));
          controller.close();
        },
      });
      return new Response(stream, { headers: { 'Content-Type': 'text/event-stream', 'UHP-Version': UHP_VERSION } });
    }
    if (pathname.endsWith('/v1/responses')) {
      if (this.options.sessionBusy) return this.json({ error: { type: 'conflict_error', code: 'session_busy', message: 'fixture session is busy' } }, 409);
      const key = headers.get('idempotency-key') ?? '';
      const prior = this.idempotency.get(key);
      if (prior) return this.json(prior);
      const created = this.response(`resp_${this.idempotency.size + 1}`);
      this.idempotency.set(key, created);
      return this.json(created);
    }
    return this.json({ error: { type: 'not_found_error', code: 'not_found', message: 'fixture route not found' } }, 404);
  };
}
