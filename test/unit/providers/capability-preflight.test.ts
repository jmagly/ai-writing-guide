import { describe, it, expect } from 'vitest';

import {
  getAgentCapabilities,
  preflightSubagentDispatch,
} from '../../../src/providers/capability-matrix.js';

describe('provider subagent dispatch preflight', () => {
  it('loads per-agent context budget overrides from the capability matrix', () => {
    const caps = getAgentCapabilities('claude-code', 'api-designer');

    expect(caps?.context_window).toBe(200000);
    expect(caps?.notes).toMatch(/1M-context/);
  });

  it('returns ok when estimated dispatch fits the declared budget', () => {
    const result = preflightSubagentDispatch({
      provider: 'codex',
      agentType: 'default',
      promptTokens: 5000,
      contextTokens: 40000,
      outputTokens: 8000,
      toolCalls: 10,
    });

    expect(result.status).toBe('ok');
    expect(result.recoveryHint).toBeNull();
  });

  it('catches context overflow before dispatch', () => {
    const result = preflightSubagentDispatch({
      provider: 'claude-code',
      agentType: 'requirements-analyst',
      promptTokens: 20000,
      contextTokens: 190000,
      outputTokens: 12000,
    });

    expect(result.status).toBe('would_overflow');
    expect(result.recoveryHint).toBe('retry_with_prefiltered_context');
  });

  it('catches unavailable 1M-context quota before dispatch', () => {
    const result = preflightSubagentDispatch({
      provider: 'claude-code',
      agentType: 'api-designer',
      promptTokens: 2000,
      contextTokens: 20000,
      requiresMillionContext: true,
    });

    expect(result.status).toBe('quota_unavailable');
    expect(result.recoveryHint).toBe('retry_with_standard_context');
  });
});
