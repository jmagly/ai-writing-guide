import assert from 'node:assert/strict';
import Module from 'node:module';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';

const runtimeDir = await mkdtemp(join(tmpdir(), 'cockpit-vscode-smoke-'));
const runtimePath = join(runtimeDir, 'bridge.json');
await writeFile(runtimePath, JSON.stringify({ token: 'vscode-shell-core-token-1234567890', port: 8159 }), { mode: 0o600 });

const requests = [];
globalThis.fetch = async (input, init = {}) => {
  requests.push({ url: String(input), init });
  if (String(input).endsWith('/bootstrap/nonce')) {
    return new Response(JSON.stringify({ nonce: 'vscode-one-time-nonce', expires_in_ms: 60000 }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};

const originalLoad = Module._load;
const commands = new Map();
const panel = { webview: { html: '' } };
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === 'vscode') {
    return {
      workspace: { getConfiguration: () => ({ get: () => runtimePath }) },
      window: { showWarningMessage: () => undefined, createWebviewPanel: () => panel },
      commands: { registerCommand: (name, callback) => { commands.set(name, callback); return { dispose: () => undefined }; } },
      env: { openExternal: () => undefined },
      Uri: { parse: (value) => ({ value }) },
      ViewColumn: { One: 1 },
    };
  }
  return originalLoad.call(this, request, parent, isMain);
};

try {
  const require = createRequire(import.meta.url);
  const extension = require('./extension.js');
  const rt = await extension._private.ensureRuntime();
  assert.equal(rt.port, 8159, 'VS Code shell uses shell-core runtime connection');
  assert.equal(rt.token, 'vscode-shell-core-token-1234567890', 'VS Code shell receives the resolved runtime token');
  assert.ok(
    requests.some((r) => r.url.endsWith('/api/health') && r.init.headers?.authorization === `Bearer ${rt.token}`),
    'shell-core performs the authenticated Bridge health check',
  );
  extension.activate({ subscriptions: [] });
  await commands.get('aiwg-cockpit.open')();
  assert.match(panel.webview.html, /frame-src http:\/\/127\.0\.0\.1:8159;/, 'webview CSP permits only the resolved Bridge origin');
  assert.doesNotMatch(panel.webview.html, /localhost:\*|127\.0\.0\.1:\*/, 'webview CSP has no wildcard local port');
  assert.match(panel.webview.html, /#bootstrap=vscode-one-time-nonce&amp;audience=vscode|#bootstrap=vscode-one-time-nonce&audience=vscode/, 'webview uses one-time fragment bootstrap');
  assert.ok(!panel.webview.html.includes(rt.token), 'webview HTML does not contain the reusable token');
  console.log('SMOKE OK - VS Code shell delegates runtime resolution to shell-core');
} finally {
  Module._load = originalLoad;
  await rm(runtimeDir, { recursive: true, force: true });
}
