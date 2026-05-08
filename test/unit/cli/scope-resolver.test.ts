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
  mirrorToUserScope,
  rejectOpenClawProjectScope,
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

describe('mirrorToUserScope (#1156)', () => {
  let tmpRoot: string;
  let projectAgentsDir: string;
  let projectSkillsDir: string;
  let projectCommandsDir: string;
  let projectRulesDir: string;

  beforeEach(async () => {
    tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'aiwg-scope-mirror-full-'));
    projectAgentsDir = path.join(tmpRoot, 'project', '.claude', 'agents');
    projectSkillsDir = path.join(tmpRoot, 'project', '.claude', 'skills');
    projectCommandsDir = path.join(tmpRoot, 'project', '.claude', 'commands');
    projectRulesDir = path.join(tmpRoot, 'project', '.claude', 'rules');
    await fs.mkdir(projectAgentsDir, { recursive: true });
    await fs.mkdir(projectSkillsDir, { recursive: true });
    await fs.mkdir(projectCommandsDir, { recursive: true });
    await fs.mkdir(projectRulesDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tmpRoot, { recursive: true, force: true });
  });

  it('returns zero counts for unknown provider', async () => {
    const r = await mirrorToUserScope('nonexistent', {
      agents: projectAgentsDir,
      skills: projectSkillsDir,
      commands: projectCommandsDir,
      rules: projectRulesDir,
      behaviors: '',
    });
    expect(r.agents.count).toBe(0);
    expect(r.skills.count).toBe(0);
    expect(r.commands.count).toBe(0);
    expect(r.rules.count).toBe(0);
  });

  it('returns zero counts when project artifact dirs are empty', async () => {
    const r = await mirrorToUserScope('claude', {
      agents: projectAgentsDir,
      skills: projectSkillsDir,
      commands: projectCommandsDir,
      rules: projectRulesDir,
      behaviors: '',
    });
    expect(r.agents.count).toBe(0);
    expect(r.skills.count).toBe(0);
    expect(r.commands.count).toBe(0);
    expect(r.rules.count).toBe(0);
  });

  it('emits non-empty target dirs for claude', async () => {
    const r = await mirrorToUserScope('claude', {
      agents: projectAgentsDir,
      skills: projectSkillsDir,
      commands: projectCommandsDir,
      rules: projectRulesDir,
      behaviors: '',
    });
    expect(r.agents.targetDir).toContain('.claude/agents');
    expect(r.skills.targetDir).toContain('.claude/skills');
    expect(r.commands.targetDir).toContain('.claude/commands');
    expect(r.rules.targetDir).toContain('.claude/rules');
  });

  // #1156 Cycle 3 — mirror returns entry names so the registry can record
  // exactly what was deployed, enabling precise remove later.
  it('returns entry names for each artifact type that was actually mirrored', async () => {
    // Populate a couple of source directories so the mirror has real content.
    await fs.mkdir(path.join(projectSkillsDir, 'skill-foo'), { recursive: true });
    await fs.writeFile(path.join(projectSkillsDir, 'skill-foo', 'SKILL.md'), '# foo', 'utf-8');
    await fs.mkdir(path.join(projectSkillsDir, 'skill-bar'), { recursive: true });
    await fs.writeFile(path.join(projectSkillsDir, 'skill-bar', 'SKILL.md'), '# bar', 'utf-8');
    await fs.writeFile(path.join(projectCommandsDir, 'cmd-baz.md'), '# baz', 'utf-8');

    const r = await mirrorToUserScope('claude', {
      agents: projectAgentsDir,
      skills: projectSkillsDir,
      commands: projectCommandsDir,
      rules: projectRulesDir,
      behaviors: '',
    });

    expect(r.skills.entries.sort()).toEqual(['skill-bar', 'skill-foo']);
    expect(r.skills.count).toBe(2);
    expect(r.commands.entries).toEqual(['cmd-baz.md']);
    expect(r.commands.count).toBe(1);
    expect(r.agents.entries).toEqual([]);
    expect(r.rules.entries).toEqual([]);
  });
});

describe('rejectOpenClawProjectScope (#1156)', () => {
  it('throws on --scope project + openclaw', () => {
    expect(() => rejectOpenClawProjectScope('openclaw', 'project')).toThrow(
      /OpenClaw is exclusively user-scope/,
    );
  });

  it('is a no-op for openclaw + scope user', () => {
    expect(() => rejectOpenClawProjectScope('openclaw', 'user')).not.toThrow();
  });

  it('is a no-op for non-openclaw providers regardless of scope', () => {
    expect(() => rejectOpenClawProjectScope('claude', 'project')).not.toThrow();
    expect(() => rejectOpenClawProjectScope('claude', 'user')).not.toThrow();
    expect(() => rejectOpenClawProjectScope('codex', 'project')).not.toThrow();
  });
});

describe('USER_SCOPE_PATHS coverage', () => {
  it('covers all 10 supported providers', () => {
    const expected = ['claude', 'codex', 'copilot', 'cursor', 'opencode', 'warp', 'windsurf', 'hermes', 'openclaw', 'factory'];
    for (const p of expected) {
      expect(USER_SCOPE_PATHS[p], `${p} should have user-scope paths`).toBeDefined();
    }
  });

  it('uses ~/.agents/skills/ as cross-provider canonical target for the 4 bridge providers', () => {
    // #1164 — Factory was previously included here but its docs explicitly
    // call out ~/.factory/skills/ as the user-scope path. We deploy there
    // instead. Factory may also scan ~/.agents/skills/ — if confirmed by
    // primary source, add it back to the cross-provider mirror set.
    const crossAgentPath = path.join(homedir(), '.agents', 'skills');
    expect(USER_SCOPE_PATHS.codex.skills).toBe(crossAgentPath);
    expect(USER_SCOPE_PATHS.copilot.skills).toBe(crossAgentPath);
    expect(USER_SCOPE_PATHS.warp.skills).toBe(crossAgentPath);
    expect(USER_SCOPE_PATHS.opencode.skills).toBe(crossAgentPath);
    expect(USER_SCOPE_PATHS.factory.skills).toBe(path.join(homedir(), '.factory', 'skills'));
  });

  // #1161 — OpenCode user-scope discovery roots at ~/.config/opencode/, not
  // ~/.opencode/. Subdirs are plural per OpenCode docs convention.
  it('places opencode user-scope agents and commands under ~/.config/opencode/ (plural)', () => {
    expect(USER_SCOPE_PATHS.opencode.agents).toBe(path.join(homedir(), '.config', 'opencode', 'agents'));
    expect(USER_SCOPE_PATHS.opencode.commands).toBe(path.join(homedir(), '.config', 'opencode', 'commands'));
  });
});
