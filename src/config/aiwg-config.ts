/**
 * Project-Level AIWG Config
 *
 * Manages `.aiwg/aiwg.config` — the project-level record of:
 *   - Which AI provider toolchains this project targets
 *   - Which frameworks/addons are deployed (with uninstall metadata)
 *   - User-defined scripts callable via `aiwg run`
 *
 * @implements #621
 */

import { readFile, writeFile, mkdir, access, readdir, rename, unlink } from 'fs/promises';
import { createHash, randomBytes } from 'crypto';
import { resolve, join, isAbsolute } from 'path';
import { homedir } from 'os';
import type { ProjectLocalType } from '../extensions/manifest.js';

const CONFIG_FILENAME = 'aiwg.config';
const AIWG_DIR = '.aiwg';

/**
 * Artifact counts for one provider deployment
 */
export interface DeployedArtifactCounts {
  agents: number;
  commands: number;
  skills: number;
  rules: number;
}

/**
 * One entry in the `installed` map
 */
export interface InstalledEntry {
  /** Deployed version (CalVer or semver) */
  version: string;

  /**
   * Source of the deployment:
   *   "bundled"       — came from the npm package
   *   "cache"         — came from ~/.cache/aiwg/packages/ (#557)
   *   "project-local" — came from .aiwg/{extensions,addons,frameworks,plugins}/<id>/ (#1035)
   *   git URL         — direct source URL
   */
  source: 'bundled' | 'cache' | 'project-local' | string;

  /** ISO-8601 timestamp of last deployment */
  installedAt: string;

  /** Provider → artifact counts */
  deployedTo: Record<string, DeployedArtifactCounts>;

  /** SHA-256 of manifest.json at deploy time; used for stale detection */
  manifestHash?: string;

  /**
   * Project-local-only fields (set when `source === 'project-local'`).
   *
   * Per @.aiwg/architecture/adr-unified-registry-shape.md (ADR companion to
   * #1035). These three fields MUST be present together when source is
   * `'project-local'` and SHOULD be absent otherwise.
   */
  /** Path of the bundle directory relative to project root (e.g., ".aiwg/extensions/foo/"). */
  localPath?: string;
  /** Bundle type from the manifest. */
  localType?: ProjectLocalType;
  /** Schema version of the manifest.json this entry was written from (currently `'1'`). */
  manifestVersion?: string;

  /**
   * Hashes of source artifacts at deploy time, keyed by source-relative path
   * (e.g., "rules/my-rule.md", "skills/my-skill/SKILL.md"). Used by
   * `aiwg remove` to detect pristine vs. mutated vs. replaced deployed
   * files per the design at @.aiwg/architecture/design-aiwg-remove-revert.md.
   *
   * Optional — older entries without this field fall back to "always-prompt"
   * remove behavior until the next `aiwg use` re-records them.
   *
   * @implements #1037
   */
  artifactHashes?: Record<string, string>;
}

/**
 * One secondary remote: a mirror, fork base, or publishing target.
 */
export interface SecondaryRemote {
  /** Must match a name from `git remote` */
  name: string;
  /** Free-form tag (mirror | upstream | publish | replica | …) */
  purpose?: string;
  /** Hint to release workflows: push tags here on stable cuts */
  push_on_release?: boolean;
}

/**
 * Repo origin topology — declares which remote is primary (CI / issues / PRs)
 * and which are secondary (mirrors, publishing targets).
 *
 * @implements #994
 */
export interface RemotesConfig {
  /** git remote name driving CI / PRs by default. Defaults to "origin". */
  primary?: string;
  /** Where issues live. Defaults to `primary`. */
  issue_tracker?: string;
  /** Where CI runs. Defaults to `primary`. */
  ci?: string;
  /** Mirrors, fork bases, publishing targets. */
  secondary?: SecondaryRemote[];
}

/**
 * Resolved remote topology — every field guaranteed to be set.
 * Returned by {@link resolveRemotes}.
 */
export interface ResolvedRemotes {
  primary: string;
  issue_tracker: string;
  ci: string;
  secondary: SecondaryRemote[];
}

/**
 * Top-level shape of .aiwg/aiwg.config
 */
export interface AiwgConfig {
  $schema?: string;
  version: '1';

  /**
   * AI provider toolchains this project targets.
   * `aiwg use <framework>` with no --provider flag deploys to ALL of these.
   */
  providers: string[];

  /**
   * Frameworks and addons currently deployed.
   * Keyed by the name passed to `aiwg use`.
   */
  installed: Record<string, InstalledEntry>;

  /**
   * User-defined scripts, run via `aiwg run <name>`.
   * Executed with `sh -c "<command>"` (or `cmd /c` on Windows).
   */
  scripts: Record<string, string>;

  /**
   * Repo origin topology. Optional — when absent, agents treat `origin` as primary.
   * @implements #994
   */
  remotes?: RemotesConfig;

  /**
   * Repo control / delivery policy — how AIWG agents are expected to ship code.
   * Optional — when absent, agents fall back to the conservative defaults
   * applied by `resolveDelivery()`.
   * @implements #995
   */
  delivery?: DeliveryConfig;
}

/**
 * How agents should ship code — modes:
 *   - `direct`         : commit & push straight to default_branch
 *   - `feature-branch` : create a branch and push it, but don't open a PR
 *   - `pr-required`    : feature branch + PR via the resolved primary remote
 */
export type DeliveryMode = 'direct' | 'feature-branch' | 'pr-required';

/**
 * Merge style preference; matches the values Gitea/GitHub/GitLab APIs accept.
 */
export type MergeStyle = 'rebase-merge' | 'squash' | 'merge' | 'fast-forward-only';

/**
 * Force-push policy:
 *   - `never`           : agents may never force-push
 *   - `own-branch-only` : OK on the agent's own feature branch, never to main
 *   - `allowed`         : escape hatch for tooling that needs it
 */
export type ForcePushPolicy = 'never' | 'own-branch-only' | 'allowed';

/**
 * Branch-naming convention. `{issue}` and `{slug}` are interpolated by skills.
 */
export interface BranchNaming {
  prefix_by_type?: Partial<Record<'feat' | 'fix' | 'docs' | 'chore' | 'refactor' | 'test', string>>;
}

/**
 * Repo control policy — see DeliveryMode for the high-level shape. Every field
 * is optional; sensible defaults applied via {@link resolveDelivery}.
 *
 * @implements #995
 */
export interface DeliveryConfig {
  mode?: DeliveryMode;
  default_branch?: string;
  branch_naming?: BranchNaming;
  merge_style?: MergeStyle;
  delete_branch_on_merge?: boolean;
  /** When true, agents must wait for CI green before declaring done. */
  require_ci_green?: boolean;
  require_signed_commits?: boolean;
  force_push_policy?: ForcePushPolicy;
  /** Include "Closes #N" / "Fixes #N" in PR body when an issue is referenced. */
  auto_close_issues?: boolean;
  /** Post AL CYCLE status comments to issue threads from address-issues loops. */
  issue_comment_on_cycle?: boolean;
}

/**
 * Resolved delivery policy with all defaults applied. Returned by
 * {@link resolveDelivery}.
 */
export interface ResolvedDelivery {
  mode: DeliveryMode;
  default_branch: string;
  branch_naming: Required<BranchNaming>;
  merge_style: MergeStyle;
  delete_branch_on_merge: boolean;
  require_ci_green: boolean;
  require_signed_commits: boolean;
  force_push_policy: ForcePushPolicy;
  auto_close_issues: boolean;
  issue_comment_on_cycle: boolean;
}

const DEFAULT_BRANCH_NAMING: Required<BranchNaming> = {
  prefix_by_type: {
    feat: 'feat/{issue}-{slug}',
    fix: 'fix/{issue}-{slug}',
    docs: 'docs/{slug}',
    chore: 'chore/{slug}',
    refactor: 'refactor/{slug}',
    test: 'test/{slug}',
  },
};

/**
 * Resolve the delivery policy with defaults applied.
 *
 * Defaults are intentionally conservative — they match what AIWG agents
 * naturally do today (PR-required, rebase-merge, no force pushes, post issue
 * comments) so that adding the schema doesn't shift behavior for existing
 * projects.
 */
export function resolveDelivery(delivery: DeliveryConfig | undefined): ResolvedDelivery {
  return {
    mode: delivery?.mode ?? 'pr-required',
    default_branch: delivery?.default_branch ?? 'main',
    branch_naming: {
      prefix_by_type: {
        ...DEFAULT_BRANCH_NAMING.prefix_by_type,
        ...(delivery?.branch_naming?.prefix_by_type ?? {}),
      },
    },
    merge_style: delivery?.merge_style ?? 'rebase-merge',
    delete_branch_on_merge: delivery?.delete_branch_on_merge ?? true,
    require_ci_green: delivery?.require_ci_green ?? true,
    require_signed_commits: delivery?.require_signed_commits ?? false,
    force_push_policy: delivery?.force_push_policy ?? 'never',
    auto_close_issues: delivery?.auto_close_issues ?? true,
    issue_comment_on_cycle: delivery?.issue_comment_on_cycle ?? true,
  };
}

/**
 * Provider tag for a given remote URL. Used by skills (issue-create,
 * pr-review, commit-and-push) to pick the right CLI / MCP client when
 * the operator didn't pass `--provider` explicitly.
 *
 * Recognized hosts:
 *   - github.com         → 'github'
 *   - gitlab.com / gitlab.* → 'gitlab'
 *   - any host containing 'gitea' (or matching the typical Gitea path shape) → 'gitea'
 *
 * Returns 'unknown' for self-hosted instances we can't classify by host alone —
 * callers should then prompt the operator or fall back to the configured
 * AIWG provider list.
 *
 * @implements #997
 */
export function resolveRemoteProvider(remoteUrl: string): 'github' | 'gitlab' | 'gitea' | 'unknown' {
  if (!remoteUrl) return 'unknown';
  const lower = remoteUrl.toLowerCase();

  // github.com (or git@github.com:owner/repo.git form)
  if (/(^|[/@])github\.com[:/]/.test(lower)) return 'github';

  // gitlab.com or self-hosted gitlab
  if (/(^|[/@])gitlab\./.test(lower) || lower.includes('/gitlab/')) return 'gitlab';

  // gitea — identified by hostname token. Self-hosted Gitea instances often
  // don't include 'gitea' in their hostname (e.g. corporate git servers), so
  // 'unknown' is the honest answer there — callers should consult the
  // configured AIWG provider list rather than guess.
  if (lower.includes('gitea')) return 'gitea';

  return 'unknown';
}

/**
 * Resolve the repo remote topology with defaults applied.
 *
 * Defaults:
 *   - `primary` defaults to "origin"
 *   - `issue_tracker` defaults to `primary`
 *   - `ci` defaults to `primary`
 *   - `secondary` defaults to `[]`
 *
 * Pass an absent or partial `remotes` block — every field comes back populated.
 */
export function resolveRemotes(remotes: RemotesConfig | undefined): ResolvedRemotes {
  const primary = remotes?.primary ?? 'origin';
  return {
    primary,
    issue_tracker: remotes?.issue_tracker ?? primary,
    ci: remotes?.ci ?? primary,
    secondary: remotes?.secondary ?? [],
  };
}

/**
 * Valid provider names (mirrors PROVIDER_PATHS in use.ts)
 */
export const VALID_PROVIDERS = [
  'claude', 'factory', 'codex', 'opencode', 'copilot',
  'cursor', 'warp', 'windsurf', 'hermes', 'openclaw',
] as const;
export type Provider = typeof VALID_PROVIDERS[number];

/**
 * Empty config template.
 *
 * Includes an explicit `delivery` block defaulting to `pr-required`. The
 * runtime default in {@link resolveDelivery} is the same, so this is purely
 * for visibility — new projects ship with the policy written down so users
 * can see what their agents will do, and switch via `aiwg config set` or
 * the AIWG Steward agent without first having to discover the field exists.
 */
export function emptyConfig(providers: string[] = ['claude']): AiwgConfig {
  return {
    $schema: 'https://aiwg.io/schemas/aiwg.config.v1.json',
    version: '1',
    providers,
    installed: {},
    scripts: {},
    delivery: {
      mode: 'pr-required',
      default_branch: 'main',
      require_ci_green: true,
      auto_close_issues: true,
      issue_comment_on_cycle: true,
      force_push_policy: 'never',
    },
  };
}

/**
 * Resolve path to .aiwg/aiwg.config for a project directory
 */
export function getConfigPath(projectDir: string): string {
  return resolve(projectDir, AIWG_DIR, CONFIG_FILENAME);
}

/**
 * Resolve the project directory for a handler invocation.
 *
 * Precedence:
 *   1. `--target <path>` or `--prefix <path>` flag in args
 *   2. The HandlerContext `cwd`, if provided
 *   3. `process.cwd()`
 *
 * All three variants existed scattered across handlers (#919 cleanup).
 * Use this helper so we have one authoritative resolution.
 */
export function getProjectDir(
  ctx: { cwd?: string } | undefined,
  args: readonly string[] = [],
): string {
  const targetIdx = args.findIndex(a => a === '--target' || a === '--prefix');
  const targetValue = targetIdx >= 0 ? args[targetIdx + 1] : undefined;
  return targetValue || ctx?.cwd || process.cwd();
}

/**
 * Read .aiwg/aiwg.config.
 * Returns null if the file does not exist.
 */
export async function readAiwgConfig(projectDir: string): Promise<AiwgConfig | null> {
  const filePath = getConfigPath(projectDir);
  try {
    await access(filePath);
  } catch {
    return null;
  }

  const content = await readFile(filePath, 'utf-8');
  const parsed = JSON.parse(content) as AiwgConfig;

  // Ensure required fields exist (forward-compat)
  if (!parsed.providers) parsed.providers = ['claude'];
  if (!parsed.installed) parsed.installed = {};
  if (!parsed.scripts) parsed.scripts = {};

  return parsed;
}

/**
 * Write .aiwg/aiwg.config, creating .aiwg/ if needed.
 */
export async function writeAiwgConfig(projectDir: string, config: AiwgConfig): Promise<void> {
  const dir = resolve(projectDir, AIWG_DIR);
  await mkdir(dir, { recursive: true });
  const filePath = join(dir, CONFIG_FILENAME);
  // Atomic write: emit to a temp sibling, fsync-ish via rename. Prevents a
  // crash or kill mid-write from corrupting the config file. Rename is
  // atomic on POSIX and on NTFS when both paths are on the same volume.
  // The random suffix avoids collisions if two concurrent writers run.
  const tmpPath = `${filePath}.${randomBytes(6).toString('hex')}.tmp`;
  try {
    await writeFile(tmpPath, JSON.stringify(config, null, 2) + '\n', 'utf-8');
    await rename(tmpPath, filePath);
  } catch (err) {
    // Best-effort cleanup of the temp file on failure, ignoring ENOENT.
    try {
      await unlink(tmpPath);
    } catch {
      /* ignore */
    }
    throw err;
  }
}

/**
 * Update the `installed` record for a framework after a successful deployment.
 * Returns the updated config (does not write to disk — caller must call writeAiwgConfig).
 */
export function updateInstalled(
  config: AiwgConfig,
  name: string,
  provider: string,
  counts: DeployedArtifactCounts,
  opts: {
    version: string;
    source: string;
    manifestHash?: string;
    /** Set when source === 'project-local'. Relative to project root. */
    localPath?: string;
    /** Set when source === 'project-local'. */
    localType?: ProjectLocalType;
    /** Set when source === 'project-local'. */
    manifestVersion?: string;
    /** Optional source-artifact hash map for project-local remove revert (#1037). */
    artifactHashes?: Record<string, string>;
  }
): AiwgConfig {
  // Project-local invariant: `source: 'project-local'` requires localPath + localType
  // (per ADR adr-unified-registry-shape §6 risk mitigation).
  if (opts.source === 'project-local') {
    if (!opts.localPath || !opts.localType) {
      throw new Error(
        `updateInstalled: source 'project-local' requires localPath and localType (got ${JSON.stringify({ localPath: opts.localPath, localType: opts.localType })})`
      );
    }
  }

  const existing = config.installed[name] ?? {
    version: opts.version,
    source: opts.source,
    installedAt: new Date().toISOString(),
    deployedTo: {},
    manifestHash: opts.manifestHash,
  };

  existing.version = opts.version;
  existing.source = opts.source;
  existing.installedAt = new Date().toISOString();
  existing.deployedTo[provider] = counts;
  if (opts.manifestHash) existing.manifestHash = opts.manifestHash;

  if (opts.source === 'project-local') {
    existing.localPath = opts.localPath;
    existing.localType = opts.localType;
    if (opts.manifestVersion) existing.manifestVersion = opts.manifestVersion;
    if (opts.artifactHashes) existing.artifactHashes = opts.artifactHashes;
  } else {
    // Clear stale project-local fields if a previously project-local entry is
    // being overwritten by a non-project-local source.
    delete existing.localPath;
    delete existing.localType;
    delete existing.manifestVersion;
    delete existing.artifactHashes;
  }

  config.installed[name] = existing;
  return config;
}

/**
 * Aggregate deployment counts across all installed frameworks for a given provider.
 * Returns the totals for agents, commands, skills, and rules.
 * If no provider is specified, uses the first configured provider.
 */
export function getDeploymentSummary(
  config: AiwgConfig,
  provider?: string
): DeployedArtifactCounts {
  const targetProvider = provider ?? config.providers[0] ?? 'claude';
  const totals: DeployedArtifactCounts = { agents: 0, commands: 0, skills: 0, rules: 0 };

  for (const entry of Object.values(config.installed)) {
    const counts = entry.deployedTo[targetProvider];
    if (!counts) continue;
    totals.agents += counts.agents;
    totals.commands += counts.commands;
    totals.skills += counts.skills;
    totals.rules += counts.rules;
  }

  return totals;
}

/**
 * Compute SHA-256 hash of a manifest.json file.
 * Returns undefined if the file cannot be read.
 */
export async function hashManifest(manifestPath: string): Promise<string | undefined> {
  try {
    const content = await readFile(manifestPath, 'utf-8');
    return 'sha256:' + createHash('sha256').update(content).digest('hex');
  } catch {
    return undefined;
  }
}

/**
 * Provider → relative deployment directories (project-relative unless absolute).
 * Mirrors PROVIDER_PATHS in use.ts; kept here to avoid circular imports.
 */
const PROVIDER_DEPLOY_DIRS: Record<string, { agents: string; skills: string; commands: string; rules: string }> = {
  claude:   { agents: '.claude/agents',       skills: '.claude/.aiwg/skills', commands: '.claude/commands',    rules: '.claude/rules'          },
  copilot:  { agents: '.github/agents',       skills: '.github/.aiwg/skills', commands: '.github/commands',   rules: '.github/copilot-rules'   },
  cursor:   { agents: '.cursor/agents',       skills: '.cursor/.aiwg/skills', commands: '.cursor/commands',    rules: '.cursor/rules'           },
  opencode: { agents: '.opencode/agent',      skills: '.opencode/.aiwg/skill', commands: '.opencode/command',  rules: '.opencode/rule'           },
  warp:     { agents: '.warp/agents',         skills: '.warp/.aiwg/skills',   commands: '.warp/commands',      rules: '.warp/rules'             },
  windsurf: { agents: '.windsurf/agents',     skills: '.windsurf/.aiwg/skills', commands: '.windsurf/workflows', rules: '.windsurf/rules'       },
  factory:  { agents: '.factory/droids',      skills: '.factory/.aiwg/skills', commands: '.factory/commands',   rules: '.factory/rules'          },
  codex:    { agents: '.codex/agents',        skills: '.codex/.aiwg/skills',  commands: '.codex/commands',     rules: '.codex/rules'            },
  hermes:   { agents: '',                     skills: join(homedir(), '.hermes', '.aiwg', 'skills'), commands: '',  rules: ''                    },
  openclaw: { agents: join(homedir(), '.openclaw', 'agents'), skills: join(homedir(), '.openclaw', '.aiwg', 'skills'), commands: join(homedir(), '.openclaw', 'commands'), rules: join(homedir(), '.openclaw', 'rules') },
};

/**
 * Count .md files or subdirectories in a deployment directory.
 * Returns 0 if the directory does not exist.
 */
async function countDeployedInDir(
  projectDir: string,
  relOrAbsDir: string,
  mode: 'md' | 'dirs'
): Promise<number> {
  if (!relOrAbsDir) return 0;
  const dir = isAbsolute(relOrAbsDir) ? relOrAbsDir : resolve(projectDir, relOrAbsDir);
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    if (mode === 'md') return entries.filter(e => e.isFile() && e.name.endsWith('.md')).length;
    return entries.filter(e => e.isDirectory()).length;
  } catch {
    return 0;
  }
}

/**
 * Scan actual deployment directories and populate `deployedTo` for any
 * `installed` entries that have an empty `deployedTo` map.
 *
 * Called by `aiwg init` when migrating a project that already has frameworks
 * deployed but whose config was created before deployment-tracking was added.
 *
 * @implements #721
 */
export async function populateDeployedTo(
  config: AiwgConfig,
  projectDir: string
): Promise<AiwgConfig> {
  const entriesNeedingPopulation = Object.entries(config.installed).filter(
    ([, entry]) => Object.keys(entry.deployedTo).length === 0
  );
  if (entriesNeedingPopulation.length === 0) return config;

  for (const provider of config.providers) {
    const dirs = PROVIDER_DEPLOY_DIRS[provider];
    if (!dirs) continue;

    const counts: DeployedArtifactCounts = {
      agents:   await countDeployedInDir(projectDir, dirs.agents,   'md'),
      commands: await countDeployedInDir(projectDir, dirs.commands, 'md'),
      skills:   await countDeployedInDir(projectDir, dirs.skills,   'dirs'),
      rules:    await countDeployedInDir(projectDir, dirs.rules,    'md'),
    };

    // Only populate if at least one artifact type is present
    if (counts.agents + counts.commands + counts.skills + counts.rules === 0) continue;

    for (const [name, entry] of entriesNeedingPopulation) {
      if (Object.keys(entry.deployedTo).length === 0) {
        entry.deployedTo[provider] = counts;
        config.installed[name] = entry;
      }
    }
  }

  return config;
}

