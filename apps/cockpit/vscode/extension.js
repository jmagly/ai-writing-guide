// AIWG Cockpit — VS Code shell (#1594).
// Hosts the registry-bound Bridge UI inside a webview, and exposes contributed
// actions as command-palette entries. The shell never replaces the CLI or the
// Bridge — it reads the per-launch token the Bridge wrote and loads its UI.
// CommonJS so it runs with no build step.
const vscode = require('vscode');
const os = require('os');
const path = require('path');
const { pathToFileURL } = require('url');

function runtimeFile() {
  const override = vscode.workspace.getConfiguration('aiwg-cockpit').get('bridgeRuntimeFile');
  return override && override.length ? override : path.join(os.homedir(), '.aiwg', 'cockpit', 'runtime', 'bridge.json');
}

async function shellCore() {
  const runtimeModule = path.join(__dirname, '..', 'shell-core', 'runtime.mjs');
  return import(pathToFileURL(runtimeModule).href);
}

/** Read the Bridge connection + confirm liveness; throws with a friendly hint if down. */
async function ensureRuntime() {
  try {
    const { connect } = await shellCore();
    return await connect({ file: runtimeFile(), timeoutMs: 2500 });
  } catch (e) {
    throw new Error(`AIWG Cockpit Bridge not reachable. Start it with \`aiwg cockpit\` (or \`node apps/cockpit/bridge/src/server.mjs\`) and retry. ${(e && e.message) || ''}`.trim());
  }
}

function activate(context) {
  context.subscriptions.push(
    vscode.commands.registerCommand('aiwg-cockpit.open', async () => {
      let rt;
      try { rt = await ensureRuntime(); } catch (e) { return vscode.window.showWarningMessage(e.message); }
      const panel = vscode.window.createWebviewPanel('aiwgCockpit', 'AIWG Cockpit', vscode.ViewColumn.One, { enableScripts: true, retainContextWhenHidden: true });
      const { webviewUrl } = await shellCore();
      const u = webviewUrl(rt);
      panel.webview.html = `<!doctype html><html><head><meta charset="utf-8" />
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; frame-src http://127.0.0.1:* http://localhost:*; style-src 'unsafe-inline';" />
        <style>html,body,iframe{margin:0;height:100vh;width:100%;border:0}</style></head>
        <body><iframe src="${u}" title="AIWG Cockpit"></iframe></body></html>`;
    }),
    vscode.commands.registerCommand('aiwg-cockpit.auditIssues', async () => {
      let rt;
      try { rt = await ensureRuntime(); } catch (e) { return vscode.window.showWarningMessage(e.message); }
      const { webviewUrl } = await shellCore();
      vscode.env.openExternal(vscode.Uri.parse(`${webviewUrl(rt)}#actions`));
    }),
  );
}

function deactivate() {}

module.exports = { activate, deactivate, _private: { ensureRuntime, runtimeFile, shellCore } };
