import { describe, expect, it } from 'vitest';
import { join } from 'path';
import {
  getAgentsDirectory,
  getSkillsDirectory,
  getCommandsDirectory,
  getRulesDirectory,
  getConfigFileName,
} from '../../../src/smiths/platform-paths.js';
import { normalizeProviderId } from '../../../src/cli/provider-resolution.js';

// OpenHuman (tinyhumansai) provider induction — Tier-1 path wiring (#1555, epic #1552).
// Asserts the four artifact getters + config bridge + provider-id normalization.
describe('OpenHuman provider path resolution (#1555)', () => {
  const proj = '/mock/project';

  it('resolves agents to .agents/agents (markdown personas, Tier-1)', () => {
    expect(getAgentsDirectory('openhuman', proj)).toBe(join(proj, '.agents/agents'));
  });

  it('resolves skills to project-scope .openhuman/skills', () => {
    expect(getSkillsDirectory('openhuman', proj)).toBe(join(proj, '.openhuman/skills'));
  });

  it('aggregates commands via AGENTS.md (no native command dir)', () => {
    expect(getCommandsDirectory('openhuman', proj)).toBe('');
  });

  it('aggregates rules via AGENTS.md (no native rules dir)', () => {
    expect(getRulesDirectory('openhuman', proj)).toBe('');
  });

  it('uses AGENTS.md as the bridge config file', () => {
    expect(getConfigFileName('openhuman')).toBe('AGENTS.md');
  });

  it('normalizes the openhuman provider id (case-insensitive)', () => {
    expect(normalizeProviderId('openhuman')).toBe('openhuman');
    expect(normalizeProviderId('OpenHuman')).toBe('openhuman');
  });
});
