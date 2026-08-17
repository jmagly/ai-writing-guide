/**
 * Canonical tracker authority and access-path selection.
 *
 * Tracker-sensitive work must resolve authority from `.aiwg/aiwg.config`
 * before considering whichever CLI happens to be authenticated. This module is
 * deliberately pure so skills, context generation, and tests can all share the
 * same authority model.
 *
 * @implements #1734
 * @implements #1735
 */

import {
  resolveRemoteProvider,
  resolveRemotes,
  type AiwgConfig,
  type SecondaryRemote,
} from '../config/aiwg-config.js';

export type TrackerProvider = 'gitea' | 'github' | 'gitlab' | 'local' | 'unknown';
export type TrackerAccessKind = 'mcp-app' | 'http-api' | 'cli' | 'blocker';

export interface TrackerAuthority {
  configPath: string;
  primaryRemote: string;
  issueTrackerRemote: string;
  ciRemote: string;
  issueTrackerUrl?: string;
  issueStorage?: string;
  provider: TrackerProvider;
  secondaryRemotes: SecondaryRemote[];
}

export interface TrackerAccessProbe {
  kind: Exclude<TrackerAccessKind, 'blocker'>;
  available: boolean;
  authenticated?: boolean;
  provider?: TrackerProvider;
  remoteName?: string;
  cli?: string;
  label?: string;
  reason?: string;
}

export interface TrackerAccessDecision {
  kind: TrackerAccessKind;
  provider: TrackerProvider;
  label: string;
  blocker?: string;
}

function providerFromIssueStorage(issueStorage: string | undefined): TrackerProvider {
  const value = issueStorage?.toLowerCase() ?? '';
  if (!value) return 'unknown';
  if (value.includes('local')) return 'local';
  if (value.includes('gitea')) return 'gitea';
  if (value.includes('github')) return 'github';
  if (value.includes('gitlab')) return 'gitlab';
  return 'unknown';
}

function normalizeProvider(provider: string): TrackerProvider {
  return provider === 'gitea' || provider === 'github' || provider === 'gitlab' || provider === 'local'
    ? provider
    : 'unknown';
}

function providerMatches(probe: TrackerAccessProbe, authority: TrackerAuthority): boolean {
  if (authority.provider === 'unknown') {
    return probe.remoteName === authority.issueTrackerRemote || probe.provider === undefined;
  }
  return probe.provider === authority.provider || probe.remoteName === authority.issueTrackerRemote;
}

function probeIsUsable(probe: TrackerAccessProbe, authority: TrackerAuthority): boolean {
  return probe.available === true && probe.authenticated !== false && providerMatches(probe, authority);
}

function accessLabel(probe: TrackerAccessProbe): string {
  if (probe.label) return probe.label;
  if (probe.kind === 'cli' && probe.cli) return `${probe.cli} CLI`;
  if (probe.kind === 'http-api') return 'tracker HTTP API';
  return 'MCP/app tools';
}

export function resolveTrackerAuthority(
  config: AiwgConfig | null | undefined,
  remoteUrls: Record<string, string | undefined> = {},
  configPath = '.aiwg/aiwg.config',
): TrackerAuthority {
  const remotes = resolveRemotes(config?.remotes);
  const issueStorage = config?.delivery?.issue_storage;
  const issueTrackerUrl = remoteUrls[remotes.issue_tracker];
  const storageProvider = providerFromIssueStorage(issueStorage);
  const configuredProvider = remotes.issue_provider ? normalizeProvider(remotes.issue_provider) : 'unknown';
  const urlProvider = issueTrackerUrl ? normalizeProvider(resolveRemoteProvider(issueTrackerUrl)) : 'unknown';

  return {
    configPath,
    primaryRemote: remotes.primary,
    issueTrackerRemote: remotes.issue_tracker,
    ciRemote: remotes.ci,
    issueTrackerUrl,
    issueStorage,
    provider: configuredProvider !== 'unknown'
      ? configuredProvider
      : storageProvider !== 'unknown'
        ? storageProvider
        : urlProvider,
    secondaryRemotes: remotes.secondary,
  };
}

export function chooseTrackerAccess(
  authority: TrackerAuthority,
  probes: readonly TrackerAccessProbe[],
): TrackerAccessDecision {
  const mcp = probes.find((probe) => probe.kind === 'mcp-app' && probeIsUsable(probe, authority));
  if (mcp) return { kind: 'mcp-app', provider: authority.provider, label: accessLabel(mcp) };

  const api = probes.find((probe) => probe.kind === 'http-api' && probeIsUsable(probe, authority));
  if (api) return { kind: 'http-api', provider: authority.provider, label: accessLabel(api) };

  const cli = probes.find((probe) => probe.kind === 'cli' && probeIsUsable(probe, authority));
  if (cli) return { kind: 'cli', provider: authority.provider, label: accessLabel(cli) };

  return {
    kind: 'blocker',
    provider: authority.provider,
    label: 'stop/report blocker',
    blocker: [
      `No usable issue-tracker write path for configured tracker '${authority.issueTrackerRemote}'`,
      `(provider: ${authority.provider}, url: ${authority.issueTrackerUrl ?? 'unresolved'}).`,
      'Git SSH remote access only proves repository sync, not issue API access.',
      'Do not file on mirror or secondary remotes unless the user explicitly requests it.',
    ].join(' '),
  };
}

export function renderTrackerProtocol(authority: TrackerAuthority): string {
  const secondary = authority.secondaryRemotes.length > 0
    ? authority.secondaryRemotes
        .map((remote) => `${remote.name}${remote.purpose ? ` (${remote.purpose})` : ''}`)
        .join(', ')
    : 'none configured';
  const issueStorage = authority.issueStorage ?? 'not configured';
  const trackerUrl = authority.issueTrackerUrl ?? 'remote URL unavailable';

  return [
    '### Tracker Authority Protocol',
    '',
    `- Source of truth: [${authority.configPath}](./${authority.configPath})`,
    `- Canonical tracker: \`${authority.issueTrackerRemote}\` (${authority.provider}; ${trackerUrl})`,
    `- Primary repo remote: \`${authority.primaryRemote}\`; CI remote: \`${authority.ciRemote}\``,
    `- Secondary/mirror remotes: ${secondary}`,
    `- Issue storage mode: ${issueStorage}`,
    '',
    'Tracker access order for issue, PR, release, and CI-sensitive tracker operations:',
    '1. MCP/app tools for the configured tracker.',
    '2. Tracker HTTP API with configured credentials.',
    '3. Tracker CLI for the configured tracker, after confirming authentication.',
    '4. Stop and report a blocker.',
    '',
    '- Project config decides tracker authority; installed/authenticated CLIs do not.',
    '- Git SSH remote access is repository sync, not issue-tracker API access.',
    '- Do not file on mirror or secondary remotes just because their CLI is authenticated.',
    '- Treat an unauthenticated tracker CLI as one failed access path, then continue probing MCP/app/API before blocking.',
  ].join('\n');
}
