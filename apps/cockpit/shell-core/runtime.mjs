// Shell-core: the handshake every Cockpit shell (VS Code, Tauri, browser) shares.
// The Bridge writes ~/.aiwg/cockpit/runtime/bridge.json (mode 600) on launch with
// { token_ref, port } when OS-keychain storage is available, else { token, port }.
// A shell resolves the token, waits for liveness, then asks the Bridge for a
// one-time bootstrap nonce. The reusable token stays in the native shell and
// never enters the webview URL. This module is the one source of that contract.
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { readCockpitToken } from './keychain.mjs';

export const RUNTIME_FILE = join(homedir(), '.aiwg', 'cockpit', 'runtime', 'bridge.json');

/** Read the per-launch Bridge connection (token, port, url). Throws if not launched. */
export async function readRuntime(file = RUNTIME_FILE) {
  const r = JSON.parse(await readFile(file, 'utf8'));
  if (process.env.AIWG_COCKPIT_KEYCHAIN_STRICT === '1' && !r.token_ref) {
    throw new Error(`runtime file ${file} is not keychain-backed in strict mode`);
  }
  const token = r.token || await readCockpitToken(r.token_ref);
  if (!token || !r.port) throw new Error(`runtime file ${file} missing token/port`);
  return { ...r, token, url: `http://127.0.0.1:${r.port}` };
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

/** Issue a short-lived, one-time browser bootstrap and place only that nonce in
 * the URL fragment (fragments are not sent in HTTP requests or referrers). */
export async function webviewUrl(rt, { audience = 'browser', next = '' } = {}) {
  const response = await api(rt, '/bootstrap/nonce', {
    method: 'POST',
    body: JSON.stringify({ audience }),
    headers: { 'content-type': 'application/json' },
  });
  if (!response.ok) throw new Error(`Bridge bootstrap refused (${response.status})`);
  const { nonce } = await response.json();
  if (!nonce) throw new Error('Bridge bootstrap returned no nonce');
  const fragment = new URLSearchParams({ bootstrap: nonce, audience, ...(next ? { next } : {}) });
  return `${rt.url}/#${fragment}`;
}

/** Authed fetch against the Bridge control surface, for shells that call the API directly. */
export function api(rt, path, opts = {}) {
  return fetch(rt.url + path, { ...opts, headers: { ...(opts.headers || {}), authorization: `Bearer ${rt.token}` } });
}
