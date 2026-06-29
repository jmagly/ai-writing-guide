import { describe, expect, it } from 'vitest';

import {
  buildClaudeArgs,
  classifyClaudeStream,
  DEFAULT_REPRO_PROMPT,
} from '../../../tools/validation/claude-context-repro.mjs';

describe('validate:claude-context', () => {
  it('builds a plan-mode Claude command with mutation tools denied', () => {
    const args = buildClaudeArgs({ debugFile: '/tmp/debug.log' });

    expect(args).toContain('--permission-mode');
    expect(args).toContain('plan');
    expect(args).toContain('--disallowedTools');
    expect(args.join(' ')).toContain('Bash(git commit*)');
    expect(args).toContain(DEFAULT_REPRO_PROMPT);
  });

  it('classifies missing Claude authentication', () => {
    const stdout = [
      JSON.stringify({
        type: 'assistant',
        message: { content: [{ type: 'text', text: 'Not logged in · Please run /login' }] },
        error: 'authentication_failed',
      }),
    ].join('\n');

    const result = classifyClaudeStream(stdout);

    expect(result.verdict).toBe('auth-blocked');
    expect(result.authBlocked).toBe(true);
    expect(result.reachedModel).toBe(false);
  });

  it('classifies context exhaustion separately from successful model execution', () => {
    const stdout = [
      JSON.stringify({
        type: 'assistant',
        message: {
          usage: { input_tokens: 1000 },
          content: [{ type: 'text', text: 'Context limit reached · /compact or /clear to continue' }],
        },
      }),
    ].join('\n');

    const result = classifyClaudeStream(stdout);

    expect(result.verdict).toBe('context-exhausted');
    expect(result.contextExhausted).toBe(true);
    expect(result.reachedModel).toBe(true);
  });

  it('detects safe scope-discovery language in a model response', () => {
    const stdout = [
      JSON.stringify({
        type: 'assistant',
        message: {
          usage: { input_tokens: 2000 },
          content: [{ type: 'text', text: 'Start with git status --short and git diff --name-only to derive scope.' }],
        },
      }),
    ].join('\n');

    const result = classifyClaudeStream(stdout);

    expect(result.verdict).toBe('model-ran');
    expect(result.mentionsSafeScopeDiscovery).toBe(true);
  });
});
