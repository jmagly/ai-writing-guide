/**
 * Scope resolver — `--scope user|project` per ADR-4.
 *
 * The CLI flag `--scope user` redirects deploys to home-rooted paths
 * (`~/.<provider>/...`) instead of project-relative paths. This module
 * holds the per-provider user-scope path map and the helper to detect
 * the flag in command-line args.
 *
 * Per ADR-4 §2 path map. Per ADR-4 §1: `--scope user` and `--scope
 * project` are mutually exclusive; default is `project`.
 */

import { homedir } from 'node:os';
import * as path from 'node:path';

export type Scope = 'project' | 'user';

/**
 * User-scope deploy paths per provider per ADR-4 §2. Each path is absolute
 * (rooted in os.homedir()) so the orchestrator's existing path-join logic
 * (which calls `path.join(target, relativePath)`) treats them as authoritative
 * and bypasses the project-relative join.
 *
 * `.agents/skills/` and `~/.agents/skills/` deliberately appear for multiple
 * providers — that's the cross-provider canonical user-scope target. Per
 * ADR-4 §5 reference counting prevents one provider's removal from breaking
 * another's deploy at the shared path.
 */
export const USER_SCOPE_PATHS: Record<string, { agents: string; skills: string; commands: string; rules: string; behaviors: string }> = {
  claude: {
    agents: path.join(homedir(), '.claude', 'agents'),
    skills: path.join(homedir(), '.claude', 'skills'),
    commands: path.join(homedir(), '.claude', 'commands'),
    rules: path.join(homedir(), '.claude', 'rules'),
    behaviors: path.join(homedir(), '.claude', 'hooks'),
  },
  codex: {
    agents: '', // AGENTS.md only — no per-agent dir at user scope
    skills: path.join(homedir(), '.agents', 'skills'),
    commands: path.join(homedir(), '.codex', 'prompts'),
    rules: '', // AGENTS.md only
    behaviors: '',
  },
  copilot: {
    agents: path.join(homedir(), '.config', 'github-copilot', 'agents'),
    skills: path.join(homedir(), '.agents', 'skills'),
    commands: path.join(homedir(), '.config', 'github-copilot', 'prompts'),
    rules: path.join(homedir(), '.config', 'github-copilot', 'instructions'),
    behaviors: '',
  },
  cursor: {
    agents: path.join(homedir(), '.cursor', 'agents'),
    skills: path.join(homedir(), '.cursor', 'skills'),
    commands: path.join(homedir(), '.cursor', 'commands'),
    rules: path.join(homedir(), '.cursor', 'rules'),
    behaviors: path.join(homedir(), '.cursor', 'rules'),
  },
  opencode: {
    agents: path.join(homedir(), '.opencode', 'agent'),
    skills: path.join(homedir(), '.agents', 'skills'),
    commands: path.join(homedir(), '.opencode', 'command'),
    rules: '', // AGENTS.md only
    behaviors: '',
  },
  warp: {
    agents: path.join(homedir(), '.warp', 'agents'),
    skills: path.join(homedir(), '.agents', 'skills'),
    commands: path.join(homedir(), '.warp', 'commands'),
    rules: path.join(homedir(), '.warp', 'rules'),
    behaviors: '',
  },
  windsurf: {
    agents: path.join(homedir(), '.windsurf', 'agents'),
    skills: path.join(homedir(), '.windsurf', 'skills'),
    commands: path.join(homedir(), '.windsurf', 'workflows'),
    rules: path.join(homedir(), '.windsurf', 'rules'),
    behaviors: '',
  },
  hermes: {
    agents: '',
    skills: path.join(homedir(), '.hermes', 'skills'),
    commands: '',
    rules: '',
    behaviors: '',
  },
  openclaw: {
    agents: path.join(homedir(), '.openclaw', 'agents'),
    skills: path.join(homedir(), '.openclaw', 'skills'),
    commands: path.join(homedir(), '.openclaw', 'commands'),
    rules: path.join(homedir(), '.openclaw', 'rules'),
    behaviors: path.join(homedir(), '.openclaw', 'behaviors'),
  },
  factory: {
    agents: path.join(homedir(), '.factory', 'droids'),
    skills: path.join(homedir(), '.agents', 'skills'),
    commands: path.join(homedir(), '.factory', 'commands'),
    rules: '', // AGENTS.md only
    behaviors: '',
  },
};

/**
 * Detect the `--scope` flag in a command-line arg list. Returns the resolved
 * scope; defaults to 'project'. Throws when both `--scope user` and `--scope
 * project` appear (mutually exclusive per ADR-4 §1).
 */
export function detectScope(args: ReadonlyArray<string>): Scope {
  const idx = args.findIndex((a) => a === '--scope');
  if (idx === -1) return 'project';
  const value = args[idx + 1];
  if (value !== 'user' && value !== 'project') {
    throw new Error(
      `--scope expected 'user' or 'project', got '${value ?? '(missing)'}'`,
    );
  }
  // Check for duplicate --scope flags.
  const dupIdx = args.findIndex((a, i) => i > idx && a === '--scope');
  if (dupIdx !== -1) {
    throw new Error('--scope appears more than once');
  }
  return value;
}

/**
 * The path to the user-scope aiwg.config per ADR-4 §4. Each operator has
 * one of these per-machine; it tracks user-global deployments.
 */
export function userScopeConfigPath(): string {
  return path.join(homedir(), '.aiwg', 'aiwg.config');
}

/**
 * Resolve the deploy paths for a (provider, scope) pair. For project scope,
 * returns the project-relative paths from PROVIDER_PATHS (the caller resolves
 * them against the project dir). For user scope, returns the absolute home-
 * rooted paths from USER_SCOPE_PATHS.
 */
export function resolveScopePaths(
  provider: string,
  scope: Scope,
  projectScopePaths: { agents: string; skills: string; commands: string; rules: string; behaviors: string },
): { agents: string; skills: string; commands: string; rules: string; behaviors: string } {
  if (scope === 'project') return projectScopePaths;
  const userPaths = USER_SCOPE_PATHS[provider];
  if (!userPaths) {
    // Unknown provider — fall back to project paths so the caller doesn't crash.
    return projectScopePaths;
  }
  return userPaths;
}

/**
 * Mirror skills deployed under the project-scope skills directory to the
 * user-scope target. Per ADR-4 §2 the cross-agent canonical user-scope
 * skills target is `~/.agents/skills/` for codex/copilot/warp/opencode/
 * factory; for other providers the user-scope skills dir is per-provider.
 *
 * This is an additive copy — the project-scope deploy stays in place; the
 * user-scope copy is created alongside. Operators get the skills available
 * across all their projects without re-running aiwg use per project.
 *
 * Returns the count of skills mirrored, or 0 when nothing was found.
 */
export async function mirrorSkillsToUserScope(
  provider: string,
  projectSkillsDir: string,
): Promise<{ count: number; targetDir: string }> {
  const userPaths = USER_SCOPE_PATHS[provider];
  if (!userPaths || !userPaths.skills) {
    return { count: 0, targetDir: '' };
  }

  const fs = await import('node:fs/promises');

  let entries: Array<{ name: string; isDirectory: boolean }>;
  try {
    const dirents = await fs.readdir(projectSkillsDir, { withFileTypes: true });
    entries = dirents.map((e) => ({ name: e.name, isDirectory: e.isDirectory() }));
  } catch {
    return { count: 0, targetDir: userPaths.skills };
  }

  await fs.mkdir(userPaths.skills, { recursive: true });

  let count = 0;
  for (const entry of entries) {
    if (!entry.isDirectory) continue;
    const src = path.join(projectSkillsDir, entry.name);
    const dst = path.join(userPaths.skills, entry.name);
    try {
      await fs.cp(src, dst, { recursive: true, force: true });
      count++;
    } catch {
      // Skip individual failures; surface in caller's verbose output.
    }
  }

  return { count, targetDir: userPaths.skills };
}
