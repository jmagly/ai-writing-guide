import { describe, expect, it } from 'vitest';
import { join } from 'path';
import { homedir } from 'os';
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

  it('does not expose a project markdown agent directory', () => {
    expect(getAgentsDirectory('openhuman', proj)).toBe('');
  });

  it('resolves skills to global/home-dir ~/.openhuman/skills (ungated, surfaced by the Skills library; #1553)', () => {
    expect(getSkillsDirectory('openhuman', proj)).toBe(join(homedir(), '.openhuman', 'skills'));
  });

  it('aggregates commands via AGENTS.md (no native command dir)', () => {
    expect(getCommandsDirectory('openhuman', proj)).toBe('');
  });

  it('stores AIWG rule bodies under the OpenHuman home support directory', () => {
    expect(getRulesDirectory('openhuman', proj)).toBe(join(homedir(), '.openhuman', '.aiwg', 'rules'));
  });

  it('does not use a project config bridge file', () => {
    expect(getConfigFileName('openhuman')).toBe('');
  });

  it('normalizes the openhuman provider id (case-insensitive)', () => {
    expect(normalizeProviderId('openhuman')).toBe('openhuman');
    expect(normalizeProviderId('OpenHuman')).toBe('openhuman');
  });
});
