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
      expect(definition.paths.contextDiscovery).toHaveProperty('agents');
      expect(definition.paths.contextDiscovery).toHaveProperty('skills');
      expect(definition.paths.contextDiscovery).toHaveProperty('rules');
      expect(definition.paths.contextDiscovery).toHaveProperty('behaviors');
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

  it('models smith-facing paths separately from deploy paths where legacy behavior differs', () => {
    expect(getProviderDefinition('copilot')?.paths.artifacts.commands).toBe('.github/commands');
    expect(getProviderDefinition('copilot')?.smithPaths.commands).toBe('.github/agents');
    expect(getProviderDefinition('opencode')?.paths.artifacts.agents).toBe('.opencode/agent');
    expect(getProviderDefinition('opencode')?.smithPaths.agents).toBeNull();
    expect(getProviderDefinition('openhuman')?.paths.artifacts.skills).toBe('~/.openhuman/.aiwg/skills');
    expect(getProviderDefinition('openhuman')?.smithPaths.skills).toBe('~/.openhuman/skills');
  });

  it('models context-discovery paths separately where regenerate differs from deploy paths', () => {
    expect(getProviderDefinition('codex')?.paths.artifacts.skills).toBe('.codex/.aiwg/skills');
    expect(getProviderDefinition('codex')?.paths.contextDiscovery.skills).toBe('.agents/skills');
    expect(getProviderDefinition('copilot')?.paths.artifacts.rules).toBe('.github/copilot-rules');
    expect(getProviderDefinition('copilot')?.paths.contextDiscovery.rules).toBe('.github/instructions');
    expect(getProviderDefinition('openhuman')?.paths.artifacts.agents).toBeNull();
    expect(getProviderDefinition('openhuman')?.paths.contextDiscovery.agents).toBe('.agents/agents');
  });
});
