import { describe, expect, it } from 'vitest';
import {
  buildAgentArgs,
  getProviderConfig,
} from '../../../src/cli/agent-spawn.js';

describe('Codex agent spawn mapping', () => {
  it('maps dangerous mode to the current Codex bypass flag', () => {
    const args = buildAgentArgs('/sdlc-accelerate --resume --auto', {
      provider: 'codex',
      dangerous: true,
    });

    expect(getProviderConfig('codex').dangerousFlag)
      .toBe('--dangerously-bypass-approvals-and-sandbox');
    expect(args).toEqual([
      '--dangerously-bypass-approvals-and-sandbox',
      '/sdlc-accelerate --resume --auto',
    ]);
    expect(args).not.toContain('--full-auto');
  });

  it('does not add a dangerous-mode flag unless requested', () => {
    const args = buildAgentArgs('/sdlc-accelerate --resume --auto', {
      provider: 'codex',
    });

    expect(args).toEqual(['/sdlc-accelerate --resume --auto']);
    expect(args).not.toContain('--dangerously-bypass-approvals-and-sandbox');
    expect(args).not.toContain('--full-auto');
  });
});
