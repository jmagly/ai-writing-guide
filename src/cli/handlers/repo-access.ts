import type { CommandHandler, HandlerContext, HandlerResult } from './types.js';
import {
  checkRepoAccess,
  findRepoEntry,
  formatRepoAccessEntry,
  loadRepoAccessManifest,
  type RepoAccessAction,
} from '../../policy/repo-access.js';
import { resolveWorkspace } from '../../config/workspace.js';

function valueAfter(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index < 0) return null;
  return args[index + 1] ?? null;
}

function printHelp(): void {
  console.log(`
  aiwg repo-access — repo authorization manifest preflight

  Usage:
    aiwg repo-access list
    aiwg repo-access status
    aiwg repo-access explain --path <repo-or-file>
    aiwg repo-access check --path <repo-or-file> --action <read|write|commit|push|issue-comment|service-action|destructive>

  Manifest:
    .aiwg/aiwg.config workspace + repos blocks (preferred)
    .aiwg/ops/security/repo-access.manifest.yaml
    .aiwg/security/repo-access.manifest.yaml (fallback)
`);
}

async function handleRepoAccess(ctx: HandlerContext): Promise<HandlerResult> {
  const [subcommand = 'help', ...args] = ctx.args;
  if (subcommand === 'help' || subcommand === '--help' || subcommand === '-h') {
    printHelp();
    return { exitCode: 0 };
  }

  try {
    const manifest = loadRepoAccessManifest(ctx.cwd);

    if (subcommand === 'list' || subcommand === 'status') {
      console.log(`Repo access manifest: ${manifest.path}`);
      console.log(`Source: ${manifest.source}`);
      if (manifest.workspaceName) console.log(`Workspace: ${manifest.workspaceName}`);
      console.log(`Default policy: ${manifest.defaultPolicy}`);
      if (manifest.source === 'workspace-config') {
        const workspace = await resolveWorkspace(
          manifest.workspaceProjectRoot,
          manifest.workspaceProjectRoot,
        );
        for (const member of workspace.members) {
          const route = `${member.primary.provider}@${member.primary.domain ?? 'unknown-domain'}`;
          const tracker = `${member.issueTracker.provider}@${member.issueTracker.domain ?? 'unknown-domain'}`;
          const drift = member.drift.length > 0 ? ` DRIFT: ${member.drift.join('; ')}` : ' OK';
          console.log(`- ${member.name}: ${member.path} [${member.allowed.join(', ')}]`);
          console.log(`  config: ${member.configPath}${member.config ? '' : ' (missing)'}`);
          console.log(`  delivery: ${member.delivery.mode} -> ${member.remotes.primary} (${route})`);
          console.log(`  tracker: ${member.remotes.issue_tracker} (${tracker})`);
          console.log(`  status:${drift}`);
        }
      } else {
        for (const repo of manifest.repos) {
          console.log(`- ${formatRepoAccessEntry(repo)}`);
        }
      }
      return { exitCode: 0 };
    }

    if (subcommand === 'explain') {
      const requestedPath = valueAfter(args, '--path');
      if (!requestedPath) return { exitCode: 2, message: 'repo-access explain requires --path <repo-or-file>' };
      const entry = findRepoEntry(manifest, requestedPath, ctx.cwd);
      if (!entry) {
        console.log(`Path: ${requestedPath}`);
        console.log('Matched repo: none');
        console.log('Decision: unlisted repo/path defaults to denied');
        return { exitCode: 0 };
      }
      console.log(`Path: ${requestedPath}`);
      console.log(`Matched repo: ${formatRepoAccessEntry(entry)}`);
      return { exitCode: 0 };
    }

    if (subcommand === 'check') {
      const requestedPath = valueAfter(args, '--path');
      const action = valueAfter(args, '--action') as RepoAccessAction | null;
      if (!requestedPath) return { exitCode: 2, message: 'repo-access check requires --path <repo-or-file>' };
      if (!action) return { exitCode: 2, message: 'repo-access check requires --action <action>' };
      const decision = checkRepoAccess(manifest, requestedPath, action, ctx.cwd);
      const status = decision.allowed ? 'ALLOW' : 'DENY';
      console.log(`${status} ${decision.action} ${decision.requestedPath}`);
      console.log(decision.reason);
      if (decision.matchedRepo) {
        console.log(`matched: ${formatRepoAccessEntry(decision.matchedRepo)}`);
      }
      return { exitCode: decision.allowed ? 0 : 1 };
    }

    return { exitCode: 2, message: `Unknown repo-access subcommand: ${subcommand}` };
  } catch (error) {
    return {
      exitCode: 2,
      message: error instanceof Error ? error.message : String(error),
      error: error instanceof Error ? error : undefined,
    };
  }
}

export const repoAccessHandler: CommandHandler = {
  id: 'repo-access',
  name: 'Repo Access',
  description: 'Validate and query repo access manifest permissions',
  category: 'utility',
  aliases: [],
  execute: handleRepoAccess,
};

export const repoAccessHandlers: CommandHandler[] = [repoAccessHandler];
