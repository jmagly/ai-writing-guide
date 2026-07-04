import { describe, expect, it } from 'vitest';

import {
  getProviderDefinition,
  listProviderDefinitions,
  normalizeProviderDefinitionId,
  validateProviderDefinitionRegistry,
} from '../../../src/providers/provider-definitions.js';

const CURRENT_PLATFORM_IDS = [
  'claude',
  'codex',
  'copilot',
  'cursor',
  'factory',
  'hermes',
  'opencode',
  'openclaw',
  'openhuman',
  'warp',
  'windsurf',
  'generic',
];

describe('provider definition registry', () => {
  it('has a valid definition for every current Platform value', () => {
    const definitions = validateProviderDefinitionRegistry();

    expect(definitions.map((definition) => definition.id)).toEqual(CURRENT_PLATFORM_IDS);
    for (const definition of definitions) {
      expect(definition.displayName).toBeTruthy();
      expect(definition.paths.artifacts).toHaveProperty('agents');
      expect(definition.paths.artifacts).toHaveProperty('commands');
      expect(definition.paths.artifacts).toHaveProperty('skills');
      expect(definition.paths.artifacts).toHaveProperty('rules');
      expect(definition.paths.artifacts).toHaveProperty('behaviors');
      expect(definition.adapters.agentFormat).toBeTruthy();
    }
  });

  it('normalizes existing provider aliases through definition data', () => {
    expect(normalizeProviderDefinitionId('claude-code')).toBe('claude');
    expect(normalizeProviderDefinitionId('openai')).toBe('codex');
    expect(normalizeProviderDefinitionId('tinyhumansai')).toBe('openhuman');
    expect(normalizeProviderDefinitionId('devin-desktop')).toBe('windsurf');
    expect(normalizeProviderDefinitionId('missing-provider')).toBeNull();
  });

  it('keeps capability matrix references resolvable for all non-generic providers', () => {
    for (const definition of listProviderDefinitions()) {
      if (definition.id === 'generic') {
        expect(definition.capabilities.matrixRef).toBeNull();
        continue;
      }
      expect(definition.capabilities.matrixRef).toBeTruthy();
      expect(Object.keys(definition.capabilities.nativeFeatures)).toContain('mcp');
      expect(Object.keys(definition.capabilities.emulation)).toContain('mission_control');
    }
  });

  it('models the current no-behavior-change paths for representative providers', () => {
    expect(getProviderDefinition('claude')?.paths.kernelSkills).toBe('.claude/skills');
    expect(getProviderDefinition('codex')?.paths.kernelSkills).toBe('.agents/skills');
    expect(getProviderDefinition('openhuman')?.paths.deployTarget).toBe('mixed');
    expect(getProviderDefinition('openhuman')?.paths.kernelSkills).toBe('~/.openhuman/skills');
    expect(getProviderDefinition('windsurf')?.surfaces.precedence).toContain('.devin/rules/');
  });
});
