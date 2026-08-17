/**
 * General workspace-of-repositories resolution.
 *
 * A workspace root declares members in its `.aiwg/aiwg.config`. Every member
 * keeps its own `.aiwg/aiwg.config`; that member config is authoritative for
 * delivery, remotes, tracker actor, and signing. Workspace capabilities are an
 * additional deny-by-default authorization layer.
 *
 * @implements #1764
 */

import { execFile } from 'child_process';
import { existsSync, statSync } from 'fs';
import { homedir } from 'os';
import { dirname, isAbsolute, relative, resolve } from 'path';
import { promisify } from 'util';
import {
  getConfigPath,
  readAiwgConfig,
  resolveDelivery,
  resolveRemoteProvider,
  resolveRemotes,
  type AiwgConfig,
  type ResolvedDelivery,
  type ResolvedRemotes,
  type WorkspaceRepoAction,
  type WorkspaceRepoConfig,
} from './aiwg-config.js';

const execFileAsync = promisify(execFile);

export type ForgeProvider = 'github' | 'gitlab' | 'gitea' | 'unknown';
type RemoteProviderHint = Exclude<ForgeProvider, 'unknown'>;

export interface ResolvedRemoteEndpoint {
  name: string;
  url?: string;
  provider: ForgeProvider;
  domain?: string;
  /** Whether a self-hosted provider hint was needed because the URL was ambiguous. */
  providerSource: 'remote' | 'manifest-hint' | 'unknown';
}

export interface ResolvedWorkspaceMember {
  name: string;
  path: string;
  allowed: WorkspaceRepoAction[];
  notes?: string;
  configPath: string;
  config: AiwgConfig | null;
  delivery: ResolvedDelivery;
  remotes: ResolvedRemotes;
  primary: ResolvedRemoteEndpoint;
  issueTracker: ResolvedRemoteEndpoint;
  ci: ResolvedRemoteEndpoint;
  drift: string[];
}

export interface ResolvedWorkspace {
  name: string;
  projectRoot: string;
  root: string;
  configPath: string;
  config: AiwgConfig;
  members: ResolvedWorkspaceMember[];
}

export interface WorkspaceOperationDecision {
  allowed: boolean;
  action: WorkspaceRepoAction;
  requestedPath: string;
  member: ResolvedWorkspaceMember | null;
  reason: string;
}

export interface TrackerActorDecision {
  allowed: boolean;
  actor?: string;
  reason: string;
}

function expandHome(value: string): string {
  if (value === '~') return homedir();
  if (value.startsWith('~/') || value.startsWith('~\\')) {
    return resolve(homedir(), value.slice(2));
  }
  return value;
}

function asDirectory(value: string): string {
  const absolute = resolve(value);
  try {
    return statSync(absolute).isDirectory() ? absolute : dirname(absolute);
  } catch {
    return absolute;
  }
}

function isSameOrInside(candidate: string, root: string): boolean {
  const rel = relative(root, candidate);
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
}

function resolveFrom(base: string, value: string): string {
  const expanded = expandHome(value);
  return isAbsolute(expanded) ? resolve(expanded) : resolve(base, expanded);
}

/**
 * Find the workspace root that governs `startPath`.
 *
 * Child members discover an ancestor workspace naturally. External members
 * can set `workspace.member_of`, or callers can set AIWG_WORKSPACE / pass an
 * explicit workspace root.
 */
export async function findWorkspaceProjectRoot(
  startPath = process.cwd(),
  explicitWorkspace?: string,
): Promise<string | null> {
  const override = explicitWorkspace ?? process.env.AIWG_WORKSPACE;
  if (override) {
    const projectRoot = asDirectory(expandHome(override));
    const config = await readAiwgConfig(projectRoot);
    if (!config?.repos) {
      throw new Error(`Workspace config at ${getConfigPath(projectRoot)} does not declare repos`);
    }
    return projectRoot;
  }

  let current = asDirectory(startPath);
  while (true) {
    if (existsSync(getConfigPath(current))) {
      const config = await readAiwgConfig(current);
      if (config?.repos) return current;
      if (config?.workspace?.member_of) {
        const projectRoot = resolveFrom(current, config.workspace.member_of);
        const workspaceConfig = await readAiwgConfig(projectRoot);
        if (!workspaceConfig?.repos) {
          throw new Error(
            `workspace.member_of resolves to ${projectRoot}, but its .aiwg/aiwg.config does not declare repos`,
          );
        }
        return projectRoot;
      }
    }
    const parent = dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

function remoteDomain(remoteUrl: string | undefined): string | undefined {
  if (!remoteUrl) return undefined;
  const scp = remoteUrl.match(/^[^@/\s]+@([^:/\s]+):/);
  if (scp?.[1]) return scp[1].toLowerCase();
  try {
    const parsed = new URL(remoteUrl);
    return parsed.hostname.toLowerCase() || undefined;
  } catch {
    return undefined;
  }
}

async function readRemoteUrl(repoPath: string, remote: string): Promise<string | undefined> {
  if (remote.includes('://') || /^[^@/\s]+@[^:/\s]+:/.test(remote)) return remote;
  try {
    const { stdout } = await execFileAsync(
      'git',
      ['-C', repoPath, 'remote', 'get-url', remote],
      { encoding: 'utf8' },
    );
    return stdout.trim() || undefined;
  } catch {
    return undefined;
  }
}

async function resolveEndpoint(
  repoPath: string,
  remote: string,
  providerHint?: RemoteProviderHint,
): Promise<ResolvedRemoteEndpoint> {
  const url = await readRemoteUrl(repoPath, remote);
  const detected = resolveRemoteProvider(url ?? '');
  const provider = detected === 'unknown' && providerHint ? providerHint : detected;
  return {
    name: remote,
    ...(url ? { url } : {}),
    provider,
    ...(remoteDomain(url) ? { domain: remoteDomain(url) } : {}),
    providerSource: detected !== 'unknown'
      ? 'remote'
      : providerHint
        ? 'manifest-hint'
        : 'unknown',
  };
}

function trackerProviderHint(
  remotes: ResolvedRemotes,
  fallback?: WorkspaceRepoConfig['provider'],
): RemoteProviderHint | undefined {
  const configured = remotes.issue_provider;
  if (configured === 'gitea' || configured === 'github') return configured;
  return fallback;
}

async function resolveMember(
  entry: WorkspaceRepoConfig,
  workspaceRoot: string,
): Promise<ResolvedWorkspaceMember> {
  const memberPath = resolveFrom(workspaceRoot, entry.path);
  const configPath = getConfigPath(memberPath);
  const config = await readAiwgConfig(memberPath);
  const remotes = resolveRemotes(config?.remotes);
  const issueProviderHint = trackerProviderHint(remotes, entry.provider);
  const [primary, issueTracker, ci] = await Promise.all([
    resolveEndpoint(memberPath, remotes.primary, entry.provider),
    resolveEndpoint(memberPath, remotes.issue_tracker, issueProviderHint),
    resolveEndpoint(memberPath, remotes.ci, entry.provider),
  ]);
  const drift: string[] = [];
  if (!existsSync(memberPath)) drift.push('member path is missing');
  if (!config) drift.push('member .aiwg/aiwg.config is missing');
  if (!primary.url) drift.push(`primary remote '${remotes.primary}' is unavailable`);
  if (!issueTracker.url) drift.push(`issue tracker remote '${remotes.issue_tracker}' is unavailable`);
  if (primary.provider === 'unknown') {
    drift.push(`primary remote provider is unknown for '${primary.domain ?? remotes.primary}'`);
  }
  if (issueTracker.provider === 'unknown') {
    drift.push(`issue tracker provider is unknown for '${issueTracker.domain ?? remotes.issue_tracker}'`);
  }
  if (entry.allowed.includes('issue-comment') && !remotes.tracker_actor?.login) {
    drift.push('issue-comment is allowed but remotes.tracker_actor.login is missing');
  }
  if (
    remotes.tracker_actor?.login
    && remotes.tracker_actor.forbid_actors?.includes(remotes.tracker_actor.login)
  ) {
    drift.push(`configured tracker actor '${remotes.tracker_actor.login}' is also forbidden`);
  }
  if (
    config?.delivery?.signing?.enforce
    && !config.delivery.signing.key
    && !config.delivery.signing.key_file
  ) {
    drift.push('delivery signing is enforced but no key or key_file is configured');
  }
  if (entry.provider && primary.providerSource === 'remote' && primary.provider !== entry.provider) {
    drift.push(`provider hint '${entry.provider}' disagrees with primary remote provider '${primary.provider}'`);
  }

  return {
    name: entry.name,
    path: memberPath,
    allowed: [...entry.allowed],
    ...(entry.notes ? { notes: entry.notes } : {}),
    configPath,
    config,
    delivery: resolveDelivery(config?.delivery),
    remotes,
    primary,
    issueTracker,
    ci,
    drift,
  };
}

/** Load and resolve every member from the canonical workspace manifest. */
export async function resolveWorkspace(
  startPath = process.cwd(),
  explicitWorkspace?: string,
): Promise<ResolvedWorkspace> {
  const projectRoot = await findWorkspaceProjectRoot(startPath, explicitWorkspace);
  if (!projectRoot) {
    throw new Error('No workspace .aiwg/aiwg.config with repos was found');
  }
  const config = await readAiwgConfig(projectRoot);
  if (!config?.repos || !config.workspace?.name) {
    throw new Error(`Invalid workspace config at ${getConfigPath(projectRoot)}`);
  }
  const workspaceRoot = config.workspace.root
    ? resolveFrom(projectRoot, config.workspace.root)
    : projectRoot;
  const members = await Promise.all(
    config.repos.map((entry) => resolveMember(entry, workspaceRoot)),
  );
  return {
    name: config.workspace.name,
    projectRoot,
    root: workspaceRoot,
    configPath: getConfigPath(projectRoot),
    config,
    members,
  };
}

/** Resolve the most-specific workspace member containing a target path. */
export async function resolveWorkspaceMember(
  startPath: string,
  targetPath = startPath,
  explicitWorkspace?: string,
): Promise<{ workspace: ResolvedWorkspace; member: ResolvedWorkspaceMember | null }> {
  const workspace = await resolveWorkspace(startPath, explicitWorkspace);
  const target = isAbsolute(targetPath)
    ? resolve(targetPath)
    : resolve(asDirectory(startPath), targetPath);
  const member = workspace.members
    .filter((candidate) => isSameOrInside(target, candidate.path))
    .sort((a, b) => b.path.length - a.path.length)[0] ?? null;
  return { workspace, member };
}

/**
 * Apply workspace authorization to an operation. An unlisted target or a
 * missing action is denied regardless of filesystem/tool writability.
 */
export async function authorizeWorkspaceOperation(
  startPath: string,
  targetPath: string,
  action: WorkspaceRepoAction,
  explicitWorkspace?: string,
): Promise<WorkspaceOperationDecision> {
  const requestedPath = isAbsolute(targetPath)
    ? resolve(targetPath)
    : resolve(asDirectory(startPath), targetPath);
  const { member } = await resolveWorkspaceMember(startPath, requestedPath, explicitWorkspace);
  if (!member) {
    return {
      allowed: false,
      action,
      requestedPath,
      member: null,
      reason: 'unlisted repo/path defaults to denied',
    };
  }
  if (!member.allowed.includes(action)) {
    return {
      allowed: false,
      action,
      requestedPath,
      member,
      reason: `repo '${member.name}' does not allow ${action}`,
    };
  }
  return {
    allowed: true,
    action,
    requestedPath,
    member,
    reason: `repo '${member.name}' allows ${action}`,
  };
}

/** Enforce the member config tracker_actor + forbid_actors contract. */
export function checkTrackerActor(
  member: ResolvedWorkspaceMember,
  actualActor?: string,
): TrackerActorDecision {
  const configured = member.remotes.tracker_actor;
  const actor = actualActor ?? configured?.login;
  if (!actor) {
    return {
      allowed: false,
      reason: `repo '${member.name}' does not resolve a tracker actor`,
    };
  }
  if (configured?.forbid_actors?.includes(actor)) {
    return {
      allowed: false,
      actor,
      reason: `tracker actor '${actor}' is forbidden by repo '${member.name}'`,
    };
  }
  if (actualActor && configured?.login && actualActor !== configured.login) {
    return {
      allowed: false,
      actor,
      reason: `tracker actor '${actualActor}' does not match configured actor '${configured.login}'`,
    };
  }
  return {
    allowed: true,
    actor,
    reason: `tracker actor '${actor}' is allowed for repo '${member.name}'`,
  };
}
