import { describe, expect, it } from 'vitest';
import { getProviderDefinition, normalizeProviderDefinitionId } from '../../../src/providers/provider-definitions.js';

describe('DeepSeek Harness provider definition', () => {
  it('resolves canonical and short identities', () => {
    expect(normalizeProviderDefinitionId('dsh')).toBe('deepseek-harness');
    expect(normalizeProviderDefinitionId('deepseek')).toBeNull();
    const provider = getProviderDefinition('deepseek-harness');
    expect(provider?.status).toBe('experimental');
    expect(provider?.upstream).toEqual({
      source: 'https://github.com/deepseek-ai/deepseek-harness',
      version: 'dsh-v0.1.3-alpha.1',
      revision: 'd347e703908d0406b7a7ef80e3a0e594d86b2215',
      runtime: 'Node.js ^22.19.0 || >=24.0.0',
      lastVerified: '2026-09-05',
    });
    expect(provider?.paths.kernelSkills).toBe('.agents/skills');
    expect(provider?.context.maxContextBytes).toBe(65536);
    expect(provider?.adapters.mcpInjection).toBeNull();
  });
});
