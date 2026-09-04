/** Pi Coding Agent adapter for headless External Ralph sessions. */
import { spawnSync } from 'child_process';
import { homedir } from 'os';
import { join } from 'path';
import { ProviderAdapter, registerProvider } from './provider-adapter.mjs';

export class PiAdapter extends ProviderAdapter {
  getBinary() { return process.env.AIWG_PI_BIN || 'pi'; }
  getName() { return 'pi'; }
  getCapabilities() {
    return { streamJson: true, sessionResume: true, budgetControl: false,
      systemPrompt: true, agentMode: false, mcpConfig: false, maxTurns: false,
      rpcAbort: true };
  }
  async isAvailable() {
    const node = spawnSync(process.execPath, ['-p', 'process.versions.node'], { encoding: 'utf8' });
    const [major, minor] = String(node.stdout).trim().split('.').map(Number);
    if (node.status !== 0 || major < 22 || (major === 22 && minor < 19)) return false;
    return super.isAvailable();
  }
  buildSessionArgs(options) {
    const args = ['--mode', 'json', '--no-approve'];
    if (options.model) args.push('--model', this.mapModel(options.model));
    if (options.thinking) args.push('--thinking', options.thinking);
    if (options.sessionId) args.push('--session', options.sessionId);
    if (options.tools?.length) args.push('--tools', options.tools.join(','));
    if (options.systemPrompt) args.push('--append-system-prompt', options.systemPrompt);
    if (options.budget) this.warnUnsupported('budgetControl', 'Budget control');
    if (options.maxTurns) this.warnUnsupported('maxTurns', 'Max turns');
    if (options.mcpConfig) this.warnUnsupported('mcpConfig', 'MCP configuration');
    args.push(options.prompt);
    return args;
  }
  buildAnalysisArgs(options) { return this.buildSessionArgs(options); }
  mapModel(model) { return model; }
  getEnvOverrides() { return { CI: 'true', NO_COLOR: '1' }; }
  getAbortInput() { return `${JSON.stringify({ type: 'abort', id: 'aiwg-abort' })}\n`; }
  getTranscriptPath(sessionId) {
    if (!sessionId) return null;
    if (sessionId.endsWith('.jsonl') || sessionId.includes('/')) return sessionId;
    const root = process.env.PI_CODING_AGENT_SESSION_DIR;
    return root ? join(root, `${sessionId}.jsonl`) : join(homedir(), '.pi', 'agent', 'sessions', `${sessionId}.jsonl`);
  }
  parseOutput(stdout) {
    const events = [];
    for (const raw of stdout.split('\n')) {
      const line = raw.endsWith('\r') ? raw.slice(0, -1) : raw;
      if (!line) continue;
      try { events.push(JSON.parse(line)); } catch { return null; }
    }
    return events.length ? { events, settled: events.some(event => event.type === 'agent_settled') } : null;
  }
}

registerProvider('pi', () => new PiAdapter());
export default PiAdapter;
