// AIWG Cockpit — VS Code shell (#1594).
// Hosts the registry-bound Bridge UI inside a webview, and exposes contributed
// actions as command-palette entries. The shell never replaces the CLI or the
// Bridge — it reads the per-launch token the Bridge wrote and loads its UI.
// CommonJS so it runs with no build step.
const vscode = require('vscode');
const fs = require('fs');
const os = require('os');
const path = require('path');

function runtimeFile() {
  const override = vscode.workspace.getConfiguration('aiwg-cockpit').get('bridgeRuntimeFile');
  return override && override.length ? override : path.join(os.homedir(), '.aiwg', 'cockpit', 'runtime', 'bridge.json');
}

/** Read the Bridge connection + confirm liveness; throws with a friendly hint if down. */
async function ensureRuntime() {
  let rt;
  try {
    const r = JSON.parse(fs.readFileSync(runtimeFile(), 'utf8'));
    rt = { ...r, url: `http://127.0.0.1:${r.port}` };
  } catch {
    throw new Error('AIWG Cockpit Bridge not found. Start it with `aiwg cockpit` (or `node apps/cockpit/bridge/src/server.mjs`) and retry.');
  }
  try { if (!(await fetch(`${rt.url}/healthz`)).ok) throw new Error(); }
  catch { throw new Error(`AIWG Cockpit Bridge not reachable at ${rt.url}. Is it still running?`); }
  return rt;
}

function activate(context) {
  context.subscriptions.push(
    vscode.commands.registerCommand('aiwg-cockpit.open', async () => {
      let rt;
      try { rt = await ensureRuntime(); } catch (e) { return vscode.window.showWarningMessage(e.message); }
      const panel = vscode.window.createWebviewPanel('aiwgCockpit', 'AIWG Cockpit', vscode.ViewColumn.One, { enableScripts: true, retainContextWhenHidden: true });
      const u = `${rt.url}/?token=${encodeURIComponent(rt.token)}`;
      panel.webview.html = `<!doctype html><html><head><meta charset="utf-8" />
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; frame-src http://127.0.0.1:* http://localhost:*; style-src 'unsafe-inline';" />
        <style>html,body,iframe{margin:0;height:100vh;width:100%;border:0}</style></head>
        <body><iframe src="${u}" title="AIWG Cockpit"></iframe></body></html>`;
    }),
    vscode.commands.registerCommand('aiwg-cockpit.auditIssues', async () => {
      let rt;
      try { rt = await ensureRuntime(); } catch (e) { return vscode.window.showWarningMessage(e.message); }
      const out = vscode.window.createOutputChannel('AIWG Cockpit');
      out.show(true);
      out.appendLine('Running contributed action: audit-issues…');
      try {
        const r = await fetch(`${rt.url}/api/actions/audit-issues/run`, { method: 'POST', headers: { authorization: `Bearer ${rt.token}` } });
        const j = await r.json();
        out.appendLine(j.output || JSON.stringify(j, null, 2));
      } catch (e) { out.appendLine('Error: ' + e.message); }
    }),
  );
}

function deactivate() {}

module.exports = { activate, deactivate };
