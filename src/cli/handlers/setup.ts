import { spawnSync } from 'child_process';
import { existsSync } from 'fs';
import type { Interface as ReadlineInterface } from 'readline';
import type {
  AiwgConfig,
  DeliveryConfig,
  IssueProviderConfig,
  RemotesConfig,
  SecondaryRemote,
} from '../../config/aiwg-config.js';
import {
  emptyConfig,
  getConfigPath,
  getProjectDir,
  readAiwgConfig,
  resolveRemoteProvider,
  VALID_PROVIDERS,
  writeAiwgConfig,
} from '../../config/aiwg-config.js';
import { AiwgError, EXIT_CODES } from '../errors.js';
import { askChoice, askString, askYesNo, createPromptInterface } from '../prompt-utils.js';
import * as ui from '../ui.js';
import type { CommandHandler, HandlerContext, HandlerResult } from './types.js';
import { projectAiwgPath } from '../../config/project-artifacts.js';

type IssueProvider = IssueProviderConfig;
type DeliveryMode = 'direct' | 'feature-branch' | 'pr-required';
type ForcePushPolicy = 'never' | 'own-branch-only' | 'allowed';
type LegacyForcePushPolicy = 'main-only-blocked';
type SigningFormat = 'openpgp' | 'ssh' | 'x509';
type TrackerVia = 'tea' | 'gh' | 'mcp' | 'api';

export interface GitRemoteInfo {
  name: string;
  fetchUrl?: string;
  pushUrl?: string;
  provider: 'github' | 'gitlab' | 'gitea' | 'unknown';
}

export interface SetupProjectOptions {
  projectDir: string;
  nonInteractive?: boolean;
  dryRun?: boolean;
  json?: boolean;
  yes?: boolean;
  primary?: string;
  issueTracker?: string;
  ci?: string;
  issueProvider?: IssueProvider;
  deliveryMode?: DeliveryMode;
  defaultBranch?: string;
  requireCiGreen?: boolean;
  autoCloseIssues?: boolean;
  issueCommentOnCycle?: boolean;
  forcePushPolicy?: ForcePushPolicy;
  requireSignedCommits?: boolean;
  committerName?: string;
  committerEmail?: string;
  signingFormat?: SigningFormat;
  signingKey?: string;
  signingEnforce?: 'commits' | 'tags' | 'all';
  trackerActorLogin?: string;
  trackerActorVia?: TrackerVia;
  providers?: string[];
  confirm?: boolean;
}

export interface SetupProjectPlan {
  projectDir: string;
  configPath: string;
  existing: AiwgConfig | null;
  next: AiwgConfig;
  remotes: GitRemoteInfo[];
  issueProvider: IssueProvider;
  warnings: string[];
  diff: string;
}

const DELIVERY_MODES: DeliveryMode[] = ['pr-required', 'feature-branch', 'direct'];
const FORCE_PUSH_POLICIES: ForcePushPolicy[] = ['never', 'own-branch-only', 'allowed'];
const ISSUE_PROVIDERS: IssueProvider[] = ['gitea', 'github', 'local'];
const SIGNING_FORMATS: SigningFormat[] = ['openpgp', 'ssh', 'x509'];
const TRACKER_VIA: TrackerVia[] = ['tea', 'gh', 'mcp', 'api'];

function flagValue(args: readonly string[], ...names: string[]): string | undefined {
  for (let i = 0; i < args.length; i += 1) {
    if (names.includes(args[i] ?? '')) {
      const value = args[i + 1];
      if (!value || value.startsWith('--')) return undefined;
      return value;
    }
  }
  return undefined;
}

function boolFlag(args: readonly string[], name: string): boolean {
  return args.includes(name);
}

function parseBooleanFlag(args: readonly string[], name: string): boolean | undefined {
  const value = flagValue(args, name);
  if (value === undefined) return undefined;
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new AiwgError({
    code: 'ERR_INVALID_VALUE',
    message: `${name} must be true or false`,
    exitCode: EXIT_CODES.USAGE,
  });
}

function parseEnum<T extends string>(value: string | undefined, allowed: readonly T[], field: string): T | undefined {
  if (value === undefined) return undefined;
  if ((allowed as readonly string[]).includes(value)) return value as T;
  throw new AiwgError({
    code: 'ERR_INVALID_VALUE',
    message: `${field} must be one of: ${allowed.join(', ')}`,
    exitCode: EXIT_CODES.USAGE,
  });
}

function parseStringList(raw: string | undefined): string[] | undefined {
  if (raw === undefined) return undefined;
  return raw.split(',').map(s => s.trim()).filter(Boolean);
}

function parseProviders(raw: string, fallback: string[]): string[] {
  const providers = parseStringList(raw);
  return providers && providers.length > 0 ? providers : fallback;
}

export function parseSetupProjectOptions(ctx: HandlerContext): SetupProjectOptions {
  const args = ctx.args;
  return {
    projectDir: getProjectDir(ctx, args),
    dryRun: ctx.dryRun || boolFlag(args, '--dry-run'),
    json: boolFlag(args, '--json'),
    yes: boolFlag(args, '--yes'),
    nonInteractive: boolFlag(args, '--non-interactive') || boolFlag(args, '--yes'),
    primary: flagValue(args, '--primary'),
    issueTracker: flagValue(args, '--issue-tracker'),
    ci: flagValue(args, '--ci'),
    issueProvider: parseEnum(flagValue(args, '--issue-provider'), ISSUE_PROVIDERS, '--issue-provider'),
    deliveryMode: parseEnum(flagValue(args, '--delivery-mode'), DELIVERY_MODES, '--delivery-mode'),
    defaultBranch: flagValue(args, '--default-branch'),
    requireCiGreen: parseBooleanFlag(args, '--require-ci-green'),
    autoCloseIssues: parseBooleanFlag(args, '--auto-close-issues'),
    issueCommentOnCycle: parseBooleanFlag(args, '--issue-comment-on-cycle'),
    forcePushPolicy: parseEnum(flagValue(args, '--force-push-policy'), FORCE_PUSH_POLICIES, '--force-push-policy'),
    requireSignedCommits: parseBooleanFlag(args, '--require-signed-commits'),
    committerName: flagValue(args, '--committer-name'),
    committerEmail: flagValue(args, '--committer-email'),
    signingFormat: parseEnum(flagValue(args, '--signing-format'), SIGNING_FORMATS, '--signing-format'),
    signingKey: flagValue(args, '--signing-key'),
    signingEnforce: parseEnum(flagValue(args, '--signing-enforce'), ['commits', 'tags', 'all'] as const, '--signing-enforce'),
    trackerActorLogin: flagValue(args, '--tracker-actor-login'),
    trackerActorVia: parseEnum(flagValue(args, '--tracker-actor-via'), TRACKER_VIA, '--tracker-actor-via'),
    providers: parseStringList(flagValue(args, '--providers')),
  };
}

export function detectGitRemotes(projectDir: string): GitRemoteInfo[] {
  const result = spawnSync('git', ['-C', projectDir, 'remote', '-v'], {
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  if (result.status !== 0) return [];

  const byName = new Map<string, GitRemoteInfo>();
  for (const line of result.stdout.split(/\r?\n/)) {
    const match = /^(\S+)\s+(\S+)\s+\((fetch|push)\)$/.exec(line.trim());
    if (!match) continue;
    const [, name, url, kind] = match;
    const current = byName.get(name) ?? { name, provider: 'unknown' as const };
    if (kind === 'fetch') current.fetchUrl = url;
    if (kind === 'push') current.pushUrl = url;
    current.provider = resolveRemoteProvider(current.fetchUrl ?? current.pushUrl ?? '');
    byName.set(name, current);
  }
  return [...byName.values()];
}

function detectDefaultBranch(projectDir: string): string {
  const symbolic = spawnSync('git', ['-C', projectDir, 'symbolic-ref', '--quiet', '--short', 'refs/remotes/origin/HEAD'], {
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  const fromOrigin = symbolic.stdout.trim().replace(/^origin\//, '');
  if (symbolic.status === 0 && fromOrigin) return fromOrigin;

  const branch = spawnSync('git', ['-C', projectDir, 'branch', '--show-current'], {
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  return branch.stdout.trim() || 'main';
}

function gitConfig(projectDir: string, key: string): string | undefined {
  const result = spawnSync('git', ['-C', projectDir, 'config', '--get', key], {
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  const value = result.stdout.trim();
  return result.status === 0 && value ? value : undefined;
}

function choosePrimary(remotes: GitRemoteInfo[]): string {
  return remotes.find(r => r.name === 'origin')?.name ?? remotes[0]?.name ?? 'origin';
}

function chooseIssueProvider(remote: GitRemoteInfo | undefined, hasLocalIssues: boolean): IssueProvider {
  if (hasLocalIssues) return 'local';
  if (remote?.provider === 'github') return 'github';
  if (remote?.provider === 'gitea') return 'gitea';
  return 'gitea';
}

function secondaryRemotes(remotes: GitRemoteInfo[], primary: string, issueTracker: string, ci: string): SecondaryRemote[] {
  return remotes
    .filter(r => r.name !== primary && r.name !== issueTracker && r.name !== ci)
    .map((r) => ({
      name: r.name,
      purpose: r.provider === 'github' ? 'public-mirror' : 'mirror',
      push_on_release: false,
    }));
}

function normalizeForcePushPolicy(
  value: DeliveryConfig['force_push_policy'] | LegacyForcePushPolicy | undefined,
  warnings: string[],
): ForcePushPolicy | undefined {
  if (value === 'main-only-blocked') {
    warnings.push(
      'delivery.force_push_policy=main-only-blocked is a legacy alias; setup normalized it to own-branch-only.',
    );
    return 'own-branch-only';
  }
  return value;
}

function cloneConfig(config: AiwgConfig): AiwgConfig {
  return JSON.parse(JSON.stringify(config)) as AiwgConfig;
}

function previewBlocks(config: AiwgConfig): Record<string, unknown> {
  return {
    providers: config.providers,
    remotes: config.remotes ?? null,
    delivery: config.delivery ?? null,
  };
}

function formatPreviewDiff(before: AiwgConfig | null, after: AiwgConfig): string {
  const beforeText = JSON.stringify(before ? previewBlocks(before) : null, null, 2);
  const afterText = JSON.stringify(previewBlocks(after), null, 2);
  return [
    '--- current project policy',
    beforeText,
    '+++ proposed project policy',
    afterText,
  ].join('\n');
}

function validateSetupConfig(config: AiwgConfig, remotes: GitRemoteInfo[], issueProvider: IssueProvider): string[] {
  const errors: string[] = [];
  const remoteNames = new Set(remotes.map(r => r.name));
  const checkRemote = (field: string, value: string | undefined) => {
    if (!value) errors.push(`${field} is required`);
    if (value && value !== 'local' && remoteNames.size > 0 && !remoteNames.has(value)) {
      errors.push(`${field} references '${value}', which is not a detected git remote`);
    }
  };

  checkRemote('remotes.primary', config.remotes?.primary);
  if (issueProvider === 'local') {
    if (config.remotes?.issue_tracker !== 'local') errors.push('local issue store requires remotes.issue_tracker = "local"');
  } else {
    checkRemote('remotes.issue_tracker', config.remotes?.issue_tracker);
  }
  if (config.remotes?.issue_provider && !ISSUE_PROVIDERS.includes(config.remotes.issue_provider as IssueProvider)) {
    errors.push('remotes.issue_provider is invalid');
  }
  checkRemote('remotes.ci', config.remotes?.ci);

  if (!DELIVERY_MODES.includes(config.delivery?.mode as DeliveryMode)) errors.push('delivery.mode is invalid');
  if (!config.delivery?.default_branch) errors.push('delivery.default_branch is required');
  if (!FORCE_PUSH_POLICIES.includes(config.delivery?.force_push_policy as ForcePushPolicy)) errors.push('delivery.force_push_policy is invalid');
  if (config.delivery?.require_signed_commits && !config.delivery.signing?.key && !config.delivery.signing?.key_file) {
    errors.push('delivery.require_signed_commits=true requires delivery.signing.key or delivery.signing.key_file');
  }
  if (config.delivery?.signing?.format && !SIGNING_FORMATS.includes(config.delivery.signing.format as SigningFormat)) {
    errors.push('delivery.signing.format is invalid');
  }
  if (config.remotes?.tracker_actor?.via && !TRACKER_VIA.includes(config.remotes.tracker_actor.via as TrackerVia)) {
    errors.push('remotes.tracker_actor.via is invalid');
  }
  if (!config.providers.every(p => (VALID_PROVIDERS as readonly string[]).includes(p))) {
    errors.push('providers contains an unknown AIWG provider');
  }

  return errors;
}

export async function buildSetupProjectPlan(options: SetupProjectOptions): Promise<SetupProjectPlan> {
  const existing = await readAiwgConfig(options.projectDir);
  const base = cloneConfig(existing ?? emptyConfig(options.providers ?? ['claude']));
  if (options.providers) base.providers = options.providers;

  const remotes = detectGitRemotes(options.projectDir);
  const primary = options.primary ?? base.remotes?.primary ?? choosePrimary(remotes);
  const primaryRemote = remotes.find(r => r.name === primary);
  const hasLocalIssues = existsSync(projectAiwgPath(options.projectDir, 'issues', 'config.json'));
  const issueProvider = options.issueProvider ?? chooseIssueProvider(primaryRemote, hasLocalIssues);
  const warnings: string[] = [];
  const issueTracker = issueProvider === 'local'
    ? 'local'
    : options.issueTracker ?? base.remotes?.issue_tracker ?? primary;
  const ci = options.ci ?? base.remotes?.ci ?? primary;

  const remotesConfig: RemotesConfig = {
    primary,
    issue_tracker: issueTracker,
    issue_provider: issueProvider,
    ci,
    secondary: base.remotes?.secondary ?? secondaryRemotes(remotes, primary, issueTracker, ci),
  };
  const trackerLogin = options.trackerActorLogin ?? base.remotes?.tracker_actor?.login;
  const trackerVia = options.trackerActorVia ?? base.remotes?.tracker_actor?.via ?? (issueProvider === 'github' ? 'gh' : issueProvider === 'gitea' ? 'tea' : undefined);
  if (trackerLogin || trackerVia || base.remotes?.tracker_actor?.forbid_actors) {
    remotesConfig.tracker_actor = {
      ...(base.remotes?.tracker_actor ?? {}),
      ...(trackerLogin ? { login: trackerLogin } : {}),
      ...(trackerVia ? { via: trackerVia } : {}),
    };
  }

  const existingDelivery = base.delivery ?? {};
  const delivery: DeliveryConfig = {
    ...existingDelivery,
    mode: options.deliveryMode ?? existingDelivery.mode ?? 'pr-required',
    default_branch: options.defaultBranch ?? existing?.delivery?.default_branch ?? detectDefaultBranch(options.projectDir),
    require_ci_green: options.requireCiGreen ?? existingDelivery.require_ci_green ?? true,
    auto_close_issues: options.autoCloseIssues ?? existingDelivery.auto_close_issues ?? true,
    issue_comment_on_cycle: options.issueCommentOnCycle ?? existingDelivery.issue_comment_on_cycle ?? true,
    require_signed_commits: options.requireSignedCommits ?? existingDelivery.require_signed_commits ?? false,
  };
  delivery.force_push_policy = (
    options.forcePushPolicy
    ?? normalizeForcePushPolicy(existingDelivery.force_push_policy as DeliveryConfig['force_push_policy'] | LegacyForcePushPolicy | undefined, warnings)
    ?? 'never'
  );

  const committerName = options.committerName ?? existingDelivery.committer?.name ?? gitConfig(options.projectDir, 'user.name');
  const committerEmail = options.committerEmail ?? existingDelivery.committer?.email ?? gitConfig(options.projectDir, 'user.email');
  if (committerName || committerEmail) {
    delivery.committer = {
      ...(committerName ? { name: committerName } : {}),
      ...(committerEmail ? { email: committerEmail } : {}),
    };
  }

  const signingFormat = options.signingFormat ?? existingDelivery.signing?.format;
  const signingKey = options.signingKey ?? existingDelivery.signing?.key ?? gitConfig(options.projectDir, 'user.signingkey');
  const signingEnforce = options.signingEnforce ?? existingDelivery.signing?.enforce;
  if (signingFormat || signingKey || signingEnforce || existingDelivery.signing?.key_file || existingDelivery.signing?.program) {
    delivery.signing = {
      ...(existingDelivery.signing ?? {}),
      ...(signingFormat ? { format: signingFormat } : {}),
      ...(signingKey ? { key: signingKey } : {}),
      ...(signingEnforce ? { enforce: signingEnforce } : {}),
    };
  }

  base.remotes = remotesConfig;
  base.delivery = delivery;

  if (primaryRemote?.provider === 'unknown' && issueProvider !== 'local') {
    warnings.push(`Remote '${primary}' is self-hosted or unknown; provider '${issueProvider}' was selected explicitly/defaulted.`);
  }
  if (delivery.mode === 'direct') {
    warnings.push('Direct delivery writes to the default branch; keep force_push_policy=never unless a maintainer explicitly approves otherwise.');
  }
  if (issueProvider === 'local' && !hasLocalIssues) {
    warnings.push('Local issue store selected; run `aiwg issue init --prefix <KEY>` if .aiwg/issues is not initialized yet.');
  }

  const errors = validateSetupConfig(base, remotes, issueProvider);
  if (errors.length > 0) {
    throw new AiwgError({
      code: 'ERR_INVALID_PROJECT_SETUP',
      message: `Project setup choices are inconsistent:\n  - ${errors.join('\n  - ')}`,
      exitCode: EXIT_CODES.CONFIG,
    });
  }

  return {
    projectDir: options.projectDir,
    configPath: getConfigPath(options.projectDir),
    existing,
    next: base,
    remotes,
    issueProvider,
    warnings,
    diff: formatPreviewDiff(existing, base),
  };
}

async function applyInteractivePrompts(
  plan: SetupProjectPlan,
  rl: ReadlineInterface,
  signal?: AbortSignal,
): Promise<SetupProjectOptions> {
  const remoteNames = plan.remotes.map(r => r.name);
  const current = plan.next;
  console.log('');
  console.log('Detected git remotes:');
  for (const remote of plan.remotes) {
    const url = remote.fetchUrl ?? remote.pushUrl ?? '(no url)';
    console.log(`  - ${remote.name}: ${url} [${remote.provider}]`);
  }
  if (plan.remotes.length === 0) console.log('  (none)');

  const primary = remoteNames.length > 0
    ? await askChoice(rl, `Primary remote [${current.remotes?.primary}]: `, remoteNames, current.remotes?.primary, signal)
    : await askString(rl, `Primary remote [${current.remotes?.primary}]: `, current.remotes?.primary ?? 'origin', signal);
  const issueProvider = await askChoice(rl, `Issue provider (${ISSUE_PROVIDERS.join('/')}): `, ISSUE_PROVIDERS, plan.issueProvider, signal);
  const issueTracker = issueProvider === 'local'
    ? 'local'
    : remoteNames.length > 0
      ? await askChoice(rl, `Issue tracker remote [${current.remotes?.issue_tracker}]: `, remoteNames, current.remotes?.issue_tracker, signal)
      : await askString(rl, `Issue tracker remote [${current.remotes?.issue_tracker}]: `, current.remotes?.issue_tracker ?? primary, signal);
  const ci = remoteNames.length > 0
    ? await askChoice(rl, `CI remote [${current.remotes?.ci}]: `, remoteNames, current.remotes?.ci, signal)
    : await askString(rl, `CI remote [${current.remotes?.ci}]: `, current.remotes?.ci ?? primary, signal);
  const deliveryMode = await askChoice(rl, `Delivery mode (${DELIVERY_MODES.join('/')}): `, DELIVERY_MODES, current.delivery?.mode as DeliveryMode, signal);
  const defaultBranch = await askString(rl, `Default branch [${current.delivery?.default_branch}]: `, current.delivery?.default_branch ?? 'main', signal);
  const requireCiGreen = await askYesNo(rl, 'Require CI green before done? [Y/n]: ', current.delivery?.require_ci_green ?? true, signal);
  const autoCloseIssues = await askYesNo(rl, 'Auto-close linked issues from delivery? [Y/n]: ', current.delivery?.auto_close_issues ?? true, signal);
  const forcePushPolicy = await askChoice(rl, `Force-push policy (${FORCE_PUSH_POLICIES.join('/')}): `, FORCE_PUSH_POLICIES, current.delivery?.force_push_policy as ForcePushPolicy, signal);
  const requireSignedCommits = await askYesNo(rl, 'Require signed delivery commits? [y/N]: ', current.delivery?.require_signed_commits ?? false, signal);
  const providersRaw = await askString(rl, `Providers [${current.providers.join(',')}]: `, current.providers.join(','), signal);

  return {
    projectDir: plan.projectDir,
    providers: parseProviders(providersRaw, current.providers),
    primary,
    issueProvider,
    issueTracker,
    ci,
    deliveryMode,
    defaultBranch,
    requireCiGreen,
    autoCloseIssues,
    forcePushPolicy,
    requireSignedCommits,
  };
}

function printPlan(plan: SetupProjectPlan): void {
  console.log(`Project config: ${plan.configPath}`);
  console.log('');
  console.log(plan.diff);
  if (plan.warnings.length > 0) {
    console.log('');
    for (const warning of plan.warnings) ui.warn(warning);
  }
}

export const setupHandler: CommandHandler = {
  id: 'setup',
  name: 'Setup',
  description: 'CLI helper for agent-led repository policy and tracker setup',
  category: 'project',
  aliases: [],

  async execute(ctx: HandlerContext): Promise<HandlerResult> {
    const [subcommand] = ctx.args;
    if (subcommand && subcommand !== 'project' && !subcommand.startsWith('--')) {
      return {
        exitCode: 1,
        message: `Unknown setup subcommand: ${subcommand}\n\nUsage: aiwg setup project [--yes] [--dry-run] [--target <dir>]`,
      };
    }

    const args = subcommand === 'project' ? ctx.args.slice(1) : ctx.args;
    const options = parseSetupProjectOptions({ ...ctx, args });
    let plan = await buildSetupProjectPlan(options);

    const canPrompt = !options.nonInteractive && process.stdin.isTTY && process.stdout.isTTY;
    if (!options.yes && canPrompt) {
      const rl = createPromptInterface();
      try {
        const prompted = await applyInteractivePrompts(plan, rl, ctx.signal);
        plan = await buildSetupProjectPlan({ ...options, ...prompted });
      } finally {
        rl.close();
      }
    }

    const primaryRemote = plan.remotes.find(r => r.name === plan.next.remotes?.primary);
    if (
      !options.dryRun &&
      primaryRemote?.provider === 'unknown' &&
      plan.issueProvider !== 'local' &&
      !options.issueProvider &&
      !canPrompt
    ) {
      throw new AiwgError({
        code: 'ERR_PROVIDER_CONFIRMATION_REQUIRED',
        message: `Remote '${primaryRemote.name}' could not be classified as Gitea or GitHub.`,
        hint: 'Re-run with --issue-provider gitea, --issue-provider github, or --issue-provider local.',
        exitCode: EXIT_CODES.CONFIG,
      });
    }

    if (options.json) {
      console.log(JSON.stringify({
        project_dir: plan.projectDir,
        config_path: plan.configPath,
        dry_run: options.dryRun,
        issue_provider: plan.issueProvider,
        warnings: plan.warnings,
        config: previewBlocks(plan.next),
      }, null, 2));
    } else {
      printPlan(plan);
    }

    if (options.dryRun) return { exitCode: 0 };

    if (!options.yes && !canPrompt) {
      throw new AiwgError({
        code: 'ERR_NON_INTERACTIVE_CONFIRMATION_REQUIRED',
        message: 'Refusing to write project setup in a non-interactive context without --yes.',
        hint: 'Re-run with `aiwg setup project --yes` or use `--dry-run` to preview only.',
        exitCode: EXIT_CODES.USAGE,
      });
    }

    if (!options.yes && canPrompt) {
      const rl = createPromptInterface();
      try {
        const write = await askYesNo(rl, 'Write this .aiwg/aiwg.config update? [y/N]: ', false, ctx.signal);
        if (!write) return { exitCode: 0, message: 'Project setup cancelled.' };
      } finally {
        rl.close();
      }
    }

    await writeAiwgConfig(plan.projectDir, plan.next);
    ui.success(`Updated ${plan.configPath}`);
    return { exitCode: 0 };
  },
};
