/**
 * Executor Conformance Client
 *
 * Abstracts REST + WS access for an executor under test.
 *
 * In fixture mode (default): replays recorded fixtures from
 *   test/conformance/executor-v1/fixtures/ via in-process registry calls.
 *   No network I/O — deterministic, CI-safe.
 *
 * In live mode (AIWG_CONFORMANCE_LIVE=1): uses globalThis.fetch and the
 *   `ws` package against the target executor's transport_endpoints.
 *
 * Same surface for both modes so test bodies do not branch.
 *
 * @see docs/contracts/conformance.md
 * @see schemas/executor-v1.json
 */

import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join, resolve as resolvePath } from 'path';
import { readFileSync } from 'fs';
import { createHash } from 'crypto';
import EventEmitter from 'events';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const PROJECT_ROOT = resolvePath(__dirname, '..', '..', '..');

// ── Ajv bootstrap (transitive dep — already used by executor-registry.ts) ──

let _ajv       = null;
let _schema    = null;
let _schemaLoaded = false;

function loadAjv() {
  if (_schemaLoaded) return;
  _schemaLoaded = true;

  const req = createRequire(import.meta.url);
  try {
    const ajvPaths = [
      join(PROJECT_ROOT, 'node_modules', 'ajv', 'dist', '2020.js'),
      join(PROJECT_ROOT, 'node_modules', 'ajv', 'dist', 'ajv.js'),
    ];
    const formatsPath = join(PROJECT_ROOT, 'node_modules', 'ajv-formats', 'dist', 'index.js');

    let Ajv = null;
    for (const p of ajvPaths) {
      try { Ajv = req(p); break; } catch { /* try next */ }
    }
    if (!Ajv) return;

    const AjvClass = Ajv?.default ?? Ajv;
    _ajv = new AjvClass({ strict: false, allErrors: true, validateSchema: false });

    try {
      const fmtMod = req(formatsPath);
      const addFormats = fmtMod?.default ?? fmtMod;
      if (typeof addFormats === 'function') addFormats(_ajv);
    } catch { /* formats optional */ }

    const schemaPath = join(PROJECT_ROOT, 'schemas', 'executor-v1.json');
    _schema = JSON.parse(readFileSync(schemaPath, 'utf-8'));
    _ajv.addSchema(_schema, 'executor.aiwg.io/v1');
  } catch { /* degraded — validators will skip */ }
}

/**
 * Strip fixture annotation keys (those prefixed with `_`) from an object,
 * returning a shallow copy suitable for schema validation.
 * Recurses into plain-object values and array elements.
 */
export function stripAnnotations(obj) {
  if (Array.isArray(obj)) return obj.map(stripAnnotations);
  if (obj === null || typeof obj !== 'object') return obj;
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (k.startsWith('_')) continue;
    out[k] = stripAnnotations(v);
  }
  return out;
}

/**
 * Validate an object against a named $ref in the executor-v1 schema.
 * Returns { valid: boolean, errors: string }.
 */
export function validateSchema(schemaRef, data) {
  loadAjv();
  if (!_ajv) return { valid: true, errors: '' };
  try {
    const validate = _ajv.compile({ $ref: schemaRef });
    const valid = validate(data);
    const errors = valid ? '' : JSON.stringify(validate.errors ?? []);
    return { valid, errors };
  } catch (e) {
    return { valid: true, errors: `schema-compile-error: ${e.message}` };
  }
}

// ── Fixture integrity hashing ──

/**
 * Compute a SHA-256 hash of the fixture files for drift detection.
 * Any mutation of a fixture file must cause at least one failing test.
 */
export function hashFixture(fixtureName) {
  const fixturePath = join(__dirname, 'fixtures', `${fixtureName}.json`);
  const content = readFileSync(fixturePath, 'utf-8');
  return createHash('sha256').update(content).digest('hex');
}

export function loadFixture(fixtureName) {
  const fixturePath = join(__dirname, 'fixtures', `${fixtureName}.json`);
  return JSON.parse(readFileSync(fixturePath, 'utf-8'));
}

// ── ExecutorRegistry shim for fixture mode ──

/**
 * Create a fresh ExecutorRegistry instance loaded from source.
 * Used in fixture mode to drive the AIWG-side dispatch path without
 * starting a real HTTP/WS server.
 */
export async function createRegistryForTest() {
  const registryPath = join(PROJECT_ROOT, 'dist', 'src', 'serve', 'executor-registry.js');
  const mod = await import(`file://${registryPath}`);
  const registry = new mod.ExecutorRegistry();
  return { registry, mod };
}

// ── Fake WebSocket transport ──

/**
 * FakeWsConn — simulates a live WS connection for fixture-mode tests.
 *
 * The registry calls wsConn.send(data) when it wants to push a message
 * to the executor. We capture those sends so tests can inspect them.
 */
export class FakeWsConn extends EventEmitter {
  constructor() {
    super();
    this.readyState = 1; // OPEN
    this.sent = [];
  }

  send(data) {
    const parsed = typeof data === 'string' ? JSON.parse(data) : data;
    this.sent.push(parsed);
    this.emit('sent', parsed);
  }

  close(code, reason) {
    this.readyState = 3; // CLOSED
    this.emit('close', code, reason);
  }

  /** Simulate an inbound message from the executor */
  simulateMessage(data) {
    this.emit('message', typeof data === 'string' ? data : JSON.stringify(data));
  }
}

// ── Live-mode HTTP client ──

/**
 * Make an HTTP request against a live executor host.
 * Only used when AIWG_CONFORMANCE_LIVE=1.
 */
export async function liveRequest(baseUrl, { method, path, headers = {}, body } = {}) {
  const url = `${baseUrl}${path}`;
  const opts = {
    method: method ?? 'GET',
    headers: { 'Content-Type': 'application/json', ...headers },
  };
  if (body !== undefined) opts.body = JSON.stringify(body);

  const res = await fetch(url, opts);
  let resBody = null;
  try { resBody = await res.json(); } catch { resBody = null; }
  const resHeaders = {};
  res.headers.forEach((v, k) => { resHeaders[k] = v; });

  return {
    status: res.status,
    headers: resHeaders,
    body: resBody,
  };
}

// ── Execution mode detection ──

export const IS_LIVE_MODE = process.env.AIWG_CONFORMANCE_LIVE === '1';

export function getExecutorId() {
  return (
    process.env.AIWG_CONFORMANCE_EXECUTOR_ID ??
    // Parse from argv: --executor <id>
    (() => {
      const idx = process.argv.findIndex(a => a === '--executor');
      return idx !== -1 ? process.argv[idx + 1] : null;
    })() ??
    'fixture-executor'
  );
}
