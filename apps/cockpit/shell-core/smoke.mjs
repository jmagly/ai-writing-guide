// Shell handshake smoke: launch the real Bridge CLI (which writes the runtime token
// file), then drive the shell-core contract both VS Code and Tauri rely on —
// resolve token+url, confirm liveness, authed call works, unauthed is rejected.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { connect, webviewUrl, api } from './runtime.mjs';

const BRIDGE = fileURLToPath(new URL('../bridge/src/server.mjs', import.meta.url));
const PORT = 8147;
const child = spawn(process.execPath, [BRIDGE], {
  env: { ...process.env, PORT: String(PORT), MOCK_URL: 'http://127.0.0.1:1' }, // no live mock needed for the handshake
  stdio: 'ignore',
});

try {
  const rt = await connect({ timeoutMs: 6000 });   // reads ~/.aiwg/cockpit/runtime/bridge.json + waits for /healthz
  assert.equal(rt.port, PORT, 'runtime port matches the launched Bridge');
  assert.ok(rt.token && rt.token.length >= 32, 'runtime carries a per-launch token');
  assert.match(webviewUrl(rt), /\/\?token=/, 'webview url carries the token');

  // the shell handshake: authed call succeeds, unauthed is gated
  assert.equal((await api(rt, '/api/health')).status, 200, 'authed /api/health 200');
  assert.equal((await fetch(rt.url + '/api/health')).status, 401, 'unauthed /api/health 401');

  console.log(`SMOKE OK — shell handshake: runtime file -> token+url (:${rt.port}) -> authed Bridge, gate enforced`);
} finally {
  child.kill();
}
