// Shell-core: the handshake every Cockpit shell (VS Code, Tauri, browser) shares.
// The Bridge writes ~/.aiwg/cockpit/runtime/bridge.json (mode 600) on launch with
// { token, port }. A shell reads it, waits for liveness, and loads the Bridge UI at
// <url>/?token=<token>. Control plane is the gated Bridge API; data plane (pty) is
// the executor URL the Bridge issues. This module is the one source of that contract.
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

export const RUNTIME_FILE = join(homedir(), '.aiwg', 'cockpit', 'runtime', 'bridge.json');

/** Read the per-launch Bridge connection (token, port, url). Throws if not launched. */
export async function readRuntime(file = RUNTIME_FILE) {
  const r = JSON.parse(await readFile(file, 'utf8'));
  if (!r.token || !r.port) throw new Error(`runtime file ${file} missing token/port`);
  return { ...r, url: `http://127.0.0.1:${r.port}` };
}

/** Resolve + wait for the Bridge to be reachable; returns { token, port, url }.
 *  Polls both the runtime file (it may not exist yet) and liveness. */
export async function connect({ timeoutMs = 5000, file = RUNTIME_FILE } = {}) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    try {
      const rt = await readRuntime(file);
      const live = await fetch(`${rt.url}/healthz`);
      if (live.ok) {
        const authed = await api(rt, '/api/health');
        if (authed.ok) return rt;
      }
    } catch { /* file missing or Bridge not up yet */ }
    if (Date.now() > deadline) throw new Error(`Bridge not reachable (runtime ${file})`);
    await new Promise((r) => setTimeout(r, 100));
  }
}

/** The webview URL a shell loads — Bridge UI with the token on the query string. */
export function webviewUrl(rt) {
  return `${rt.url}/?token=${encodeURIComponent(rt.token)}`;
}

/** Authed fetch against the Bridge control surface, for shells that call the API directly. */
export function api(rt, path, opts = {}) {
  return fetch(rt.url + path, { ...opts, headers: { ...(opts.headers || {}), authorization: `Bearer ${rt.token}` } });
}
