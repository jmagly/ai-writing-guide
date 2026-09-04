import { spawnSync } from 'node:child_process';
import { ProviderAdapter, registerProvider } from './provider-adapter.mjs';
import { OmpFrameDecoder, summarizeOmpEvents, OmpRpcClient, MAX_MESSAGE } from '../../providers/omp-transport.mjs';

/** Oh My Pi's native flags/events intentionally differ from Pi. */
export class OmpAdapter extends ProviderAdapter {
  async getVersion() { const result = spawnSync(this.getBinary(), ['--version'], { encoding: 'utf8', timeout: 5000, maxBuffer: 65536 }); return result.status === 0 ? result.stdout.trim() : null; }
  async isAvailable() { return Boolean(await this.getVersion()); }
  getName() { return 'omp'; }
  getBinary() { return process.env.AIWG_OMP_BIN || 'omp'; }
  getCapabilities() { return { streamJson: true, sessionResume: true, budgetControl: false, systemPrompt: true, agentMode: false, mcpConfig: false, maxTurns: false, rpcAbort: true }; }
  buildSessionArgs(options) {
    const args = ['--mode', 'json'];
    if (options.profile) args.push('--profile', options.profile);
    for (const config of options.config ?? []) args.push('--config', config);
    if (options.model) args.push('--model', this.mapModel(options.model));
    if (options.thinking) args.push('--thinking', options.thinking);
    if (options.sessionId) args.push('--session', options.sessionId);
    if (options.sessionDir) args.push('--session-dir', options.sessionDir);
    if (options.noSession) args.push('--no-session');
    if (options.noExtensions) args.push('--no-extensions');
    if (options.tools) { if (options.tools.length) args.push('--tools', options.tools.join(',')); else args.push('--no-tools'); }
    if (options.systemPrompt) args.push('--append-system-prompt', options.systemPrompt);
    for (const [option, capability] of [['budget', 'budgetControl'], ['maxTurns', 'maxTurns'], ['mcpConfig', 'mcpConfig']]) if (options[option]) this.warnUnsupported(capability, option);
    args.push('--', options.prompt);
    return args;
  }
  buildAnalysisArgs(options) { return this.buildSessionArgs(options); }
  mapModel(model) { return model; }
  getEnvOverrides() { return { CI: 'true', NO_COLOR: '1' }; }
  // JSON print mode has no stdin abort protocol; runner terminates its process.
  getAbortInput() { return null; }
  createRpcClient(options = {}) { return new OmpRpcClient({ binary: this.getBinary(), ...options }); }
  getTranscriptPath(sessionId) { return sessionId?.endsWith('.jsonl') ? sessionId : null; }
  parseOutput(stdout, options = {}) {
    if (Buffer.byteLength(stdout) > MAX_MESSAGE) return null;
    try { const decoder = new OmpFrameDecoder({ frameLimit: MAX_MESSAGE }); const events = decoder.push(Buffer.from(stdout)); decoder.end(); return events.length ? summarizeOmpEvents(events, options) : null; } catch { return null; }
  }
}
registerProvider('omp', () => new OmpAdapter());
export default OmpAdapter;
