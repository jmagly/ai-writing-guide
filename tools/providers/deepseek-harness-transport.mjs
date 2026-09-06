import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile, chmod } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';

export const DSH_SUPPORTED_VERSIONS = Object.freeze(['0.1.1-rc.2', '0.1.2-rc.1', '0.1.3-alpha.1']);
export const DSH_MAX_FRAME_BYTES = 1024 * 1024;
export const DSH_MAX_OUTPUT_BYTES = 16 * 1024 * 1024;
export const DSH_UPSTREAM_SOURCE = 'https://github.com/deepseek-ai/deepseek-harness';
export const DSH_UPSTREAM_REVISION = 'd347e703908d0406b7a7ef80e3a0e594d86b2215';

const SAFE_ID = /^[a-z0-9][a-z0-9-]{0,63}$/;
const SAFE_MODEL = /^[A-Za-z0-9][A-Za-z0-9._:/+-]{0,191}$/;
const SAFE_ENV = /^[A-Z][A-Z0-9_]{0,127}$/;
const BASE_ENV = ['PATH', 'HOME', 'USER', 'LOGNAME', 'LANG', 'LC_ALL', 'TMPDIR', 'TEMP', 'TMP', 'SystemRoot', 'ComSpec', 'PATHEXT'];
const SDK_SERVER_NAME = 'deepseek-harness-sdk-runtime';
const SDK_NOTIFICATION_METHODS = new Set(['session.event', 'session.status', 'subagent.started', 'subagent.finished']);

export function assertSupportedDshVersion(version) {
  const normalized = String(version).trim().replace(/^dsh\s+v?/, '').replace(/^v/, '');
  if (!DSH_SUPPORTED_VERSIONS.includes(normalized)) {
    throw new Error(`Unsupported DeepSeek Harness version ${normalized || '(empty)'}; supported: ${DSH_SUPPORTED_VERSIONS.join(', ')}`);
  }
  return normalized;
}

export function buildCredentialEnvironment({ credentialEnv, credentialValue, dshHome, env = process.env }) {
  if (credentialEnv !== undefined && !SAFE_ENV.test(credentialEnv)) throw new Error('credentialEnv must be an uppercase environment-variable name');
  if ((credentialEnv === undefined) !== (credentialValue === undefined)) throw new Error('credentialEnv and credentialValue must be supplied together');
  if (credentialEnv !== undefined && (typeof credentialValue !== 'string' || credentialValue.length === 0)) throw new Error(`Missing credential value for ${credentialEnv}`);
  if (typeof dshHome !== 'string' || !dshHome) throw new Error('dshHome is required');
  const child = {};
  for (const name of BASE_ENV) if (env[name]) child[name] = env[name];
  if (credentialEnv !== undefined) child[credentialEnv] = credentialValue;
  child.DSH_HOME = resolve(dshHome);
  child.DSH_PERMISSION_MODE = 'workspace-write';
  child.DSH_TELEMETRY_DISABLED = '1';
  return child;
}

export async function inspectDshVersion({ binary = 'dsh', cwd = process.cwd(), dshHome, timeoutMs = 10_000 }) {
  const env = buildCredentialEnvironment({ dshHome });
  const result = await runBounded(binary, ['--version'], { cwd: resolve(cwd), env, timeoutMs });
  if (result.code !== 0) throw new Error(`DeepSeek Harness version probe failed (${result.code ?? result.signal})`);
  return assertSupportedDshVersion(result.stdout.trim());
}

export function buildRoutePatch({ route = 'openrouter', model, credentialEnv = 'OPENROUTER_API_KEY' }) {
  if (!SAFE_ID.test(route)) throw new Error('route must be a lowercase hyphenated identifier');
  if (!SAFE_MODEL.test(model)) throw new Error('model contains unsupported characters');
  if (!SAFE_ENV.test(credentialEnv)) throw new Error('credentialEnv must be an uppercase environment-variable name');
  return [
    '- id: llm-pi-ai',
    '  config:',
    '    providers:',
    `      ${route}:`,
    `        apiKeyEnv: ${credentialEnv}`,
    '- id: agent-default-model',
    '  config:',
    `    provider: ${route}`,
    `    model: ${model}`,
    '',
  ].join('\n');
}

export async function createEphemeralRoutePatch(options) {
  const directory = await mkdtemp(join(tmpdir(), 'aiwg-dsh-route-'));
  const path = join(directory, 'route.cordis.patch.yml');
  const content = buildRoutePatch(options);
  await writeFile(path, content, { encoding: 'utf8', mode: 0o600 });
  await chmod(path, 0o600);
  return {
    path,
    hash: `sha256:${createHash('sha256').update(content).digest('hex')}`,
    async cleanup() { await rm(directory, { recursive: true, force: true }); },
  };
}

export async function runDshHeadless({ prompt, cwd, dshHome, projectPatch, routePatch, route, model, credentialEnv, credentialValue, binary = 'dsh', timeoutMs = 120_000, terminateGraceMs = 1_000, signal, version }) {
  if (typeof prompt !== 'string' || !prompt.trim()) throw new Error('prompt is required');
  const env = buildCredentialEnvironment({ credentialEnv, credentialValue, dshHome });
  const runtimeVersion = version === undefined
    ? await inspectDshVersion({ binary, cwd, dshHome, timeoutMs: Math.min(timeoutMs, 10_000) })
    : assertSupportedDshVersion(version);
  const args = ['--profile', 'headless', '--patch', resolve(projectPatch), '--patch', resolve(routePatch), prompt];
  const result = await runBounded(binary, args, { cwd: resolve(cwd), env, timeoutMs, terminateGraceMs, signal });
  return { ...result, provenance: await provenance({ binary, version: runtimeVersion, profile: 'headless', projectPatch, routePatch, route, model }) };
}

export class DshJsonRpcClient {
  constructor({ cwd, dshHome, projectPatch, routePatch, credentialEnv, credentialValue, binary = 'dsh', timeoutMs = 120_000, version }) {
    this.options = { cwd, dshHome, projectPatch, routePatch, credentialEnv, credentialValue, binary, timeoutMs, version };
    this.nextId = 1;
    this.pending = new Map();
    this.notifications = [];
    this.notificationWaiters = new Set();
    this.buffer = '';
    this.outputBytes = 0;
  }

  start() {
    if (this.child) return;
    const o = this.options;
    const env = buildCredentialEnvironment(o);
    const args = ['--profile', 'sdk', '--patch', resolve(o.projectPatch), '--patch', resolve(o.routePatch)];
    this.child = spawn(o.binary, args, { cwd: resolve(o.cwd), env, stdio: ['pipe', 'pipe', 'pipe'] });
    this.stderr = '';
    this.child.stdout.on('data', chunk => this.onData(chunk));
    this.child.stderr.on('data', chunk => {
      try {
        this.accountOutput(chunk);
        this.stderr = appendBounded(this.stderr, chunk, DSH_MAX_OUTPUT_BYTES);
      }
      catch (error) { this.abort(error); }
    });
    this.child.once('error', error => this.rejectAll(error));
    this.child.once('exit', (code, signal) => {
      const suffix = this.buffer.length ? '; truncated JSON-RPC frame remained on stdout' : '';
      this.rejectAll(new Error(`DeepSeek Harness JSON-RPC exited (${code ?? signal})${suffix}`));
    });
  }

  accountOutput(chunk) {
    this.outputBytes += chunk.length;
    if (this.outputBytes > DSH_MAX_OUTPUT_BYTES) throw new Error('DeepSeek Harness JSON-RPC aggregate output limit exceeded');
  }

  onData(chunk) {
    try { this.accountOutput(chunk); }
    catch (error) { return this.abort(error); }
    this.buffer += chunk.toString('utf8');
    for (;;) {
      const nl = this.buffer.indexOf('\n');
      if (nl < 0) break;
      const line = this.buffer.slice(0, nl).replace(/\r$/, '');
      this.buffer = this.buffer.slice(nl + 1);
      if (Buffer.byteLength(line) > DSH_MAX_FRAME_BYTES) return this.abort(new Error('DeepSeek Harness JSON-RPC frame limit exceeded'));
      if (!line.trim()) continue;
      let message;
      try { message = JSON.parse(line); } catch { return this.abort(new Error('Malformed DeepSeek Harness JSON-RPC frame')); }
      if (message.jsonrpc !== '2.0') return this.abort(new Error('Invalid DeepSeek Harness JSON-RPC version'));
      if (message.id !== undefined) {
        const pending = this.pending.get(message.id);
        if (!pending) continue;
        this.pending.delete(message.id);
        clearTimeout(pending.timer);
        if (message.error) pending.reject(new Error(`DeepSeek Harness JSON-RPC error ${message.error.code}: ${message.error.message}`));
        else pending.resolve(message.result);
      } else if (typeof message.method === 'string') {
        if (!SDK_NOTIFICATION_METHODS.has(message.method)) return this.abort(new Error(`Unsupported DeepSeek Harness JSON-RPC notification: ${message.method}`));
        this.notifications.push(message);
        for (const waiter of [...this.notificationWaiters]) {
          if (waiter.predicate(message)) {
            this.notificationWaiters.delete(waiter);
            clearTimeout(waiter.timer);
            waiter.resolve(message);
          }
        }
      } else return this.abort(new Error('Invalid DeepSeek Harness JSON-RPC message shape'));
    }
    if (Buffer.byteLength(this.buffer) > DSH_MAX_FRAME_BYTES) return this.abort(new Error('DeepSeek Harness JSON-RPC frame limit exceeded'));
  }

  request(method, params, { signal, timeoutMs = this.options.timeoutMs } = {}) {
    this.start();
    const id = this.nextId++;
    const frame = JSON.stringify({ jsonrpc: '2.0', id, method, params });
    if (Buffer.byteLength(frame) > DSH_MAX_FRAME_BYTES) return Promise.reject(new Error('DeepSeek Harness JSON-RPC request exceeds frame limit'));
    return new Promise((resolvePromise, reject) => {
      const fail = error => this.abort(error);
      const cancel = () => fail(new Error(`DeepSeek Harness JSON-RPC ${method} cancelled`));
      const timer = setTimeout(() => fail(new Error(`DeepSeek Harness JSON-RPC ${method} timed out`)), timeoutMs);
      this.pending.set(id, {
        resolve: value => { signal?.removeEventListener('abort', cancel); resolvePromise(value); },
        reject: error => { signal?.removeEventListener('abort', cancel); reject(error); },
        timer,
      });
      if (signal?.aborted) return cancel();
      signal?.addEventListener('abort', cancel, { once: true });
      this.child.stdin.write(`${frame}\n`, error => { if (error) fail(error); });
    });
  }

  async initialize({ provider, model, reasoningEffort, maxTokens }) {
    this.version = this.options.version === undefined
      ? await inspectDshVersion({ binary: this.options.binary, cwd: this.options.cwd, dshHome: this.options.dshHome, timeoutMs: Math.min(this.options.timeoutMs, 10_000) })
      : assertSupportedDshVersion(this.options.version);
    const result = await this.request('initialize', { cwd: resolve(this.options.cwd), provider, model, ...(reasoningEffort ? { reasoningEffort } : {}), ...(maxTokens ? { maxTokens } : {}) });
    if (!result || typeof result !== 'object' || result.serverInfo?.name !== SDK_SERVER_NAME || typeof result.serverInfo?.version !== 'string') throw new Error('DeepSeek Harness initialize returned an incompatible server identity');
    this.route = provider;
    this.model = model;
    return result;
  }
  async prompt(sessionId, contentBlocks, options) {
    const result = await this.request('session/prompt', { sessionId, contentBlocks }, options);
    if (!result || typeof result !== 'object' || typeof result.messageId !== 'string') throw new Error('DeepSeek Harness session/prompt returned no message id');
    return result;
  }
  waitForNotification(predicate, { from = 0, timeoutMs = this.options.timeoutMs } = {}) {
    const existing = this.notifications.slice(from).find(predicate);
    if (existing) return Promise.resolve(existing);
    return new Promise((resolvePromise, reject) => {
      const waiter = { predicate, resolve: resolvePromise, reject, timer: undefined };
      waiter.timer = setTimeout(() => {
        this.notificationWaiters.delete(waiter);
        reject(new Error('DeepSeek Harness notification wait timed out'));
      }, timeoutMs);
      this.notificationWaiters.add(waiter);
    });
  }
  async promptAndWait(sessionId, contentBlocks, { signal, onNotification, timeoutMs = this.options.timeoutMs } = {}) {
    const from = this.notifications.length;
    const result = await this.prompt(sessionId, contentBlocks, { signal, timeoutMs });
    const deadline = Date.now() + timeoutMs;
    let cursor = from;
    let rootRan = false;
    const active = new Set();
    const events = [];
    for (;;) {
      if (signal?.aborted) this.abort(new Error('DeepSeek Harness prompt settlement cancelled'));
      const notification = this.notifications[cursor] ?? await this.waitForNotification(() => true, {
        from: cursor,
        timeoutMs: Math.max(1, deadline - Date.now()),
      });
      cursor = this.notifications.indexOf(notification, cursor) + 1;
      onNotification?.(notification);
      events.push(summarizeNotification(notification));
      const params = notification.params && typeof notification.params === 'object' ? notification.params : {};
      if (notification.method === 'subagent.started' && params.parentSessionId === sessionId && typeof params.childSessionId === 'string') active.add(params.childSessionId);
      if (notification.method === 'subagent.finished' && typeof params.childSessionId === 'string') active.delete(params.childSessionId);
      if (notification.method === 'session.status' && params.sessionId === sessionId) {
        if (params.status === 'running') rootRan = true;
        if (params.status === 'idle' && rootRan && active.size === 0) {
          return { messageId: result.messageId, events, provenance: { provider: 'deepseek-harness', version: this.version, profile: 'sdk', route: this.route, model: this.model } };
        }
      }
    }
  }
  shutdown() { return this.request('shutdown', {}); }
  abort(error = new Error('DeepSeek Harness JSON-RPC client closed')) {
    if (this.child && !this.child.killed) {
      this.child.kill('SIGTERM');
      const child = this.child;
      const escalation = setTimeout(() => { if (child.exitCode === null) child.kill('SIGKILL'); }, 1_000);
      child.once('exit', () => clearTimeout(escalation));
    }
    this.rejectAll(error);
  }
  rejectAll(error) {
    for (const pending of this.pending.values()) { clearTimeout(pending.timer); pending.reject(error); }
    this.pending.clear();
    for (const waiter of this.notificationWaiters) { clearTimeout(waiter.timer); waiter.reject(error); }
    this.notificationWaiters.clear();
  }
}

async function provenance({ binary, version, profile, projectPatch, routePatch, route, model }) {
  const [project, routeBytes] = await Promise.all([readFile(projectPatch), readFile(routePatch)]);
  const projectPatchHash = `sha256:${createHash('sha256').update(project).digest('hex')}`;
  const routePatchHash = `sha256:${createHash('sha256').update(routeBytes).digest('hex')}`;
  const profileHash = `sha256:${createHash('sha256').update(JSON.stringify({ profile, projectPatchHash, routePatchHash })).digest('hex')}`;
  return {
    provider: 'deepseek-harness', binary, version, profile, route, model,
    upstreamSource: DSH_UPSTREAM_SOURCE,
    upstreamRevision: DSH_UPSTREAM_REVISION,
    profileHash,
    projectPatchHash,
    routePatchHash,
  };
}

function summarizeNotification(message) {
  const params = message.params && typeof message.params === 'object' ? message.params : {};
  if (message.method !== 'session.event') return { method: message.method, ...copyScalars(params) };
  const event = params.event && typeof params.event === 'object' ? params.event : {};
  const data = event.data && typeof event.data === 'object' ? event.data : {};
  const summary = { method: message.method, sessionId: params.sessionId, type: event.type, seq: event.seq, time: event.time };
  if (event.type === 'assistant/message') {
    const messageData = data.message && typeof data.message === 'object' ? data.message : {};
    summary.text = textBlocks(messageData.content);
  } else if (String(event.type).startsWith('tool/')) {
    summary.toolName = typeof data.name === 'string' ? data.name : typeof data.toolName === 'string' ? data.toolName : undefined;
    summary.toolCallId = typeof data.id === 'string' ? data.id : typeof data.toolCallId === 'string' ? data.toolCallId : undefined;
    summary.redacted = true;
  } else if (String(event.type).includes('question')) {
    summary.question = typeof data.question === 'string' ? data.question : undefined;
  }
  return summary;
}

function copyScalars(value) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => ['string', 'number', 'boolean'].includes(typeof item)));
}

function textBlocks(value) {
  if (!Array.isArray(value)) return '';
  return value.flatMap(item => item && typeof item === 'object' && item.type === 'text' && typeof item.text === 'string' ? [item.text] : []).join('\n');
}

function appendBounded(current, chunk, max) {
  const next = current + chunk.toString('utf8');
  if (Buffer.byteLength(next) > max) throw new Error('DeepSeek Harness output limit exceeded');
  return next;
}

function runBounded(binary, args, { cwd, env, timeoutMs, terminateGraceMs = 1_000, signal }) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(binary, args, { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = ''; let stderr = ''; let outputBytes = 0; let settled = false; let stopError; let escalation;
    const finish = (error, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      clearTimeout(escalation);
      signal?.removeEventListener('abort', cancel);
      error ? reject(error) : resolvePromise(value);
    };
    const terminate = error => {
      if (settled || stopError) return;
      stopError = error;
      // A descendant may retain pipes after the direct child exits. Keep the
      // deadline bounded even when there is no live direct child to terminate.
      if (child.exitCode !== null || child.signalCode !== null) {
        child.stdout.destroy();
        child.stderr.destroy();
        finish(error);
        return;
      }
      child.kill('SIGTERM');
      if (settled) return;
      escalation = setTimeout(() => {
        if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
      }, terminateGraceMs);
    };
    const cancel = () => terminate(new Error('DeepSeek Harness run cancelled'));
    const timer = setTimeout(() => terminate(new Error('DeepSeek Harness run timed out')), timeoutMs);
    signal?.addEventListener('abort', cancel, { once: true });
    if (signal?.aborted) cancel();
    child.once('error', error => finish(error));
    const capture = (current, chunk) => {
      outputBytes += chunk.length;
      if (outputBytes > DSH_MAX_OUTPUT_BYTES) throw new Error('DeepSeek Harness aggregate output limit exceeded');
      return appendBounded(current, chunk, DSH_MAX_OUTPUT_BYTES);
    };
    child.stdout.on('data', chunk => { try { stdout = capture(stdout, chunk); } catch (error) { terminate(error); } });
    child.stderr.on('data', chunk => { try { stderr = capture(stderr, chunk); } catch (error) { terminate(error); } });
    child.once('exit', () => {
      if (stopError) {
        child.stdout.destroy();
        child.stderr.destroy();
        finish(stopError);
      }
    });
    // 'exit' can precede the final stdout/stderr data events.
    child.once('close', (code, exitSignal) => finish(stopError, { code, signal: exitSignal, stdout, stderr }));
  });
}
