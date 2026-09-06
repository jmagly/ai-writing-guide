import { resolve } from 'node:path';
import { ProviderAdapter, registerProvider } from './provider-adapter.mjs';
import { assertSupportedDshVersion } from '../../providers/deepseek-harness-transport.mjs';

export class DeepSeekHarnessAdapter extends ProviderAdapter {
  getBinary() { return process.env.AIWG_DSH_BIN || 'dsh'; }
  getName() { return 'deepseek-harness'; }
  getCapabilities() {
    return { streamJson: false, sessionResume: true, budgetControl: false,
      systemPrompt: false, agentMode: true, mcpConfig: true, maxTurns: false,
      rpcAbort: false };
  }
  async isAvailable() {
    if (!await super.isAvailable()) return false;
    try { assertSupportedDshVersion(await this.getVersion()); return true; } catch { return false; }
  }
  buildSessionArgs(options) {
    const args = ['--profile', 'headless'];
    const projectPatch = process.env.AIWG_DSH_PROJECT_PATCH || '.dsh/aiwg.cordis.patch.yml';
    args.push('--patch', resolve(projectPatch));
    if (process.env.AIWG_DSH_ROUTE_PATCH) args.push('--patch', resolve(process.env.AIWG_DSH_ROUTE_PATCH));
    if (options.budget) this.warnUnsupported('budgetControl', 'Budget control');
    if (options.maxTurns) this.warnUnsupported('maxTurns', 'Max turns');
    if (options.systemPrompt) this.warnUnsupported('systemPrompt', 'Appended system prompts');
    args.push(options.prompt);
    return args;
  }
  buildAnalysisArgs(options) { return this.buildSessionArgs(options); }
  mapModel(model) { return model; }
  getEnvOverrides() { return { DSH_PERMISSION_MODE: 'workspace-write', DSH_TELEMETRY_DISABLED: '1', NO_COLOR: '1' }; }
  parseOutput(stdout) {
    const text = stdout.trim();
    return text ? { events: [{ type: 'assistant_final', text }], settled: true, text } : null;
  }
}

registerProvider('deepseek-harness', () => new DeepSeekHarnessAdapter());
registerProvider('dsh', () => new DeepSeekHarnessAdapter());
export default DeepSeekHarnessAdapter;
