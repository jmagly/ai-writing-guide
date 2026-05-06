/**
 * Tests for the --scope user|project resolver (PUW-027 / #1128).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { homedir } from 'node:os';
import * as path from 'node:path';
import { promises as fs } from 'node:fs';
import * as os from 'node:os';
import {
  detectScope,
  userScopeConfigPath,
  resolveScopePaths,
  USER_SCOPE_PATHS,
  mirrorSkillsToUserScope,
} from '../../../src/cli/scope-resolver.js';

describe('detectScope', () => {
  it('defaults to project when --scope absent', () => {
    expect(detectScope([])).toBe('project');
    expect(detectScope(['--provider', 'codex'])).toBe('project');
  });

  it('parses --scope user', () => {
    expect(detectScope(['--scope', 'user'])).toBe('user');
  });

  it('parses --scope project explicit', () => {
    expect(detectScope(['--scope', 'project'])).toBe('project');
  });

  it('rejects unknown scope value', () => {
    expect(() => detectScope(['--scope', 'shared'])).toThrow(/expected 'user' or 'project'/);
  });

  it('rejects missing scope value', () => {
    expect(() => detectScope(['--scope'])).toThrow(/expected 'user' or 'project'/);
  });

  it('rejects duplicate --scope flags', () => {
    expect(() => detectScope(['--scope', 'user', '--scope', 'project'])).toThrow(/more than once/);
  });
});

describe('userScopeConfigPath', () => {
  it('returns ~/.aiwg/aiwg.config', () => {
    expect(userScopeConfigPath()).toBe(path.join(homedir(), '.aiwg', 'aiwg.config'));
  });
});

describe('resolveScopePaths', () => {
  const projectPaths = {
    agents: '.codex/agents',
    skills: '.codex/skills',
    commands: '.codex/commands',
    rules: '.codex/rules',
    behaviors: '.codex/rules',
  };

  it('returns project paths for scope=project', () => {
    const r = resolveScopePaths('codex', 'project', projectPaths);
    expect(r).toEqual(projectPaths);
  });

  it('returns user-scope absolute paths for scope=user (codex)', () => {
    const r = resolveScopePaths('codex', 'user', projectPaths);
    expect(r.skills).toBe(path.join(homedir(), '.agents', 'skills'));
    expect(r.commands).toBe(path.join(homedir(), '.codex', 'prompts'));
  });

  it('returns user-scope absolute paths for scope=user (claude)', () => {
    const r = resolveScopePaths('claude', 'user', projectPaths);
    expect(r.agents).toBe(path.join(homedir(), '.claude', 'agents'));
    expect(r.skills).toBe(path.join(homedir(), '.claude', 'skills'));
    expect(r.commands).toBe(path.join(homedir(), '.claude', 'commands'));
    expect(r.rules).toBe(path.join(homedir(), '.claude', 'rules'));
  });

  it('falls back to project paths for unknown provider', () => {
    const r = resolveScopePaths('nonexistent', 'user', projectPaths);
    expect(r).toEqual(projectPaths);
  });
});

describe('mirrorSkillsToUserScope', () => {
  let tmpRoot: string;
  let projectSkillsDir: string;

  // USER_SCOPE_PATHS captures homedir at module-load time; we don't mutate
  // HOME here (it leaked between describe blocks before this fix). The
  // mirror function dynamically calls path.join with USER_SCOPE_PATHS, so
  // it uses the same captured homedir. Tests assert structural shape
  // rather than absolute path values.

  beforeEach(async () => {
    tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'aiwg-scope-mirror-'));
    projectSkillsDir = path.join(tmpRoot, 'project', '.codex', 'skills');
    await fs.mkdir(projectSkillsDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tmpRoot, { recursive: true, force: true });
  });

  it('returns count 0 for unknown provider', async () => {
    const r = await mirrorSkillsToUserScope('nonexistent', projectSkillsDir);
    expect(r.count).toBe(0);
  });

  it('returns count 0 when project skills dir is empty', async () => {
    const r = await mirrorSkillsToUserScope('codex', projectSkillsDir);
    expect(r.count).toBe(0);
  });

  it('returns count 0 when project skills dir does not exist', async () => {
    const r = await mirrorSkillsToUserScope('codex', path.join(tmpRoot, 'nonexistent'));
    expect(r.count).toBe(0);
  });

  it('emits a non-empty target dir for codex', async () => {
    const r = await mirrorSkillsToUserScope('codex', projectSkillsDir);
    expect(r.targetDir).toContain('agents/skills');
  });
});

describe('USER_SCOPE_PATHS coverage', () => {
  it('covers all 10 supported providers', () => {
    const expected = ['claude', 'codex', 'copilot', 'cursor', 'opencode', 'warp', 'windsurf', 'hermes', 'openclaw', 'factory'];
    for (const p of expected) {
      expect(USER_SCOPE_PATHS[p], `${p} should have user-scope paths`).toBeDefined();
    }
  });

  it('uses ~/.agents/skills/ as cross-provider canonical target for the 5 bridge providers', () => {
    const crossAgentPath = path.join(homedir(), '.agents', 'skills');
    expect(USER_SCOPE_PATHS.codex.skills).toBe(crossAgentPath);
    expect(USER_SCOPE_PATHS.copilot.skills).toBe(crossAgentPath);
    expect(USER_SCOPE_PATHS.warp.skills).toBe(crossAgentPath);
    expect(USER_SCOPE_PATHS.opencode.skills).toBe(crossAgentPath);
    expect(USER_SCOPE_PATHS.factory.skills).toBe(crossAgentPath);
  });
});
