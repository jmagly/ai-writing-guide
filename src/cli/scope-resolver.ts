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
  return mirrorArtifactDir(projectSkillsDir, userPaths.skills);
}

/**
 * #1156 Phase 1 — Mirror the full per-provider artifact set (agents, commands,
 * skills, rules) from project scope to the user-scope target. Additive: the
 * project-scope deploy stays in place; user-scope copies are created alongside
 * so the framework is available across every project on the machine.
 *
 * `projectPaths` are the relative or absolute paths the caller already resolved
 * for project-scope deployment. Each one whose user-scope counterpart is
 * non-empty gets mirrored. Returns per-artifact-type counts and the resolved
 * user-scope target directories so the caller can surface them.
 */
export async function mirrorToUserScope(
  provider: string,
  projectPaths: { agents: string; skills: string; commands: string; rules: string; behaviors: string },
): Promise<{
  agents: { count: number; targetDir: string };
  skills: { count: number; targetDir: string };
  commands: { count: number; targetDir: string };
  rules: { count: number; targetDir: string };
  behaviors: { count: number; targetDir: string };
}> {
  const userPaths = USER_SCOPE_PATHS[provider];
  const empty = { count: 0, targetDir: '' };
  if (!userPaths) {
    return { agents: empty, skills: empty, commands: empty, rules: empty, behaviors: empty };
  }
  const [agents, skills, commands, rules, behaviors] = await Promise.all([
    userPaths.agents ? mirrorArtifactDir(projectPaths.agents, userPaths.agents) : Promise.resolve(empty),
    userPaths.skills ? mirrorArtifactDir(projectPaths.skills, userPaths.skills) : Promise.resolve(empty),
    userPaths.commands ? mirrorArtifactDir(projectPaths.commands, userPaths.commands) : Promise.resolve(empty),
    userPaths.rules ? mirrorArtifactDir(projectPaths.rules, userPaths.rules) : Promise.resolve(empty),
    userPaths.behaviors ? mirrorArtifactDir(projectPaths.behaviors, userPaths.behaviors) : Promise.resolve(empty),
  ]);
  return { agents, skills, commands, rules, behaviors };
}

/**
 * Copy every directory or file under `src` into `dst` (creating `dst` if
 * needed). Returns the count of top-level entries successfully copied.
 *
 * Used by the user-scope mirror to cover both directory-style artifacts
 * (skills, agents) and file-style artifacts (commands, rules in some
 * providers). Failures on individual entries are swallowed so a single bad
 * entry doesn't fail the whole mirror.
 */
async function mirrorArtifactDir(src: string, dst: string): Promise<{ count: number; targetDir: string }> {
  if (!src || !dst) return { count: 0, targetDir: dst };
  const fs = await import('node:fs/promises');

  let dirents;
  try {
    dirents = await fs.readdir(src, { withFileTypes: true });
  } catch {
    return { count: 0, targetDir: dst };
  }

  await fs.mkdir(dst, { recursive: true });
  let count = 0;
  for (const entry of dirents) {
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    try {
      if (entry.isDirectory()) {
        await fs.cp(s, d, { recursive: true, force: true });
      } else if (entry.isFile()) {
        await fs.copyFile(s, d);
      } else {
        continue;
      }
      count++;
    } catch {
      // ignore individual failures
    }
  }
  return { count, targetDir: dst };
}

/**
 * #1156 Phase 1 — OpenClaw is exclusively user-scope. `--scope project` against
 * OpenClaw is meaningless because all OpenClaw paths are already home-rooted;
 * silently accepting it would create the false impression that project-scope
 * deploys are tracked. This helper is called by the use/list/remove handlers
 * to fail fast with a clear message on `--scope project --provider openclaw`.
 *
 * `--scope user --provider openclaw` is a no-op: that's already what OpenClaw
 * does without the flag.
 */
export function rejectOpenClawProjectScope(provider: string, scope: Scope): void {
  if (provider === 'openclaw' && scope === 'project') {
    throw new Error(
      "OpenClaw is exclusively user-scope (~/.openclaw/). '--scope project' is not supported for this provider; omit the flag or pass '--scope user'.",
    );
  }
}
